"""APScheduler async jobs for notifications and recurring instance generation."""
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services import pb_service, notification_service
from app.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _check_due_soon():
    """Notify assignees of chores due within the next 24 hours."""
    try:
        token = await pb_service.get_admin_token()
        now = datetime.now(timezone.utc)
        window_end = now + timedelta(hours=24)

        result = await pb_service.pb_list(
            "chores",
            token,
            filter=(
                f'due_date >= "{now.date().isoformat()}" && '
                f'due_date <= "{window_end.date().isoformat()}" && '
                'status = "active"'
            ),
            expand="assigned_to",
        )

        for chore in result.get("items", []):
            assignees = chore.get("expand", {}).get("assigned_to", [])
            for user in assignees:
                # Push
                subs = await pb_service.pb_list(
                    "push_subscriptions",
                    token,
                    filter=f'user = "{user["id"]}"',
                )
                for sub in subs.get("items", []):
                    notification_service.send_push(
                        sub,
                        title="Chore due soon",
                        body=f'{chore["title"]} is due on {chore.get("due_date", "today")}',
                    )
                # Email
                if user.get("email"):
                    notification_service.send_email(
                        to=user["email"],
                        subject=f"Chore due soon: {chore['title']}",
                        body_html=notification_service.build_due_soon_email(
                            chore["title"], chore.get("due_date", "")
                        ),
                    )
    except Exception as e:
        logger.error("check_due_soon job failed: %s", e)


async def _check_overdue():
    """Notify assignees of overdue chores."""
    try:
        token = await pb_service.get_admin_token()
        today = datetime.now(timezone.utc).date().isoformat()

        result = await pb_service.pb_list(
            "chores",
            token,
            filter=f'due_date < "{today}" && status = "active"',
            expand="assigned_to",
        )

        for chore in result.get("items", []):
            assignees = chore.get("expand", {}).get("assigned_to", [])
            for user in assignees:
                subs = await pb_service.pb_list(
                    "push_subscriptions",
                    token,
                    filter=f'user = "{user["id"]}"',
                )
                for sub in subs.get("items", []):
                    notification_service.send_push(
                        sub,
                        title="Overdue chore",
                        body=f'{chore["title"]} is overdue!',
                    )
    except Exception as e:
        logger.error("check_overdue job failed: %s", e)


async def _generate_recurring_instances():
    """Daily job: ensure recurring chores have instances 30 days ahead."""
    try:
        from datetime import date
        from app.services.recurrence_service import generate_instances

        token = await pb_service.get_admin_token()
        result = await pb_service.pb_list(
            "chores",
            token,
            filter='recurring != "none" && is_instance = false',
        )

        for chore in result.get("items", []):
            # Check if we need more instances
            latest = await pb_service.pb_list(
                "chores",
                token,
                filter=f'parent_chore = "{chore["id"]}"',
                sort="-due_date",
                per_page=1,
            )
            items = latest.get("items", [])
            if items:
                last_date_str = items[0].get("due_date", "")
                if last_date_str:
                    last_date = date.fromisoformat(last_date_str[:10])
                    horizon = date.today() + timedelta(days=30)
                    if last_date >= horizon:
                        continue
            await generate_instances(chore, token)
    except Exception as e:
        logger.error("generate_recurring_instances job failed: %s", e)


def start_scheduler():
    scheduler.add_job(_check_due_soon, "interval", minutes=60, id="check_due_soon")
    scheduler.add_job(_check_overdue, "interval", minutes=60, id="check_overdue")
    scheduler.add_job(
        _generate_recurring_instances,
        "cron",
        hour=0,
        minute=5,
        id="generate_recurring",
    )
    scheduler.start()
    logger.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)

from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date, timedelta

from app.services import pb_service
from app.dependencies import verify_pb_token
from app.utils.date_utils import get_week_of_month

router = APIRouter(prefix="/history", tags=["History"])


@router.get("")
async def get_history(
    range: str = Query("weekly", regex="^(daily|weekly|monthly)$"),
    week_of_month: Optional[int] = Query(None, ge=1, le=5),
    user: dict = Depends(verify_pb_token),
):
    token = user["_token"]
    org_id = user.get("organization", "")
    today = date.today()

    if range == "daily":
        date_filter = f'completed_at >= "{today.isoformat()}"'
    elif range == "weekly":
        start = today - timedelta(days=today.weekday())
        date_filter = f'completed_at >= "{start.isoformat()}"'
    else:  # monthly
        start = today.replace(day=1)
        date_filter = f'completed_at >= "{start.isoformat()}"'

    filters = [f'organization = "{org_id}"', date_filter]
    if week_of_month:
        # Filter to specific week-of-month within the current month
        start_of_month = today.replace(day=1)
        # Build date range for that week
        week_start = start_of_month + timedelta(weeks=week_of_month - 1)
        week_end = week_start + timedelta(days=6)
        filters = [
            f'organization = "{org_id}"',
            f'completed_at >= "{week_start.isoformat()}"',
            f'completed_at <= "{week_end.isoformat()}"',
        ]

    return await pb_service.pb_list(
        "chore_completions",
        token,
        filter=" && ".join(filters),
        sort="-completed_at",
        expand="chore,completed_by",
    )


@router.get("/stats")
async def get_history_stats(
    user: dict = Depends(verify_pb_token),
):
    """Aggregate completion counts per day and per assignee for the current month."""
    token = user["_token"]
    org_id = user.get("organization", "")
    start = date.today().replace(day=1)

    result = await pb_service.pb_list(
        "chore_completions",
        token,
        filter=f'organization = "{org_id}" && completed_at >= "{start.isoformat()}"',
        expand="completed_by",
        per_page=200,
    )

    by_day: dict = {}
    by_user: dict = {}

    for item in result.get("items", []):
        day = item["completed_at"][:10]
        by_day[day] = by_day.get(day, 0) + 1

        user_rec = item.get("expand", {}).get("completed_by", {})
        uid = user_rec.get("id", item.get("completed_by", "unknown"))
        uname = user_rec.get("name", uid)
        by_user[uname] = by_user.get(uname, 0) + 1

    return {"by_day": by_day, "by_user": by_user}

"""Generate recurring chore instances in PocketBase."""
from datetime import date
from typing import Optional
from app.services import pb_service
from app.utils.date_utils import (
    generate_weekly_dates,
    generate_monthly_dates,
    generate_yearly_dates,
)


async def generate_instances(
    parent: dict,
    token: str,
) -> None:
    """Create child chore instances for a recurring parent chore."""
    recurring = parent.get("recurring", "none")
    anchor_str = parent.get("recurrence_anchor") or parent.get("due_date")
    if not anchor_str or recurring == "none":
        return

    anchor = date.fromisoformat(anchor_str[:10])

    if recurring == "weekly":
        dates = generate_weekly_dates(anchor, count=52)
    elif recurring == "monthly":
        dates = generate_monthly_dates(anchor, count=12)
    elif recurring == "yearly":
        dates = generate_yearly_dates(anchor, count=5)
    else:
        return

    # Skip first date (that's the parent itself)
    for d in dates[1:]:
        instance_data = {
            "title": parent["title"],
            "description": parent.get("description"),
            "due_date": d.isoformat(),
            "importance": parent.get("importance", 3),
            "project": parent.get("project"),
            "organization": parent["organization"],
            "assigned_to": parent.get("assigned_to", []),
            "kanban_column": parent.get("kanban_column", "todo"),
            "status": "active",
            "recurring": "none",
            "is_instance": True,
            "parent_chore": parent["id"],
            "created_by": parent["created_by"],
        }
        await pb_service.pb_create("chores", instance_data, token)


async def delete_instances(parent_id: str, token: str) -> None:
    """Delete all child instances of a recurring chore."""
    result = await pb_service.pb_list(
        "chores",
        token,
        filter=f'parent_chore="{parent_id}"',
        per_page=200,
    )
    for record in result.get("items", []):
        await pb_service.pb_delete("chores", record["id"], token)

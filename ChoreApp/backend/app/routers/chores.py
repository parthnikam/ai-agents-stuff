from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone

from app.models.chore import ChoreCreate, ChoreUpdate, ChoreMove, ChoreComplete, SubtaskCreate, SubtaskUpdate
from app.services import pb_service
from app.services.recurrence_service import generate_instances, delete_instances
from app.dependencies import verify_pb_token

router = APIRouter(prefix="/chores", tags=["Chores"])


@router.get("")
async def list_chores(
    project: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    column: Optional[str] = Query(None),
    user: dict = Depends(verify_pb_token),
    authorization: str = Query(None, include_in_schema=False),
):
    from fastapi import Request
    org_id = user.get("organization")
    if not org_id:
        return {"items": [], "totalItems": 0}

    filters = [f'organization = "{org_id}"']
    if project:
        filters.append(f'project = "{project}"')
    if assignee:
        filters.append(f'assigned_to ~ "{assignee}"')
    if status:
        filters.append(f'status = "{status}"')
    if column:
        filters.append(f'kanban_column = "{column}"')

    token = _extract_token(user)
    return await pb_service.pb_list(
        "chores",
        token,
        filter=" && ".join(filters),
        sort="-importance,due_date",
        expand="assigned_to,project",
    )


@router.post("")
async def create_chore(
    body: ChoreCreate,
    user: dict = Depends(verify_pb_token),
):
    token = _extract_token(user)
    data = body.model_dump(exclude_none=True)
    if "due_date" in data and data["due_date"]:
        data["due_date"] = str(data["due_date"])
    if "recurrence_anchor" in data and data["recurrence_anchor"]:
        data["recurrence_anchor"] = str(data["recurrence_anchor"])
    data["status"] = "active"
    data["is_instance"] = False
    data["created_by"] = user["id"]

    record = await pb_service.pb_create("chores", data, token)

    # Generate recurring instances
    if body.recurring != "none":
        record["organization"] = body.organization
        await generate_instances(record, token)

    return record


@router.get("/{chore_id}")
async def get_chore(chore_id: str, user: dict = Depends(verify_pb_token)):
    token = _extract_token(user)
    return await pb_service.pb_get(
        "chores", chore_id, token, expand="assigned_to,project,subtasks_via_chore"
    )


@router.patch("/{chore_id}")
async def update_chore(
    chore_id: str,
    body: ChoreUpdate,
    user: dict = Depends(verify_pb_token),
):
    token = _extract_token(user)
    data = body.model_dump(exclude_none=True)
    if "due_date" in data and data["due_date"]:
        data["due_date"] = str(data["due_date"])
    return await pb_service.pb_update("chores", chore_id, data, token)


@router.delete("/{chore_id}")
async def delete_chore(chore_id: str, user: dict = Depends(verify_pb_token)):
    token = _extract_token(user)
    await delete_instances(chore_id, token)
    await pb_service.pb_delete("chores", chore_id, token)
    return {"ok": True}


@router.patch("/{chore_id}/complete")
async def complete_chore(
    chore_id: str,
    body: ChoreComplete,
    user: dict = Depends(verify_pb_token),
):
    token = _extract_token(user)
    chore = await pb_service.pb_get("chores", chore_id, token)
    org_id = chore.get("organization")

    await pb_service.pb_update("chores", chore_id, {"status": "completed", "kanban_column": "done"}, token)
    payload = {
        "chore": chore_id,
        "completed_by": user["id"],
        "organization": org_id,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.notes:
        payload["notes"] = body.notes

    await pb_service.pb_create(
        "chore_completions",
        payload,
        token,
    )
    return {"ok": True}


@router.patch("/{chore_id}/move")
async def move_chore(
    chore_id: str,
    body: ChoreMove,
    user: dict = Depends(verify_pb_token),
):
    token = _extract_token(user)
    data: dict = {"kanban_column": body.column}
    if body.column == "done":
        data["status"] = "completed"
    elif body.column in ("todo", "in_progress"):
        data["status"] = "active"
    return await pb_service.pb_update("chores", chore_id, data, token)


# ── Subtasks ──────────────────────────────────────────────────────────────────

@router.get("/{chore_id}/subtasks")
async def list_subtasks(chore_id: str, user: dict = Depends(verify_pb_token)):
    token = _extract_token(user)
    return await pb_service.pb_list(
        "subtasks", token, filter=f'chore = "{chore_id}"', sort="order"
    )


@router.post("/{chore_id}/subtasks")
async def create_subtask(
    chore_id: str,
    body: SubtaskCreate,
    user: dict = Depends(verify_pb_token),
):
    token = _extract_token(user)
    data = body.model_dump()
    data["chore"] = chore_id
    data["completed"] = False
    return await pb_service.pb_create("subtasks", data, token)


@router.patch("/{chore_id}/subtasks/{sub_id}")
async def update_subtask(
    chore_id: str,
    sub_id: str,
    body: SubtaskUpdate,
    user: dict = Depends(verify_pb_token),
):
    token = _extract_token(user)
    return await pb_service.pb_update("subtasks", sub_id, body.model_dump(exclude_none=True), token)


@router.delete("/{chore_id}/subtasks/{sub_id}")
async def delete_subtask(
    chore_id: str,
    sub_id: str,
    user: dict = Depends(verify_pb_token),
):
    token = _extract_token(user)
    await pb_service.pb_delete("subtasks", sub_id, token)
    return {"ok": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_token(user: dict) -> str:
    # The token is stored on the user dict by the dependency
    return user.get("_token", "")

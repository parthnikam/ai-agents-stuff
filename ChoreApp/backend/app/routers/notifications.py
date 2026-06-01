from typing import Optional

from fastapi import APIRouter, Depends

from app.dependencies import verify_pb_token
from app.models.notification import PushSubscription
from app.services import notification_service, pb_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/subscribe")
async def subscribe_push(
    body: PushSubscription,
    user: dict = Depends(verify_pb_token),
):
    token = user["_token"]
    # Upsert: delete existing subscription for this endpoint, then create
    existing = await pb_service.pb_list(
        "push_subscriptions",
        token,
        filter=f'user = "{user["id"]}" && endpoint = "{body.endpoint}"',
    )
    for item in existing.get("items", []):
        await pb_service.pb_delete("push_subscriptions", item["id"], token)

    record = await pb_service.pb_create(
        "push_subscriptions",
        {
            "user": user["id"],
            "endpoint": body.endpoint,
            "p256dh": body.keys.p256dh,
            "auth": body.keys.auth,
            "user_agent": body.user_agent or "",
        },
        token,
    )
    return record


@router.delete("/unsubscribe")
async def unsubscribe_push(
    endpoint: Optional[str] = None,
    user: dict = Depends(verify_pb_token),
):
    token = user["_token"]
    filter_expr = f'user = "{user["id"]}"'
    if endpoint:
        filter_expr += f' && endpoint = "{endpoint}"'
    existing = await pb_service.pb_list(
        "push_subscriptions",
        token,
        filter=filter_expr,
    )
    for item in existing.get("items", []):
        await pb_service.pb_delete("push_subscriptions", item["id"], token)
    return {"ok": True, "removed": len(existing.get("items", []))}


@router.post("/test")
async def test_push(user: dict = Depends(verify_pb_token)):
    """Send a test push notification to the calling user's subscriptions."""
    token = user["_token"]
    subs = await pb_service.pb_list(
        "push_subscriptions",
        token,
        filter=f'user = "{user["id"]}"',
    )
    sent = 0
    for sub in subs.get("items", []):
        ok = notification_service.send_push(
            sub,
            title="ChoreApp test notification",
            body="Push notifications are working!",
        )
        if ok:
            sent += 1
    return {"sent": sent}

import logging

import httpx
from fastapi import Header, HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)


async def verify_pb_token(authorization: str = Header(...)) -> dict:
    """Verify a PocketBase auth token and return the user record (with _token attached)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )
    token = authorization.removeprefix("Bearer ")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.pb_url}/api/collections/users/auth-refresh",
                headers={"Authorization": f"Bearer {token}"},
            )
    except httpx.RequestError as exc:
        logger.exception("Token verification failed: PocketBase request error")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable",
        ) from exc

    if resp.status_code != 200:
        logger.warning(
            "Token verification rejected with status=%s",
            resp.status_code,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    data = resp.json()
    record = data.get("record", {})
    # Attach the raw token so routers can make further PB calls
    record["_token"] = token
    return record

"""PocketBase REST API client wrapper."""
import logging
import httpx
from fastapi import HTTPException
from typing import Any, Dict, Optional
from app.config import settings
logger = logging.getLogger(__name__)
PB_TIMEOUT = httpx.Timeout(15.0, connect=5.0)


def _error_detail(resp: httpx.Response) -> str:
    try:
        body = resp.json()
        if isinstance(body, dict):
            for key in ("message", "detail", "error"):
                if body.get(key):
                    return str(body[key])
            return str(body)
        return str(body)
    except Exception:
        text = resp.text.strip()
        return text or f"PocketBase error ({resp.status_code})"


async def _request_json(
    method: str,
    url: str,
    *,
    token: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Dict[str, Any]] = None,
    operation: str,
) -> Dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        async with httpx.AsyncClient(timeout=PB_TIMEOUT) as client:
            resp = await client.request(
                method,
                url,
                headers=headers,
                params=params,
                json=json,
            )
    except httpx.RequestError as exc:
        logger.exception("PocketBase request failed operation=%s", operation)
        raise HTTPException(
            status_code=502,
            detail="PocketBase service is unavailable",
        ) from exc

    if resp.status_code >= 400:
        detail = _error_detail(resp)
        logger.warning(
            "PocketBase request rejected operation=%s status=%s detail=%s",
            operation,
            resp.status_code,
            detail,
        )
        raise HTTPException(status_code=resp.status_code, detail=detail)

    if not resp.content:
        return {}
    return resp.json()


async def get_admin_token() -> str:
    """Authenticate as PocketBase admin and return token."""
    payload = await _request_json(
        "POST",
        f"{settings.pb_url}/api/admins/auth-with-password",
        json={
            "identity": settings.pb_admin_email,
            "password": settings.pb_admin_password,
        },
        operation="admins/auth-with-password",
    )
    return str(payload.get("token", ""))


async def pb_list(
    collection: str,
    token: str,
    filter: Optional[str] = None,
    sort: Optional[str] = None,
    expand: Optional[str] = None,
    page: int = 1,
    per_page: int = 200,
) -> Dict[str, Any]:
    params: Dict[str, Any] = {"page": page, "perPage": per_page}
    if filter:
        params["filter"] = filter
    if sort:
        params["sort"] = sort
    if expand:
        params["expand"] = expand
    return await _request_json(
        "GET",
        f"{settings.pb_url}/api/collections/{collection}/records",
        token=token,
        params=params,
        operation=f"{collection}.list",
    )


async def pb_get(
    collection: str,
    record_id: str,
    token: str,
    expand: Optional[str] = None,
) -> Dict[str, Any]:
    params = {}
    if expand:
        params["expand"] = expand
    return await _request_json(
        "GET",
        f"{settings.pb_url}/api/collections/{collection}/records/{record_id}",
        token=token,
        params=params,
        operation=f"{collection}.get",
    )


async def pb_create(
    collection: str,
    data: Dict[str, Any],
    token: str,
) -> Dict[str, Any]:
    return await _request_json(
        "POST",
        f"{settings.pb_url}/api/collections/{collection}/records",
        token=token,
        json=data,
        operation=f"{collection}.create",
    )


async def pb_update(
    collection: str,
    record_id: str,
    data: Dict[str, Any],
    token: str,
) -> Dict[str, Any]:
    return await _request_json(
        "PATCH",
        f"{settings.pb_url}/api/collections/{collection}/records/{record_id}",
        token=token,
        json=data,
        operation=f"{collection}.update",
    )


async def pb_delete(
    collection: str,
    record_id: str,
    token: str,
) -> None:
    await _request_json(
        "DELETE",
        f"{settings.pb_url}/api/collections/{collection}/records/{record_id}",
        token=token,
        operation=f"{collection}.delete",
    )

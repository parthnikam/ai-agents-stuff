from contextlib import asynccontextmanager
import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_config import configure_logging
from app.routers import ai, chores, notifications, history, scheduler
from app.services.scheduler_service import start_scheduler, stop_scheduler
configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup: initializing scheduler")
    start_scheduler()
    yield
    logger.info("Application shutdown: stopping scheduler")
    stop_scheduler()


app = FastAPI(
    title="ChoreApp API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router)
app.include_router(chores.router)
app.include_router(notifications.router)
app.include_router(history.router)
app.include_router(scheduler.router)

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid4()))
    start = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (perf_counter() - start) * 1000
        logger.exception(
            "Request failed request_id=%s method=%s path=%s duration_ms=%.2f",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = (perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "Request complete request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.get("/health")
async def health():
    import httpx
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.pb_url}/api/health")
        pb_ok = resp.status_code == 200
    except Exception:
        logger.exception("Health check failed while contacting PocketBase")
        pb_ok = False
    return {"status": "ok", "pocketbase": "reachable" if pb_ok else "unreachable"}


# parth@gmail.com
# elonphysics
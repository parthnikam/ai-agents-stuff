from fastapi import APIRouter, Depends, HTTPException
from app.services.scheduler_service import scheduler
from app.dependencies import verify_pb_token

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


@router.get("/jobs")
async def list_jobs(user: dict = Depends(verify_pb_token)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    return [
        {
            "id": job.id,
            "next_run": str(job.next_run_time),
            "trigger": str(job.trigger),
        }
        for job in scheduler.get_jobs()
    ]


@router.post("/trigger/{job_id}")
async def trigger_job(job_id: str, user: dict = Depends(verify_pb_token)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    job = scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    scheduler.modify_job(job_id, next_run_time=__import__("datetime").datetime.now())
    return {"ok": True, "job_id": job_id}

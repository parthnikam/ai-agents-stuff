from fastapi import APIRouter, Depends
from app.models.ai import AIParseRequest, AIParseResponse
from app.services.ai_service import parse_chore
from app.dependencies import verify_pb_token

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/parse-chore", response_model=AIParseResponse)
async def parse_chore_endpoint(
    body: AIParseRequest,
    _user: dict = Depends(verify_pb_token),
):
    """Parse a natural language string into structured chore data."""
    return parse_chore(body.prompt)

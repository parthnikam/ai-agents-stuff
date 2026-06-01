from pydantic import BaseModel
from typing import Optional, List


class AIParseRequest(BaseModel):
    prompt: str


class AIParseResponse(BaseModel):
    title: str
    recurrence: str = "none"
    importance: int = 3
    assignees: List[str] = []
    project: Optional[str] = None
    due_date: Optional[str] = None
    raw_output: Optional[str] = None

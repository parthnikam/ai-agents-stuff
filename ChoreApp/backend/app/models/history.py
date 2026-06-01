from pydantic import BaseModel
from typing import Optional
from datetime import date


class HistoryQuery(BaseModel):
    range: str = "weekly"
    week_of_month: Optional[int] = None

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from enum import Enum


class KanbanColumn(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class ChoreStatus(str, Enum):
    active = "active"
    completed = "completed"
    archived = "archived"


class RecurringType(str, Enum):
    none = "none"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class ChoreCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    importance: int = Field(default=3, ge=1, le=5)
    project: Optional[str] = None
    organization: str
    assigned_to: List[str] = []
    kanban_column: KanbanColumn = KanbanColumn.todo
    recurring: RecurringType = RecurringType.none
    recurrence_anchor: Optional[date] = None


class ChoreUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    importance: Optional[int] = Field(default=None, ge=1, le=5)
    project: Optional[str] = None
    assigned_to: Optional[List[str]] = None
    kanban_column: Optional[KanbanColumn] = None
    status: Optional[ChoreStatus] = None
    recurring: Optional[RecurringType] = None


class ChoreMove(BaseModel):
    column: KanbanColumn

class ChoreComplete(BaseModel):
    notes: Optional[str] = None


class SubtaskCreate(BaseModel):
    title: str
    order: int = 0


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
    order: Optional[int] = None

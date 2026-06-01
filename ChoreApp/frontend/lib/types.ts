export type KanbanColumn = "todo" | "in_progress" | "done"
export type ChoreStatus = "active" | "completed" | "archived"
export type RecurringType = "none" | "weekly" | "monthly" | "yearly"

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  organization?: string
  is_admin?: boolean
}

export interface Organization {
  id: string
  name: string
  owner: string
  members: string[]
}

export interface Project {
  id: string
  name: string
  description?: string
  color?: string
  organization: string
  created_by: string
  created: string
}

export interface Subtask {
  id: string
  chore: string
  title: string
  completed: boolean
  order: number
}

export interface Chore {
  id: string
  title: string
  description?: string
  due_date?: string
  importance: number
  project?: string
  organization: string
  assigned_to: string[]
  kanban_column: KanbanColumn
  status: ChoreStatus
  recurring: RecurringType
  recurrence_anchor?: string
  parent_chore?: string
  is_instance: boolean
  created_by: string
  created: string
  updated: string
  // expanded relations
  expand?: {
    assigned_to?: User[]
    project?: Project
    subtasks_via_chore?: Subtask[]
  }
}

export interface ChoreCompletion {
  id: string
  chore: string
  completed_by: string
  organization: string
  completed_at: string
  notes?: string
  expand?: {
    chore?: Chore
    completed_by?: User
  }
}

export interface PBList<T> {
  items: T[]
  totalItems: number
  totalPages: number
  page: number
  perPage: number
}

export interface AIParseResponse {
  title: string
  recurrence: RecurringType
  importance: number
  assignees: string[]
  project: string | null
  due_date: string | null
  raw_output?: string
}

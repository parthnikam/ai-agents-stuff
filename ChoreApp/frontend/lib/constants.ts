export const KANBAN_COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
] as const

export const IMPORTANCE_CONFIG: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  1: { label: "Low", color: "text-slate-500", bg: "bg-slate-100" },
  2: { label: "Normal", color: "text-blue-500", bg: "bg-blue-100" },
  3: { label: "Medium", color: "text-yellow-600", bg: "bg-yellow-100" },
  4: { label: "High", color: "text-orange-500", bg: "bg-orange-100" },
  5: { label: "Critical", color: "text-red-600", bg: "bg-red-100" },
}

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const

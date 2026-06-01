"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Chore, User } from "@/lib/types"
import { IMPORTANCE_CONFIG } from "@/lib/constants"

interface Props {
  chore: Chore
  orgUsers: User[]
  onClick: () => void
}

function formatDueDate(due: string | undefined) {
  if (!due) return null
  const d = new Date(due)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / 86_400_000)
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  if (days < 0) return { label, color: "text-red-600 bg-red-50" }
  if (days <= 2) return { label, color: "text-orange-600 bg-orange-50" }
  return { label, color: "text-gray-500 bg-gray-50" }
}

export function ChoreCard({ chore, orgUsers, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chore.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const due = formatDueDate(chore.due_date)
  const importance = IMPORTANCE_CONFIG[chore.importance] ?? IMPORTANCE_CONFIG[1]
  const assignees =
    chore.expand?.assigned_to ??
    chore.assigned_to.map((id) => orgUsers.find((u) => u.id === id)).filter(Boolean) as User[]

  const projectColor = chore.expand?.project?.color ?? "#6366f1"
  const projectName = chore.expand?.project?.name

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none"
    >
      {/* Drag handle + project tag row */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div
          {...listeners}
          className="w-5 h-5 flex flex-col justify-center gap-0.5 cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to move"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-0.5 w-4 bg-gray-300 rounded-full" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {projectName && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: projectColor }}
            >
              {projectName}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${importance.bg} ${importance.color}`}>
            {"★".repeat(chore.importance)}
          </span>
        </div>
      </div>

      {/* Clickable body */}
      <div className="px-3 pb-3" onClick={onClick}>
        <p className="text-sm font-semibold text-gray-900 mt-1 leading-snug line-clamp-2">
          {chore.title}
        </p>
        {chore.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{chore.description}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          {/* Due date */}
          {due ? (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${due.color}`}>
              {due.label}
            </span>
          ) : (
            <span />
          )}

          {/* Assignee avatars */}
          <div className="flex -space-x-2">
            {assignees.slice(0, 3).map((u) => (
              <div
                key={u.id}
                title={u.name}
                className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-600 text-xs font-bold"
              >
                {u.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-500 text-xs font-bold">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        </div>

        {chore.recurring !== "none" && (
          <div className="mt-2 flex items-center gap-1">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs text-gray-400 capitalize">{chore.recurring}</span>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ChoreCard } from "./ChoreCard"
import type { Chore, KanbanColumn as KanbanColumnType, User } from "@/lib/types"

interface Props {
  id: KanbanColumnType
  label: string
  chores: Chore[]
  orgUsers: User[]
  onCardClick: (chore: Chore) => void
  onAddClick: () => void
}

const COLUMN_STYLE: Record<KanbanColumnType, { dot: string; badge: string }> = {
  todo: { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" },
  in_progress: { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700" },
  done: { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700" },
}

export function KanbanColumn({ id, label, chores, orgUsers, onCardClick, onAddClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const style = COLUMN_STYLE[id]

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${style.dot}`} />
          <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${style.badge}`}>
            {chores.length}
          </span>
        </div>
        <button
          onClick={onAddClick}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title={`Add to ${label}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Drop zone */}
      <SortableContext items={chores.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 min-h-24 rounded-xl p-2 space-y-2 transition-colors ${
            isOver ? "bg-indigo-50 ring-2 ring-indigo-200" : "bg-gray-100/60"
          }`}
        >
          {chores.map((chore) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              orgUsers={orgUsers}
              onClick={() => onCardClick(chore)}
            />
          ))}
          {chores.length === 0 && (
            <div className="h-20 flex items-center justify-center">
              <p className="text-xs text-gray-400">Drop cards here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

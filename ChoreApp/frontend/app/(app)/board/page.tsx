"use client"

import { useState, useEffect, useCallback } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core"
import { useAuth } from "@/contexts/AuthContext"
import { useChores } from "@/hooks/useChores"
import { KanbanColumn } from "@/components/KanbanColumn"
import { ChoreModal } from "@/components/ChoreModal"
import { ChoreDetail } from "@/components/ChoreDetail"
import { KANBAN_COLUMNS } from "@/lib/constants"
import type { Chore, KanbanColumn as KanbanColumnType, Project, User } from "@/lib/types"
import { getOrgUsers } from "@/lib/api"
import getPocketBase from "@/lib/pocketbase"

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || "http://localhost:8090"

export default function BoardPage() {
  const { user, token, org } = useAuth()
  const [orgUsers, setOrgUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterProject, setFilterProject] = useState("")
  const [filterAssignee, setFilterAssignee] = useState("")

  const { chores, loading, error, refetch, moveChoreOptimistic, choresByColumn, setChores } =
    useChores(token, {
      project: filterProject || undefined,
      assignee: filterAssignee || undefined,
    })

  const [showModal, setShowModal] = useState(false)
  const [defaultColumn, setDefaultColumn] = useState<KanbanColumnType>("todo")
  const [detailChore, setDetailChore] = useState<Chore | null>(null)
  const [editChore, setEditChore] = useState<Chore | null>(null)

  // Load org users and projects
  useEffect(() => {
    if (!token || !org) return
    getOrgUsers(PB_URL, token, org.id).then(setOrgUsers).catch(() => {})

    const pb = getPocketBase()
    pb.collection("projects")
      .getFullList({ filter: `organization="${org.id}"` })
      .then((records) =>
        setProjects(
          records.map((r) => ({
            id: r.id,
            name: r.name as string,
            color: r.color as string,
            description: r.description as string,
            organization: r.organization as string,
            created_by: r.created_by as string,
            created: r.created as string,
          }))
        )
      )
      .catch(() => {})
  }, [token, org])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return
      const activeChoreId = active.id as string
      const overId = over.id as string

      const targetColumn = KANBAN_COLUMNS.find((c) => c.id === overId)
      if (targetColumn) {
        const activeChore = chores.find((c) => c.id === activeChoreId)
        if (activeChore && activeChore.kanban_column !== targetColumn.id) {
          setChores((prev) =>
            prev.map((c) =>
              c.id === activeChoreId ? { ...c, kanban_column: targetColumn.id as KanbanColumnType } : c
            )
          )
        }
      }
    },
    [chores, setChores]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return
      const activeChoreId = active.id as string
      const overId = over.id as string

      // Determine target column
      let targetColumn: KanbanColumnType | null = null
      if (KANBAN_COLUMNS.some((c) => c.id === overId)) {
        targetColumn = overId as KanbanColumnType
      } else {
        const overChore = chores.find((c) => c.id === overId)
        if (overChore) targetColumn = overChore.kanban_column
      }

      if (!targetColumn) return
      const activeChore = chores.find((c) => c.id === activeChoreId)
      if (activeChore && activeChore.kanban_column !== targetColumn) {
        await moveChoreOptimistic(activeChoreId, targetColumn)
      }
    },
    [chores, moveChoreOptimistic]
  )

  function openCreate(column: KanbanColumnType) {
    setDefaultColumn(column)
    setEditChore(null)
    setShowModal(true)
  }

  function openEdit(chore: Chore) {
    setEditChore(chore)
    setDetailChore(null)
    setShowModal(true)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <header className="px-6 py-5 border-b border-gray-200 bg-white flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kanban Board</h1>
          {org && <p className="text-sm text-gray-400 mt-0.5">{org.name}</p>}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All members</option>
            {orgUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <button
            onClick={() => openCreate("todo")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add chore
          </button>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
            {error}{" "}
            <button className="underline" onClick={refetch}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-5 h-full min-h-0">
              {KANBAN_COLUMNS.map(({ id, label }) => (
                <KanbanColumn
                  key={id}
                  id={id as KanbanColumnType}
                  label={label}
                  chores={choresByColumn(id as KanbanColumnType)}
                  orgUsers={orgUsers}
                  onCardClick={(chore) => setDetailChore(chore)}
                  onAddClick={() => openCreate(id as KanbanColumnType)}
                />
              ))}
            </div>
          </DndContext>
        )}
      </div>

      {/* Chore create/edit modal */}
      {showModal && (
        <ChoreModal
          token={token!}
          orgId={org?.id ?? ""}
          orgUsers={orgUsers}
          projects={projects}
          initialChore={editChore ?? undefined}
          defaultColumn={defaultColumn}
          currentUserId={user?.id ?? ""}
          onClose={() => { setShowModal(false); setEditChore(null) }}
          onSaved={() => { setShowModal(false); setEditChore(null); refetch() }}
        />
      )}

      {/* Chore detail panel */}
      {detailChore && (
        <ChoreDetail
          chore={detailChore}
          token={token!}
          orgUsers={orgUsers}
          onClose={() => setDetailChore(null)}
          onEdit={() => openEdit(detailChore)}
          onCompleted={refetch}
          onDeleted={() => { setDetailChore(null); refetch() }}
        />
      )}
    </div>
  )
}

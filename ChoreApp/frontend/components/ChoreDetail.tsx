"use client"

import { useState, useEffect } from "react"
import { completeChore, deleteChore, getChore } from "@/lib/api"
import { SubtaskList } from "./SubtaskList"
import { IMPORTANCE_CONFIG } from "@/lib/constants"
import type { Chore, User } from "@/lib/types"

interface Props {
  chore: Chore
  token: string
  orgUsers: User[]
  onClose: () => void
  onEdit: () => void
  onCompleted: () => void
  onDeleted: () => void
}

export function ChoreDetail({ chore, token, orgUsers, onClose, onEdit, onCompleted, onDeleted }: Props) {
  const [fullChore, setFullChore] = useState(chore)
  const [notes, setNotes] = useState("")
  const [completing, setCompleting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setFullChore(chore)
  }, [chore])

  useEffect(() => {
    getChore(token, chore.id).then(setFullChore).catch(() => {})
  }, [token, chore.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const importance = IMPORTANCE_CONFIG[fullChore.importance] ?? IMPORTANCE_CONFIG[1]
  const assignees =
    fullChore.expand?.assigned_to ??
    fullChore.assigned_to
      .map((id) => orgUsers.find((u) => u.id === id))
      .filter(Boolean) as User[]

  async function handleComplete() {
    setCompleting(true)
    try {
      await completeChore(token, fullChore.id, notes)
      onCompleted()
      onClose()
    } catch {
      // ignore
    } finally {
      setCompleting(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await deleteChore(token, fullChore.id)
      onDeleted()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${importance.bg} ${importance.color}`}
          >
            {"★".repeat(fullChore.importance)} {importance.label}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Title + meta */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{fullChore.title}</h2>
            {fullChore.description && (
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{fullChore.description}</p>
            )}
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            {fullChore.due_date && (
              <div className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(fullChore.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}
            {fullChore.recurring !== "none" && (
              <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 rounded-full px-3 py-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {fullChore.recurring}
              </div>
            )}
            <div className={`flex items-center text-xs rounded-full px-3 py-1 ${
              fullChore.kanban_column === "todo"
                ? "bg-gray-100 text-gray-600"
                : fullChore.kanban_column === "in_progress"
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {fullChore.kanban_column === "todo"
                ? "To Do"
                : fullChore.kanban_column === "in_progress"
                ? "In Progress"
                : "Done"}
            </div>
          </div>

          {/* Assignees */}
          {assignees.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned to</p>
              <div className="flex flex-wrap gap-2">
                {assignees.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                      {u.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm text-gray-700">{u.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div>
            <SubtaskList choreId={fullChore.id} token={token} />
          </div>

          {/* Completion notes */}
          {fullChore.status !== "completed" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Completion notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes when marking done…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          {fullChore.status !== "completed" && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {completing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark complete
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              confirmDelete
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200"
            }`}
          >
            {deleting ? "Deleting…" : confirmDelete ? "Click again to confirm" : "Delete chore"}
          </button>
        </div>
      </div>
    </>
  )
}

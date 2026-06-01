"use client"

import { useState, useEffect } from "react"
import { createChore, updateChore } from "@/lib/api"
import { ImportanceSelector } from "./ImportanceSelector"
import { UserMultiSelect } from "./UserMultiSelect"
import { AIParseInput } from "./AIParseInput"
import { RECURRENCE_OPTIONS } from "@/lib/constants"
import type { Chore, KanbanColumn, Project, User, AIParseResponse } from "@/lib/types"

interface Props {
  token: string
  orgId: string
  orgUsers: User[]
  projects: Project[]
  initialChore?: Chore
  defaultColumn?: KanbanColumn
  currentUserId: string
  onClose: () => void
  onSaved: () => void
}

interface FormState {
  title: string
  description: string
  project: string
  assigned_to: string[]
  due_date: string
  importance: number
  recurring: string
  recurrence_anchor: string
}

function emptyForm(col: KanbanColumn, currentUserId: string): FormState {
  return {
    title: "",
    description: "",
    project: "",
    assigned_to: [currentUserId],
    due_date: "",
    importance: 2,
    recurring: "none",
    recurrence_anchor: "",
  }
}

function choreToForm(chore: Chore): FormState {
  return {
    title: chore.title,
    description: chore.description ?? "",
    project: chore.project ?? "",
    assigned_to: chore.assigned_to,
    due_date: chore.due_date ? chore.due_date.split("T")[0] : "",
    importance: chore.importance,
    recurring: chore.recurring,
    recurrence_anchor: chore.recurrence_anchor ?? "",
  }
}

export function ChoreModal({
  token,
  orgId,
  orgUsers,
  projects,
  initialChore,
  defaultColumn = "todo",
  currentUserId,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!initialChore
  const [form, setForm] = useState<FormState>(
    initialChore ? choreToForm(initialChore) : emptyForm(defaultColumn, currentUserId)
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function handleAIParsed(result: AIParseResponse) {
    setForm((f) => ({
      ...f,
      title: result.title || f.title,
      importance: result.importance ?? f.importance,
      recurring: result.recurrence ?? f.recurring,
      due_date: result.due_date ? result.due_date.split("T")[0] : f.due_date,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setError("")
    setSubmitting(true)
    try {
      const payload: Partial<Chore> = {
        title: form.title.trim(),
        description: form.description || undefined,
        project: form.project || undefined,
        organization: orgId,
        assigned_to: form.assigned_to,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
        importance: form.importance,
        recurring: form.recurring as Chore["recurring"],
        recurrence_anchor: form.recurrence_anchor || undefined,
        kanban_column: initialChore?.kanban_column ?? defaultColumn,
      }
      if (isEdit) {
        await updateChore(token, initialChore.id, payload)
      } else {
        await createChore(token, payload)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit chore" : "New chore"}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* AI quick-add (only for new chores) */}
          {!isEdit && <AIParseInput token={token} onParsed={handleAIParsed} />}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Chore title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Optional details…"
              />
            </div>

            {/* Project + Due date row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={form.project}
                  onChange={(e) => set("project", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Importance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Importance</label>
              <ImportanceSelector value={form.importance} onChange={(v) => set("importance", v)} />
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned to</label>
              <UserMultiSelect
                users={orgUsers}
                selected={form.assigned_to}
                onChange={(ids) => set("assigned_to", ids)}
              />
            </div>

            {/* Recurring + anchor row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
                <select
                  value={form.recurring}
                  onChange={(e) => set("recurring", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {RECURRENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {form.recurring !== "none" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starting from
                  </label>
                  <input
                    type="date"
                    value={form.recurrence_anchor}
                    onChange={(e) => set("recurrence_anchor", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Create chore"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

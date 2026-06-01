"use client"

import { useState, useEffect, useRef } from "react"
import { getSubtasks, createSubtask, updateSubtask, deleteSubtask } from "@/lib/api"
import type { Subtask } from "@/lib/types"

interface Props {
  choreId: string
  token: string
}

export function SubtaskList({ choreId, token }: Props) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSubtasks(token, choreId)
      .then((data) => setSubtasks(data.sort((a, b) => a.order - b.order)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [choreId, token])

  async function handleToggle(subtask: Subtask) {
    const updated = { ...subtask, completed: !subtask.completed }
    setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? updated : s)))
    try {
      await updateSubtask(token, choreId, subtask.id, { completed: updated.completed })
    } catch {
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? subtask : s)))
    }
  }

  async function handleAdd() {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const created = await createSubtask(token, choreId, {
        title: newTitle.trim(),
        order: subtasks.length,
      })
      setSubtasks((prev) => [...prev, created])
      setNewTitle("")
      inputRef.current?.focus()
    } catch {
      // ignore
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(subtask: Subtask) {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtask.id))
    try {
      await deleteSubtask(token, choreId, subtask.id)
    } catch {
      setSubtasks((prev) => [...prev, subtask].sort((a, b) => a.order - b.order))
    }
  }

  const done = subtasks.filter((s) => s.completed).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          Subtasks{" "}
          {subtasks.length > 0 && (
            <span className="text-gray-400 font-normal">
              {done}/{subtasks.length}
            </span>
          )}
        </h3>
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="w-full h-1 bg-gray-200 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${(done / subtasks.length) * 100}%` }}
          />
        </div>
      )}

      {loading ? (
        <div className="h-8 flex items-center">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 group">
              <button
                onClick={() => handleToggle(s)}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  s.completed
                    ? "bg-indigo-600 border-indigo-600"
                    : "border-gray-300 hover:border-indigo-400"
                }`}
              >
                {s.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm ${s.completed ? "line-through text-gray-400" : "text-gray-700"}`}
              >
                {s.title}
              </span>
              <button
                onClick={() => handleDelete(s)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add subtask */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add subtask…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newTitle.trim()}
          className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}

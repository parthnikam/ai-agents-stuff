"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import getPocketBase from "@/lib/pocketbase"
import type { Project } from "@/lib/types"

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#a855f7",
]

export default function ProjectsPage() {
  const { token, org, user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(COLORS[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function loadProjects() {
    if (!org) return
    const pb = getPocketBase()
    pb.collection("projects")
      .getFullList({ filter: `organization="${org.id}"`, sort: "-created" })
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
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProjects()
  }, [org]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditProject(null)
    setName("")
    setDescription("")
    setColor(COLORS[0])
    setError("")
    setShowForm(true)
  }

  function openEdit(p: Project) {
    setEditProject(p)
    setName(p.name)
    setDescription(p.description ?? "")
    setColor(p.color ?? COLORS[0])
    setError("")
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!org || !user) return
    setError("")
    setSubmitting(true)
    const pb = getPocketBase()
    try {
      if (editProject) {
        await pb.collection("projects").update(editProject.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        })
      } else {
        await pb.collection("projects").create({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          organization: org.id,
          created_by: user.id,
        })
      }
      setShowForm(false)
      setEditProject(null)
      loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(p: Project) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    const pb = getPocketBase()
    try {
      await pb.collection("projects").delete(p.id)
      setProjects((prev) => prev.filter((x) => x.id !== p.id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-5 border-b border-gray-200 bg-white flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Projects</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New project
        </button>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-14 h-14 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-gray-400 text-sm">No projects yet.</p>
            <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-2" style={{ backgroundColor: p.color ?? "#6366f1" }} />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      {p.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 mt-3">
                    {new Date(p.created).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editProject ? "Edit project" : "New project"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        color === c ? "border-gray-800 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editProject ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

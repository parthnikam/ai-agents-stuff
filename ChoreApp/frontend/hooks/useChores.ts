"use client"

import { useCallback, useEffect, useState } from "react"
import { getChores, moveChore, type ChoreFilters } from "@/lib/api"
import type { Chore, KanbanColumn } from "@/lib/types"

export function useChores(token: string | null, filters: ChoreFilters = {}) {
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChores = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!token) return
      try {
        setError(null)
        const data = await getChores(token, filters, { force: options.force })
        setChores(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chores")
      } finally {
        setLoading(false)
      }
    },
    [token, filters.project, filters.assignee, filters.status, filters.column]
  )

  useEffect(() => {
    fetchChores()
  }, [fetchChores])

  // Light background refresh to stay in sync without hammering the backend
  useEffect(() => {
    if (!token) return
    const interval = window.setInterval(() => {
      fetchChores()
    }, 60_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [token, fetchChores])

  const moveChoreOptimistic = useCallback(
    async (choreId: string, column: KanbanColumn) => {
      if (!token) return
      // Optimistic update
      setChores((prev) =>
        prev.map((c) =>
          c.id === choreId
            ? {
                ...c,
                kanban_column: column,
                status: column === "done" ? "completed" : "active",
              }
            : c
        )
      )

      try {
        await moveChore(token, choreId, column)
      } catch {
        // Revert on failure
        fetchChores({ force: true })
      }
    },
    [token, fetchChores]
  )

  const choresByColumn = useCallback(
    (column: KanbanColumn) => chores.filter((c) => c.kanban_column === column),
    [chores]
  )

  return {
    chores,
    loading,
    error,
    refetch: () => fetchChores({ force: true }),
    moveChoreOptimistic,
    choresByColumn,
    setChores,
  }
}

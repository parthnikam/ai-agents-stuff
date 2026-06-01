"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { getHistory, getHistoryStats } from "@/lib/api"
import { CompletionFeed } from "@/components/CompletionFeed"
import { StatsChart } from "@/components/StatsChart"
import type { ChoreCompletion } from "@/lib/types"
import type { HistoryStats } from "@/lib/api"
import { getOrgUsers } from "@/lib/api"

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || "http://localhost:8090"

type Range = "daily" | "weekly" | "monthly"

export default function HistoryPage() {
  const { token, org } = useAuth()
  const [range, setRange] = useState<Range>("weekly")
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [orgUsers, setOrgUsers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !org) return
    getOrgUsers(PB_URL, token, org.id).then(setOrgUsers).catch(() => {})
  }, [token, org])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([getHistory(token, range), getHistoryStats(token)])
      .then(([feed, s]) => {
        setCompletions(feed)
        setStats(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, range])

  const RANGES: { value: Range; label: string }[] = [
    { value: "daily", label: "Today" },
    { value: "weekly", label: "This week" },
    { value: "monthly", label: "This month" },
  ]

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-5 border-b border-gray-200 bg-white flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">History</h1>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                range === value
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stats chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              {stats ? (
                <StatsChart stats={stats} orgUsers={orgUsers} />
              ) : (
                <p className="text-sm text-gray-400">No stats available.</p>
              )}
            </div>

            {/* Completion feed */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Completion feed
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {completions.length} {completions.length === 1 ? "entry" : "entries"}
                </span>
              </h3>
              <CompletionFeed completions={completions} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

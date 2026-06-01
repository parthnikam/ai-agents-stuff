"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import type { HistoryStats } from "@/lib/api"

interface Props {
  stats: HistoryStats
  orgUsers: { id: string; name: string }[]
}

export function StatsChart({ stats, orgUsers }: Props) {
  // By-day bar chart data
  const dayData = Object.entries(stats.by_day)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      Completions: count,
    }))

  // Leaderboard
  const leaderboard = Object.entries(stats.by_user)
    .map(([userId, count]) => ({
      name: orgUsers.find((u) => u.id === userId)?.name ?? userId,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-8">
      {/* Bar chart */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Completions this month</h3>
        {dayData.length === 0 ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="Completions" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-400">No completions yet.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map(({ name, count }, i) => (
              <div key={name} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : i === 1
                      ? "bg-gray-100 text-gray-600"
                      : i === 2
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-50 text-gray-400"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-gray-700 font-medium">{name}</span>
                <span className="text-sm text-gray-500">
                  {count} {count === 1 ? "chore" : "chores"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

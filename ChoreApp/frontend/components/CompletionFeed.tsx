"use client"

import type { ChoreCompletion } from "@/lib/types"

interface Props {
  completions: ChoreCompletion[]
}

export function CompletionFeed({ completions }: Props) {
  if (completions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p className="text-sm">No completions in this period.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {completions.map((c) => {
        const choreName = c.expand?.chore?.title ?? c.chore
        const userName = c.expand?.completed_by?.name ?? c.completed_by
        const when = new Date(c.completed_at)
        return (
          <div
            key={c.id}
            className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{choreName}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Completed by <span className="font-medium">{userName}</span>
              </p>
              {c.notes && (
                <p className="text-xs text-gray-400 mt-1 italic">"{c.notes}"</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">
                {when.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
              <p className="text-xs text-gray-300">
                {when.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

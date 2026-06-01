"use client"

import { useState } from "react"
import type { User } from "@/lib/types"

interface Props {
  users: User[]
  selected: string[]
  onChange: (ids: string[]) => void
}

export function UserMultiSelect({ users, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const selectedUsers = users.filter((u) => selected.includes(u.id))

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-h-[38px]"
      >
        {selectedUsers.length === 0 ? (
          <span className="text-gray-400">Select assignees…</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {u.name}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(u.id) }}
                  className="hover:text-indigo-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 ml-auto flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-auto">
          {users.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">No members found</p>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                {selected.includes(u.id) && (
                  <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Click outside to close */}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}

"use client"

import { IMPORTANCE_CONFIG } from "@/lib/constants"

interface Props {
  value: number
  onChange: (v: number) => void
}

export function ImportanceSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const cfg = IMPORTANCE_CONFIG[n]
        const active = n <= value
        return (
          <button
            key={n}
            type="button"
            title={cfg.label}
            onClick={() => onChange(n)}
            className={`text-lg leading-none transition-transform hover:scale-110 ${
              active ? cfg.color : "text-gray-300"
            }`}
          >
            ★
          </button>
        )
      })}
      <span className="ml-2 text-sm text-gray-500 self-center">
        {IMPORTANCE_CONFIG[value]?.label}
      </span>
    </div>
  )
}

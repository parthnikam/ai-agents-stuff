"use client"

import { useState } from "react"
import { parseChoreAI } from "@/lib/api"
import type { AIParseResponse } from "@/lib/types"

interface Props {
  token: string
  onParsed: (result: AIParseResponse) => void
}

export function AIParseInput({ token, onParsed }: Props) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleParse() {
    if (!prompt.trim()) return
    setError("")
    setLoading(true)
    try {
      const result = await parseChoreAI(token, prompt)
      onParsed(result)
      setPrompt("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI parse failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xs font-semibold text-indigo-700">AI Quick-Add</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
          placeholder='e.g. "Clean bathroom every week, high priority"'
          className="flex-1 border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={handleParse}
          disabled={loading || !prompt.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Parse"
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

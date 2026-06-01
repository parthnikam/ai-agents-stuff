"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/ThemeContext"

export function ThemeToggle() {
  const { theme, toggleTheme, isHydrated } = useTheme()

  if (!isHydrated) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full" disabled aria-label="Toggle theme">
        <span className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = theme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-muted-foreground"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"
          />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 1 1 8.646 3.646 7 7 0 0 0 20.354 15.354z"
          />
        </svg>
      )}
    </Button>
  )
}

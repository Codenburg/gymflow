"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
}

export function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full cursor-pointer p-5 text-left hover:bg-[var(--background)] transition-colors"
      >
        <span className="text-lg font-semibold text-[var(--foreground)]">
          {title}
        </span>
        <ChevronDown
          className="w-5 h-5 text-[var(--muted-foreground)] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        className={`px-5 transition-all duration-300 ease-in-out overflow-hidden ${
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pb-5">{children}</div>
      </div>
    </div>
  )
}

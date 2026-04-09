"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  maxTagLength?: number
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

function TagInput({
  value,
  onChange,
  placeholder = "Add a tag...",
  maxTags = 10,
  maxTagLength = 50,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    const trimmedInput = inputValue.trim()

    if (e.key === "Enter" || (e.key === " " && !e.shiftKey)) {
      e.preventDefault()
      if (trimmedInput) {
        addTag(trimmedInput)
      }
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      e.preventDefault()
      removeTag(value.length - 1)
    }
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return
    
    if (trimmedTag.length > maxTagLength) {
      setError(`El tag no puede exceder ${maxTagLength} caracteres`)
      setTimeout(() => setError(null), 2000)
      return
    }
    
    if (value.length >= maxTags) {
      setError(`Máximo ${maxTags} tags permitidos`)
      setTimeout(() => setError(null), 2000)
      return
    }

    const isDuplicate = value.some(
      (existingTag) => existingTag.toLowerCase() === trimmedTag.toLowerCase()
    )
    if (isDuplicate) return

    onChange([...value, trimmedTag])
    setInputValue("")
  }

  const removeTag = (index: number) => {
    if (disabled) return
    const newTags = value.filter((_, i) => i !== index)
    onChange(newTags)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return

    e.preventDefault()
    const pastedText = e.clipboardData.getData("text")
    const tags = pastedText.split(",").map((tag) => tag.trim()).filter(Boolean)

    const validTags: string[] = []
    for (const tag of tags) {
      if (tag.length > maxTagLength) continue
      if (value.length + validTags.length >= maxTags) break

      const isDuplicate = [...value, ...validTags].some(
        (existingTag) => existingTag.toLowerCase() === tag.toLowerCase()
      )
      if (isDuplicate) continue

      validTags.push(tag)
    }

    if (validTags.length > 0) {
      onChange([...value, ...validTags])
    }
    setInputValue("")
  }

  return (
    <div
      role="listbox"
      aria-label={ariaLabel || "Tag input"}
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
    >
      {value.map((tag, index) => (
        <div
          key={`${tag}-${index}`}
          role="option"
          aria-label={`Remove ${tag}`}
          className="inline-flex h-5 items-center gap-1 overflow-hidden rounded-4xl border border-transparent bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          <span className="truncate">{tag}</span>
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => removeTag(index)}
            disabled={disabled}
            className="flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary/60 hover:bg-primary/20 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-16 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
      {error && (
        <p className="text-destructive text-xs mt-1 px-1">{error}</p>
      )}
    </div>
  )
}

export { TagInput }
export type { TagInputProps }

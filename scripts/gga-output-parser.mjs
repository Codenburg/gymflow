#!/usr/bin/env node
// gga-output-parser.mjs
// Tolerant parser for `gga run` stdout. GGA's prompt template
// (`~/.local/bin/gga:1116-1177`) tells the AI to "list each violation with:
// File name, Line number, Rule violated, Description" but does NOT enforce a
// strict format. Different providers phrase findings differently:
//
//   src/app/actions/feriados.ts:42 - description
//   **File**: src/lib/x.ts
//   **Line**: 42
//   **Description**: description
//   - src/lib/x.ts:42 - description
//   src/lib/x.ts line 42: description
//
// We try five regexes in priority order per line, disambiguate against the
// staged-file set, and fall back to "non-localizable" (file-level) findings
// that survive the wrapper's diff filter. Severity is inferred from message
// keywords so the wrapper can print `ERROR:` / `WARN:` / `INFO:` labels.
//
// Pure module — no I/O, no subprocess calls — so Vitest can import it
// directly without side effects.

// @typedef {{
//   file: string,
//   line: number | null,    // null = file-level finding
//   severity: 'error' | 'warning' | 'info',
//   message: string,
//   rule?: string
// }} Finding

/**
 * @param {string} stdout — full stdout from `gga run`
 * @param {Set<string>} knownFiles — set of staged file paths (repo-relative)
 * @returns {Finding[]}
 */
export function parseGgaOutput(stdout, knownFiles) {
  const findings = []
  if (!stdout) return findings

  const lines = stdout.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed === '') continue
    // STATUS: line is the verdict header, not a finding.
    if (/^STATUS\s*:/i.test(trimmed)) continue

    const multilineMatch = tryMultiline(lines, i)
    if (multilineMatch) {
      findings.push(toFinding(multilineMatch.file, multilineMatch.line, multilineMatch.msg, multilineMatch.rule, knownFiles))
      i += multilineMatch.linesConsumed - 1
      continue
    }

    const single = trySingleLine(trimmed)
    if (single) {
      findings.push(toFinding(single.file, single.line, single.msg, single.rule, knownFiles))
      continue
    }

    // Fallback: the whole line is treated as a non-localizable file-level
    // message. The first whitespace-delimited token (or the whole line if
    // there is none) becomes the synthetic file basename so the wrapper
    // can still report it as `file: message`.
    const firstToken = trimmed.split(/\s+/, 1)[0] || trimmed
    const syntheticFile = firstToken.replace(/[,:;]+$/, '')
    findings.push(toFinding(syntheticFile, null, trimmed, undefined, knownFiles, /*forceNonLocalizable*/ true))
  }
  return findings
}

/**
 * @param {string} line — already-trimmed single line
 */
function trySingleLine(line) {
  // Pattern 1: "path/to/file.ts:42 - description"  (also matches "42:5 col" and
  // "42 - description" by collapsing the optional colon+col and any of
  // " - ", ": ", " — " separators)
  let m = line.match(/^(?<file>\S+\.\w+):(?<line>\d+)(?::\d+)?\s*[:\-—]\s+(?<msg>.+)$/)
  if (m) return { file: m.groups.file, line: Number(m.groups.line), msg: m.groups.msg, rule: undefined }

  // Pattern 3: "- path/to/file.ts:42 — description" or "* path/to/file.ts:42 - description"
  m = line.match(/^[-*]\s+(?<file>\S+\.\w+):(?<line>\d+)\s+[-—]\s+(?<msg>.+)$/)
  if (m) return { file: m.groups.file, line: Number(m.groups.line), msg: m.groups.msg, rule: undefined }

  // Pattern 4: "path/to/file.ts line 42: description" / "path/to/file.ts line 42 - description"
  m = line.match(/^(?<file>\S+\.\w+)\s+line\s+(?<line>\d+)\s*[:\-—]\s+(?<msg>.+)$/)
  if (m) return { file: m.groups.file, line: Number(m.groups.line), msg: m.groups.msg, rule: undefined }

  // Pattern 5: file-level (no line) "path/to/file.ts - description"
  m = line.match(/^(?<file>\S+\.\w+)\s*[:|-]\s*(?<msg>.+)$/)
  if (m) return { file: m.groups.file, line: null, msg: m.groups.msg, rule: undefined }

  return null
}

/**
 * Multiline pattern 2: "**File**: path\n**Line**: N\n**Description**: msg"
 * (optional **Rule**: between Line and Description)
 * @param {string[]} lines — all stdout lines
 * @param {number} start — index of the candidate first line
 */
function tryMultiline(lines, start) {
  const fileLine = lines[start]?.trim() ?? ''
  const fileMatch = fileLine.match(/^\*\*File\*\*\s*:\s*(.+?)\s*$/i)
  if (!fileMatch) return null

  // Need at least two more lines (Line + Description) in the immediate window.
  if (start + 2 >= lines.length) return null
  const lineLine = lines[start + 1].trim()
  const lineMatch = lineLine.match(/^\*\*Line\*\*\s*:\s*(\d+)\s*$/i)
  if (!lineMatch) return null

  // Optional Rule on line start+2; if present, Description shifts to start+3.
  let descIdx = start + 2
  let rule = undefined
  const maybeRule = lines[descIdx]?.trim() ?? ''
  const ruleMatch = maybeRule.match(/^\*\*Rule\*\*\s*:\s*(.+?)\s*$/i)
  if (ruleMatch) {
    rule = ruleMatch[1]
    descIdx += 1
  }
  if (descIdx >= lines.length) return null
  const descLine = lines[descIdx].trim()
  const descMatch = descLine.match(/^\*\*Description\*\*\s*:\s*(.+?)\s*$/i)
  if (!descMatch) return null

  const linesConsumed = descIdx - start + 1
  return {
    file: fileMatch[1].trim(),
    line: Number(lineMatch[1]),
    msg: descMatch[1],
    rule,
    linesConsumed,
  }
}

/**
 * @param {string} file
 * @param {number | null} line
 * @param {string} msg
 * @param {string | undefined} rule
 * @param {Set<string>} knownFiles
 * @param {boolean} [forceNonLocalizable] — when true, treat as file-level even
 *                                         if `file` happens to be in knownFiles
 *                                         (used by the fallback path).
 */
function toFinding(file, line, msg, rule, knownFiles, forceNonLocalizable = false) {
  let resolvedFile = file
  let resolvedLine = line
  if (forceNonLocalizable) {
    resolvedLine = null
    resolvedFile = basename(file)
  } else if (line !== null && !knownFiles.has(file)) {
    // Regex matched but the path is not in the staged set — disambiguate
    // to a file-level finding so GGA's verdict still stands.
    resolvedLine = null
    resolvedFile = basename(file)
  }
  return {
    file: resolvedFile,
    line: resolvedLine,
    severity: inferSeverity(msg),
    message: msg,
    rule,
  }
}

function basename(path) {
  const i = path.lastIndexOf('/')
  return i === -1 ? path : path.slice(i + 1)
}

function inferSeverity(message) {
  const m = String(message).toLowerCase()
  if (/\b(error|critical|fail(ing|ed|ure)?|fatal)\b/.test(m)) return 'error'
  if (/\bwarn(ing)?\b/.test(m)) return 'warning'
  return 'info'
}

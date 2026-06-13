#!/usr/bin/env node
// gga-ignore-helper.mjs
// Pure parser for the .gga-ignore file format used by the GGA pre-commit
// wrapper. No I/O, no subprocess calls — kept side-effect free so it can be
// unit-tested with Vitest and reused by both the wrapper and the install
// scripts.
//
// Syntax (one entry per line):
//   # comment                       → ignored
//   <blank>                         → ignored
//   path/to/file.ts                 → match the whole file
//   path/to/file.ts:42              → match a single 1-indexed line
//   path/to/file.ts:42-50           → match an inclusive line range
//   glob/with/**/*.ts               → match using `*` (single segment) and
//                                      `**` (any path). `?` and `[abc]` are
//                                      not supported.
//
// `parseGgaIgnore` throws on syntax errors, including the 1-indexed line
// number of the offending line, so the wrapper can fail CLOSED with a
// message that points at the exact problem in the .gga-ignore file.

// @typedef {{ fileGlob: string, line: number | null, range: [number, number] | null }} IgnoreEntry
// @typedef {{ entries: IgnoreEntry[], raw: string }} IgnoreSet

/**
 * @param {string} text — raw .gga-ignore file content
 * @returns {IgnoreSet}
 */
export function parseGgaIgnore(text) {
  const entries = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const lineNo = i + 1
    const trimmed = raw.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    // No colon → whole-file match.
    if (colonIdx === -1) {
      assertGlob(trimmed, lineNo)
      entries.push({ fileGlob: trimmed, line: null, range: null })
      continue
    }

    const fileGlob = trimmed.slice(0, colonIdx)
    const spec = trimmed.slice(colonIdx + 1)
    if (fileGlob === '') {
      throw new Error(`.gga-ignore:${lineNo}: missing file glob before ':' (got '${raw}')`)
    }
    assertGlob(fileGlob, lineNo)

    if (spec === '') {
      throw new Error(`.gga-ignore:${lineNo}: missing line number after ':' (got '${raw}')`)
    }

    const dashIdx = spec.indexOf('-')
    if (dashIdx === -1) {
      const n = parseInt(spec, 10)
      if (!Number.isInteger(n) || n < 1 || String(n) !== spec) {
        throw new Error(`.gga-ignore:${lineNo}: invalid line number '${spec}' (must be a positive integer)`)
      }
      entries.push({ fileGlob, line: n, range: null })
      continue
    }

    const startStr = spec.slice(0, dashIdx)
    const endStr = spec.slice(dashIdx + 1)
    if (endStr === '') {
      throw new Error(`.gga-ignore:${lineNo}: malformed range '${spec}' (empty end; use 'N-M' not 'N-')`)
    }
    const start = parseInt(startStr, 10)
    const end = parseInt(endStr, 10)
    if (!Number.isInteger(start) || start < 1 || String(start) !== startStr) {
      throw new Error(`.gga-ignore:${lineNo}: invalid range start '${startStr}' (must be a positive integer)`)
    }
    if (!Number.isInteger(end) || end < 1 || String(end) !== endStr) {
      throw new Error(`.gga-ignore:${lineNo}: invalid range end '${endStr}' (must be a positive integer)`)
    }
    if (end < start) {
      throw new Error(`.gga-ignore:${lineNo}: inverted range '${spec}' (end < start)`)
    }
    entries.push({ fileGlob, line: null, range: [start, end] })
  }
  return { entries, raw: text }
}

/**
 * @param {string} glob
 * @param {number} lineNo
 */
function assertGlob(glob, lineNo) {
  if (glob.includes('?') || glob.includes('[') || glob.includes(']')) {
    throw new Error(
      `.gga-ignore:${lineNo}: unsupported glob char in '${glob}' (only '*' and '**' are supported)`,
    )
  }
}

/**
 * Convert a glob to a RegExp anchored at both ends.
 * `*` matches a single path segment (no '/'); `**` matches any path.
 * All other characters are treated literally.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegex(glob) {
  let pattern = ''
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        pattern += '.*'
        i++ // consume the second '*'
      } else {
        pattern += '[^/]*'
      }
    } else {
      // Escape regex specials.
      pattern += ch.replace(/[.+^${}()|\\]/g, '\\$&')
    }
  }
  return new RegExp('^' + pattern + '$')
}

/**
 * @param {IgnoreSet} set
 * @param {string} file — repo-relative path
 * @param {number} line — 1-indexed (use -1 for file-level findings)
 * @returns {boolean}
 */
export function isIgnored(set, file, line) {
  for (const entry of set.entries) {
    const re = globToRegex(entry.fileGlob)
    if (!re.test(file)) continue
    if (entry.line === null && entry.range === null) return true // whole-file
    if (line < 1) continue // file-level finding can never match a line-scoped entry
    if (entry.line !== null && entry.line === line) return true
    if (entry.range !== null && line >= entry.range[0] && line <= entry.range[1]) return true
  }
  return false
}

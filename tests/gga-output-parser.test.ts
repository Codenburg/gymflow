/**
 * Unit tests for the GGA stdout parser. The parser is the only part of the
 * wrapper that can fail (GGA's prompt is not strictly formatted), so we
 * exercise the full regex matrix and the fallback path here.
 *
 * Coverage (≥ 5 cases per T5 in openspec/changes/gga-hook-diff-only/tasks.md):
 *   1. STATUS: PASSED line is recognized and ignored
 *   2. Pattern 1: "path:N - msg"  (single line, single colon)
 *   3. Pattern 2: multiline **File** / **Line** / **Description**  (+ optional **Rule**)
 *   4. Pattern 3: markdown list "- path:N - msg"
 *   5. Pattern 4: "path line N: msg"
 *   6. Pattern 5: file-level "path: msg" (no line number)
 *   7. STATUS: FAILED fallback — non-conforming line becomes a non-localizable finding
 *   8. File not in knownFiles → line=null, file=basename, severity preserved
 *   9. Severity inference: error / critical / fail / fatal → 'error',
 *                                    warn / warning → 'warning',
 *                                    default → 'info'
 *  10. Empty stdout → empty findings list
 */

import { describe, it, expect } from 'vitest'
import { parseGgaOutput } from '../scripts/gga-output-parser.mjs'

const KNOWN = new Set([
  'src/app/actions/feriados.ts',
  'src/lib/rutinas.ts',
  'src/app/actions/promociones.ts',
])

describe('parseGgaOutput', () => {
  it('ignores the STATUS: PASSED header line', () => {
    const out = 'STATUS: PASSED\n'
    expect(parseGgaOutput(out, KNOWN)).toEqual([])
  })

  it('parses pattern 1 — "path:line - description"', () => {
    const out = [
      'STATUS: FAILED',
      'src/app/actions/feriados.ts:150 - error: missing null guard on formData.get',
    ].join('\n')
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings).toEqual([
      {
        file: 'src/app/actions/feriados.ts',
        line: 150,
        severity: 'error',
        message: 'error: missing null guard on formData.get',
        rule: undefined,
      },
    ])
  })

  it('parses pattern 2 — multiline **File** / **Line** / **Description** (with **Rule**)', () => {
    const out = [
      'STATUS: FAILED',
      '**File**: src/lib/rutinas.ts',
      '**Line**: 42',
      '**Rule**: no-unused-vars',
      '**Description**: variable "x" is declared but never read',
    ].join('\n')
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toEqual({
      file: 'src/lib/rutinas.ts',
      line: 42,
      severity: 'info', // "declared but never read" has no error/warn keyword
      message: 'variable "x" is declared but never read',
      rule: 'no-unused-vars',
    })
  })

  it('parses pattern 2 without the optional **Rule** line', () => {
    const out = [
      '**File**: src/lib/rutinas.ts',
      '**Line**: 7',
      '**Description**: warn: magic number 42',
    ].join('\n')
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      file: 'src/lib/rutinas.ts',
      line: 7,
      severity: 'warning',
      message: 'warn: magic number 42',
    })
    expect(findings[0].rule).toBeUndefined()
  })

  it('parses pattern 3 — markdown list "- path:line — msg"', () => {
    const out = '- src/app/actions/promociones.ts:105 — error: hard-coded gym id'
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings).toEqual([
      {
        file: 'src/app/actions/promociones.ts',
        line: 105,
        severity: 'error',
        message: 'error: hard-coded gym id',
        rule: undefined,
      },
    ])
  })

  it('parses pattern 4 — "path line N: msg"', () => {
    const out = 'src/lib/rutinas.ts line 88: description here'
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings).toEqual([
      {
        file: 'src/lib/rutinas.ts',
        line: 88,
        severity: 'info',
        message: 'description here',
        rule: undefined,
      },
    ])
  })

  it('parses pattern 5 — file-level "path: msg" (no line)', () => {
    const out = 'src/lib/rutinas.ts: overall structure could be improved'
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings).toEqual([
      {
        file: 'src/lib/rutinas.ts',
        line: null,
        severity: 'info',
        message: 'overall structure could be improved',
        rule: undefined,
      },
    ])
  })

  it('falls back to a non-localizable file-level finding on a non-conforming line', () => {
    const out = 'This is unstructured prose that no regex can parse.'
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings).toHaveLength(1)
    const f = findings[0]
    expect(f.line).toBeNull()
    expect(f.severity).toBe('info')
    expect(f.message).toBe(out)
    // Synthetic file is the first whitespace-delimited token.
    expect(f.file).toBe('This')
  })

  it('normalizes a regex-matched file that is NOT in knownFiles to basename + line=null', () => {
    const out = 'src/other/untracked.ts:42 - error: critical type mismatch'
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings).toHaveLength(1)
    const f = findings[0]
    expect(f.line).toBeNull()
    expect(f.file).toBe('untracked.ts')
    expect(f.severity).toBe('error')
    expect(f.message).toBe('error: critical type mismatch')
  })

  it('preserves a regex-matched file that IS in knownFiles (line kept)', () => {
    const out = 'src/app/actions/feriados.ts:150 - error: null guard missing'
    const findings = parseGgaOutput(out, KNOWN)
    expect(findings[0]).toMatchObject({
      file: 'src/app/actions/feriados.ts',
      line: 150,
      severity: 'error',
    })
  })

  describe('severity inference', () => {
    const cases = [
      ['plain info', 'this is just a comment', 'info'],
      ['warning keyword', 'warning: refactor suggestion', 'warning'],
      ['warn keyword', 'warn: refactor suggestion', 'warning'],
      ['error keyword', 'error: missing null check', 'error'],
      ['failed keyword', 'failed: type assertion', 'error'],
      ['fatal keyword', 'fatal: unhandled exception', 'error'],
      ['critical keyword', 'critical: security hole', 'error'],
    ]
    for (const [label, msg, expected] of cases) {
      it(`infers '${expected}' from ${label}`, () => {
        const out = `src/app/actions/feriados.ts:1 - ${msg}`
        const findings = parseGgaOutput(out, KNOWN)
        expect(findings[0].severity).toBe(expected)
      })
    }
  })

  it('returns an empty list for empty stdout', () => {
    expect(parseGgaOutput('', KNOWN)).toEqual([])
  })

  it('handles a real-looking FAILED corpus with mixed patterns', () => {
    const out = [
      'STATUS: FAILED',
      '',
      'src/app/actions/feriados.ts:150 - error: null guard missing',
      '- src/lib/rutinas.ts:88 - warning: unused import',
      '**File**: src/app/actions/promociones.ts',
      '**Line**: 105',
      '**Description**: hard-coded gym id',
      '   ', // blank line — ignored
      'Unstructured prose the AI added as a summary.',
    ].join('\n')
    const findings = parseGgaOutput(out, KNOWN)
    // Expect 4 findings: 3 regex-matched (all in knownFiles) + 1 fallback
    // for the unstructured summary line.
    expect(findings).toHaveLength(4)
    expect(findings[0]).toMatchObject({ file: 'src/app/actions/feriados.ts', line: 150, severity: 'error' })
    expect(findings[1]).toMatchObject({ file: 'src/lib/rutinas.ts', line: 88, severity: 'warning' })
    expect(findings[2]).toMatchObject({ file: 'src/app/actions/promociones.ts', line: 105, severity: 'info' })
    // findings[3] is the fallback for the unstructured summary line — the
    // first token "Unstructured" becomes the synthetic file basename.
    expect(findings[3]).toMatchObject({ line: null, severity: 'info' })
    expect(findings[3].file).toBe('Unstructured')
  })
})

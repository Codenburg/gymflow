/**
 * Guard test — `tests/unit/cache-prisma-guard.test.ts`
 *
 * Regression net for the v0.19.0 regression: any cached reader in
 * `src/` that imports the singleton `prisma` MUST NOT use the
 * `"use cache"` directive. The directive serializes the captured
 * closure; `prisma` wraps a `pg.Pool` and is NOT JSON-serializable.
 *
 * Why this guard exists:
 * - The bug only surfaces at request time when Next.js serializes the
 *   closure, so a unit test on a reader would not exercise the failure.
 *   A grep over the tree is a cheap, deterministic regression net that
 *   trips the moment a new reader picks the wrong cache API.
 *
 * Phase 1 status: RED. 7 files in `src/` currently match both
 * conditions (services/routines/pagination.ts, lib/rutinas.ts,
 * lib/promociones.ts, lib/gym-price.ts, lib/feriados.ts,
 * lib/descuentos.ts, app/actions/gym.ts). The guard goes GREEN after
 * Phases 2-4 (PR 2) migrate those 11 readers to `unstable_cache`.
 *
 * Spec coverage:
 *   - specs/next-cache-with-prisma/spec.md
 *     "Vitest Grep Guard Against use cache"
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC_ROOT = join(process.cwd(), "src");

/**
 * Recursively walk a directory and return the absolute paths of every
 * regular file. Skips `node_modules`, `.next`, and hidden directories
 * to keep the scan tight.
 */
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, acc);
    } else if (stat.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

const USE_CACHE_PATTERN = /"use cache"/;
const PRISMA_IMPORT_PATTERN = /from\s+["']@\/lib\/prisma["']/;

describe("cache-prisma-guard — no file may combine 'use cache' with @/lib/prisma", () => {
  const allSrcFiles = walk(SRC_ROOT).filter((f) =>
    f.endsWith(".ts") || f.endsWith(".tsx")
  );

  it("finds at least one .ts/.tsx file under src/ (sanity)", () => {
    // If this fails the test setup itself is broken (wrong CWD, etc.)
    expect(allSrcFiles.length).toBeGreaterThan(0);
  });

  it("reports no offenders (zero files combine 'use cache' with prisma import)", () => {
    const offenders = allSrcFiles
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return USE_CACHE_PATTERN.test(source) && PRISMA_IMPORT_PATTERN.test(source);
      })
      .map((file) => relative(process.cwd(), file).split(sep).join("/"));

    if (offenders.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        "\n[cache-prisma-guard] Offending files (must migrate to unstable_cache):\n  " +
          offenders.join("\n  ") +
          "\n"
      );
    }

    expect(offenders).toEqual([]);
  });
});

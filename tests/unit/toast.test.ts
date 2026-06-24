/**
 * Unit tests for `showUndoableToast` from `src/lib/toast.ts`.
 *
 * Strict TDD — Phase B RED. These tests are written BEFORE the
 * implementation module exists. Each test references production code
 * (`showUndoableToast`) that is NOT yet exported, so the test file
 * fails to load until T-004 (GREEN) creates the module.
 *
 * Contract (from design #289 §5 + tasks #290 T-004):
 *   - Renders a sonner toast with `unstyled: true`, an "Deshacer"
 *     action button, and a `description` slot used for the progress
 *     bar element.
 *   - Default `duration` is 5000ms.
 *   - Clicking "Deshacer" calls `sonnerToast.dismiss(id)` AND
 *     `onUndo()`; `onAutoDismiss` is NOT called.
 *   - On auto-dismiss (5s expiry or manual close, NOT undo), the
 *     `onAutoDismiss` callback fires exactly once.
 *   - Returns the toast id (string | number) for external dismissal.
 *
 * Mocking strategy: `vi.mock("sonner")` replaces the toast singleton
 * with `vi.fn()` stubs. The wrapper's `sonnerToast.dismiss(id)` call
 * inside `action.onClick` is what makes the `wasUndone` flag flip work
 * (per design D13) — this test captures the contract.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Mock sonner — declared BEFORE importing the wrapper
// ============================================================

const mockSuccess = vi.fn();
const mockDismiss = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockSuccess(...args),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: (...args: unknown[]) => mockDismiss(...args),
  },
}));

// ============================================================
// Import AFTER mocks
// ============================================================

// `showUndoableToast` does not exist yet — this import WILL fail
// at module-load time during T-003 (RED). T-004 (GREEN) creates
// the module.
import { showUndoableToast } from "@/lib/toast";

// ============================================================
// Tests
// ============================================================

describe("showUndoableToast — API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation: returns a stable id.
    mockSuccess.mockReturnValue("toast-1");
    mockDismiss.mockReturnValue(undefined);
  });

  it("renders toast with unstyled:true + Deshacer action + 5000ms duration", () => {
    const onUndo = vi.fn();
    showUndoableToast({ message: "Dirección eliminada", onUndo });

    expect(mockSuccess).toHaveBeenCalledTimes(1);
    const [message, opts] = mockSuccess.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(message).toBe("Dirección eliminada");
    expect(opts.unstyled).toBe(true);
    expect(opts.duration).toBe(5000);

    // The action label is "Deshacer" (Spanish, matches the rest of the app)
    const action = opts.action as { label: string; onClick: () => void };
    expect(action.label).toBe("Deshacer");
    expect(typeof action.onClick).toBe("function");
  });

  it("returns the toast id (string | number) for external dismissal", () => {
    mockSuccess.mockReturnValue(42);
    const id = showUndoableToast({ message: "test", onUndo: vi.fn() });
    expect(id).toBe(42);
  });

  it("clicking 'Deshacer' dismisses the toast AND fires onUndo (NOT onAutoDismiss)", () => {
    const onUndo = vi.fn();
    const onAutoDismiss = vi.fn();

    showUndoableToast({
      message: "Instagram eliminado",
      onUndo,
      onAutoDismiss,
    });

    const opts = mockSuccess.mock.calls[0][1] as Record<string, unknown>;
    const action = opts.action as { onClick: () => void };

    // Simulate user clicking Deshacer.
    action.onClick();

    expect(mockDismiss).toHaveBeenCalledWith("toast-1");
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onAutoDismiss).not.toHaveBeenCalled();
  });

  it("fires onAutoDismiss exactly once when the toast auto-closes (5s expiry)", () => {
    const onUndo = vi.fn();
    const onAutoDismiss = vi.fn();

    showUndoableToast({
      message: "Mapa eliminado",
      onUndo,
      onAutoDismiss,
    });

    const opts = mockSuccess.mock.calls[0][1] as Record<string, unknown>;
    const onDismiss = opts.onDismiss as () => void;

    // Simulate sonner's auto-close path (5s timer expiry).
    onDismiss();

    expect(onAutoDismiss).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });
});
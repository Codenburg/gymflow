/**
 * Unit tests for `src/components/ui/error-state.tsx`
 *
 * Locks the regression net for the v0.19.0 `use cache` + Prisma RSC
 * cascade: the homepage error path renders `<ErrorState />` from a
 * Server Component, and the component renders a `<Button>` with
 * `onClick={() => window.location.reload()}`. As a Server Component,
 * React threw `Event handlers cannot be passed to Client Component
 * props`, cascading into `ErrorBoundary:homepage`.
 *
 * The production fix is the `"use client"` directive (Task 1.2).
 * Vitest/jsdom does NOT enforce the RSC boundary, so this test does
 * not directly assert the directive — it asserts the user-visible
 * contract that the runtime (after the directive is added) must
 * preserve:
 *
 *   1. The wrapper resolves via `[data-testid="error-state"]`.
 *   2. The "Reintentar" button is rendered and enabled.
 *   3. Clicking the button calls `window.location.reload()`.
 *
 * Spec coverage:
 *   - specs/components/spec.md "ErrorState Is a Client Component"
 *   - specs/next-cache-with-prisma/spec.md
 *     "ErrorState reintentar button is clickable"
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ErrorState } from "@/components/ui/error-state";

describe("ErrorState — user-visible contract", () => {
  beforeEach(() => {
    cleanup();
    // Reset the reload spy between tests so call counts do not leak.
    vi.restoreAllMocks();
  });

  it("renders the wrapper element with data-testid='error-state'", () => {
    render(<ErrorState message="Algo explotó" />);
    const wrapper = screen.getByTestId("error-state");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders the user-facing message inside the wrapper", () => {
    render(<ErrorState message="Sin conexión con la base de datos" />);
    const wrapper = screen.getByTestId("error-state");
    expect(wrapper).toHaveTextContent("Sin conexión con la base de datos");
  });

  it("renders the 'Reintentar' button", () => {
    render(<ErrorState message="Boom" />);
    const button = screen.getByRole("button", { name: /reintentar/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it("clicking 'Reintentar' calls window.location.reload()", () => {
    const reloadSpy = vi.fn();
    // jsdom's window.location is a special object — replace `reload` with a spy.
    const originalReload = window.location.reload;
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
      configurable: true,
    });

    try {
      render(<ErrorState message="Boom" />);
      const button = screen.getByRole("button", { name: /reintentar/i });
      fireEvent.click(button);
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    } finally {
      // Restore so other tests are not affected.
      Object.defineProperty(window, "location", {
        value: { ...window.location, reload: originalReload },
        writable: true,
        configurable: true,
      });
    }
  });
});

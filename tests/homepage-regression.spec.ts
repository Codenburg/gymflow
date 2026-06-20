import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * Homepage regression — `tests/homepage-regression.spec.ts`
 *
 * Regression net for the v0.19.0 cascade: the homepage crashed with
 * `PrismaClientKnownRequestError` (from `"use cache"` serializing the
 * `prisma` closure) and `Event handlers cannot be passed to Client
 * Component props` (from `ErrorState` rendering a `<Button onClick>` in
 * a Server Component), tripping the `ErrorBoundary:homepage` boundary.
 *
 * Phase 1 of the fix adds `"use client"` to `ErrorState`, which closes
 * the `Event handlers` half of the cascade. The `PrismaClientKnown…`
 * half stays open until Phases 2-4 (PR 2) migrate the 11 cached
 * readers from `"use cache"` to `unstable_cache`. This test is the
 * regression net for the full fix:
 *
 *   - RED on the current tree: the Prisma error appears in the
 *     homepage console (plus the event-handler error, pre-1.2).
 *   - GREEN after Phases 2-4: console is clean, the homepage renders
 *     the routine list, and the error path renders `ErrorState` with a
 *     working "Reintentar" button.
 *
 * Spec coverage:
 *   - specs/next-cache-with-prisma/spec.md "Playwright E2E Regression
 *     for Homepage Errors"
 *   - specs/components/spec.md "ErrorState reintentar button is clickable"
 *   - specs/components/spec.md "ErrorState does not throw Event handlers error"
 *   - specs/homepage/spec.md "Homepage renders without Prisma
 *     serialization errors"
 */

// ============================================
// Helpers
// ============================================

/**
 * Filters console messages that originate from the React DevTools hook
 * (it logs metadata that has nothing to do with our code) and returns
 * the messages we care about.
 */
function isRelevant(message: ConsoleMessage): boolean {
  const text = message.text();
  return (
    text.includes('PrismaClientKnownRequestError') ||
    text.includes('Event handlers cannot be passed to Client Component props') ||
    text.includes('ErrorBoundary:homepage')
  );
}

function collectRelevantMessages(messages: ConsoleMessage[]): string[] {
  return messages.filter(isRelevant).map((m) => m.text());
}

// ============================================
// Tests
// ============================================

test.describe('Homepage regression — cache + Prisma cascade', () => {
  test('homepage loads with no Prisma or event-handler console errors', async ({ page }) => {
    const consoleMessages: ConsoleMessage[] = [];
    const pageErrors: Error[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(msg);
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Track the response status. The spec says the request MUST be 200.
    let responseStatus: number | null = null;
    page.on('response', (response) => {
      if (response.url() === page.url() || response.url().endsWith('/')) {
        responseStatus = response.status();
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for the routine list to actually render. The seed always
    // includes a "Full Body" routine (see prisma/seed.ts); if the
    // homepage crashed, the title is hidden behind the error boundary
    // and this wait times out, surfacing the cascade in the failure
    // message (the timing-out wait IS the assertion in the RED state).
    await expect(page.getByText('Full Body').first()).toBeVisible({ timeout: 15_000 });

    // 1. HTTP status MUST be 200 (a 500 from the error boundary would
    //    land here; an ErrorBoundary render is a 200 with the boundary
    //    markup, so we also assert the content below).
    expect(responseStatus, 'homepage response status').toBe(200);

    // 2. Browser console MUST NOT contain the two known regression
    //    error strings.
    const relevant = collectRelevantMessages(consoleMessages);
    expect(
      relevant.find((m) => m.includes('PrismaClientKnownRequestError')),
      'console must not contain PrismaClientKnownRequestError'
    ).toBeUndefined();
    expect(
      relevant.find((m) => m.includes('Event handlers cannot be passed to Client Component props')),
      'console must not contain event-handler build error'
    ).toBeUndefined();

    // 3. Page content MUST NOT include the error-boundary marker.
    const html = await page.content();
    expect(html, 'page must not render ErrorBoundary:homepage').not.toContain('ErrorBoundary:homepage');

    // Sanity: the page did not surface an unhandled JS exception either.
    const prismaFromPageError = pageErrors.find((e) =>
      e.message.includes('PrismaClientKnownRequestError')
    );
    expect(prismaFromPageError, 'no unhandled pageerror with Prisma error').toBeUndefined();
  });

  test('homepage handles a /api/rutinas 500 gracefully (no crash, no Event handlers error)', async ({
    page,
  }) => {
    // Best-effort regression net for the ErrorState path.
    //
    // Architectural reality: the homepage Server Component calls
    // `getRoutinesPaginated` directly (Prisma), NOT `/api/rutinas`.
    // So a 500 from `/api/rutinas` does NOT trigger the
    // `<ErrorState message={error} />` branch — the page still
    // renders normally from the Prisma-direct path. To exercise the
    // ErrorState "Reintentar" interaction contract end-to-end we
    // rely on the Vitest unit test (tests/unit/error-state.test.tsx,
    // Task 1.3); here we only assert the homepage does not throw an
    // unhandled error and does not regress the event-handler build
    // error (Task 1.2's "use client" fix).
    //
    // This mirrors the pattern from tests/homepage.spec.ts:4.15:
    // intercept the unrelated REST endpoint to simulate a downstream
    // outage and assert the page does not crash.
    await page.route(/api\/rutinas/, async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Database unavailable' },
      });
    });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // The page should still render the routine list (the Prisma-direct
    // path is unaffected by the /api/rutinas mock). If it did go
    // through ErrorState, that's ALSO acceptable — we just need the
    // page to render something the user can act on.
    await expect(page.getByText('Full Body').first()).toBeVisible({ timeout: 15_000 });

    // The event-handler build error MUST NOT appear in the console,
    // even when the API mock is in place.
    const eventHandlerErrors = consoleErrors.filter((m) =>
      m.includes('Event handlers cannot be passed to Client Component props')
    );
    expect(eventHandlerErrors, 'no event-handler build error after API 500').toEqual([]);

    // If the ErrorState did render, the "Reintentar" button must be
    // enabled (this validates the data-testid selector and the
    // post-"use client" button contract at the integration level).
    const errorState = page.locator('[data-testid="error-state"]');
    if ((await errorState.count()) > 0) {
      const retryButton = page.getByRole('button', { name: /reintentar/i });
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeEnabled();
    }
  });
});

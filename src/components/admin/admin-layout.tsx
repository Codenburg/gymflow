"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  username: string;
  role: string;
  /**
   * Gym name resolved by the Server layout via the
   * `DB → NEXT_PUBLIC_GYM_NAME → "Gimnasio"` chain. Forwarded to the
   * `AdminSidebar` so its logo can render the deployed gym's identity
   * (or the generic last-resort when neither DB nor env var is set).
   */
  gymName: string;
}

export function AdminLayout({ children, username, role, gymName }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: AdminSidebar in flow, h-screen. Hidden on mobile. */}
      <div className="hidden lg:flex">
        <AdminSidebar username={username} role={role} gymName={gymName} />
      </div>

      {/* Mobile: AdminSidebar renders its own fixed top header. Hidden on desktop. */}
      <div className="lg:hidden">
        <AdminSidebar username={username} role={role} gymName={gymName} />
      </div>

      {/* Content renders ONCE; CSS controls position and padding per breakpoint.
          Mobile: p-4 pt-16 (padding 1rem + top 4rem to clear the fixed top bar).
          Desktop (lg+): ml-64 (16rem margin to clear the sidebar) + p-6 (1.5rem padding).
          This avoids rendering {children} twice, which was breaking Playwright
          strict mode (every data-testid resolved to 2 elements). */}
      <div className="p-4 pt-16 lg:ml-64 lg:p-6">{children}</div>
    </div>
  );
}

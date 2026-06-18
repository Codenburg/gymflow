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
      {/* Mobile: AdminSidebar renders its own fixed top header */}
      <div className="lg:hidden">
        <AdminSidebar username={username} role={role} gymName={gymName} />
      </div>

      {/* Desktop: sidebar h-screen, content offset */}
      <div className="hidden lg:flex">
        <AdminSidebar username={username} role={role} gymName={gymName} />
        <div className="ml-64 flex-1 p-6">{children}</div>
      </div>

      {/* Mobile content */}
      <div className="lg:hidden p-4 pt-16">{children}</div>
    </div>
  );
}

import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Skeleton — a non-interactive placeholder block.
 *
 * Building block for page-shaped loading states. Pages compose multiple
 * `<Skeleton>` primitives with sizing utilities (e.g. `h-4 w-1/3`) to
 * build titles, lines, tiles, and rows.
 *
 * Renders a `<div>` with `bg-muted animate-pulse rounded` so it blends
 * with the design system (no hardcoded colors, no hardcoded animation).
 *
 * Non-interactive by design: no `role`, no `tabIndex`, no handlers —
 * screen readers and keyboard navigation skip it.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

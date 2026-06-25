'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * Shared toast card width. Sonner's default is 356px. Exported so
 * `TOAST_CLASSES.base` (the classNames for sonner-style toasts in
 * src/lib/toast.ts) and this custom-component toast agree on the
 * exact same width class — preventing the previous visual bug where
 * the custom undo toast rendered narrower than the save toasts.
 */
export const TOAST_WIDTH = 'w-[356px]';

type ToastWithProgressProps = {
  message: string;
  /** Total duration in ms. Sonner's toast.duration MUST match this value. */
  duration?: number;
  /** When provided, renders a "Deshacer" action button. */
  onUndo?: () => void;
  /** Called once when the progress bar reaches 100% naturally (NOT on undo). */
  onComplete?: () => void;
};

/**
 * Custom sonner toast rendered via `toast.custom()`. Owns its own
 * progress state via `requestAnimationFrame`, decoupled from CSS
 * keyframes — the previous CSS-based approaches (::before + width
 * animation, box-shadow inset, linear-gradient background) all failed
 * to render reliably given `unstyled: true` + Tailwind layer order +
 * sonner 2.0.7's DOM structure. JS-driven progress sidesteps all that.
 *
 * Pauses on hover (matches sonner's default pause-on-hover for the
 * dismiss timer) so the bar stays in sync with the toast's actual
 * remaining time.
 */
export function ToastWithProgress({
  message,
  duration = 5000,
  onUndo,
  onComplete,
}: ToastWithProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, isHovered, onComplete]);

  return (
    <div
      className={`${TOAST_WIDTH} min-h-[64px] flex items-center justify-center gap-2 px-4 py-3 pr-20 rounded-lg border shadow-lg !bg-success !text-success-foreground !border-success/20 relative overflow-hidden`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CheckCircle2 className="shrink-0 w-5 h-5" />
      <span className="leading-tight text-center text-sm font-semibold max-w-full">
        {message}
      </span>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="absolute top-2 right-2 text-sm font-medium hover:underline"
        >
          Deshacer
        </button>
      )}
      <div
        className="absolute bottom-0 left-0 h-[3px] bg-success-foreground"
        style={{ width: `${progress}%` }}
        data-testid="undo-toast-progress"
      />
    </div>
  );
}
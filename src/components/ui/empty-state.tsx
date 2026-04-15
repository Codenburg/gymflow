import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  className?: string;
}

export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
      data-testid="empty-state"
    >
      <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
      <p className="text-muted-foreground text-lg font-medium">
        No hay rutinas disponibles
      </p>
      <p className="text-muted-foreground text-sm mt-1">
        Crea tu primera rutina para comenzar
      </p>
    </div>
  );
}

"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message: string;
  className?: string;
}

export function ErrorState({ message, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
      data-testid="error-state"
    >
      <AlertCircle className="w-16 h-16 text-destructive mb-4" />
      <p className="text-foreground text-lg font-medium">Algo salió mal</p>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm">{message}</p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Reintentar
      </Button>
    </div>
  );
}

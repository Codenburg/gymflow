"use client";

import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedSearch } from "@/hooks/use-unified-search";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Trainer {
  nombre: string;
  count: number;
}

interface TrainerFilterDrawerProps {
  trainers: Trainer[];
}

export function TrainerFilterDrawer({ trainers }: TrainerFilterDrawerProps) {
  const { trainerFilters, toggleTrainerFilter, clearTrainerFilters } =
    useUnifiedSearch();

  if (!trainers || trainers.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Filter className="size-4" />
        <span>Filtrar</span>
        {trainerFilters.length > 0 && (
          <Badge
            variant="secondary"
            className="ml-1 size-5 rounded-full p-0 text-xs"
          >
            {trainerFilters.length}
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="min-h-[40vh]">
        <SheetHeader>
          <SheetTitle>Filtrar por Entrenador</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-full mt-4">
          <div className="flex flex-col gap-2 p-1 w-full md:flex-row md:flex-wrap">
            {/* Todos option */}
            <Button
              variant={trainerFilters.length === 0 ? "default" : "secondary"}
              onClick={clearTrainerFilters}
              className="gap-2 rounded-full text-base w-full md:w-auto"
            >
              <span className="font-medium">Todos</span>
              <span className="text-xs opacity-70">
                {trainers.reduce((acc, t) => acc + t.count, 0)}
              </span>
            </Button>

            {/* Trainer pills */}
            {trainers.map((trainer) => {
              const isSelected = trainerFilters.includes(trainer.nombre);
              return (
                <Button
                  key={trainer.nombre}
                  variant={isSelected ? "default" : "secondary"}
                  onClick={() => toggleTrainerFilter(trainer.nombre)}
                  className="gap-2 rounded-full text-base w-full md:w-auto"
                >
                  <span className="truncate">{trainer.nombre}</span>
                  <span className="text-xs opacity-70">{trainer.count}</span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

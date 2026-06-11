import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Ejercicio {
  id: string;
  nombre: string;
  series: string | null;
  repes: string | null;
}

interface Dia {
  id: string;
  orden: number;
  musculosEnfocados: string[] | null;
  ejercicios: Ejercicio[];
}

interface DayCardProps {
  dia: Dia;
  rutinaId: string;
}

export function DayCard({ dia, rutinaId }: DayCardProps) {
  return (
    <Link href={`/rutinas/${rutinaId}/dias/${dia.id}`} prefetch={true}>
      <Card className="group cursor-pointer transition-all duration-200 hover:border-red-500/50 hover:shadow-md hover:shadow-red-500/10">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base group-hover:text-red-400 transition-colors text-[var(--foreground)]">
              Día {dia.orden + 1}
            </CardTitle>
            {dia.musculosEnfocados && dia.musculosEnfocados.length > 0 ? (
              <div className="flex shrink-0 gap-1 flex-wrap justify-end max-w-[60%]">
                {dia.musculosEnfocados.map((musculo) => (
                  <Badge key={musculo} variant="secondary" className="text-xs">
                    {musculo}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground italic">
                Sin músculos enfocados
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {dia.ejercicios.length > 0 ? (
            <div className="space-y-1.5">
              {dia.ejercicios.slice(0, 3).map((ejercicio) => (
                <div key={ejercicio.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground)]/80 truncate">{ejercicio.nombre}</span>
                  {ejercicio.series && ejercicio.repes && (
                    <span className="text-xs text-[var(--muted-foreground)] shrink-0 ml-2">
                      {ejercicio.series} x {ejercicio.repes}
                    </span>
                  )}
                </div>
              ))}
              {dia.ejercicios.length > 3 && (
                <p className="text-xs text-[var(--muted-foreground)] pt-1">
                  +{dia.ejercicios.length - 3} más
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] italic">Sin ejercicios</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

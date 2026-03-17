import { Suspense } from "react";
import Link from "next/link";
import { House } from "lucide-react";

interface Feriado {
  id: string;
  fecha: string;
  createdAt: string;
}

interface GymConfig {
  id: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

async function getFeriados(): Promise<Feriado[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/feriados`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

async function getGymPrice(): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/gym`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return 45000;
  }

  const gym: GymConfig = await response.json();
  return gym.price;
}

function formatDate(fechaStr: string): string {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
}

export default async function InformacionPage() {
  const feriadosPromise = getFeriados();
  const gymPricePromise = getGymPrice();

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center">
      <main className="w-full max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="p-2 hover:bg-[var(--button-secondary-bg)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <House className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Información</h1>
          <div className="w-9" />
        </div>

        <div className="grid gap-6">
          {/* Price Section */}
          <Suspense fallback={<PriceSectionSkeleton />}>
            <PriceSection pricePromise={gymPricePromise} />
          </Suspense>

          {/* Hours Section */}
          <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Horarios</h2>
            <p className="text-lg text-[var(--foreground)]">8:00 a 22:00</p>
            <p className="text-[var(--muted-foreground)] mt-1">Lunes a viernes</p>
          </section>

          {/* Address Section */}
          <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Dirección</h2>
            <p className="text-lg text-[var(--foreground)]">Sargento Cabral 545</p>
            <p className="text-[var(--muted-foreground)] mt-1">Esquina Corrientes</p>
            <a
              href="https://maps.app.goo.gl/oxcpqAWFmFKpfpMU9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-3 py-1.5 text-sm bg-[var(--button-secondary-bg)] hover:opacity-80 text-[var(--button-secondary-foreground)] rounded-lg transition-colors"
            >
              Ver en Google Maps
            </a>
          </section>

          {/* Holidays Section */}
          <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Feriados</h2>
              <Link
                href="/feriados"
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Ver todos →
              </Link>
            </div>
            <Suspense fallback={<HolidaysSkeleton />}>
              <HolidaysPreviewWrapper feriadosPromise={feriadosPromise} />
            </Suspense>
          </section>
        </div>
      </main>
    </div>
  );
}

async function HolidaysPreviewWrapper({
  feriadosPromise,
}: {
  feriadosPromise: Promise<Feriado[]>;
}) {
  const feriados = await feriadosPromise;

  if (feriados.length === 0) {
    return (
      <p className="text-[var(--muted-foreground)]">No hay feriados programados</p>
    );
  }

  return (
    <ul className="space-y-2">
      {feriados.slice(0, 3).map((feriado) => (
        <li key={feriado.id} className="text-[var(--foreground)]">
          {formatDate(feriado.fecha)}
        </li>
      ))}
      {feriados.length > 3 && (
        <li className="text-[var(--muted-foreground)] text-sm">
          +{feriados.length - 3} más...
        </li>
      )}
    </ul>
  );
}

function HolidaysSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-5 w-32 bg-[var(--background)] rounded animate-pulse" />
      <div className="h-5 w-40 bg-[var(--background)] rounded animate-pulse" />
    </div>
  );
}

async function PriceSection({
  pricePromise,
}: {
  pricePromise: Promise<number>;
}) {
  const price = await pricePromise;

  return (
    <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
        Precio
      </h2>
      <p className="text-2xl font-bold text-[var(--foreground)]">
        {formatPrice(price)}
      </p>
      <p className="text-[var(--muted-foreground)] mt-1">Abono mensual</p>
    </section>
  );
}

function PriceSectionSkeleton() {
  return (
    <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
        Precio
      </h2>
      <div className="h-8 w-28 bg-[var(--background)] rounded animate-pulse" />
    </section>
  );
}

# Champion Gym — Gestor de Rutinas

v1.0.0 · Next.js 16 + React 19 + TypeScript + Tailwind v4 + Prisma + PostgreSQL

Sistema web para gestionar y visualizar rutinas de entrenamiento. Admins crean rutinas (Rutina → Día → Ejercicio), usuarios públicos las exploran. Incluye gestión de feriados, promociones y descuentos por duración.

---

## Features (1.0)

- **Gestión completa de rutinas** (Rutina → Día → Ejercicio) con drag-and-drop, dnd-kit, soft-delete y aislamiento por trainer.
- **Gimnasio configurable** desde admin: nombre, horarios estructurados (Lun a Dom), dirección, redes sociales, precio de inscripción.
- **Feriados con horarios parciales** y reglas de fechas pasadas.
- **Promociones y descuentos por duración** (1, 3, 6, 12 meses) con admin CRUD.
- **Auth DNI-based** con roles (ADMIN, TRAINER, USER) y audit trail.
- **Admin dashboard** con stats en vivo, error boundaries y fallbacks degradados.
- **Pre-commit hook GGA** (opt-in via `bash scripts/install-gga-hook.sh`): diff-only review + `.gga-ignore` escape hatch + kill switch `GGA_DIFF_FILTER=off`.
- **26+ E2E tests** con page objects + helpers + fixtures (rutinas, feriados, promociones, descuentos, trainers, auth).
- **151 unit tests** + **245 Playwright tests** (suite total, mayoría E2E).

---

## Stack

| Capa | Tech |
|------|------|
| Framework | Next.js 16.1.6 + React 19.2.3 |
| Cache Components | `'use cache'` + `cacheTag` + `cacheLife` (v0.19.0 migration) |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Estado | Zustand v5 |
| Validación | Zod v4 + React Hook Form |
| ORM / DB | Prisma v7 + PostgreSQL 18 |
| Auth | Better Auth v1 (login con DNI) |
| Testing | Playwright + Vitest |
| Pre-commit | GGA v2.8.1 (Gentleman Guardian Angel) |

---

## Setup

```bash
pnpm install
cp .env.example .env        # configurar DATABASE_URL y BETTER_AUTH_SECRET
docker compose up -d        # levantar PostgreSQL
pnpm dlx prisma db push
pnpm run db:seed            # opcional
pnpm run dev                # puerto 3000
```

---

## Scripts

```bash
pnpm run dev / build / start
pnpm run test / test:ui
pnpm run db:generate / db:push / db:seed / db:studio
```

---

## Modelo de datos

```
Rutina (nombre, tipo, descripcion, creador)
└── Dia (orden → display "Día N", musculosEnfocados[])
    └── Ejercicio (nombre, series, repes, orden)

Gym (singleton: price, nombre, horarioJson, direccion, mapsEmbedUrl, socialInstagram, socialWhatsapp, feriados[], promociones[], descuentosDuracion[])
Promocion (titulo, descripcion, precio, activo)
DescuentoDuracion (meses, porcentaje) -- unique(gymId, meses)
User (dni, role) -- role: ADMIN | TRAINER | USER
```

---

## Estructura

```
src/
├── app/
│   ├── (admin)/admin/      # rutinas, dias, feriados
│   ├── (public)/           # home, rutinas, feriados, informacion
│   └── actions/            # Server Actions (mutaciones)
├── components/
│   ├── admin/
│   ├── routines/
│   └── ui/                 # shadcn/ui
├── lib/schemas/            # Zod schemas
└── store/                  # Zustand (theme)
```

---

## Troubleshooting

**Prisma out of sync** → `pnpm run db:generate`

**Auth no funciona** → verificar que `BETTER_AUTH_URL` coincida exactamente con la URL (sin slash final)

**DB no conecta** → verificar `DATABASE_URL` y que el contenedor Docker esté corriendo (`docker-compose ps`)

---

## Contribución
Ver [CONTRIBUTING.md](./CONTRIBUTING.md)

---
## Mis Skills
Ver [Repo de Skills](https://github.com/Codenburg/skills)
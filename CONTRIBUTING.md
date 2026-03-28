# Guía de Contribución

## Workflow

1. Crear branch desde `dev`: `git checkout -b feature/nombre`
2. Trabajar en la feature
3. Commitear con conventional commits: `git commit -m "feat: description"`
4. Push: `git push -u origin feature/nombre`
5. Crear PR a `dev`
6. Code review
7. Merge

## Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nueva funcionalidad
fix: bug fix
docs: documentación
style: formatting (sin cambio de código)
refactor: refactor
test: tests
chore: mantenimiento
```

## SDD (Spec-Driven Development)

Para features significativas, usar el workflow SDD:

```
/sdd-init                          # Inicializar contexto
/sdd-explore <topic>               # Investigar
/sdd-propose <change>              # Crear proposal
/sdd-spec <change>                 # Escribir specs
/sdd-design <change>               # Diseño técnico
/sdd-tasks <change>                # Task breakdown
/sdd-apply <change>                 # Implementar
/sdd-verify <change>               # Verificar
/sdd-archive <change>               # Archivar
```

## Skills

El proyecto tiene skills especializados. Antes de trabajar en un área:

| Área | Skill |
|------|-------|
| React 19 | react-19 |
| Next.js | nextjs-best-practices |
| TypeScript | typescript |
| Tailwind | tailwind-design-system |
| Prisma | prisma |
| Zod | zod-4 |
| Zustand | zustand-5 |
| Forms | react-hook-form |
| shadcn/ui | shadcn |
| Auth | better-auth-best-practices |
| PostgreSQL | postgresql-best-practices |
| API testing | api-testing-patterns |

## Código

- Function components únicamente
- Server Components por defecto; Client Components con `"use client"`
- Mensajes de error en español
- TypeScript strict mode

## UI Components

Usar **shadcn/ui** para componentes base. No crear custom para:
- Button, Input, Select, Dialog, Dropdown, Card

Agregar: `npx shadcn@latest add <componente>`

## Testing

```bash
npm run test          # Playwright E2E
npm run test:ui       # Playwright con UI
npm run test:unit     # Vitest unit tests
```

## DB

```bash
npm run db:generate   # Generar Prisma client
npm run db:push       # Push schema
npm run db:seed       # Seed data
npm run db:studio     # Prisma Studio
```

## Pull Requests

- Título descriptivo siguiendo conventional commits
- Descripción del qué y por qué
- Link a issue si aplica
- Screenshots para cambios de UI

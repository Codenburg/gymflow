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

## Agent Setup

Este proyecto usa **opencode** con skills especializados. Los skills son necesarios para mantener los estándares del proyecto.

### Skills requeridos

Los skills se instalan en `~/.agents/skills/` o `~/.config/opencode/skills/`:

| Área | Skill | Path |
|------|-------|------|
| React 19 + Compiler | react-19 | react-19/SKILL.md |
| Next.js App Router | nextjs-best-practices | nextjs-best-practices/SKILL.md |
| TypeScript strict | typescript | typescript/SKILL.md |
| Tailwind CSS v4 | tailwind-design-system | tailwind-design-system/SKILL.md |
| Prisma ORM | prisma | prisma/SKILL.md |
| Zod validation | zod-4 | zod-4/SKILL.md |
| Zustand state | zustand-5 | zustand-5/SKILL.md |
| React Hook Form | react-hook-form | react-hook-form/SKILL.md |
| shadcn/ui | shadcn | shadcn/SKILL.md |
| Auth (Better Auth) | better-auth-best-practices | better-auth-best-practices/SKILL.md |
| Server-side auth | nextjs-auth-server-side | nextjs-auth-server-side/SKILL.md |
| PostgreSQL | postgresql-best-practices | postgresql-best-practices/SKILL.md |
| API testing | api-testing-patterns | api-testing-patterns/SKILL.md |
| Frontend design | frontend-design | frontend-design/SKILL.md |
| URL search debounce | url-search-debounce | url-search-debounce/SKILL.md |
| README versioning | readme-guardian | readme-guardian/SKILL.md |

### Instalación

1. Asegurate de tener **opencode** instalado
2. Los skills van en `~/.agents/skills/` (o `~/.config/opencode/skills/` según la config)
3. Usar el skill `find-skills` para buscar e instalar skills
4. O clonar/linkear manualmente desde el origen de cada skill

### Verificación

Al trabajar en el proyecto, el agente debería leer automáticamente los skills desde `AGENTS.md`. Si un skill no está disponible, el agente loindicará.

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

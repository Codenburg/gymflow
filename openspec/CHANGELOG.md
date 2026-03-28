# Changelog

Todos los cambios significativos del proyecto se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.2.0] - 2026-03-28

### Fixed
- Ejercicio form: unified series/repes to single "4x12" formato input
- Ejercicio form: validation error when leaving series/repes empty (NaN bug)
- Ejercicio mutations: revalidatePath now uses exact route (/admin/rutinas/[id]/dias/[diaId])
- Dia creation: auto-generates "Día N" nombre instead of requiring user input
- Series/repes: changed from String to Int in Prisma schema

### Changed
- ejercicio-form.tsx: single formato input instead of separate series/repes
- dia-manager.tsx: no longer requires nombre input for new days
- Schemas: new createDiaSchema (rutinaId only), formato field with refine+transform

### Added
- Toast notifications for ejercicio CRUD operations
- router.refresh() after mutations for immediate UI updates

## [0.1.1] - 2026-03-27

### Changed
- README: Mark PDF generation as pending (not implemented)
- README: Add TODO section with completed/pending features
- README: Fix Spanish/English mixed text in Troubleshooting
- PRD: PDF moved to backlog, Phase 2 marked as pending

### Added
- README: TODO section with full project status tracking

## [0.1.0] - 2026-03-25

### Added
- Initial documented state with full tech stack
- All Phase 1-3 features implemented and documented

# Delta for components

## Purpose

This spec defines the component-level requirements for the routine creation UI redesign. It describes the behavior, states, and visual specifications for ChipSelector, CollapsibleDiaSection, and EjercicioRow components.

---

## ADDED Requirements

### Requirement: ChipSelector Component

The ChipSelector component SHALL allow users to select a single routine type from a list of options. It replaces the dropdown `<Select>` pattern with a more visible, click-friendly chip/pill interface.

#### ChipSelector Props Interface

```typescript
interface ChipSelectorProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}
```

#### ChipSelector States

| State | Light Mode | Dark Mode |
|-------|------------|-----------|
| Default (unselected) | Border `--color-border-light`, text `--color-text-secondary` | Border `--color-border-light`, text `--color-text-secondary` |
| Hover | Border `--color-accent`, text `--color-accent` | Border `--color-accent`, text `--color-accent` |
| Selected | Background `--color-accent`, text `--color-accent-foreground` | Border `--color-accent`, background `--color-accent`, text `--color-accent-foreground` |
| Disabled | Opacity 50%, cursor not-allowed | Opacity 50%, cursor not-allowed |

#### Scenario: Selecting a chip in light mode

- GIVEN a user in light mode views the routine type section
- WHEN they click on "Fuerza" chip
- THEN the chip MUST have `--color-accent` (#48b8c9) background
- AND text MUST be `--color-accent-foreground` (#ffffff)
- AND previous selection MUST be deselected

#### Scenario: Selecting a chip in dark mode

- GIVEN a user in dark mode views the routine type section
- WHEN they click on "Cardio" chip
- THEN the chip MUST have `--color-accent` border
- AND `--color-accent` background
- AND text MUST be `--color-accent-foreground` (#ffffff)

#### Scenario: Hover state feedback

- GIVEN a user hovers over an unselected chip
- WHEN the hover occurs
- THEN the border MUST change to `--color-accent`
- AND the text color MUST change to `--color-accent`

#### Scenario: Keyboard navigation

- GIVEN a user navigates via Tab key
- WHEN focus lands on a chip
- THEN a visible focus ring MUST appear using `--focus-ring`
- AND Enter/Space keys MUST trigger selection

#### Scenario: Disabled state

- GIVEN the ChipSelector has `disabled={true}`
- WHEN the component renders
- THEN all chips MUST have `opacity: 0.5`
- AND clicks MUST NOT trigger `onChange`

---

### Requirement: CollapsibleDiaSection Component

The CollapsibleDiaSection component SHALL display a single training day that can expand/collapse to show or hide its exercises. It reduces cognitive load by keeping the interface scannable.

#### CollapsibleDiaSection Props Interface

```typescript
interface DiaSectionProps {
  dia: Dia;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (dia: Dia) => void;
  onDelete: () => void;
}
```

#### CollapsibleDiaSection Visual States

##### Header (Collapsed)

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `--color-card` (#ffffff) | `--color-card` (#121212) |
| Border | `--color-border-light` | `--color-border-light` (#2a2a2a) |
| Border radius | 12px - 16px | 12px - 16px |
| Delete button | Icon only, `--color-text-secondary` | Icon only, `--color-text-secondary` |

##### Header (Expanded)

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `--color-card` (#ffffff) | `--color-card` (#121212) |
| Border | `--color-border-light` | `--color-border-light` (#2a2a2a) |
| Chevron rotation | 90deg (pointing down) | 90deg (pointing down) |
| Delete button visible | Yes | Yes (and collapse button) |

#### Scenario: Collapsing a day section

- GIVEN a user views an expanded DiaSection
- WHEN they click on the header or chevron
- THEN the section MUST collapse
- AND the exercises list MUST be hidden
- AND the chevron MUST rotate to point right (0deg)

#### Scenario: Expanding a day section

- GIVEN a user views a collapsed DiaSection
- WHEN they click on the header or chevron
- THEN the section MUST expand
- AND the exercises list MUST be visible
- AND the chevron MUST rotate to point down (90deg)

#### Scenario: Deleting a day

- GIVEN a user clicks the delete icon on a DiaSection
- WHEN the delete action is confirmed (if needed)
- THEN `onDelete` callback MUST be invoked
- AND the day MUST be removed from the form state

#### Scenario: Dark mode card style

- GIVEN a user in dark mode views a DiaSection
- WHEN the section renders
- THEN the card background MUST be `--color-card` (#121212)
- AND border MUST be `--color-border-light` (#2a2a2a)
- AND border radius MUST be 12px-16px
- AND shadow MUST be subtle: `0 1px 3px rgba(0,0,0,0.3)`

#### Scenario: Chevron animation

- GIVEN a user toggles a DiaSection
- WHEN the expand/collapse occurs
- THEN the chevron rotation MUST animate smoothly (150-200ms transition)

---

### Requirement: EjercicioRow Component

The EjercicioRow component SHALL display a single exercise with horizontal layout `[Nombre] [Series] x [Repeticiones] [Delete]`. It MUST be ultra-slim with minimal visual weight.

#### EjercicioRow Props Interface

```typescript
interface EjercicioRowProps {
  ejercicio: Ejercicio;
  onUpdate: (ejercicio: Ejercicio) => void;
  onDelete: () => void;
}
```

#### EjercicioRow Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [Nombre输入框....................]  [3]  x  [10]            [🗑] │
│   Placeholder: "Ej: Sentadillas con barra"                        │
└──────────────────────────────────────────────────────────────────┘
```

| Field | Width | Behavior |
|-------|-------|----------|
| Nombre | Flexible (flex-1) | Text input, placeholder required |
| Series | Fixed (w-16) | Number input, min 1 |
| Repeticiones | Fixed (w-16) | Number input, min 1 |
| Delete | Fixed | Icon button |

#### EjercicioRow Visual States

##### Light Mode

| Element | Style |
|---------|-------|
| Container | Horizontal flex, gap 12px, align-center |
| Input borders | 1px `--color-border-light` |
| Border radius | 8px - 12px |
| Placeholder | `--color-text-secondary`, descriptive text |
| Delete icon | `--color-text-secondary`, hover `--color-error` |

##### Dark Mode (Ultra-Slim)

| Element | Style |
|---------|-------|
| Container | Horizontal flex, gap 12px, align-center |
| Input background | Slightly lighter than card: `#2a2a2a` on `#121212` |
| Input border | None or very subtle `#2a2a2a` |
| Border radius | 8px - 12px |
| Placeholder | `--color-placeholder` (#6b7280), descriptive |
| Delete icon | `--color-text-secondary`, hover `--color-error` |

#### Scenario: Rendering exercise row in light mode

- GIVEN an exercise exists in a day
- WHEN the EjercicioRow renders in light mode
- THEN the layout MUST be horizontal: `[Nombre] [3] x [10] [🗑]`
- AND the placeholder for Nombre MUST be descriptive: "Ej: Sentadillas con barra"

#### Scenario: Rendering exercise row in dark mode

- GIVEN an exercise exists in a day
- WHEN the EjercicioRow renders in dark mode
- THEN inputs MUST have `#2a2a2a` background on `#121212` card
- AND placeholder text MUST be `--color-placeholder` (#6b7280)

#### Scenario: Updating exercise name

- GIVEN a user types in the Nombre input
- WHEN the value changes
- THEN `onUpdate` MUST be called with the updated ejercicio object
- AND the input MUST reflect the new value

#### Scenario: Updating series/reps

- GIVEN a user changes the series count
- WHEN the value changes
- THEN `onUpdate` MUST be called with the updated ejercicio
- AND the number MUST be validated (min 1)

#### Scenario: Deleting an exercise

- GIVEN a user clicks the delete icon
- WHEN the click occurs
- THEN `onDelete` MUST be called
- AND the row MUST be removed from the list

#### Scenario: Error state in dark mode

- GIVEN an input has a validation error
- WHEN the error displays in dark mode
- THEN the border MUST use `--color-error` (#ef4444)
- AND the error border MUST be subtle (not overwhelming)

---

### Requirement: Form Header with Submit Button

The routine creation form SHALL have a header area containing the type selector and a prominent "Crear Rutina" submit button positioned in the upper right corner.

#### Scenario: Submit button position in dark mode

- GIVEN a user in dark mode views the routine form
- WHEN the "Crear Rutina" button renders
- THEN it MUST be positioned in the upper right corner
- AND it MUST have solid white background (#ffffff)
- AND text MUST be black (#0a0a0a)
- AND border-radius MUST be 12px

#### Scenario: Submit button position in light mode

- GIVEN a user in light mode views the routine form
- WHEN the "Crear Rutina" button renders
- THEN it SHOULD be positioned in the upper right corner or prominent location

---

## FILES AFFECTED

| File | Changes |
|------|---------|
| `src/components/admin/chip-selector.tsx` | **NEW** - ChipSelector component |
| `src/components/admin/dia-section.tsx` | MODIFY - Add collapsible behavior |
| `src/components/admin/ejercicio-row.tsx` | MODIFY - Horizontal layout, ultra-slim dark mode |
| `src/components/admin/rutina-completa-form.tsx` | MODIFY - Integrate new components |

---

## ACCEPTANCE CRITERIA

| ID | Criterion | Verification |
|----|-----------|--------------|
| RCC1 | ChipSelector renders with all states (default, hover, selected, disabled) | Unit test + visual |
| RCC2 | ChipSelector selection works in both light/dark modes | Visual inspection |
| RCC3 | ChipSelector keyboard navigation functional | Keyboard test |
| RCC4 | DiaSection collapses/expands with animation | Visual inspection |
| RCC5 | DiaSection delete triggers callback | Unit test |
| RCC6 | EjercicioRow has horizontal layout `[Nombre] [Series] x [Repeticiones]` | Visual inspection |
| RCC7 | EjercicioRow placeholders are descriptive | Visual inspection |
| RCC8 | EjercicioRow dark mode is ultra-slim | Visual inspection |
| RCC9 | Submit button positioned correctly in upper right | Visual inspection |
| RCC10 | All components use semantic tokens from design-system | ESLint grep |

---

## Edit Routine Page Requirements

This section defines component-level requirements for the Edit Routine page UI refactor. These requirements establish exact Tailwind class contracts, visual states, token mappings, and enforcement rules for pixel-perfect consistency.

### Exact Token System

The system SHALL use these EXACT color token values in CSS custom properties for the Edit Routine page.

#### Dark Mode Tokens

| Token | Value | Tailwind Mapping | Usage |
|-------|-------|-----------------|-------|
| `--color-base` | `#0f0f10` | N/A (page bg) | Page background |
| `--color-surface` | `#18181b` | `bg-[#18181b]` | Card/component backgrounds |
| `--color-border` | `#27272a` | `border-[#27272a]` | All borders |
| `--color-hover` | `#1f1f23` | `hover:bg-[#1f1f23]` | Hover backgrounds |
| `--color-muted` | `#a1a1aa` | `text-[#a1a1aa]` | Muted text |
| `--color-foreground` | `#fafafa` | `text-[#fafafa]` | Primary text |
| `--color-primary` | `#E11D48` | `bg-[#E11D48]` | Primary actions (NO secondary CTAs) |

#### Light Mode Tokens

| Token | Value | Tailwind Mapping | Usage |
|-------|-------|-----------------|-------|
| `--color-base` | `#f8fafc` | N/A (page bg) | Page background |
| `--color-surface` | `#ffffff` | `bg-white` / `dark:bg-[#ffffff]` | Card backgrounds |
| `--color-border` | `#e2e8f0` | `border-[#e2e8f0]` | All borders |
| `--color-hover` | `#f1f5f9` | `hover:bg-[#f1f5f9]` | Hover backgrounds |
| `--color-muted` | `#64748b` | `text-[#64748b]` | Muted text |
| `--color-foreground` | `#111827` | `text-[#111827]` | Primary text |
| `--color-primary` | `#48b8c9` | `bg-[#48b8c9]` | Primary actions |

#### Scenario: Dark mode renders with exact tokens

- GIVEN a user with dark mode preference views the Edit Routine page
- WHEN the page renders
- THEN all components MUST use dark mode tokens
- AND `bg-surface` MUST resolve to `#18181b`
- AND `text-muted` MUST resolve to `#a1a1aa`
- AND `border-border` MUST resolve to `#27272a`

#### Scenario: Light mode renders with exact tokens

- GIVEN a user with light mode preference views the Edit Routine page
- WHEN the page renders
- THEN all components MUST use light mode tokens
- AND `bg-surface` MUST resolve to `#ffffff`
- AND `text-muted` MUST resolve to `#64748b`
- AND `border-border` MUST resolve to `#e2e8f0`

### Días de entrenamiento Section Container

The "Días de entrenamiento" section container SHALL use these exact classes.

#### Container Contract

```tsx
<div className="bg-surface border border-border rounded-xl p-4">
```

#### Title Contract

```tsx
<h2 className="text-lg font-semibold">
```

#### Scenario: Días section container renders

- GIVEN the Edit Routine page renders
- WHEN the "Días de entrenamiento" section displays
- THEN the container MUST have `bg-surface border border-border rounded-xl p-4`
- AND the title MUST have `text-lg font-semibold`
- AND NO additional card wrapper exists around this section

### Detalles de la Rutina Section

The "Detalles de la Rutina" section SHALL be FLAT (no card wrapper) with specific spacing.

#### Detalles Contract

```tsx
<div className="space-y-3">
  <h3 className="text-base font-medium text-muted-foreground">
```

#### Scenario: Detalles section renders without card

- GIVEN the Edit Routine page renders
- WHEN the "Detalles de la Rutina" section displays
- THEN the section MUST have NO `bg-surface` or card styling
- AND spacing MUST be `space-y-3`
- AND title MUST be `text-base font-medium text-muted-foreground`
- AND NO border or rounded-xl on this section

### DiaCard Component (RIGID CONTRACT)

The DiaCard component SHALL use this exact structure and Tailwind classes.

#### DiaCard Root

```tsx
<div className="flex flex-col h-full min-h-[140px] p-4 bg-surface border border-border rounded-xl hover:bg-hover transition-colors duration-150">
```

#### DiaCard Header

```tsx
<div className="flex items-center gap-2">
  {/* índice: badge */}
  <span className="text-xs text-muted-foreground">
  {/* título */}
  <h3 className="text-sm font-medium truncate">
```

#### DiaCard Description

```tsx
<p className="text-sm text-muted-foreground line-clamp-1 min-h-[20px]">
  {/* placeholder: same style, NO italic */}
</p>
```

#### DiaCard Body

```tsx
<div className="flex-1">
```

#### DiaCard Footer

```tsx
<div className="flex items-center justify-between pt-2">
  {/* Badge: neutral style */}
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
  {/* CTA */}
  <a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
    Ir a día <ChevronRight className="inline w-4 h-4 ml-1" />
  </a>
```

#### Scenario: DiaCard renders in default state

- GIVEN a DiaCard component renders with a day that has exercises
- WHEN the card displays
- THEN the root MUST have `flex flex-col h-full min-h-[140px] p-4 bg-surface border border-border rounded-xl hover:bg-hover transition-colors duration-150`
- AND header index MUST be `text-xs text-muted-foreground`
- AND title MUST be `text-sm font-medium truncate`
- AND description MUST be `text-sm text-muted-foreground line-clamp-1 min-h-[20px]`
- AND footer MUST have neutral badge and muted CTA

#### Scenario: DiaCard renders with empty description

- GIVEN a DiaCard component renders with a day that has no muscle group description
- WHEN the card displays
- THEN the description placeholder MUST use same style as filled description
- AND NO italic styling
- AND min-h-[20px] MUST be present to prevent layout shift

#### Scenario: DiaCard hover state

- GIVEN a user hovers over a DiaCard
- WHEN the hover occurs
- THEN ONLY `bg-hover` color change MUST occur
- AND NO scale, size, or layout changes
- AND transition MUST be `transition-colors duration-150`

### Agregar Día Button

The "Agregar Día" button SHALL use dashed border pattern with these exact classes.

#### Button Contract

```tsx
<button className="border border-dashed border-border bg-transparent hover:bg-surface min-h-[44px] flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all duration-150">
```

#### Scenario: Agregar Día button renders

- GIVEN the Edit Routine page renders with fewer than 7 days
- WHEN the "Agregar Día" button displays
- THEN it MUST have `border border-dashed border-border`
- AND `bg-transparent`
- AND `min-h-[44px]`
- AND `flex items-center justify-center gap-2`
- AND `text-muted-foreground hover:text-foreground`

#### Scenario: Agregar Día button hover

- GIVEN a user hovers over the "Agregar Día" button
- WHEN the hover occurs
- THEN background MUST change to `bg-surface`
- AND text MUST change to `text-foreground`
- AND NO other visual changes occur

### SegmentedControl Component

The SegmentedControl SHALL use fixed dimensions and semantic tokens for active/inactive states.

#### SegmentedControl Contract

```tsx
// Container
<div className="inline-flex bg-muted rounded-lg p-1 flex-nowrap items-center gap-1">
  {/* Buttons */}
  <button className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium flex-none whitespace-nowrap">
    {/* Inactive */}
    <button className="text-muted-foreground bg-transparent hover:text-foreground hover:bg-accent">
    {/* Active */}
    <button className="bg-primary text-primary-foreground shadow-sm">
```

#### Critical Rules

- Container: `inline-flex bg-muted rounded-lg p-1 flex-nowrap items-center gap-1`
- Button: `inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium flex-none whitespace-nowrap`
- Height MUST be `h-9` (fixed, no variation)
- Horizontal padding MUST be `px-3`
- Active state MUST be `bg-primary text-primary-foreground shadow-sm`
- Inactive state MUST be `text-muted-foreground bg-transparent hover:text-foreground hover:bg-accent`
- Focus ring MUST use semantic token: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
- NO borders, NO shadows in inactive state
- Icon: `w-4 h-4 flex-shrink-0`

#### Scenario: SegmentedControl renders with active selection

- GIVEN a SegmentedControl renders with "fuerza" selected
- WHEN the component displays
- THEN the container MUST have `inline-flex bg-muted rounded-lg p-1`
- AND the "fuerza" button MUST have `bg-primary text-primary-foreground shadow-sm`
- AND other buttons MUST have `text-muted-foreground bg-transparent`

#### Scenario: SegmentedControl inactive button hover

- GIVEN a user hovers over an inactive SegmentedControl button
- WHEN the hover occurs
- THEN text color change to `text-foreground` MUST occur
- AND background change to `bg-accent` MUST occur
- AND NO borders or shadows appear

### Grid Layout

The days grid SHALL use responsive columns with exact gap and full-height items.

#### Grid Contract

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  {/* Each item */}
  <div className="h-full">
    <DiaCard />
  </div>
</div>
```

#### Scenario: Grid renders responsive columns

- GIVEN the Edit Routine page renders with 3+ days
- WHEN the grid displays
- THEN mobile MUST show 1 column
- AND tablet (md) MUST show 2 columns
- AND desktop (xl) MUST show 3 columns
- AND gap MUST be `gap-4`
- AND each item MUST be wrapped in `h-full`

### Global Interaction Rules

All interactive surfaces SHALL follow these interaction patterns.

#### Transition Contract

```tsx
<InteractiveElement className="transition-colors duration-150 ease-out">
```

#### Cursor Contract

```tsx
<clickableElement className="cursor-pointer">
<nonClickableElement className="/* NO cursor-pointer */">
```

#### Hover State Rules

- hover: ONLY `bg` or `text` changes
- hover: NEVER size, margin, padding, or layout properties

#### Active State Rules

```tsx
<button className="active:brightness-95">
```

- active: ONLY `brightness-95`
- active: NO scale, NO transform

#### Focus State Rules

```tsx
<element className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
```

#### Scenario: Button follows interaction rules

- GIVEN a Button component renders
- WHEN the user hovers
- THEN ONLY bg/text color MUST change
- AND transition MUST be `transition-colors duration-150 ease-out`
- WHEN the user clicks
- THEN ONLY `brightness-95` MUST apply
- AND NO scale or size changes
- WHEN the user focuses via keyboard
- THEN `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50` MUST apply

### Radius and Border Standards

All components SHALL use `rounded-xl` and `border-border` consistently.

#### Radius Contract

```tsx
<element className="rounded-xl">
```

#### Border Contract

```tsx
<element className="border border-border">
```

#### Rule

- `rounded-xl` MUST be used on EVERYTHING (cards, buttons, containers)
- `border border-border` MUST be the ONLY border style
- NO stronger border variants (e.g., `border-2`, `border-black`)
- NO multiple borders on same element

#### Scenario: New component uses standard radius/border

- GIVEN a developer creates a new component for the Edit Routine page
- WHEN the component renders
- THEN `rounded-xl` MUST be applied
- AND `border border-border` MUST be applied
- AND NO stronger border variants exist

### Canonical Spacing

Component spacing SHALL follow these canonical patterns.

#### Spacing Contract

| Context | Tailwind Classes |
|---------|-----------------|
| Card internal padding | `p-4` |
| Section padding | `p-4` |
| Between form fields | `space-y-2` |
| Between big blocks | `space-y-4` |

#### Rule

- NO `space-y` outside these contexts
- Card internal: `p-4` ONLY
- Form fields: `space-y-2` ONLY
- Page sections: `space-y-4` ONLY

#### Scenario: Form fields use canonical spacing

- GIVEN a form renders on the Edit Routine page
- WHEN the form fields display
- THEN vertical spacing between fields MUST be `space-y-2`
- AND card padding MUST be `p-4`
- AND NO arbitrary space-y values

### Iconography Standards

All icons SHALL use consistent sizing and colors.

#### Icon Contract

```tsx
<Icon className="h-4 w-4" />
```

| Property | Value | Rule |
|----------|-------|------|
| Size | `h-4 w-4` | ALL icons MUST use this size |
| Default color | `text-muted-foreground` | Never use hardcoded colors |
| Hover color | Inherits `text-foreground` | On hoverable containers |

#### Scenario: Icon renders with correct size

- GIVEN an icon renders on the Edit Routine page
- WHEN the icon displays
- THEN it MUST have `h-4 w-4`
- AND default color MUST be `text-muted-foreground`
- AND NOT hardcoded hex values like `#9ca3af`

### Ir a día CTA

The "Ir a día" link/button SHALL use muted color with arrow icon.

#### CTA Contract

```tsx
<a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
  Ir a día <ChevronRight className="inline w-4 h-4 ml-1" />
</a>
```

#### Rule

- NEVER use `text-primary` or `#E11D48` on this CTA
- CTA MUST be `text-muted-foreground hover:text-foreground`
- Arrow icon MUST have `ml-1` (margin-left gap)

#### Scenario: Ir a día CTA renders correctly

- GIVEN a DiaCard renders
- WHEN the footer CTA displays
- THEN "Ir a día" text MUST be `text-muted-foreground hover:text-foreground`
- AND arrow icon MUST be inline with `ml-1`
- AND color MUST NOT be `text-primary`

### DiaCard Typography Contract

The title SHALL be `text-sm font-medium` (previously `font-semibold`).

The description SHALL NOT use italic for empty state (previously used italic).

#### Scenario: DiaCard title typography updated

- GIVEN a DiaCard renders
- WHEN the title displays
- THEN title MUST be `text-sm font-medium` (NOT `font-semibold`)
- AND title MUST still be truncated with `truncate`

#### Scenario: DiaCard empty description no longer italic

- GIVEN a DiaCard renders with empty muscle group
- WHEN the placeholder text displays
- THEN the placeholder MUST be `text-sm text-muted-foreground`
- AND MUST NOT be italic

### SegmentedControl Active State

The active button SHALL use `bg-primary text-primary-foreground shadow-sm` with semantic tokens.

#### Scenario: SegmentedControl active uses semantic tokens

- GIVEN a SegmentedControl renders with an option selected
- WHEN the active button displays
- THEN it MUST have `bg-primary text-primary-foreground shadow-sm`
- AND focus ring MUST use `focus-visible:ring-ring`
- AND NO `data-[selected=true]` attribute dependency

### Enforcement Rules

#### Global Rule 1: No Layout Changes on State

```typescript
// BAD
className="hover:scale-105 active:scale-95"

// GOOD  
className="hover:bg-hover active:brightness-95"
```

State changes (hover, active, focus) MUST ONLY change color, NEVER layout properties (width, height, margin, padding, scale).

#### Global Rule 2: Single Source of Truth for Padding

```typescript
// Every card MUST have p-4 and NOTHING else
className="p-4 bg-surface border border-border rounded-xl"

// NOT
className="p-3 bg-surface ..." // p-3 is VIOLATION
className="p-6 bg-surface ..." // p-6 is VIOLATION
```

Components MUST NOT define padding outside the contract. If a component needs different padding, it is a BUG.

#### Global Rule 3: No Color Deviations

```typescript
// BAD - hardcoded colors
className="text-[#9ca3af] bg-[#121212]"

// GOOD - semantic tokens
className="text-muted-foreground bg-surface"
```

Developers MUST NOT introduce new hardcoded colors. All colors MUST use the defined token system.

#### Global Rule 4: Primary Color Scope

```typescript
// Primary color ONLY for:
// - Main submit button (Crear/Actualizar Rutina)
// - SegmentedControl active state

// Primary color FORBIDDEN for:
// - "Ir a día" CTA
// - "Agregar Día" button  
// - Cancel buttons
// - Secondary actions
```

`bg-primary` / `#E11D48` / `#48b8c9` MUST ONLY be used for the PRIMARY action. All secondary actions use muted colors.

### Edit Routine Page Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| ERC1 | Dark mode tokens match exact values | Inspect globals.css |
| ERC2 | Light mode tokens match exact values | Inspect globals.css |
| ERC3 | Días section uses `bg-surface border border-border rounded-xl p-4` | Visual inspection |
| ERC4 | Detalles section has NO card, uses `space-y-3` | Visual inspection |
| ERC5 | DiaCard follows rigid contract | Visual inspection |
| ERC6 | Agregar Día uses dashed border, min-h-[44px] | Visual inspection |
| ERC7 | SegmentedControl: h-9 px-3, active=bg-primary text-primary-foreground | Visual inspection |
| ERC8 | Grid: 1/2/3 cols responsive, gap-4, h-full items | Visual inspection |
| ERC9 | All transitions: `transition-colors duration-150` | Visual inspection |
| ERC10 | Hover: ONLY bg/text, NO size changes | Visual inspection |
| ERC11 | Active: ONLY brightness-95, NO scale | Visual inspection |
| ERC12 | All rounded-xl, border-border (no stronger) | Visual inspection |
| ERC13 | Icons: h-4 w-4, text-muted-foreground | Visual inspection |
| ERC14 | "Ir a día": muted color, NOT primary | Visual inspection |
| ERC15 | Contrast ratios pass WCAG AA | Contrast checker |
| ERC16 | Focus visible on all interactive elements | Keyboard navigation test |

---

## ADDED Requirements (ErrorState Client Directive Fix — v0.20.0)

### Requirement: ErrorState Is a Client Component

The `ErrorState` component (`src/components/ui/error-state.tsx`) MUST be a React Client Component: the file MUST start with the `"use client"` directive at the top of the module. The component MUST continue to render the error icon, the user-facing message, and a `<Button>` with an `onClick` handler that calls `window.location.reload()`. The component MUST keep the existing `data-testid="error-state"` attribute for Playwright selectors.

(Reason: The component renders a `<Button>` with `onClick={() => window.location.reload()}`. As a Server Component, React threw `Event handlers cannot be passed to Client Component props` when the homepage's error path rendered it, cascading into the `ErrorBoundary:homepage` error boundary. Marking the file as `"use client"` lets the runtime attach the click handler in the browser.)

#### Scenario: ErrorState module declares use client

- GIVEN `src/components/ui/error-state.tsx` exists
- WHEN the file is read
- THEN the first non-comment statement MUST be the `"use client"` directive
- AND the module MUST continue to export `ErrorState` as a named export

#### Scenario: ErrorState reintentar button invokes reload

- GIVEN the homepage error path renders `<ErrorState message="..." />`
- WHEN the user clicks the "Reintentar" button
- THEN the browser SHALL call `window.location.reload()`
- AND the page SHALL reload with a fresh data fetch

#### Scenario: ErrorState does not throw Event handlers error

- GIVEN any Server Component (e.g. `app/(public)/page.tsx`, `app/error.tsx`) renders `<ErrorState message="..." />`
- WHEN React renders the tree
- THEN the browser console SHALL NOT contain `Event handlers cannot be passed to Client Component props`
- AND the error boundary SHALL NOT trigger

#### Scenario: ErrorState keeps data-testid for E2E selectors

- GIVEN a Playwright test selects the error state UI
- WHEN the test runs
- THEN `[data-testid="error-state"]` SHALL resolve to the rendered wrapper element
- AND the "Reintentar" button SHALL be visible and clickable

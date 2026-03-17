# Search & Filtering Specification

## Purpose

This spec describes the search and filtering functionality, including a separated search input and trainer sidebar filter panel.

## ADDED Requirements

### Requirement: Trainer Sidebar as Source of Truth

The trainer sidebar checkbox selection MUST be the only source of truth for filter state.
No additional chips or tags should appear below the search bar.

The sidebar MUST:
- Display each unique trainer name from the database
- Show a count of routines per trainer next to each name
- Provide checkboxes for multiple trainer selection
- Include an "Todos" option to clear all trainer filters
- Visually indicate selected trainers (checkbox + highlight)

#### Scenario: Display trainer list in sidebar

- GIVEN there are trainers with routines in the database
- WHEN the user visits the routines page
- THEN the sidebar displays a list of trainers with checkboxes
- AND each trainer shows their routine count in parentheses

#### Scenario: Select single trainer filter

- GIVEN the trainer sidebar is visible
- WHEN the user checks a trainer checkbox
- THEN the results filter to show only routines from that trainer
- AND no chip appears (sidebar checkbox indicates selection)

#### Scenario: Select multiple trainers

- GIVEN the trainer sidebar is visible
- WHEN the user checks multiple trainer checkboxes
- THEN the results filter to show routines from ANY selected trainer
- AND no chips appear (sidebar checkboxes indicate selection)

#### Scenario: Deselect all trainers (Todos)

- GIVEN one or more trainers are selected
- WHEN the user clicks "Todos" option
- THEN all checkboxes are cleared
- AND the results show routines from all trainers

### Requirement: Simplified Search Input

The search input MUST only filter routines by name (`routine.nombre`).

The input MUST:
- Display centered in the main content area
- Apply a 300ms debounce before triggering the search
- Filter results using `ILIKE` pattern matching on `routine.nombre`

#### Scenario: Search by routine name

- GIVEN the search input is empty
- WHEN the user types "pierna" in the search input
- THEN after 300ms the results filter to show only routines containing "pierna" in the name

#### Scenario: Clear search input

- GIVEN the search input has text and results are filtered
- WHEN the user clicks the clear button (X)
- THEN the input clears
- AND all routines are displayed (respecting any trainer filters)

### Requirement: Search Autocomplete

The autocomplete dropdown showing both routines and trainers during typing MUST be removed.

(Reason: Replaced by separated search input and sidebar panel approach)

#### Scenario: Autocomplete no longer appears

- GIVEN the user is typing in the search input
- WHEN the user types any text
- THEN no autocomplete dropdown appears
- AND results only filter after debounce completes

### Requirement: Type Selector

The type selector dropdown that filters routines by type MUST be removed.

(Reason: Simplifying the UI to focus on name search and trainer filters only)

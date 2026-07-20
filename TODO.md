# TODO - College Class Scheduling System

## Plan/Scope

### Feature 1: Improve App.css

- [ ] Reduce landing page overlay opacity.
- [ ] Ensure cards/tables/forms/buttons/animations/timetable blocks match St. Rita’s College theme and existing variables.

### Feature 2: FacultyPage.tsx

- [ ] Enforce Admin-only actions.
- [ ] Ensure edit modal is prefilled (already) and refreshes after update/delete (already) + confirmation before delete (already).
- [ ] Support editing teacher availability (already via availability textarea; verify API payload).
- [ ] Fix any TS/unused vars.

### Feature 3: SubjectsPage.tsx

- [ ] Enforce only Admin can edit/delete.
- [ ] Make Teacher/Student read-only (hide actions + ensure modal not open).
- [ ] Remove incorrect role gating (localStorage role is used; replace with consistent RBAC logic if needed).
- [ ] Refresh data after changes (already).

### Feature 4: RoomsPage.tsx

- [ ] Enforce Admin-only edit/delete.
- [ ] Ensure delete confirmation dialog (already).
- [ ] Ensure PUT /api/rooms/:number and DELETE /api/rooms/:number usage is correct.

### Feature 5: SectionsPage.tsx

- [ ] Enforce Admin-only edit/delete.
- [ ] Ensure PUT /api/sections/:id and DELETE /api/sections/:id usage is correct.
- [ ] Refresh list after update/delete (already).

### Feature 6: Final Verification

- [ ] Run frontend build.
- [ ] Fix TypeScript errors.
- [ ] Remove unused imports/dead code.
- [ ] Ensure no broken API calls and no console errors.
- [ ] Manual testing checklist.

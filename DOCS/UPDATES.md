Changes made:

- Backend: added `POST /api/schedules/generate` and improved generator to:
  - allocate multiple slots per subject based on `lecture_hours` + `lab_hours`
  - prefer subject instructor when available
  - respect `faculty.availability` (permissive parser)
  - avoid double-booking faculty/rooms/sections in the same day/time
  - respect room `capacity` vs section `students`

- Frontend: added non-blocking toasts and loading states for generation actions; wired Dashboard and Schedules pages to call the generator and refresh data.

Files to inspect:

- server/services/schedules.service.js
- server/controllers/schedules.controller.js
- server/routes/schedules.routes.js
- src/components/common/Toast.tsx
- src/layouts/MainLayout.tsx
- src/pages/DashboardPage.tsx
- src/pages/SchedulesPage.tsx

How to run locally:

1. Ensure MySQL is running and apply `server/database/schema.sql`.
2. Create or seed data for `faculty`, `rooms`, `subjects`, and `sections`.
3. Start backend:

```bash
cd server
npm install
npm run dev
```

4. Start frontend:

```bash
# repo root
npm install
npm run dev
```

5. Use the UI "Generate Schedule" / "Generate Timetable" buttons.

Known limitations & next steps:

- Availability parsing is permissive; consider standardizing an availability schema for reliability.
- The generator is a heuristic, not an optimizer. To make production-grade, implement:
  - constraint solver (e.g. greedy + backtracking or ILP)
  - teacher load balancing and max hours per day constraints
  - subject-specific contiguous slot requirements (e.g., 3-hour labs)
  - better error reporting when insufficient resources are available
- Replace simple rotate-mapping of subjects->sections with explicit course/section mapping.

If you want, I can proceed to implement a constraint solver next (ILP or backtracking).

# TODO - DB + Backend Integration (College Scheduling System)

## Plan steps

- [ ] Inspect existing frontend data usage (completed).
- [ ] Create backend MVC architecture under `server/`.
- [ ] Add backend dependencies and `server/package.json`.
- [ ] Add `.env` sample and use `dotenv`.
- [ ] Implement MySQL init SQL scripts (create DB/tables if not exist).
- [ ] Implement mysql2 connection pool.
- [ ] Implement MVC layers: models/services/controllers/routes for Faculty, Subjects, Courses, Sections, Rooms, Schedules, Users.
- [ ] Implement auth endpoints (register/login) with bcrypt + JWT.
- [ ] Add error handling + request validation (express-validator).
- [ ] Enable CORS.
- [ ] Wire frontend Axios integration by updating `src/data/mockData.ts` to fetch from backend while preserving exports.
- [ ] Update hardcoded page data sources to use `mockData.ts` (Courses/Departments/Schedules/Conflict).
- [ ] Run backend and verify endpoints.
- [ ] Run frontend and verify UI shows DB data.

# Task: Server Startup (2026-04-22)

## 1. Objectives
- Ensure database is running (local or Supabase).
- Start the backend API server.
- Start the frontend web server.
- Verify system health.

## 2. Checklist
- [x] Check DB availability
- [x] Configure environment (if needed)
- [/] Run `./gradlew :api-server:bootRun`
- [/] Run `pnpm dev` in `frontend/`
- [ ] Verify connectivity

## 3. Progress
- Checked Docker status: Not running locally.
- Checked local ports 5432/5433: Not in use.
- Updated configuration to use Oracle Cloud IP `129.154.54.178`.
- **SUCCESS**: Connected to Oracle Cloud DB at `129.154.54.178:5432`.
- DB Version: PostgreSQL 17.9 (Debian 17.9-1.pgdg13+1).
- Port 22 (SSH) is still timing out, but DB service is confirmed alive.
- Next: Start backend and frontend to verify full system integration.

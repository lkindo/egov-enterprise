# 20260511 Setup DB Bridge for OCI PostgreSQL

## Status
- [ ] Update `GEMINI.md` with DB interaction rules
- [ ] Create `.agent/scripts/db-bridge.js`
- [ ] Verify DB connection with a test query
- [ ] Finalize the setup and report to user

## Details
- Purpose: Efficient DB querying for Antigravity without manual MCP setup.
- Target: OCI PostgreSQL 17 (129.154.54.178:5432/egovdb)
- Method: Local Node.js script using `pg` library.

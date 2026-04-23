# Task: Server Execution (2026-04-23)

## 1. Objectives
- Start the full development stack (Backend + Frontend).
- Verify successful startup of API server (Spring Boot).
- Verify successful startup of Web server (Next.js).

## 2. Checklist
- [ ] Run `npm run dev` in root
- [ ] Confirm Backend is running (Port 8080)
- [ ] Confirm Frontend is running (Port 3000)
- [ ] Verify homepage accessibility

## 3. Progress
- [x] Initializing server startup...
- [x] Web server (Next.js) started on http://localhost:3001
- [!] API server (Spring Boot) failed due to DB schema mismatches.
- [x] Fixed `nleaderschdul` (missing column)
- [x] Fixed `nloginlog`, `nprivacylog`, `nuserlog`, `nsyslog` (missing auditing columns)
- [x] Fixed `npopupmanage` (type mismatch numeric -> varchar)
- [x] Created `nonlinemnual` (missing table)
- [x] Created `nqestnrrespond` (missing table)
- [!] Currently missing `nqestnrtmplat` and potentially more tables.

## 4. Findings
- The remote Oracle Cloud DB is significantly out of sync with the current JPA entities.
- Manual fixes are possible but many more tables seem to be missing.
- `ddl-auto: update` fails with `connection closed` error during full schema scan.

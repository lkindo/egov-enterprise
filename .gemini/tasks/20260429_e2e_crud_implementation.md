# Task Record: E2E Stabilization - Collaboration & Operations CRUD (2026-04-29)

## Status
- [ ] Implement Delete Note in Collaboration Hub
- [ ] Implement Event Creation Modal in Event Ops Center
- [ ] Implement Delete Event in Event Ops Center
- [ ] Update E2E Page Objects (CollabPage, OpsDetailPage)
- [ ] Add E2E tests for new CRUD operations
- [ ] Check Tier-1 User Portal coverage gaps

## Plan
1. **Frontend Implementation**:
   - `CollaborationHubClient.tsx`: Add delete functionality to the trash button.
   - `EventManagementClient.tsx`: Add a state for creation modal and implement the form with `eventService`.
   - `EventManagementClient.tsx`: Add delete functionality to the table row button.
2. **E2E Object Update**:
   - `CollabPage.ts`: Add `deleteNote(subject)`.
   - `OpsDetailPage.ts`: Add `fillEventForm(data)` and `deleteEvent(name)`.
3. **Verification**:
   - Run the new E2E tests.

## Notes
- Aesthetics: Maintain the premium "Hub" design (Framer Motion, glassmorphism).
- Security: Ensure `storageState` is used for admin access.

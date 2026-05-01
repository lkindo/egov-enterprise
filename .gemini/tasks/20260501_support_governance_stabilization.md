# Task: Resolve Support Governance HTTP 500 and Expand Coverage

## Status
- [x] Analyze Root Cause (HttpMessageNotWritableException)
- [x] Initial fix in HelpService (defensive coding)
- [x] Verify Tier 17 Online Manual pass
- [ ] Identify missing modules in Tier 17 (HPCM, FAQ)
- [ ] Implement HPCM E2E Test
- [ ] Implement FAQ E2E Test
- [ ] Final verification of all Tier 17 tests

## Findings
- HTTP 500 in Online Manual was likely due to missing fields or ID generation issues in `HelpService.createOnlineManual`. Applied defensive logic.
- Tier 17 currently only covers Online Manual and some visibility checks.
- FAQ and HPCM (Help Content) modules are present in the backend but not covered by E2E.

## Plan
1. Add `gotoFaq`, `createFaq`, `deleteFaq` to `SupportPage.ts`.
2. Add `gotoHpcm`, `createHpcm`, `deleteHpcm` to `SupportPage.ts`.
3. Update `17-support-governance.spec.ts` to include tests for FAQ and HPCM.
4. Run tests and ensure no 500 errors or console warnings.

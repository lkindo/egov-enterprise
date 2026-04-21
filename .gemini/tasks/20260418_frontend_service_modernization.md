# 20260418 Frontend Service Modernization

## Task status
- [x] Analyze frontend services for technical debt and encoding issues
- [x] Implement password migration in `EgovAuthenticationProvider`
- [x] Standardize `ManualAdminService.ts` (ApiService + Encoding)
- [x] Standardize `knowledgeService.ts` (Class Pattern + ApiService)
- [x] Standardize `communityService.ts` (ApiService)
- [x] Standardize `deptScheduleService.ts` (ApiService)
- [x] Fix encoding in `AbsenceAdminService.ts`, `DeptAdminService.ts`, `reportService.ts`
- [x] Modernize `reportService.ts` (RESTful path alignment)
- [x] Fix `ApiService` basePath normalization (Leading slash issue)
- [x] Create `WorkReportApiController` and `CommunityUserApiController`
- [x] Modernize `CommunityUserService.ts`
- [x] **EventUserService & DeptJobUserService 현대화**: `ApiService` 상속 및 페이징 파라미터 표준화
- [x] **NAMING RULE 준수**: `export default` 제거 및 Named Export 전환
- [x] **DAM 서비스 현대화**: `src/services/dam/damService.ts` -> `src/services/business/admin/dam/DamAdminService.ts`
- [x] **Security 서비스 현대화 & 이동**: `src/services/security/` -> `src/services/foundation/security/SecurityAdminService.ts`
- [x] **Poll 서비스 현대화 & 이동**: `src/services/poll/` -> `src/services/business/user/poll/PollUserService.ts`
- [x] **File 서비스 현대화 & 이동**: `src/services/file/` -> `src/services/foundation/file/FileService.ts`
- [x] **서비스 디렉토리 통합**: `business/`, `foundation/` 계층 구조로 정리 및 레거시 폴더 삭제
- [x] **글로벌 위생 점검**: 모든 서비스 파일의 `export` 방식 통일 및 레거시 임포트 업데이트
- [ ] **E2E 검증 (Playwright)**: 리팩토링된 서비스가 실제 UI에서 정상 작동하는지 확인

## Notes
- `reportService.ts` is now fully RESTful using `/api/v1/work-reports`.
- `CommunityUserService.ts` is now RESTful using `/api/v1/communities`.
- `ApiService` now strips leading slashes in `basePath` to ensure correct concatenation with `baseURL`.
- `CommentService.ts` fixed (encoding + path).
- `pollService.ts` and `onlineHelpService.ts` migrated to `ApiService`.
- Manual `pageIndex` formula is no longer needed in individual services; `ApiService.get()` handles it centrally.
- IDE error in `ScheduleService.java` addressed via FQCN usage.
- All legacy root service directories (`dam/`, `file/`, `poll/`, `security/`, `deptJob/`) have been removed and consolidated into domain-bound paths.

## Next Steps
1. Run `pnpm test` to ensure all service tests pass.
2. Perform E2E check on Admin modules.
3. Verify newly created `DamAdminService` with backend endpoints.

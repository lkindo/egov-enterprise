# 프론트엔드 인코딩 복구 및 Gradle 설정 안정화 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 및 subagent-driven-development를 사용하여 이 계획을 실행하세요.

**목표:** 프론트엔드 로그 관리 페이지의 손상된 한글 인코딩을 복구하여 빌드 오류를 해결하고, 백엔드 Gradle 설정을 최종 안정화합니다.

**아키텍처:** 
1. **프론트엔드 복구:** 손상된 7개 `.tsx` 파일의 한글 텍스트를 원래 의도된 내용으로 복원 (UTF-8).
2. **백엔드 리팩토링:** `build.gradle`의 `ignoreFailures` 옵션을 정상화하여 품질 통제 강화.
3. **검증:** 전체 프로젝트 빌드 및 테스트 수행으로 마이그레이션 완료 확인.

**기술 스택:** React, Next.js, Gradle 9.4.1, Spring Boot 3.4.1

---

### Task 1: 프론트엔드 로그 관리 페이지 인코딩 복구

**파일:**
- 수정: `frontend/src/app/admin/system/logs/login/page.tsx`
- 수정: `frontend/src/app/admin/system/logs/privacy/page.tsx`
- 수정: `frontend/src/app/admin/system/logs/system/page.tsx`
- 수정: `frontend/src/app/admin/system/logs/transfer/page.tsx`
- 수정: `frontend/src/app/admin/system/logs/user/page.tsx`
- 수정: `frontend/src/app/admin/system/logs/web/page.tsx`
- 수정: `frontend/src/app/admin/system/logs/page.tsx`

**Step 1: `transfer/page.tsx` 복구 및 빌드 확인**
- 손상된 한글 문자열을 올바른 한글로 교체합니다.
- Run: `cd frontend; pnpm build`
- Expected: 해당 파일 관련 구문 오류 사라짐

**Step 2: 나머지 6개 로그 페이지 순차 복구**
- 동일한 방식으로 모든 `.tsx` 파일의 한글 텍스트를 복원합니다.
- 각 파일 수정 후 `pnpm build` 재실행하여 오류 여부를 확인합니다.

**Step 3: 커밋**
Run: `git add . && git commit -m "fix(frontend): restore corrupted korean encoding in log admin pages"`

### Task 2: Gradle 설정 안정화 및 최종 검증

**파일:**
- 수정: `build.gradle` (line 51)

**Step 1: `ignoreFailures` 옵션 비활성화**
- `ignoreFailures = true`를 `ignoreFailures = false`로 수정합니다.

**Step 2: 전체 프로젝트 클린 빌드 및 테스트**
- Run: `./gradlew clean build`
- Expected: BUILD SUCCESSFUL (테스트 포함)

**Step 3: 커밋**
Run: `git add build.gradle && git commit -m "chore: enable test failure enforcement in gradle build"`

### Task 3: 마무리 요약 및 보고

**Step 1: 마이그레이션 완료 리포트 작성**
- 최종 빌드 상태 및 수정 사항 요약 보고.

# Admin Console Auditor - URL Direct Visit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 관리자 콘솔의 모든 주요 메뉴 경로를 직접 방문하여 런타임 오류 및 콘솔 에러를 탐색하고 검증하는 테스트로 고도화합니다.

**Architecture:** 
- `adminRoutes` 배열에 탐색된 모든 주요 관리자 서비스 경로를 정의합니다.
- 각 경로를 `page.goto()`로 직접 방문하고, `console`, `pageerror`, `requestfailed` 이벤트를 모니터링합니다.
- 테스트 종료 시 수집된 오류가 하나라도 있다면 테스트를 실패(`reject`) 처리하여 명확한 리포트를 제공합니다.

**Tech Stack:** Playwright, TypeScript

---

### Task 1: Refine `admin-console-auditor.spec.ts` with Direct Route List

**Files:**
- Modify: `d:\project\egov-enterprise\frontend\e2e\admin-console-auditor.spec.ts`

**Step 1: Define comprehensive admin routes**
- 추출된 디렉토리 구조를 기반으로 `ADMIN_ROUTES` 상수를 정의합니다.

**Step 2: Implement sequential visit logic**
- 기존의 크롤러 로직을 제거하고, `for...of` 루프를 통해 정의된 모든 경로를 방문하는 로직으로 교체합니다.

**Step 3: Add error assertion**
- 테스트 마지막에 `expect(errorLogs.length).toBe(0)`을 추가하여 오류 발견 시 테스트가 실패하도록 설정합니다.

---

### Task 2: Run and Verify the Auditor

**Step 1: Execute Playwright test**
- 명령어를 통해 새로 작성된 테스트를 실행합니다.
- Run: `npx playwright test frontend/e2e/admin-console-auditor.spec.ts --project=chromium`

**Step 2: Analyze Results**
- 테스트 실패 시 로그와 스크린샷(`frontend/test-results/auditor-screenshots`)을 확인하여 근본 원인을 분석합니다.

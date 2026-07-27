import { defineConfig, devices } from '@playwright/test';
;

export default defineConfig({
    testDir: './e2e',
    globalTeardown: './e2e/scripts/cleanup-db.ts',
    // [2026-07-28 하향: 300s → 180s] 종전 5분은 **실측 최장 테스트(50.2s)의 6배**였다. 여유가 아니라
    //   예산 구멍이었다 — CI 는 retries 가 붙으므로 한 테스트가 먹을 수 있는 상한이 timeout×(1+retries)
    //   가 되고, 300s×3 = 15분이었다. 멈춘 테스트 4~5건이면 그것만으로 잡의 75분 예산이 소진된다
    //   (2026-07-27 실측: e2e 3샤드가 정확히 timeout-minutes:75 에서 잘림).
    //   180s 는 실측 최장의 3.6배로, CI 러너가 로컬보다 2~3배 느려도 정상 테스트를 죽이지 않는다.
    //   더 조이지 않는 이유: 90s 로 내리면 50s 짜리가 CI 에서 2배만 느려져도 죽는다.
    timeout: 180000,
    expect: {
        timeout: 60000,
        toHaveScreenshot: {
            maxDiffPixels: 100, // Allow minor differences (anti-aliasing, etc.)
            threshold: 0.1, // Pixel comparison threshold (0-1)
        },
    },
    fullyParallel: false, // Disable parallel execution for stability
    forbidOnly: !!process.env.CI,
    // 로컬은 0 유지(포트 점유·자원 고갈로 재시도가 오히려 해로웠던 이력). CI 는 2회 재시도한다 —
    // 러너는 매 실행이 새 컨테이너라 포트 점유 문제가 없고, 재시도 없이는 플레이키 1건이 즉시
    // 전체 red 가 되어 신호가 무의미해진다. 재시도로 통과한 테스트는 리포트에 flaky 로 남으므로
    // 은폐가 아니라 **가시화**다(반복 flaky 는 별건으로 추적).
    // [2026-07-28 하향: 2 → 1] 재시도의 목적(플레이키 1건이 전체를 red 로 만드는 것 방지)은 1회로도
    //   달성된다. 2회는 실패 테스트의 비용을 3배로 키워 위 timeout 과 곱해지는 쪽 부담이 더 컸다.
    //   스위트가 전량 그린(112 passed)이 된 지금은 재시도 의존도 자체가 낮다.
    //   상한: 180s × 2 = 6분 (종전 300s × 3 = 15분).
    retries: process.env.CI ? 1 : 0,
    workers: 1, // Limit workers to 1 to prevent OOM and connection refused errors
    reporter: 'html',
    use: {
        baseURL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001',
        trace: 'retain-on-failure',
        // [E2E 감사 C1] retries:0 환경에서 'on-first-retry'는 영상이 영구 미수집됨.
        // GEMINI.md §8의 WebP 비디오 교차검증 의무를 복원하기 위해 실패 시 항상 보존으로 변경.
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'tier-1-core',
            testMatch: /01-core-base\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-2-admin',
            testMatch: /02-admin-system\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-3-business',
            testMatch: /03-board-community\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            // 03-board-master-management.spec.ts 는 전용 project 가 없어 tier 단위 실행 시
            // 조용히 누락되고 full-suite 에서만 돌았다. 동일 tier-3 계열로 별도 project 를 부여한다.
            name: 'tier-3-board-master',
            testMatch: /03-board-master-management\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-4-quality',
            testMatch: /04-quality-resilience\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-5-public',
            testMatch: /05-public-experience\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-6-ops',
            testMatch: /06-ops-governance\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-7-productivity',
            testMatch: /07-productivity-suite\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-8-collaboration',
            testMatch: /08-advanced-collaboration\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-9-observability',
            testMatch: /09-admin-observability-workspace\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-10-extension',
            testMatch: /10-operational-extension\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-11-workflow',
            testMatch: /11-enterprise-workflow\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-12-notification',
            testMatch: /12-notification\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-13-mail',
            testMatch: /13-mail\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-14-admin-workflow',
            testMatch: /14-admin-workflow\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-15-collaboration-ext',
            testMatch: /15-collaboration-extension\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-16-system-obs',
            testMatch: /16-system-observability\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-17-support',
            testMatch: /17-support-governance\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-18-business-ext',
            testMatch: /18-business-extension\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-19-hierarchy',
            testMatch: /19-hierarchy-modernization\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-20-security',
            testMatch: /20-common-security-validation\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-21-resilience',
            testMatch: /21-advanced-resilience\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-22-security',
            testMatch: /22-deep-security-guard\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            // [E2E 감사 Phase4] 인증/세션/RBAC 누락 보완 (E1~E12)
            name: 'tier-23-security-auth',
            testMatch: /23-security-auth-supplement\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            // 조직(부서 생성·계층·삭제가드) ↔ 일정(등록·조회축·수정·삭제) 통합 사슬 회귀 방어
            name: 'tier-24-org-schedule',
            testMatch: /24-org-schedule-journey\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            // 부서 업무(등록·상세·수정·삭제, 목록이 업무함 아닌 부서 업무를 보는지) ↔
            // 업무 보고(제목 검색·페이지 크기·페이저·행 수정/삭제) 회귀 방어
            name: 'tier-25-deptjob-workreport',
            testMatch: /25-deptjob-workreport-journey\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'full-suite',
            testMatch: /.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        }
    ],
});

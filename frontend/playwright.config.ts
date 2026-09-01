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
        // [2026-07-28 하향: 60s → 20s] 종전 60초는 Playwright 기본값(5초)의 12배였다.
        //   요소가 **없는** 실패에서는 60초를 기다려도 결과가 바뀌지 않는다 — 순수 낭비다.
        //   그리고 위 test timeout(180s)과 곱해지는 쪽이 실제 예산을 태운다: 단언 3개가 연달아
        //   실패하면 그것만으로 test timeout 을 채우고, CI 는 retries 1 이라 비용이 2배가 된다.
        //   실측(run 30279822185): shard 2 의 실패 13건이 이 방식으로 잡의 67분 중 대부분을 먹었다.
        //   근거값: 성공 경로의 테스트는 로컬에서 건당 1.5~15초이며(06:1.5~3.8s, 07:2.7~4.2s,
        //   05:8~15.7s) 단일 단언은 그보다 훨씬 짧다. 20초는 CI 러너가 로컬보다 3배 느려도
        //   정상 단언을 죽이지 않으면서 실패 비용을 1/3로 줄인다.
        //   ⚠ 특정 화면이 구조적으로 느리다면 전역값을 되돌리지 말고 **그 단언에만**
        //     `{ timeout: N }` 을 주고 이유를 남길 것(전역 완화는 모든 실패를 다시 비싸게 만든다).
        timeout: 20000,
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
    // [2026-09-01 실측 개시: CI 만 1 → 2] 종전 `workers: 1` 의 근거는 "prevent OOM and connection
    //   refused errors" 라는 **미측정 주석 한 줄**이었다. 같은 파일의 다른 튜닝값(timeout 300→180,
    //   expect 60→20, retries 2→1)이 전부 측정과 날짜를 달고 있는 것과 대조된다.
    //
    //   왜 지금 건드리는가 — 실행 구조가 이 값에 묶여 있다. 직렬 실행(364초)을 감당하려고
    //   병렬성을 job 레벨(3 샤드)로 올렸는데, 샤드마다 스택을 통째로 다시 빌드한다.
    //   실측(PR #529): 샤드당 343초 중 테스트는 100초뿐이고 나머지 243초가 빌드·기동이며,
    //   3 샤드 러너 합계 1093초 중 테스트는 300초(27%)다. workers 를 올릴 수 있으면 샤드를
    //   줄여 그 중복 빌드를 없앨 수 있다(1 샤드 × workers 3 이면 wall-clock 동일, 러너 1/3).
    //
    //   로컬은 1 을 유지한다 — 포트 점유·자원 고갈 이력은 로컬 축의 근거이고 러너와 다르다.
    //   CI 는 매 실행이 새 컨테이너다. 우선 2 로 올려 OOM/connection-refused 가설을 실측한다.
    //   샤드 축소는 이 실측이 green 인 뒤의 별도 변경이다(shard 수는 required-checks·gates·
    //   shard-plan 계약에 동결돼 있어 함께 바꿔야 한다).
    workers: process.env.CI ? 2 : 1,
    reporter: 'html',
    use: {
        baseURL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001',
        trace: 'retain-on-failure',
        // [E2E 감사 C1] retries:0 환경에서 'on-first-retry'는 영상이 영구 미수집됨.
        // AGENTS.md "공통 작업 원칙"의 E2E 증거 교차검증을 위해 실패 시 WebP 비디오를 항상 보존한다.
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    // ────────────────────────────────────────────────────────────────────────
    // [2026-08-10 축소: 28개 → 2개] tier-N-* project 26개를 제거한다.
    //
    //   그 26개는 각각 스펙 파일 하나만 매칭했고, `full-suite` 의 testMatch 가
    //   `/.*\.spec\.ts/` 라 **같은 스펙을 다시 전부 매칭**했다. 그래서 project 를 지정하지
    //   않고 실행하면(= `npm run test:e2e` 의 기본 동작) 모든 테스트가 두 번 돈다.
    //   ci.yml 이 `--project=full-suite` 를 붙이게 된 것이 바로 이 문제 때문이며, 그 커밋
    //   본문에 실측이 남아 있다: **226건 = full-suite 112 + tier-* 112 + setup 2**.
    //   즉 우회는 CI 에만 적용됐고 **로컬은 지금까지 계속 2배를 돌고 있었다.**
    //
    //   tier-* 의 존재 이유였던 "특정 tier 만 빠르게"는 파일 지정으로 동일하게 달성된다:
    //     npx playwright test e2e/01-core-base.spec.ts
    //     npx playwright test -g "Deep Security"           (제목 필터)
    //   project 를 파일 단위로 복제할 필요가 없다.
    //
    //   `full-suite` 라는 이름은 **의도적으로 유지**한다 — ci.yml 의 `--project=full-suite`
    //   와 스크린샷 기준선 파일명(`dashboard-baseline-full-suite-linux.png`)이 이 이름에
    //   묶여 있어, 개명하면 CI 명령과 스냅샷 경로가 동시에 깨진다.
    // ────────────────────────────────────────────────────────────────────────
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'full-suite',
            testMatch: /.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        }
    ],
});

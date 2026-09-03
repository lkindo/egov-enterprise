import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    testTimeout: 15000,
    alias: {
      '@': path.resolve(configDirectory, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // [2026-08-09 범위 정정] 종전 include 는 4개 디렉터리 한정이었고, 그중 실제 파일이
      //   있는 것은 3개뿐이었다(exportUtils·serialization·schemas). 그래서 "커버리지 98%" 가
      //   **전체 469개 소스 중 3개 파일**을 재고 있었다 — 관리 지표로 쓸 수 없는 숫자다.
      //
      //   ⚠ 더 문제는 **이미 있는 검증이 수치에 안 잡혔다**는 것이다. 테스트 57개는
      //   app(17)·services(12)·lib(9)·components(8)·hooks(3)·contexts(2) 를 실제로 검증하는데
      //   include 가 그 전부를 배제하고 있었다. 범위를 넓히는 것은 커버리지를 '올리는' 일이
      //   아니라 **이미 하고 있던 검증을 보이게 하는** 일이다.
      //
      //   숫자는 내려간다. 그것이 실측값이며 개선의 출발점이다.
      include: [
        'src/app/**',
        'src/components/**',
        'src/contexts/**',
        'src/hooks/**',
        'src/lib/**',
        'src/services/**',
        'src/constants/**',
        'src/config/**',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        // 코드젠 산출물 — 사람이 쓰지 않으므로 분모에 넣으면 수치만 왜곡한다.
        //   generated-api.d.ts 17,196줄 · generated-zod.ts 3,904줄.
        //   이 둘의 정합은 커버리지가 아니라 codegen:verify 게이트가 지킨다.
        'src/types/**',
        // 타입 선언만 있는 파일은 런타임 코드가 없다.
        '**/*.d.ts',
        // 테스트 하네스 자신.
        'src/mocks/**',
        'src/**/__tests__/**',
        // i18n 메시지 로더 — 선언적 설정에 가깝다.
        'src/i18n/**',
      ],
      // [2026-08-15 실측 래칫 · 3차] foundation/system 관리자 서비스 6종(설문·정보보안·모니터링·
      // 게시판·사용자·권한)에 계약 테스트 176개를 추가한 결과:
      // statements 33.23 / branches 27.71 / functions 28.53 / lines 33.89 (103 files / 767 tests).
      //
      // 2차(107개)에 이어 서비스 계층을 계속 덮는 중이다. 화면(app/**)이 아니라 서비스를 먼저 겨누는
      // 이유는 여기가 URL 조합·페이징 변환·경로 변수를 쥐고 있어 테스트당 회수가 가장 크기 때문이다.
      // functions 가 특히 크게 올랐다(26.73 -> 28.53) — 서비스 메서드가 함수 분모의 큰 몫이다.
      //
      // ⚠ 이 값의 완화나 include 축소로 수치를 맞추지 않는다. 분모가 늘면(새 소스 추가) 테스트도
      //   함께 보강한다. 확보한 수준은 그때그때 잠근다(build.gradle 의 JaCoCo 래칫과 동일 원칙).
      //   branches 는 27 을 유지한다 — 실측 27.71 이라 28 로 올리면 미달이다.
      // [2026-08-15 실측 래칫 · 4차] system 관리자 서비스 8종(통계·부서·커뮤니티·온라인투표·
      // 사용자권한·로그인정책·배너·감사)에 계약 테스트 199개를 추가한 결과:
      // statements 33.70 / branches 27.83 / functions 29.69 / lines 34.39 (111 files / 966 tests).
      // functions 가 다시 크게 올랐다(28.53 -> 29.69) — 서비스 메서드가 함수 분모의 큰 몫이다.
      // statements·branches 는 실측이 각각 33.70/27.83 이라 34/28 로는 올리지 못한다(미달).
      // [2026-08-15 실측 래칫 · 5차/최종] foundation/system 잔여 10종에 계약 테스트 293개를 추가해
      // 이 디렉터리 24개 서비스를 **전부** 덮었다(디렉터리 커버리지 91.36%).
      // statements 34.29 / branches 27.85 / functions 31.05 / lines 35.02 (121 files / 1259 tests).
      //
      // 이번 세션 누적: 458 -> 1259 tests, lines 31.22 -> 35.02. functions 가 가장 크게 올랐다
      // (25.27 -> 31.05) — 서비스 메서드가 함수 분모의 큰 몫이라는 가설이 5회 연속 확인됐다.
      // branches 만 27 에 머문다(27.85) — 서비스 계층은 분기가 얕고, 분기는 화면·훅에 몰려 있다.
      //
      // ⚠ 이 값의 완화나 include 축소로 수치를 맞추지 않는다. 확보한 수준은 그때그때 잠근다.
      //
      // [2026-09-03 실측 래칫 · 6차] **3주간 확보분이 잠기지 않은 채 쌓여 있었다.**
      // 5차 이후 이 파일은 한 글자도 바뀌지 않았는데(분모 불변 — exclude 확대로 인한 착시가 아니다)
      // 그 사이 테스트 파일 171개가 추가돼 1,259 -> 2,440 tests(294 files)가 됐고 커버리지가 사실상
      // 두 배가 됐다. 임계는 34/27/31/35 그대로여서 **커버리지가 절반으로 떨어져도 CI 는 green** 이었다.
      //
      // 실측 두 환경:
      //   로컬 win32 : statements 72.21 / branches 64.06 / functions 65.11 / lines 74.24
      //   CI ubuntu  : statements 72.19 / branches 64.05 / functions 65.06 / lines 74.23
      //     (run 33722754242 frontend-scope, 같은 294 files / 2440 tests)
      // 하한은 **CI 실측에서 뽑되 floor 가 아니라 여유를 둔다.** 처음에는 floor(72/64/65/74)로
      // 잡으려 했고, 적대 검증이 그것을 뒤집었다. 근거 셋이다.
      //
      // ① **이 저장소의 커버리지 래칫 정책은 원래 floor 가 아니다.** 같은 2026-08-15 캠페인의
      //    커밋 0b881de5a 와 build.gradle 의 JaCoCo 래칫은 실측 LINE 90.19 / BRANCH 77.09 에 대해
      //    0.85 / 0.70 을 잠그며 **여유 +5.19pp / +7.09pp** 를 남겼고, 사유를 "정상적인 리팩터가
      //    곧바로 깨지지 않을 만큼" 이라고 적었다. 같은 커밋이 ESLint 만 "실측이 253 이므로 여유 0"
      //    으로 달리 처리했다 — **결정적 정적 카운트는 여유 0, 런타임 실수 측정은 여유 확보**라는
      //    구분이다. 커버리지는 후자다. 3~5차의 0.02~0.05pp 여유는 정책이 아니라 정수 반올림의
      //    부산물이며, 그 임계는 2026-08-15 이후 **한 번도 구속력을 가진 적이 없다**(08-25 에 이미
      //    실측 48/43/41/49 로 여유 14pp). 즉 "얇아도 flapping 이 없었다" 는 안전의 증거가 아니다.
      //
      // ② **평범한 개발 구간의 단일 병합 하락폭이 floor 여유보다 크다.** 테스트 캠페인이 아닌
      //    2026-08-25~26 의 성공한 main frontend-scope 8회를 CI 로그로 실측하니 연속 병합 간 최대
      //    하락이 statements -0.11 · branches -0.11 · **functions -0.15pp** 였다. floor 로 잡았을 때의
      //    CI 여유는 branches 0.05pp(6분기) · functions 0.06pp(2함수)로 그보다 작다 — 이 저장소가
      //    이미 병합해 온 종류의 PR 한 건이 required frontend-build 를 red 로 만든다.
      //
      // ③ **72/64/65/74 는 6시간 전에 처음 도달한 고점이다.** functions 는 09-03 05:28 병합에서 처음
      //    65 를 넘었고(6시간 전 64.75), branches 는 첫 도달 시 정확히 64.00 이었다. 고점을 하한으로
      //    못 박는 것은 "확보한 수준을 잠근다" 가 아니다.
      //
      // 그래서 **71 / 63 / 64 / 73** — 2026-09-01 이후 측정된 main run 9회가 **전부** 만족한 최고
      // 정수 집합이다(그 구간 최저 71.47 / 63.28 / 64.20 / 73.45). 34/27/31/35 대비 +37/+36/+33/+38
      // 강화이므로 완화가 아니며 include/exclude 도 손대지 않았다.
      //
      // 남은 여유를 **백분율이 아니라 개수로** 적는다 — pp 로만 보면 크기를 오해한다.
      //   (분모 statements 14,640 · branches 12,949 · functions 4,214 · lines 13,240,
      //    CI 실측 72.19 / 64.05 / 65.06 / 74.23 기준)
      //   statements 여유 약 174문장 · branches 약 136분기 · functions 약 45함수 · lines 약 162라인
      // 관측된 최대 단일 하락(functions -0.15pp ≈ 6함수)의 7배 이상이고 JaCoCo 래칫의 의도와 같은 크기다.
      //
      // ④ **측정 자체가 run-to-run 으로 흔들린다.** 같은 커밋·같은 머신에서 두 번 돌렸더니
      //    branches 가 64.06(8,296분기) → 64.05(8,295분기)로 달랐다. 분기 1개 차이지만, floor 로
      //    잡으면 이 정도 흔들림도 red 가 된다. 커버리지는 결정적 카운트가 아니다.
      //
      // ⚠ 다음 인상 때: 하한은 **CI 실행 로그의 `All files` 행**에서 뽑고, 가능하면 2회 이상 확보해
      //   변동 폭을 확인한 뒤 정한다. 로컬 win32 는 모든 축에서 CI 보다 0.01~0.05pp 높게 나온다
      //   (같은 트리 42fb6585e 실측). 로컬만 보고 올리면 CI 가 미달한다.
      //
      // ⚠ 재검증 시 **로컬 표의 행 수를 분모로 오해하지 말 것.** vitest 는 에이전트 환경에서
      //   `skipFull` 을 켜 100% 파일을 표에서 감춘다 — 로컬 표는 파일 414행인데 같은 커밋의 CI 표는
      //   486행이다. 분모가 준 것이 아니라 표시가 다른 것이다. 근거로는 표가 아니라
      //   `Coverage summary` 총계(로컬) 또는 CI 의 `All files` 행을 쓴다.
      //
      // ⚠ thresholds 블록은 이 파일에 **하나만** 두고 coverage 블록 안에 유지할 것.
      //   거버넌스 registry 의 vitest-coverage-threshold selector 가 파일의 첫 `thresholds:` 를 읽는다
      //   (scripts/governance-gates-contract.mjs). 더 앞선 블록이 생기면 조용히 엉뚱한 값을 읽는다.
      //   같은 블록 안에 키가 중복되면 fail-closed 라 그쪽은 안전하다.
      thresholds: {
        statements: 71,
        branches: 63,
        functions: 64,
        lines: 73,
      },
    },
  },
});

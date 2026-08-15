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
      thresholds: {
        statements: 34,
        branches: 27,
        functions: 31,
        lines: 35,
      },
    },
  },
});

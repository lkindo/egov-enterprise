#!/usr/bin/env node
/**
 * 통합 검증 게이트 (§2.H 검증 인프라 파편화 해소).
 *
 * "실제로 안 깨진다"를 단일 명령으로 증명한다 — 백엔드 전 모듈 컴파일+테스트 + 프론트 tsc/next build/vitest.
 * Cross-platform(Windows: .\gradlew.bat / *nix: ./gradlew), make 불요. e2e 는 서버 기동 필요라 별도.
 *
 *   node scripts/verify.mjs [all|be|fe]     (기본: all)
 *   npm run verify | verify:be | verify:fe
 *
 * CI(ci.yml) 빌링 복구 시 이 게이트를 상시 실행하면 로컬↔CI 검증 정합이 성립한다.
 */
import { execSync } from 'node:child_process';
import { platform } from 'node:os';

const isWin = platform() === 'win32';
const gradlew = isWin ? '.\\gradlew.bat' : './gradlew';
const scope = (process.argv[2] || 'all').toLowerCase();

if (!['all', 'be', 'fe'].includes(scope)) {
  console.error(`알 수 없는 범위 '${scope}' — [all|be|fe] 중 하나여야 합니다.`);
  process.exit(2);
}

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, TZ: 'Asia/Seoul' } });
}

try {
  if (scope === 'all' || scope === 'be') {
    // 백엔드: §0.6 컴파일 무결성 + 전 모듈 테스트(하네스 린터 게이트 포함)
    run(`${gradlew} compileJava compileTestJava test -Dfile.encoding=UTF-8`);
  }
  if (scope === 'all' || scope === 'fe') {
    // 프론트: 타입·RSC 빌드·vitest(색상/fe-auth 회귀 게이트 포함)
    run('pnpm -C frontend exec tsc --noEmit');
    run('pnpm -C frontend build');
    run('pnpm -C frontend test');
  }
  console.log(`\n✅ [verify:${scope}] 통합 게이트 통과 — 요청 범위 전 검증 그린`);
} catch (e) {
  console.error(`\n❌ [verify:${scope}] 통합 게이트 실패 — ${e.message}`);
  process.exit(1);
}

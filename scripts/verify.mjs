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

if (!['all', 'be', 'fe', 'ops'].includes(scope)) {
  console.error(`알 수 없는 범위 '${scope}' — [all|be|fe|ops] 중 하나여야 합니다.`);
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
  if (scope === 'ops') {
    // 운영 형상: GitHub 의 **실제** 브랜치 보호 설정과 ci.yml 을 대조한다.
    //
    // [왜 all 에 넣지 않는가] 이 검사는 GitHub API 조회가 필요하고 ruleset 읽기는 저장소 admin
    //   권한을 요구한다. 네트워크·토큰이 없는 환경에서 `verify all` 이 통째로 실패하면
    //   개발 루프가 인프라 사정으로 막힌다. 반대로 조용히 skip 하면 이 저장소가 반복해서 당한
    //   false-green 이 되므로, **별도 스코프로 분리하고 스킵은 허용하지 않는다**.
    //   병합 전·릴리스 전 체크리스트에서 `npm run verify:ops` 로 명시 실행할 것.
    run('node scripts/verify-branch-protection.mjs');
  }
  console.log(`\n✅ [verify:${scope}] 통합 게이트 통과 — 요청 범위 전 검증 그린`);
} catch (e) {
  console.error(`\n❌ [verify:${scope}] 통합 게이트 실패 — ${e.message}`);
  process.exit(1);
}

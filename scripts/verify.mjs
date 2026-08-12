#!/usr/bin/env node
/**
 * 통합 검증 게이트 (§2.H 검증 인프라 파편화 해소).
 *
 * "실제로 안 깨진다"를 단일 명령으로 증명한다 — 백엔드 컴파일·테스트·커버리지 하한과
 * 프론트 계약·lint·tsc·next build·vitest/coverage 하한을 같은 진입점에서 검증한다.
 * Cross-platform(Windows: .\gradlew.bat / *nix: ./gradlew), make 불요. e2e 는 서버 기동 필요라 별도.
 *
 *   node scripts/verify.mjs [all|be|fe]     (기본: all)
 *   npm run verify | verify:be | verify:fe
 *
 * CI 와 동일한 핵심 품질 축을 로컬에서도 실행해 로컬↔CI 검증 정합을 유지한다.
 */
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { platform } from 'node:os';

const isWin = platform() === 'win32';
const gradlew = isWin ? '.\\gradlew.bat' : './gradlew';
const scope = (process.argv[2] || 'all').toLowerCase();

if (!['all', 'be', 'fe', 'ops'].includes(scope)) {
  console.error(`알 수 없는 범위 '${scope}' — [all|be|fe|ops] 중 하나여야 합니다.`);
  process.exit(2);
}

function run(cmd, extraEnv = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, TZ: 'Asia/Seoul', ...extraEnv },
  });
}

try {
  if (scope === 'all' || scope === 'be') {
    // DB 진단 브리지는 자격증명·물리 스키마에 직접 닿으므로 쓰기 우회 회귀를 백엔드보다 먼저 차단한다.
    run('node --test .agent/scripts/db-bridge.test.js');
    // 백엔드: §0.6 컴파일 무결성 + 전 모듈 테스트 + JaCoCo 50% 하한(하네스 포함)
    run(`${gradlew} compileJava compileTestJava test jacocoRootCoverageVerification -Dfile.encoding=UTF-8`);
  }
  if (scope === 'all' || scope === 'fe') {
    // 프론트: OpenAPI 계약·정적 품질·타입·RSC 빌드·번들 예산·vitest 전체소스 coverage 래칫
    run('pnpm -C frontend run codegen:verify');
    run('pnpm -C frontend run codegen:verify:zod');
    run('pnpm -C frontend run lint');
    run('pnpm -C frontend exec tsc --noEmit');
    // middleware.ts는 production에서 JWT_SECRET 부재를 fail-fast 한다. 호출자가 제공한 값은
    // 그대로 존중하고, 로컬 검증용 값이 없을 때만 이 프로세스의 build 자식에 일회성 값을 전달한다.
    const frontendBuildEnv = process.env.JWT_SECRET
      ? {}
      : { JWT_SECRET: randomBytes(44).toString('hex') };
    run('pnpm -C frontend build', frontendBuildEnv);
    run('pnpm -C frontend run bundle:check');
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

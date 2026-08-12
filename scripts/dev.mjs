#!/usr/bin/env node
/**
 * 개발 서버 통합 기동 진입점 (백엔드 bootRun + 프론트 next dev).
 *
 * [존재 이유] JWT 서명 시크릿의 좌우 비대칭을 구조적으로 막는다.
 *
 * 백엔드(JwtTokenProvider)와 프론트 Proxy(frontend/src/proxy.ts)는 **같은 시크릿**으로
 * 서명·검증해야 한다. 그런데 둘은 서로 다른 프로세스라 각자 환경변수를 따로 해석하고,
 * 어느 한쪽만 루트 .env 를 받으면 서명 검증이 전량 실패한다. 그 실패는 조용하다 —
 * 로그인 API 는 200 을 주고(백엔드 담당), 그 다음 페이지 진입에서 미들웨어가 307 로 /login 에
 * 되돌려보내므로 "인증 완료 후 다시 로그인창" 이라는 무한 루프로만 드러난다. (2026-07-19 실제 발생)
 *
 * 이 스크립트는 두 자식 프로세스를 **하나의 환경**에서 낳아 그 비대칭을 원천 차단한다.
 * package.json 의 dev 스크립트가 `node --env-file-if-exists=.env` 로 이 파일을 실행하므로,
 * 루트 .env 가 있으면 그 값이, 없으면 양쪽 다 각자의 dev 기본값이 쓰인다 — 어느 쪽이든 대칭이다.
 *
 * ⚠ 백엔드만 / 프론트만 따로 띄우는 경우(npm run backend, npm run frontend)는 이 보장이 없다.
 *   한쪽만 .env 가 실린 셸에서 띄우면 비대칭이 재발한다. 그 경우를 위해 양쪽 모두 기동 시
 *   시크릿 지문(SHA-256 앞 8자)을 로그로 남기므로, 두 로그의 지문을 눈으로 대조하면 즉시 판별된다.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// 기동 시점에 시크릿 지문을 찍어 둔다. 값 자체는 절대 출력하지 않는다(지문만으로 대조에 충분).
const secret = process.env.JWT_SECRET;
const fingerprint = secret ? createHash('sha256').update(secret).digest('hex').slice(0, 8) : null;
console.log(
  fingerprint
    ? `[dev] JWT_SECRET 주입됨 (지문 ${fingerprint}) — 백엔드/프론트 양쪽에 동일하게 전달합니다.`
    : '[dev] JWT_SECRET 미설정 — 백엔드/프론트 양쪽이 각자의 dev 기본값을 씁니다(값이 같으므로 대칭).'
);

// ⚠ shell:true 에서는 인자 배열이 하나의 셸 문자열로 합쳐지므로, 배열 원소로 넘긴 명령의
//   따옴표가 사라진다. 그러면 concurrently 가 "gradlew.bat :api-server:bootRun ..." 을
//   토큰마다 별개 명령으로 해석해 전부 실패한다. 따옴표를 포함한 단일 문자열로 넘긴다.
// gradlew 는 절대경로로 부른다. 셸에 따라 현재 디렉터리가 실행 경로 탐색에서 빠져 있으면
// (Windows 의 NoDefaultCurrentDirectoryInExePath=1 등) 'gradlew.bat' 만으로는 못 찾는다.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gradlew = join(repoRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

const command =
  'npx -y concurrently -n "API,WEB" -c "blue,green" ' +
  `"\\"${gradlew}\\" :api-server:bootRun -Dfile.encoding=UTF-8" ` +
  '"pnpm -C frontend dev"';

const child = spawn(command, { stdio: 'inherit', shell: true, cwd: repoRoot, env: process.env });

child.on('exit', (code) => process.exit(code ?? 0));

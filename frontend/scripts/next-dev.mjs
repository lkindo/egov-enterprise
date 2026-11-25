#!/usr/bin/env node
/**
 * `next dev` 진입점(frontend/package.json 의 dev). 어느 경로로 띄워도(`npm run dev`·`npm run frontend`·`cd frontend && pnpm dev`)
 * 같은 규칙을 지난다(2026-11-25 DEC-OPS-432, Codex 2차 검토).
 *
 * ① 서명 비밀을 넘기지 않는다 — 백엔드용 ES256 개인키 키링(JWT_SIGNING_*)과 퇴역한 HMAC 비밀(JWT_SECRET·JWT_ACCEPT_LEGACY_HMAC)이
 *    셸에 남아 있어도 Next 프로세스는 받지 않는다(ADR-0060: Next 는 JWT_VERIFY_KEYS_JSON 공개키로만 검증한다). Windows 의 환경 변수
 *    이름은 대소문자를 가리지 않으므로 이름을 대문자로 맞춰 거른다.
 * ② 루프백에 바인딩한다 — `next dev` 의 기본은 모든 주소다. 키링 없이 띄운 백엔드는 공개 저장소의 개발용 서명키를 쓰고 루프백에만
 *    열리는데, 그 앞의 Next 가 모든 주소에 열리면 같은 망의 누구나 Next 를 거쳐 그 백엔드에 닿는다. 다른 기기에서 열어야 하면 자체
 *    키쌍을 준 뒤 `-H 0.0.0.0` 처럼 직접 지정한다(지정하면 그 값을 쓴다).
 * ③ 받은 인자를 그대로 넘기고(포트를 주지 않으면 3001), 자식의 종료 코드를 돌려준다 — 시그널로 끝나면 실패(1)다.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Next 프로세스에 넘기지 않는 서명 비밀. scripts/dev.mjs 의 FRONTEND_WITHHELD_SIGNING_ENV 와 같아야 한다(dev-remote-db-guard 시험이 대조한다). */
export const WITHHELD_SIGNING_ENV = Object.freeze([
  'JWT_SIGNING_ACTIVE_KID', 'JWT_SIGNING_KEYS_JSON', 'JWT_SECRET', 'JWT_ACCEPT_LEGACY_HMAC',
]);

export function withoutSigningSecrets(env) {
  const withheld = new Set(WITHHELD_SIGNING_ENV);
  return Object.fromEntries(Object.entries(env).filter(([name]) => !withheld.has(name.toUpperCase())));
}

const givenOption = (args, short, long) => args.some((arg) => arg === short || arg === long || arg.startsWith(`${long}=`));

export function nextDevArguments(args) {
  return [
    'dev',
    ...(givenOption(args, '-p', '--port') ? [] : ['-p', '3001']),
    ...(givenOption(args, '-H', '--hostname') ? [] : ['-H', '127.0.0.1']),
    ...args,
  ];
}

/** 자식의 종료를 이 프로세스의 종료 코드로 옮긴다. 시그널로 끝났으면(code 가 null) 성공으로 보지 않는다. */
export function exitCodeOf(code, signal) {
  if (code !== null && code !== undefined) return code;
  return signal ? 1 : 0;
}

function main() {
  const require = createRequire(import.meta.url);
  const nextBin = require.resolve('next/dist/bin/next');
  // 종전 dev 스크립트(cross-env NODE_OPTIONS=--max-old-space-size=8192)와 같은 힙 상한.
  const env = { ...withoutSigningSecrets(process.env), NODE_OPTIONS: '--max-old-space-size=8192' };
  const child = spawn(process.execPath, [nextBin, ...nextDevArguments(process.argv.slice(2))], { stdio: 'inherit', env });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    });
  }
  child.on('error', () => process.exit(1));
  child.on('exit', (code, signal) => process.exit(exitCodeOf(code, signal)));
}

// 시험이 판정 함수만 불러갈 때는 Next 를 띄우지 않는다.
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main();
}

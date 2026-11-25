#!/usr/bin/env node
/**
 * Next CLI 진입점 — frontend/package.json 의 dev·build·start 가 이 파일을 지난다(2026-11-25 DEC-OPS-432, Codex 2·3차 검토).
 * 어느 경로로 띄워도(`npm run dev`·`npm run frontend`·`pnpm -C frontend build`·`cd frontend && pnpm dev`) 같은 규칙이다.
 *
 * ① 서명 비밀을 넘기지 않는다 — 백엔드용 ES256 개인키 키링(JWT_SIGNING_*)과 퇴역한 HMAC 비밀(JWT_SECRET·JWT_ACCEPT_LEGACY_HMAC)이
 *    셸에 남아 있어도 Next 프로세스는 받지 않는다(ADR-0060: Next 는 JWT_VERIFY_KEYS_JSON 공개키로만 검증한다). Windows 의 환경 변수
 *    이름은 대소문자를 가리지 않으므로 이름을 대문자로 맞춰 거른다.
 * ② Next 가 스스로 읽는 dotenv(frontend/.env·.env.local·.env.<mode>[.local])에 그 이름이 있으면 시작하지 않는다 — 래퍼는 Next 가
 *    나중에 읽는 파일을 거를 수 없다. 1차 전환 때 넣어 둔 JWT_SECRET 같은 줄을 지우라고 알리고, 값은 출력하지 않는다.
 * ③ dev 는 루프백에 바인딩한다 — `next dev` 의 기본은 모든 주소다. 키링 없이 띄운 백엔드는 공개 저장소의 개발용 서명키를 쓰고
 *    루프백에만 열리는데, 그 앞의 Next 가 모든 주소에 열리면 같은 망의 누구나 Next 를 거쳐 그 백엔드에 닿는다. 다른 기기에서 열어야
 *    하면 자체 키쌍을 준 뒤 `-H 0.0.0.0` 처럼 직접 지정한다(지정하면 그 값을 쓴다). 포트를 주지 않으면 3001 이다.
 * ④ 받은 인자를 그대로 넘기고 자식의 종료 코드를 돌려준다 — 시그널로 끝나면 실패(1)다. POSIX 에서는 받은 종료 신호를 자식에 넘기고,
 *    Windows 에서는 콘솔이 Ctrl+C 를 자식에도 직접 보내므로 넘기지 않고(강제 종료가 되어 Next 정리가 끊긴다) 자식이 끝나기를 기다린다.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Next 프로세스에 넘기지 않는 서명 비밀. scripts/dev.mjs 의 FRONTEND_WITHHELD_SIGNING_ENV 와 같아야 한다(dev-remote-db-guard 시험이 대조한다). */
export const WITHHELD_SIGNING_ENV = Object.freeze([
  'JWT_SIGNING_ACTIVE_KID', 'JWT_SIGNING_KEYS_JSON', 'JWT_SECRET', 'JWT_ACCEPT_LEGACY_HMAC',
]);

/** Next 가 스스로 읽는 dotenv 파일(Next 환경 변수 로드 순서의 모든 이름). */
export const NEXT_DOTENV_FILES = Object.freeze([
  '.env', '.env.local',
  '.env.development', '.env.development.local',
  '.env.production', '.env.production.local',
  '.env.test', '.env.test.local',
]);

const SUBCOMMANDS = new Set(['dev', 'build', 'start']);
const HEAP_LIMITED = new Set(['dev', 'build']);

export function withoutSigningSecrets(env) {
  const withheld = new Set(WITHHELD_SIGNING_ENV);
  return Object.fromEntries(Object.entries(env).filter(([name]) => !withheld.has(name.toUpperCase())));
}

/** dotenv 본문에서 서명 비밀 이름을 정의한 줄의 이름만 돌려준다(값은 보지 않는다). */
export function withheldNamesIn(dotenvText) {
  const withheld = new Set(WITHHELD_SIGNING_ENV);
  const names = [];
  for (const line of dotenvText.split(/\r?\n/u)) {
    const name = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/u.exec(line)?.[1];
    if (name && withheld.has(name.toUpperCase())) names.push(name);
  }
  return names;
}

/** 프런트 폴더의 dotenv 에서 서명 비밀을 정의한 곳을 `파일: 이름` 으로 돌려준다. */
export function dotenvSigningSecrets(frontendRoot) {
  const found = [];
  for (const file of NEXT_DOTENV_FILES) {
    const full = path.join(frontendRoot, file);
    if (!existsSync(full)) continue;
    for (const name of withheldNamesIn(readFileSync(full, 'utf8'))) found.push(`${file}: ${name}`);
  }
  return found;
}

const givenOption = (args, short, long) => args.some((arg) => arg === short || arg === long || arg.startsWith(`${long}=`));

export function nextArguments(subcommand, args) {
  if (!SUBCOMMANDS.has(subcommand)) throw new Error(`next-cli: dev·build·start 만 받는다(받은 값: ${subcommand ?? '없음'})`);
  if (subcommand !== 'dev') return [subcommand, ...args];
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

/** 자식 환경 — 서명 비밀을 걷고, dev·build 는 종전 스크립트(cross-env NODE_OPTIONS=--max-old-space-size=8192)와 같은 힙 상한을 준다. */
export function childEnvironment(subcommand, env) {
  const clean = withoutSigningSecrets(env);
  return HEAP_LIMITED.has(subcommand) ? { ...clean, NODE_OPTIONS: '--max-old-space-size=8192' } : clean;
}

function main() {
  const [subcommand, ...args] = process.argv.slice(2);
  const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const nextArgs = nextArguments(subcommand, args);
  const leaked = dotenvSigningSecrets(frontendRoot);
  if (leaked.length > 0) {
    console.error(`[next-cli] 프런트 dotenv 에 서명 비밀이 있어 시작하지 않습니다 — ${leaked.join(', ')}.`);
    console.error('[next-cli] Next 는 JWT_VERIFY_KEYS_JSON 공개키로만 검증합니다(ADR-0060 2차). 그 줄을 지우고 다시 실행하세요.');
    process.exit(1);
  }
  const require = createRequire(import.meta.url);
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...nextArgs], {
    stdio: 'inherit',
    env: childEnvironment(subcommand, process.env),
  });
  const forwarded = process.platform === 'win32' ? [] : ['SIGINT', 'SIGTERM', 'SIGHUP'];
  for (const signal of forwarded) {
    process.on(signal, () => {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    });
  }
  if (process.platform === 'win32') {
    // 콘솔이 자식에도 보낸다 — 래퍼가 먼저 끝나 프롬프트가 돌아온 뒤 Next 출력이 이어지지 않게 자식을 기다린다.
    for (const signal of ['SIGINT', 'SIGBREAK']) process.on(signal, () => {});
  }
  child.on('error', () => process.exit(1));
  child.on('exit', (code, signal) => process.exit(exitCodeOf(code, signal)));
}

// 시험이 판정 함수만 불러갈 때는 Next 를 띄우지 않는다.
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main();
}

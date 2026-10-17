/*
 * 생성 계약(api-docs.json → 생성 타입 3종)의 드리프트 검증과, 생성 타입을 만드는 생성기 실행 정의.
 *
 * 비교 기준은 index 다. index 의 api-docs.json 으로 임시 디렉터리에 다시 만든 결과를 index 의 생성물과 비교한다. 커밋에 실릴 쌍이라,
 * 스펙만 stage 하고 다시 만든 생성물을 빠뜨린 커밋을 잡는다. index 는 git cat-file 로 꺼내 경로를 stat 하지 않고, pre-commit 이
 * 넘기는 GIT_INDEX_FILE(커밋 -a·경로 지정 커밋의 임시 index)을 그대로 따른다. 네 파일 가운데 하나라도 작업 트리가 index 와 다르면
 * (줄 끝 정규화 후) 작업 트리 쌍도 같은 방법으로 비교한다 — 스펙만 고치고 다시 만들지 않은 작업본을 잡는다. 스펙이 같으면 생성을
 * 다시 하지 않는다. 성공·실패 모두 작업 트리와 index 를 쓰지 않는다. 생성물의 누락·미추적은 실패이며 복원하지 않는다.
 *
 * 생성기 실행(runContractGenerator)과 그 상수는 생성기 투영(reusable-contract-projection.mjs)도 쓰는 하나의 정의다. 그 모듈이 아니라
 * 여기 두는 이유: frontend 잡이 실행하는 이 검증이 생성기·도구 경로 표(ci-change-scope.mjs)의 모듈을 import 하면, 그 표 항목들에
 * frontend 축을 켜야 한다(도구 경로 표 계약이 그렇게 계산한다). 이 파일은 표 밖이라 바뀌면 전수 검증이 돈다.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const API_DOCS_PATH = 'api-docs.json';
/** 생성 타입 3종(저장소 기준 경로). 원본 커밋본과 같은 생성기로 만든다. */
export const GENERATED_CONTRACT_TYPES = Object.freeze({
  zod: 'frontend/src/types/generated-zod.ts',
  operations: 'frontend/src/types/generated-operations.ts',
  api: 'frontend/src/types/generated-api.d.ts',
});
/** 생성기마다 만드는 생성 타입(GENERATED_CONTRACT_TYPES 의 키). 검증 종류도 이 이름이다. */
export const CONTRACT_GENERATORS = Object.freeze({
  api: Object.freeze(['api']),
  zod: Object.freeze(['zod', 'operations']),
});
/** generated-api.d.ts 를 만드는 openapi-typescript CLI(원본 frontend 의존성, 저장소 기준 경로). */
export const OPENAPI_TYPESCRIPT_CLI = 'frontend/node_modules/openapi-typescript/bin/cli.js';
const CODEGEN_ZOD = '.agent/scripts/codegen-zod.js';
const GENERATOR_CWD_PREFIX = 'egov-contract-generator-';
const VERIFY_PREFIX = 'egov-contract-verify-';
const MAX_BUFFER = 64 * 1024 * 1024;
const normalizeLineEndings = text => text.replace(/\r\n?/gu, '\n');

/** 이 호출이 체크아웃 밖(시스템 임시 디렉터리 바로 아래)에 만든 디렉터리만 지운다. */
function removeOwnTemporary(directory, prefix) {
  if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith(prefix)) {
    throw new Error('Unexpected temporary contract directory');
  }
  rmSync(directory, { recursive: true, force: true });
}

/**
 * 생성기 하나를 실행한다. `toolRoot` 는 생성기와 원본 frontend 의존성이 있는 트리이고, `specPath`·`outputPaths`(키는
 * CONTRACT_GENERATORS[kind])는 절대 경로다. 실패하면 생성기 이름과 종료 코드로 멈춘다.
 *
 * cwd 는 실행마다 새로 만든 빈 임시 디렉터리다. openapi-typescript 는 cwd 의 redocly 설정을 찾고, 그 `apis` 가 있으면 -o 를 무시하고
 * 설정의 출력 위치에 쓴다 — 트리 안에서 돌리면 설정 파일 하나로 출력 위치가 바뀐다. codegen-zod.js 는 cwd 를 읽지 않는다.
 */
export function runContractGenerator({ kind, toolRoot = repoRoot, specPath, outputPaths, spawn = spawnSync }) {
  if (!Object.hasOwn(CONTRACT_GENERATORS, kind)) throw new Error('Expected contract kind: api or zod');
  for (const key of CONTRACT_GENERATORS[kind]) {
    if (typeof outputPaths?.[key] !== 'string') throw new Error(`Missing ${kind} generator output path: ${key}`);
  }
  const [label, args, env] = kind === 'api'
    ? ['openapi-typescript', [join(toolRoot, OPENAPI_TYPESCRIPT_CLI), specPath, '-o', outputPaths.api], {}]
    : ['codegen-zod', [join(toolRoot, CODEGEN_ZOD)], {
      CODEGEN_API_DOCS_PATH: specPath,
      CODEGEN_ZOD_OUTPUT_PATH: outputPaths.zod,
      CODEGEN_OPERATIONS_OUTPUT_PATH: outputPaths.operations,
    }];
  const cwd = mkdtempSync(join(tmpdir(), GENERATOR_CWD_PREFIX));
  try {
    const result = spawn(process.execPath, args, {
      cwd, env: { ...process.env, ...env }, encoding: 'utf8', windowsHide: true, maxBuffer: MAX_BUFFER,
    });
    if (result.error || result.status !== 0) {
      const detail = result.error?.message ?? `${result.stderr ?? ''}${result.stdout ?? ''}`;
      throw new Error(`${label} failed (${result.status ?? 'spawn'}): ${String(detail).trim().slice(-2000)}`);
    }
  } finally {
    removeOwnTemporary(cwd, GENERATOR_CWD_PREFIX);
  }
}

/** git 을 저장소 루트에서 실행한다. GIT_INDEX_FILE 등 호출자의 환경을 그대로 넘긴다. */
function git(root, args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: root, encoding, windowsHide: true, maxBuffer: MAX_BUFFER });
  if (result.error || result.status !== 0) {
    throw new Error(`git failed (${result.status ?? 'spawn'}): ${result.error?.message ?? `${result.stderr}${result.stdout}`}`);
  }
  return result.stdout;
}

/** index 쌍(과 다를 때 작업 트리 쌍)을 임시 재생성과 비교한다. 작업 트리와 index 를 쓰지 않는다. */
export function verifyGeneratedContracts(kind, root = repoRoot) {
  if (!Object.hasOwn(CONTRACT_GENERATORS, kind)) throw new Error('Expected contract kind: api or zod');
  const keys = CONTRACT_GENERATORS[kind];
  const files = keys.map(key => GENERATED_CONTRACT_TYPES[key]);
  const tracked = [API_DOCS_PATH, ...files];
  git(root, ['ls-files', '--error-unmatch', '--', ...tracked]);
  const staged = tracked.map(file => git(root, ['cat-file', 'blob', `:${file}`], 'buffer'));
  const working = tracked.map(file => readFileSync(join(root, file)));
  const text = buffer => normalizeLineEndings(buffer.toString('utf8'));
  const temporary = mkdtempSync(join(tmpdir(), VERIFY_PREFIX));
  try {
    const regenerate = (side, specPath) => {
      const directory = join(temporary, side);
      mkdirSync(directory);
      const outputPaths = Object.fromEntries(keys.map(key => [key, join(directory, basename(GENERATED_CONTRACT_TYPES[key]))]));
      runContractGenerator({ kind, specPath, outputPaths });
      return keys.map(key => normalizeLineEndings(readFileSync(outputPaths[key], 'utf8')));
    };
    const stagedSpec = join(temporary, API_DOCS_PATH);
    writeFileSync(stagedSpec, staged[0]);
    const fromIndex = regenerate('index', stagedSpec);
    const drift = files.filter((file, index) => text(staged[index + 1]) !== fromIndex[index]).map(file => `${file} [index]`);
    if (tracked.some((file, index) => text(working[index]) !== text(staged[index]))) {
      const fromWorktree = text(working[0]) === text(staged[0]) ? fromIndex : regenerate('worktree', join(root, API_DOCS_PATH));
      files.forEach((file, index) => {
        if (text(working[index + 1]) !== fromWorktree[index]) drift.push(`${file} [working tree]`);
      });
    }
    if (drift.length) {
      throw new Error(`Generated contract drift: ${drift.join(', ')}. [index] compares the staged files with a regeneration from`
        + ' the staged api-docs.json, [working tree] does the same for the checkout. Review the spec, run pnpm -C frontend'
        + ' syncContract to update intentionally, and stage the regenerated files with api-docs.json.');
    }
    return files;
  } finally {
    removeOwnTemporary(temporary, VERIFY_PREFIX);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const files = verifyGeneratedContracts(process.argv[2]);
    console.log(`Generated contracts match: ${files.join(', ')}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

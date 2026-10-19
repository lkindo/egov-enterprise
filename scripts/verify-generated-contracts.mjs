/*
 * 생성 계약(api-docs.json → 생성 타입 3종)의 드리프트 검증과, 생성 타입을 만드는 생성기 실행 정의.
 *
 * 비교 기준은 index 다. index 의 api-docs.json 으로 임시 디렉터리에 다시 만든 결과를 index 의 생성물과 비교한다. 커밋에 실릴 쌍이라,
 * 스펙만 stage 하고 다시 만든 생성물을 빠뜨린 커밋을 잡는다. index 는 git cat-file 로 꺼내 경로를 stat 하지 않고, pre-commit 이
 * 넘기는 GIT_INDEX_FILE(커밋 -a·경로 지정 커밋의 임시 index)을 그대로 따른다. 그 종류(api·zod)가 맡은 스펙·생성물 가운데 하나라도
 * 작업 트리가 index 와 다르면(줄 끝 정규화 후) 작업 트리 쌍도 같은 방법으로 비교한다 — 스펙만 고치고 다시 만들지 않은 작업본을 잡는다.
 * 스펙이 같으면 생성을 다시 하지 않는다. 성공·실패 모두 작업 트리와 index 를 쓰지 않는다. 생성물의 누락·미추적은 실패이며 복원하지 않는다.
 * zod·operations 는 진입 파일과 그 옆 같은 이름 폴더의 묶음 모듈로 나뉜다(2026-10-19, codegen-zod.js 머리말). 묶음 모듈도 같은 쌍으로
 * 비교하며, 다시 만든 결과에 없는 모듈·있는데 빠진 모듈도 드리프트다.
 *
 * 생성기 실행(runContractGenerator)과 그 상수는 생성기 투영(reusable-contract-projection.mjs)도 쓰는 하나의 정의다. 그 모듈이 아니라
 * 여기 두는 이유: frontend 잡이 실행하는 이 검증이 생성기·도구 경로 표(ci-change-scope.mjs)의 모듈을 import 하면, 그 표 항목들에
 * frontend 축을 켜야 한다(도구 경로 표 계약이 그렇게 계산한다). 이 파일은 표 밖이라 바뀌면 전수 검증이 돈다.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
/** 진입 파일 옆 같은 이름 폴더에 묶음 모듈을 두는 생성 타입(codegen-zod.js 가 만든다). */
export const MODULAR_CONTRACT_TYPES = Object.freeze(['zod', 'operations']);
/** 묶음 모듈 폴더(저장소 기준 경로 또는 절대 경로 모두). `x/generated-zod.ts` → `x/generated-zod`. */
export const contractModuleDirectory = entry => entry.replace(/\.ts$/u, '');

/** 진입 파일(절대 경로) 옆 묶음 모듈의 파일 이름(정렬). 폴더가 없으면 실패한다 — 생성물 누락을 빈 목록으로 보지 않는다. */
export function contractModuleNames(entryPath) {
  return readdirSync(contractModuleDirectory(entryPath), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts')).map(entry => entry.name).sort();
}

/**
 * 생성 타입 하나의 본문 — 진입 파일 뒤에 묶음 모듈을 이름 순으로 잇는다. 서술자·이름을 정규식으로 읽는 도구(경계 census, 계약 시험)가
 * 종전처럼 한 덩어리로 읽는다. api(d.ts)는 진입 파일 하나다.
 */
export function generatedContractTextAt(entryPath, { modular = true } = {}) {
  const parts = [readFileSync(entryPath, 'utf8')];
  if (modular) {
    for (const name of contractModuleNames(entryPath)) parts.push(readFileSync(join(contractModuleDirectory(entryPath), name), 'utf8'));
  }
  return parts.join('\n');
}

/** 트리 root 에서 생성 타입 key(zod·operations·api)의 본문. */
export function generatedContractText(root, key) {
  return generatedContractTextAt(join(root, GENERATED_CONTRACT_TYPES[key]), { modular: MODULAR_CONTRACT_TYPES.includes(key) });
}

/** 생성 타입 key 의 파일 전부(저장소 기준 경로: 진입 파일, 그다음 묶음 모듈 이름 순). 트리 root 의 작업 트리에서 센다. */
export function generatedContractFiles(root, key) {
  const entry = GENERATED_CONTRACT_TYPES[key];
  if (!MODULAR_CONTRACT_TYPES.includes(key)) return [entry];
  return [entry, ...contractModuleNames(join(root, entry)).map(name => `${contractModuleDirectory(entry)}/${name}`)];
}

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
  const moduleDirectories = keys.filter(key => MODULAR_CONTRACT_TYPES.includes(key))
    .map(key => contractModuleDirectory(GENERATED_CONTRACT_TYPES[key]));
  git(root, ['ls-files', '--error-unmatch', '--', API_DOCS_PATH, ...files]);
  // 묶음 모듈은 폴더 바로 아래 .ts 만 생성물이다. index 쪽은 추적 목록, 작업 트리 쪽은 실제 폴더에서 센다(폴더가 없으면 ENOENT 로 실패).
  const directChild = (directory, file) => file.startsWith(`${directory}/`) && !file.slice(directory.length + 1).includes('/')
    && file.endsWith('.ts');
  const indexModules = moduleDirectories.flatMap(directory => git(root, ['ls-files', '-z', '--', `${directory}/`])
    .split('\0').filter(file => directChild(directory, file)));
  const workingModules = moduleDirectories.flatMap(directory => contractModuleNames(join(root, `${directory}.ts`))
    .map(name => `${directory}/${name}`));
  const text = buffer => normalizeLineEndings(buffer.toString('utf8'));
  const read = (paths, load) => new Map(paths.map(file => [file, text(load(file))]));
  const staged = read([API_DOCS_PATH, ...files, ...indexModules], file => git(root, ['cat-file', 'blob', `:${file}`], 'buffer'));
  const working = read([API_DOCS_PATH, ...files, ...workingModules], file => readFileSync(join(root, file)));
  const temporary = mkdtempSync(join(tmpdir(), VERIFY_PREFIX));
  try {
    /** 다시 만든 생성물(저장소 기준 경로 → 본문). 진입 파일과 묶음 모듈을 모두 담는다. */
    const regenerate = (side, specPath) => {
      const directory = join(temporary, side);
      mkdirSync(directory);
      const outputPaths = Object.fromEntries(keys.map(key => [key, join(directory, basename(GENERATED_CONTRACT_TYPES[key]))]));
      runContractGenerator({ kind, specPath, outputPaths });
      const generated = new Map();
      for (const key of keys) {
        const entry = GENERATED_CONTRACT_TYPES[key];
        generated.set(entry, normalizeLineEndings(readFileSync(outputPaths[key], 'utf8')));
        if (!MODULAR_CONTRACT_TYPES.includes(key)) continue;
        for (const name of contractModuleNames(outputPaths[key])) {
          generated.set(`${contractModuleDirectory(entry)}/${name}`,
            normalizeLineEndings(readFileSync(join(contractModuleDirectory(outputPaths[key]), name), 'utf8')));
        }
      }
      return generated;
    };
    /** 생성물 쪽(actual)이 다시 만든 결과(expected)와 다른 파일 — 본문이 다르거나, 한쪽에만 있다. */
    const differing = (expected, actual) => [...new Set([...expected.keys(), ...actual.keys()])]
      .filter(file => file !== API_DOCS_PATH && expected.get(file) !== actual.get(file)).sort();
    const stagedSpec = join(temporary, API_DOCS_PATH);
    writeFileSync(stagedSpec, staged.get(API_DOCS_PATH));
    const fromIndex = regenerate('index', stagedSpec);
    const drift = differing(fromIndex, staged).map(file => `${file} [index]`);
    if (differing(working, staged).length || working.get(API_DOCS_PATH) !== staged.get(API_DOCS_PATH)) {
      const fromWorktree = working.get(API_DOCS_PATH) === staged.get(API_DOCS_PATH)
        ? fromIndex : regenerate('worktree', join(root, API_DOCS_PATH));
      drift.push(...differing(fromWorktree, working).map(file => `${file} [working tree]`));
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

#!/usr/bin/env node
/**
 * 원문 계약 탐지기 — src/__tests__ 밖에서 저장소 파일을 import 그래프 밖으로 읽는 vitest 시험(원문 계약)을 고른다.
 *
 * pre-push·verify:fast 는 프런트 시험을 src/__tests__ 만 돌았다. 그런데 화면 옆 __tests__ 에도 소스 원문을 readFileSync 로
 * 읽어 단언하는 시험이 있어, 그 원문을 바꾸면 CI 의 전체 vitest(frontend-coverage-scope)에서만 실패했다(2026-09-12 PR #626,
 * 2026-09-16 layout.tsx, 2026-10-23 PR #969). vitest related 는 import 그래프만 봐서 이런 시험을 못 찾는다.
 *
 * - 목록은 매 실행 계산한다(사본 없음). 위치와 무관하게 고르므로 원문 계약을 src/__tests__ 로 옮길 필요가 없다.
 * - 판정할 수 없으면 고른다(넓히는 쪽): 읽을 수 없는 import, 해석하지 못한 지역 import, 쿼리 접미사(?raw 등)가 붙은 import.
 * - 고르는 규칙: 파일 접근 모듈(fs·child_process)을 직접 import 하거나, 선언한 읽기 도우미의 읽는 내보내기를 쓰거나
 *   분류하지 않은 내보내기·이름을 셀 수 없는 형태로 가져오거나, 선언하지 않은 지역 모듈이 파일 접근 모듈을 import 할 때.
 * - 권위는 여전히 CI 의 전체 vitest 다. 이 목록은 그 일부를 푸시 전에 앞당겨 돌릴 뿐이다.
 *
 * 지역 모듈 해석은 후보 경로를 직접 읽어 본다(있는지 먼저 묻고 다시 읽지 않는다 — CodeQL js/file-system-race).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeWithoutComments } from './code-without-comments.mjs';
import { parseModuleReferences } from './frontend-module-graph.mjs';
import { IGNORED_FRONTEND_DIRECTORIES, candidatePaths } from './frontend-module-resolver.mjs';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FILE_ACCESS_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'child_process', 'node:child_process']);
// fs 를 쓰는 공용 도우미: 내보내기마다 저장소 파일을 읽는지(reads)/아닌지(pure). 합은 그 모듈의 내보내기와 같아야 한다(시험이 대조).
// projection.ts 의 판정 함수는 원장에 있는 경로일 때만 디스크를 보고, 원본 저장소에는 원장이 없다 — 그래서 pure 다.
export const FILE_READING_HELPERS = Object.freeze({
  'frontend/src/test-utils/projection.ts': Object.freeze({
    reads: ['projectionView', 'readInProjection', 'missingOutsideLedger'],
    pure: ['REPO_ROOT', 'PROJECTION_LEDGER_FILE', 'projectionRemovedFiles', 'repoPath', 'isRemovedByProjection', 'inProjection',
      'keepInProjection', 'frozenInProjection', 'pageInProjection', 'frozenTableDiff'],
  }),
  'scripts/code-without-comments.mjs': Object.freeze({ reads: ['productionSourceFiles'], pure: ['codeWithoutComments'] }),
});
export const VITEST_TEST_FILE = /\.test\.tsx?$/; // frontend/vitest.config.mts 의 include 와 같다(시험이 대조)
export const INVARIANT_PREFIX = 'src/__tests__/'; // 훅·verify 가 따로 도는 모집단

const isLocal = specifier => specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('@/');

/** 지역 지정자를 저장소 기준 '/' 경로와 원문으로 푼다. 패키지면 null, 풀지 못하면 undefined. */
export function createTargetReader(repoRoot) {
  const frontendRoot = path.join(repoRoot, 'frontend');
  const cache = new Map();
  const readFirst = (base) => {
    for (const candidate of candidatePaths(base)) {
      if (cache.has(candidate)) return cache.get(candidate);
      let text;
      try { text = readFileSync(candidate, 'utf8'); } catch { continue; }
      const found = { rel: path.relative(repoRoot, candidate).split(path.sep).join('/'), text };
      cache.set(candidate, found);
      return found;
    }
    return undefined;
  };
  return (importerRel, specifier) => {
    if (!isLocal(specifier)) return null;
    if (/[?#]/.test(specifier)) return undefined;
    const base = specifier.startsWith('@/')
      ? path.join(frontendRoot, 'src', specifier.slice(2))
      : path.resolve(path.dirname(path.join(frontendRoot, importerRel)), specifier);
    return readFirst(base);
  };
}

const usesName = (source, name) => new RegExp(`\\b${name}\\b`).test(source);
const importsFileAccess = (text, file) => parseModuleReferences(text, file).references.some(r => FILE_ACCESS_MODULES.has(r.specifier));
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 주석을 뺀 코드에서 `specifier` 로부터 이름으로 가져온 바인딩. 이름을 셀 수 없는 형태(기본·네임스페이스·동적 import)면 null. */
export function importedNames(code, specifier) {
  const quoted = escapeRegExp(specifier);
  if (new RegExp(`\\bimport\\s*\\(\\s*['"\`]${quoted}`).test(code)) return null;
  const names = [];
  for (const match of code.matchAll(new RegExp(`\\b(?:import|export)\\s+(?:type\\s+)?([^;]*?)\\s+from\\s+['"]${quoted}['"]`, 'g'))) {
    const named = match[1].trim().match(/^\{([^}]*)\}$/);
    if (!named) return null;
    for (const part of named[1].split(',').map(item => item.trim()).filter(Boolean)) {
      names.push(part.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim());
    }
  }
  return names;
}

/** 시험 하나가 원문 계약인 이유. 아니면 null. `readTarget(importerRel, specifier)` 는 createTargetReader 와 같은 약속이다. */
export function selectionReason({ file, source, readTarget }) {
  const { references, issues } = parseModuleReferences(source, file);
  if (issues.length > 0) return 'unparseable-import';
  for (const { specifier } of references) {
    if (FILE_ACCESS_MODULES.has(specifier)) return `module:${specifier}`;
    const target = readTarget(file, specifier);
    if (target === null) continue;
    if (target === undefined) return `unresolved-import:${specifier}`;
    const helper = FILE_READING_HELPERS[target.rel];
    if (helper) {
      const used = helper.reads.find(name => usesName(source, name));
      if (used) return `helper:${used}`;
      // 분류하지 않은 내보내기나 이름을 셀 수 없는 import 는 읽는지 모른다 — 고른다(넓히는 쪽).
      const imported = importedNames(codeWithoutComments(source, file), specifier);
      if (imported === null) return `helper-opaque-import:${target.rel}`;
      const unclassified = imported.find(name => !helper.reads.includes(name) && !helper.pure.includes(name));
      if (unclassified) return `helper-unclassified:${unclassified}`;
      continue;
    }
    if (importsFileAccess(target.text, target.rel)) return `undeclared-helper:${target.rel}`;
  }
  return null;
}

function testFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return IGNORED_FRONTEND_DIRECTORIES.has(entry.name) ? [] : testFiles(path.join(directory, entry.name), `${rel}/`);
    return VITEST_TEST_FILE.test(entry.name) ? [rel] : [];
  });
}

/** frontend 기준 '/' 경로와 이유의 목록(경로 순). */
export function frontendSourceContracts(repoRoot = REPO_ROOT) {
  const frontendRoot = path.join(repoRoot, 'frontend');
  const readTarget = createTargetReader(repoRoot);
  const selected = [];
  for (const file of testFiles(frontendRoot).filter(rel => !rel.startsWith(INVARIANT_PREFIX)).sort()) {
    const source = readFileSync(path.join(frontendRoot, file), 'utf8');
    const reason = selectionReason({ file, source, readTarget: (importer, specifier) => readTarget(importer, specifier) });
    if (reason) selected.push({ file, reason });
  }
  return selected;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootFlag = process.argv.indexOf('--root');
  const selected = frontendSourceContracts(rootFlag > 0 ? path.resolve(process.argv[rootFlag + 1]) : REPO_ROOT);
  if (selected.length === 0 || selected.some(({ file }) => /\s/.test(file))) {
    console.error('원문 계약 0건이거나 공백 경로 — 탐지 규칙이 무너졌거나, 모두 src/__tests__ 로 옮겼다면 훅·verify 의 원문 계약 단계를 걷으세요');
    process.exit(1);
  }
  process.stdout.write(`${selected.map(({ file }) => file).join('\n')}\n`);
}

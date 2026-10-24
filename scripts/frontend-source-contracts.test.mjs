import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeWithoutComments } from './code-without-comments.mjs';
import { IGNORED_FRONTEND_DIRECTORIES } from './frontend-module-resolver.mjs';
import {
  FILE_READING_HELPERS, INVARIANT_PREFIX, REPO_ROOT, VITEST_TEST_FILE, frontendSourceContracts, selectionReason,
} from './frontend-source-contracts.mjs';

const script = fileURLToPath(new URL('./frontend-source-contracts.mjs', import.meta.url));
const selected = frontendSourceContracts();
const selectedFiles = new Set(selected.map(({ file }) => file));

// 원문 계약이 CI 에서만 붉었던 사고의 시험들과, 저장소를 읽는 대표 형태(fs 직접·도우미 존재 검사)가 고른 목록에 있다.
test('the real tree selects the file-reading contracts outside src/__tests__', () => {
  for (const file of [
    'src/app/components/layout/__tests__/shell-accessibility-contract.test.ts', // PR #969 · 2026-09-16 layout.tsx
    'src/app/__tests__/dashboard-auth-error.test.tsx', // PR #969 업무 홈 구조 단언
    'src/lib/navigation/__tests__/popstate-gate.test.ts', // layout.tsx 원문
    'e2e/fixtures/error-detector.test.ts', // e2e spec 원문
    'src/app/__tests__/WorkHome.equivalence.test.tsx', // 읽기 도우미(missingOutsideLedger)
  ]) assert.ok(selectedFiles.has(file), `${file} 가 원문 계약 묶음에 없다`);
  assert.deepEqual(selected.filter(({ file }) => file.startsWith(INVARIANT_PREFIX)), [], 'src/__tests__ 는 따로 돈다');
  assert.ok(selected.every(({ file }) => VITEST_TEST_FILE.test(file) && !/\s/.test(file)));
});

// 탐지 규칙과 독립된 이름 대조: 주석을 뺀 코드가 파일을 읽는 흔적을 가진 바깥 시험은 모두 골라져 있어야 한다(⊆).
// 탐지 규칙이 좁아지면(예: FILE_ACCESS_MODULES 에서 'node:fs' 를 빼면) 여기서 붉다.
test('every outside test that visibly reads files is selected (independent cross-check)', () => {
  const frontendRoot = path.join(REPO_ROOT, 'frontend');
  const walk = (directory, prefix = '') => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return IGNORED_FRONTEND_DIRECTORIES.has(entry.name) ? [] : walk(path.join(directory, entry.name), `${rel}/`);
    return VITEST_TEST_FILE.test(entry.name) ? [rel] : [];
  });
  const READS = /\bfs\.\w+|from ['"](?:node:)?fs(?:\/promises)?['"]|require\(['"](?:node:)?fs|\b(?:readFileSync|readdirSync|existsSync|statSync)\(|\breadInProjection\b|\bmissingOutsideLedger\b|\bproductionSourceFiles\b|import\.meta\.glob|\?raw['"]/;
  const missing = walk(frontendRoot).filter(file => !file.startsWith(INVARIANT_PREFIX))
    .filter(file => READS.test(codeWithoutComments(readFileSync(path.join(frontendRoot, file), 'utf8'), file)))
    .filter(file => !selectedFiles.has(file));
  assert.deepEqual(missing, [], `탐지기가 고르지 않은 파일 읽기 시험: ${missing.join(', ')}`);
});

test('selection rules widen on doubt and ignore comments and pure helpers', () => {
  const helper = { rel: 'frontend/src/test-utils/projection.ts', text: "import { readFileSync } from 'node:fs';" };
  const reader = targets => (_importer, specifier) => (specifier in targets ? targets[specifier] : null);
  const reason = (source, targets = {}) => selectionReason({ file: 'src/x/__tests__/a.test.ts', source, readTarget: reader(targets) });
  assert.equal(reason("// import { readFileSync } from 'node:fs';\nexport {};"), null, '주석 속 import 는 고르지 않는다');
  assert.equal(reason("import { readFileSync } from 'node:fs';"), 'module:node:fs');
  assert.equal(reason("import { execSync } from 'child_process';"), 'module:child_process');
  assert.equal(reason("const m = await import(`./${name}`);"), 'unparseable-import', '계산된 동적 import 는 판정할 수 없어 고른다');
  assert.equal(reason("import css from './a.css?raw';", { './a.css?raw': undefined }), 'unresolved-import:./a.css?raw');
  assert.equal(reason("import { readInProjection } from '@/test-utils/projection';", { '@/test-utils/projection': helper }), 'helper:readInProjection');
  assert.equal(reason("import { inProjection } from '@/test-utils/projection';", { '@/test-utils/projection': helper }), null, '읽지 않는 도우미 함수만 쓰면 고르지 않는다');
  assert.equal(reason("import {\n  inProjection as keep,\n  type Foo,\n} from '@/test-utils/projection';", { '@/test-utils/projection': helper }),
    'helper-unclassified:Foo', '분류하지 않은 이름은 읽는지 모르므로 고른다');
  assert.equal(reason("import { inProjection as keep } from '@/test-utils/projection';", { '@/test-utils/projection': helper }), null);
  assert.equal(reason("import { readSourceText } from '@/test-utils/projection';", { '@/test-utils/projection': helper }),
    'helper-unclassified:readSourceText', '도우미에 새로 생긴 내보내기는 분류 전까지 고른다');
  for (const source of ["import * as projection from '@/test-utils/projection';", "import projection from '@/test-utils/projection';",
    "const projection = await import('@/test-utils/projection');"]) {
    assert.equal(reason(source, { '@/test-utils/projection': helper }), 'helper-opaque-import:frontend/src/test-utils/projection.ts', source);
  }
  assert.equal(reason("import { load } from '../load';", { '../load': { rel: 'frontend/src/x/load.ts', text: "import fs from 'node:fs';" } }),
    'undeclared-helper:frontend/src/x/load.ts', '선언하지 않은 도우미가 파일에 닿으면 고른다');
  assert.equal(reason("import { render } from '@testing-library/react';"), null, '패키지 import 만 있으면 고르지 않는다');
});

// 선언한 읽기 도우미의 내보내기는 reads·pure 로 빠짐없이 나뉜다. 새로 읽는 내보내기를 더하고 분류하지 않으면 붉다.
// 모르는 내보내기 형태(default·재수출 등)는 이름을 셀 수 없으므로 통과시키지 않고 붉다.
const SUPPORTED_EXPORT = /^export (?:(?:async )?function\*? \w|(?:const|let|var) (?:\w|\{)|class \w|\{|type |interface )/;
function helperExports(text) {
  const lines = text.split(/\r?\n/);
  const unsupported = lines.filter(line => /^export\b/.test(line) && !SUPPORTED_EXPORT.test(line));
  assert.deepEqual(unsupported, [], '분류기가 이름을 셀 수 없는 내보내기 형태다 — 이름 있는 선언이나 export { … } 로 쓴다');
  const names = [...text.matchAll(/^export (?:(?:async )?function\*?|const|let|var|class) (\w+)/gm)].map(match => match[1]);
  const lists = [...text.matchAll(/^export const \{([^}]*)\}/gm)].map(block => block[1].split(',').map(part => part.split(':').at(-1)));
  lists.push(...[...text.matchAll(/^export \{([^}]*)\}/gm)].map(block => block[1].split(',').map(part => part.split(/\s+as\s+/).at(-1))));
  for (const list of lists) names.push(...list.map(item => item.trim()).filter(Boolean));
  return names.sort();
}

test('declared file-reading helpers classify every export', () => {
  for (const [module, { reads, pure }] of Object.entries(FILE_READING_HELPERS)) {
    const declared = helperExports(readFileSync(path.join(REPO_ROOT, module), 'utf8'));
    assert.deepEqual(declared, [...reads, ...pure].sort(), `${module} 의 내보내기 분류가 실제 내보내기와 다르다`);
  }
  // red 재현: 목록·별칭 내보내기는 이름으로 세고, 이름을 셀 수 없는 형태는 붉다.
  assert.deepEqual(helperExports("export function a() {}\nfunction b() {}\nexport { b, b as c };\nexport class D {}\nexport function* e() {}"),
    ['D', 'a', 'b', 'c', 'e']);
  for (const form of ['export default function () {}', "export * from './x';", 'export async function* () {}']) {
    assert.throws(() => helperExports(form), /이름을 셀 수 없는 내보내기 형태/u, form);
  }
});

test('the detector population matches the Vitest include', () => {
  const config = readFileSync(path.join(REPO_ROOT, 'frontend/vitest.config.mts'), 'utf8');
  assert.match(config, /include: \['\*\*\/\*\.test\.\{ts,tsx\}'\]/, 'vitest include 가 바뀌면 VITEST_TEST_FILE 을 함께 고친다');
});

test('the CLI prints the selection and blocks an empty one', (t) => {
  const ok = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(ok.stdout.trim().split('\n'), [...selectedFiles]);
  const root = mkdtempSync(path.join(tmpdir(), 'frontend-source-contracts-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'frontend/src/a/__tests__'), { recursive: true });
  writeFileSync(path.join(root, 'frontend/src/a/__tests__/pure.test.ts'), "import { describe } from 'vitest';\n");
  const empty = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /원문 계약 0건/u);
});

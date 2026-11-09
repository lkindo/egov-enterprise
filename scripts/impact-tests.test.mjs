import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { importClosureReader, selectImpactTests } from './impact-tests.mjs';

/*
  [2026-11-10] #1072 에서 로컬 표적 시험이 놓친 두 연결 — 두 단계 건너 import 한 node 시험과, 바꾼 스크립트 경로를 문자열로 적은 Java
  하네스 시험 — 을 찾는지, 그리고 Java 시험을 태그별 Gradle 작업으로 돌리라고 하는지 고정한다.
*/
function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'impact-tests-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  const mentions = (needle) => Object.entries(files).filter(([, text]) => text.includes(needle)).map(([file]) => file).sort();
  return {
    root,
    repository: {
      tracked: Object.keys(files).sort(),
      importChain: importClosureReader(root),
      mentions,
      read: (file) => files[file],
    },
  };
}

const FILES = {
  'scripts/release-images.test.mjs': "import { fixture } from './historical-release-fixture.mjs';\n",
  'scripts/historical-release-fixture.mjs': "import { select } from '../frontend/scripts/ui-quality-baseline-core.mjs';\nexport const fixture = select;\n",
  'frontend/scripts/ui-quality-baseline-core.mjs': 'export const select = () => [];\n',
  'scripts/unrelated.test.mjs': "import { other } from './other.mjs';\n",
  'scripts/other.mjs': 'export const other = 1;\n',
  // 같은 폴더의 상대 경로라 저장소 경로 글자가 없다 — 타입 전용 import 를 따라가지 않는지만 본다.
  'frontend/scripts/typed.test.mjs': "import type { Select } from './ui-quality-baseline-core.mjs';\n",
  'scripts/verify-reusable-artifact.mjs': "export const steps = [['pnpm', ['-C', 'frontend', 'run', 'type-check']]];\n",
  'api-server/src/test/java/nuri/api/harness/WorkflowManifestLinterTest.java':
    '@Tag("governance-harness")\nclass WorkflowManifestLinterTest { String runner = "scripts/verify-reusable-artifact.mjs"; }\n',
  'api-server/src/test/java/nuri/api/schema/SchemaCheckTest.java':
    '@Tag("schema-validation")\nclass SchemaCheckTest { BoardService service; }\n',
  'api-server/src/test/java/nuri/api/service/BoardServiceTest.java': 'class BoardServiceTest { BoardService service; }\n',
  'business-app/src/main/java/nuri/business/service/board/BoardService.java': 'class BoardService {}\n',
};

test('a node test that reaches the changed module through imports is selected with its chain', (t) => {
  const { repository } = fixture(t, FILES);
  const result = selectImpactTests(['frontend/scripts/ui-quality-baseline-core.mjs'], repository);
  assert.deepEqual(result.tests, [{
    test: 'scripts/release-images.test.mjs',
    reasons: ['import: scripts/release-images.test.mjs → scripts/historical-release-fixture.mjs → frontend/scripts/ui-quality-baseline-core.mjs'],
  }]);
  assert.deepEqual(result.commands, ['node --test scripts/release-images.test.mjs']);
});

test('a Java harness test that names the changed script path runs through its tagged Gradle task', (t) => {
  const { repository } = fixture(t, FILES);
  const result = selectImpactTests(['scripts/verify-reusable-artifact.mjs'], repository);
  assert.deepEqual(result.tests.map(({ test: file }) => file), ['api-server/src/test/java/nuri/api/harness/WorkflowManifestLinterTest.java']);
  assert.deepEqual(result.commands, ["./gradlew :api-server:harnessTest --tests '*WorkflowManifestLinterTest'"]);
});

test('a changed Java class selects the Java tests that name it, each under its own task', (t) => {
  const { repository } = fixture(t, FILES);
  const result = selectImpactTests(['business-app/src/main/java/nuri/business/service/board/BoardService.java'], repository);
  assert.deepEqual(result.commands, [
    "./gradlew :api-server:schemaValidationTest --tests '*SchemaCheckTest'",
    "./gradlew :api-server:test --tests '*BoardServiceTest'",
  ]);
});

test('frontend source changes go to vitest related and nothing is selected for an unrelated change', (t) => {
  const { repository } = fixture(t, FILES);
  assert.deepEqual(selectImpactTests(['frontend/src/app/page.tsx'], repository).commands,
    ['pnpm -C frontend exec vitest related --run src/app/page.tsx']);
  assert.deepEqual(selectImpactTests(['docs/README.md'], repository).tests, []);
});

test('a new node test that git does not track yet is still selected as a changed test', (t) => {
  const { repository } = fixture(t, FILES);
  const result = selectImpactTests(['scripts/brand-new.test.mjs'], repository);
  assert.deepEqual(result.tests, [{ test: 'scripts/brand-new.test.mjs', reasons: ['바꾼 시험'] }]);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

import { buildJUnitDurationSummary, collectJUnitDurations } from './ci-junit-duration-summary.mjs';

// [2026-11-07] 이 파일이 만든 임시 폴더는 모든 시험이 끝난 뒤 지운다 — 지우지 않아 %TEMP% 에 수만 개가 쌓였다(pre-push 지연 실측). 저장소를 닫는 시험별 정리(t.after)가 먼저 끝난 뒤라 Windows 에서도 지울 수 있다. 다른 프로세스가 아직 쥐고 있어 지우지 못하면 시험을 실패시키지 않고 남긴다(정리는 최선 노력이다).
const temporaryRoots = [];
function temporaryDirectory(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}
after(() => {
  for (const root of temporaryRoots.splice(0)) {
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }); } catch { /* 최선 노력 */ }
  }
});

function withResults(files) {
  const root = temporaryDirectory('ci-junit-duration-');
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
  return root;
}

test('JUnit suites are ranked by measured duration and retain their Gradle task identity', () => {
  const root = withResults({
    'api-server/build/test-results/schemaValidationTest/TEST-Slow.xml': '<testsuite time="12.5"/>',
    'business-core/build/test-results/test/TEST-Fast.xml': '<testsuite time="0.25"/>',
  });
  assert.deepEqual(collectJUnitDurations(root), [
    { task: 'api-server:schemaValidationTest', suite: 'Slow', seconds: 12.5 },
    { task: 'business-core:test', suite: 'Fast', seconds: 0.25 },
  ]);
  const summary = buildJUnitDurationSummary(root);
  assert.match(summary, /Parsed suites: \*\*2\*\*, cumulative suite time: \*\*12\.750s\*\*/);
  assert.ok(summary.indexOf('| 1 | api-server:schemaValidationTest | Slow | 12.500 |')
    < summary.indexOf('| 2 | business-core:test | Fast | 0.250 |'));
});

test('malformed, negative and unreadable reports cannot invent timing evidence', () => {
  const root = withResults({
    'api-server/build/test-results/test/TEST-Missing.xml': '<testsuite tests="1"/>',
    'api-server/build/test-results/test/TEST-Negative.xml': '<testsuite time="-1"/>',
    'api-server/build/test-results/test/TEST-Unreadable.xml': '<testsuite time="1"/>',
  });
  const suites = collectJUnitDurations(root, {
    readFile: file => {
      if (file.endsWith('TEST-Unreadable.xml')) throw new Error('EACCES');
      return fs.readFileSync(file, 'utf8');
    },
  });
  assert.deepEqual(suites, []);
  assert.match(buildJUnitDurationSummary(root, { readFile: () => '<testsuite time="NaN"/>' }),
    /No JUnit XML with a valid suite duration was produced/);
});

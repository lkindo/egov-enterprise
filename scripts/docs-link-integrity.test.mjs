import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * 소유 문서의 상대 링크와 이식성 경계를 검사한다.
 *
 * `http(s):`·`mailto:`·순수 앵커는 파일 존재 검사 밖이며, `path#anchor`는 경로 부분만 확인한다.
 * 작성자 머신에만 유효한 `file://` 링크는 금지한다. 범위는 `docs/**`, 루트 Markdown,
 * `.githooks/**`, `.agent/memory/**`이고 벤더링된 범용 skill 예시는 제외한다.
 * 실행 경로는 문서 pre-push fast path와 CI 계약 테스트 묶음이다.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 우리가 소유한 문서인가. */
function isOwnedDoc(file) {
  if (file.startsWith('build/')) return false;
  if (file.startsWith('docs/')) return true;
  if (file.startsWith('.githooks/')) return true;
  if (file.startsWith('.agent/memory/')) return true;
  return !file.includes('/'); // 저장소 루트의 *.md (README·GEMINI·CLAUDE·AGENTS …)
}

function trackedMarkdown() {
  const out = execFileSync('git', ['ls-files', '*.md'], { cwd: repoRoot, encoding: 'utf8' });
  const tracked = out.trim().split('\n').filter(Boolean).filter(isOwnedDoc);
  const memoryRoot = path.join(repoRoot, '.agent', 'memory');
  const memory = fs.existsSync(memoryRoot)
    ? fs.readdirSync(memoryRoot)
      .filter(file => file.endsWith('.md'))
      .map(file => path.posix.join('.agent', 'memory', file))
    : [];
  return [...new Set([...tracked, ...memory])];
}

/** `](target)` 에서 target 을 뽑는다. 공백 없는 형태만 — 마크다운 타이틀 문법은 이 저장소에 없다. */
const LINK = /\]\(([^)\s]+)\)/g;

/** 스캔 경로·링크 추출이 조용히 0건으로 붕괴하지 않게 두는 보수적 vacuity 하한. */
const MIN_DOCS = 30;
const MIN_LINKS = 200;

test('owned documentation has no phantom relative links', () => {
  const files = trackedMarkdown();
  assert.ok(
    files.length >= MIN_DOCS,
    `게이트 무결성 파손: 스캔 문서 수(${files.length})가 하한(${MIN_DOCS}) 미만 — 경로/스캔 파손 의심. 조용한 skip 은 false-green 입니다.`,
  );

  let linkCount = 0;
  const broken = [];
  const fileScheme = [];

  for (const file of files) {
    const dir = path.dirname(path.join(repoRoot, file));
    const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');

    for (const match of text.matchAll(LINK)) {
      const raw = match[1];

      if (/^file:\/\//i.test(raw)) {
        fileScheme.push(`${file}  ->  ${raw}`);
        continue;
      }
      if (/^(https?:|mailto:|#)/i.test(raw)) continue;

      const target = raw.split('#')[0];
      if (!target) continue; // 순수 앵커

      linkCount++;
      let resolved;
      try {
        resolved = path.resolve(dir, decodeURIComponent(target));
      } catch {
        resolved = path.resolve(dir, target);
      }
      if (!fs.existsSync(resolved)) broken.push(`${file}  ->  ${target}`);
    }
  }

  assert.ok(
    linkCount >= MIN_LINKS,
    `게이트 무결성 파손: 로컬 링크 수(${linkCount})가 하한(${MIN_LINKS}) 미만 — 링크 추출 정규식 부식 의심.`,
  );

  assert.deepEqual(
    fileScheme,
    [],
    `📎 file:// 절대경로 링크는 작성자 기계에서만 열립니다. 저장소 상대경로로 바꾸십시오.\n  ${fileScheme.join('\n  ')}`,
  );

  assert.deepEqual(
    broken,
    [],
    `📎 [DOC LINK] 존재하지 않는 대상을 가리키는 링크가 ${broken.length}건 있습니다.\n`
      + `코드가 이동·삭제됐다면 현재 경로로 고치고, 대상이 사라진 이력 서술이라면 링크를 해제하고\n`
      + `소멸 사실을 본문에 남기십시오(없는 파일을 가리키는 링크는 독자를 오도합니다).\n  `
      + broken.join('\n  '),
  );
});

test('owned documentation does not revive the retired CI billing-block narrative', () => {
  const stale = [];
  for (const file of trackedMarkdown()) {
    const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    if (/CI\s*과금\s*차단|과금차단/i.test(text)) stale.push(file);
  }

  assert.deepEqual(
    stale,
    [],
    `CI 상태는 과거 과금 문구가 아니라 현재 workflow 실행 증거로 판정해야 합니다: ${stale.join(', ')}`,
  );
});

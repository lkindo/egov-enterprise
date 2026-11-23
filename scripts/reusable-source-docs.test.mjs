import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { documentationLinks, maskExamples, ownedMarkdown, validateDocumentationLinks } from './docs-link-integrity.mjs';
import { UPSTREAM_ATLAS } from './reusable-harness-census.mjs';
import {
  UPSTREAM_ATLAS_README_LINE, dropDanglingIndexRows, nonInlineLinks, ownedDocFiles, projectGeneratedDocs,
  rewriteDanglingLinks, stripUpstreamAtlasMention,
} from './reusable-source-docs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 생성물 모양의 임시 트리. 헌법 metadata 는 검사기가 요구하는 최소 모양만 둔다. */
function artifact(files) {
  const root = mkdtempSync(join(tmpdir(), 'reusable-docs-'));
  const all = {
    '.agent/knowledge/backend-api-constitution/metadata.json': '{"references":["README.md"]}',
    '.agent/knowledge/frontend-ux-constitution/metadata.json': '{"references":["README.md"]}',
    '.agent/knowledge/db-standard-constitution/metadata.json': '{"references":["README.md"]}',
    'README.md': '# Product\n',
    ...files,
  };
  for (const [rel, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}
const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
/** 목적지에 gone 이 들어 있으면 없는 파일, #없는 으로 끝나면 절만 없는 것으로 보는 판정(순수 함수 시험용). */
const fakeJudge = raw => (raw.includes('gone') ? 'missing-file' : raw.includes('#없는') ? 'missing-anchor' : 'keep');

test('a link to a removed file keeps its words, and a link to a kept file is left alone', () => {
  const root = artifact({
    'docs/03-guides/guide.md': [
      '# Guide',
      '',
      '도구는 [생성기 가이드](project-composer-guide.md)와 [검사기](../../scripts/removed-tool.mjs)에 있다.',
      '남는 문서는 [시작 안내](getting-started.md)다. 바깥은 [사이트](https://example.org/a)다.',
      '그림: ![구성도](images/removed.png)',
      '',
    ].join('\n'),
    'docs/03-guides/getting-started.md': '# 시작 안내\n',
  });
  try {
    const summary = projectGeneratedDocs(root);
    assert.equal(read(root, 'docs/03-guides/guide.md'), [
      '# Guide',
      '',
      '도구는 생성기 가이드와 검사기에 있다.',
      '남는 문서는 [시작 안내](getting-started.md)다. 바깥은 [사이트](https://example.org/a)다.',
      '그림: 구성도',
      '',
    ].join('\n'));
    assert.deepEqual({ changedFiles: summary.changedFiles, unlinked: summary.unlinked, defragmented: summary.defragmented }, {
      changedFiles: 1, unlinked: 3, defragmented: 0,
    });
    // 다시 돌리면 바꿀 것이 없다.
    assert.equal(projectGeneratedDocs(root).changedFiles, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a link whose file stays but whose section is gone keeps the file link', () => {
  const root = artifact({
    'docs/a.md': '# A\n\n[지운 절](b.md#없는-절) · [남은 절](b.md#남은-절) · [이 문서의 없는 절](#없는-절)\n',
    'docs/b.md': '# B\n\n## 남은 절\n',
  });
  try {
    const summary = projectGeneratedDocs(root);
    assert.equal(read(root, 'docs/a.md'), '# A\n\n[지운 절](b.md) · [남은 절](b.md#남은-절) · 이 문서의 없는 절\n');
    assert.equal(summary.defragmented, 1);
    assert.equal(summary.unlinked, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('code examples, comments and line endings are left as they are', () => {
  const source = [
    '# 예시',
    '',
    '`[인라인](gone.md)` 은 예시다.',
    '',
    '```md',
    '[펜스 안](gone.md)',
    '```',
    '',
    '> ~~~md',
    '> [인용문 안의 펜스](gone.md)',
    '> ~~~',
    '',
    '<!-- [주석](gone.md)',
    '[여러 줄 주석](gone.md) -->',
    '실제 링크는 [여기](gone.md)다.',
    '',
  ].join('\r\n');
  const masked = maskExamples(source);
  assert.equal(masked.length, source.length, '가린 글의 길이는 원문과 같다');
  assert.equal(masked.split('\r\n').length, source.split('\r\n').length);
  const rewritten = rewriteDanglingLinks(source, fakeJudge);
  assert.equal(rewritten.unlinked, 1);
  assert.equal(rewritten.text, source.replace('[여기](gone.md)', '여기'));
  // 검사기도 같은 범위를 예시로 본다 — 예시 안의 링크는 링크가 아니다.
  assert.deepEqual(documentationLinks(source), ['gone.md']);
});

test('titles, brackets in words, several links on one line and section names with parentheses keep their surroundings', () => {
  const cases = [
    ['[a](gone.md "round ) bracket") 뒤', 'a 뒤'],
    ["[a](gone.md 'single') 뒤", 'a 뒤'],
    ['[a](<gone file.md> "t") 뒤', 'a 뒤'],
    ['[a\\]b](gone.md) 뒤', 'a\\]b 뒤'],
    ['[`x[0]`](gone.md) 뒤', '`x[0]` 뒤'],
    ['[하나](gone.md), [둘](kept.md), [셋](gone/x.md)', '하나, [둘](kept.md), 셋'],
    ['[절](kept.md#없는(절)) 뒤', '[절](kept.md) 뒤'],
    ['[절](kept.md#없는-절 "제목") 뒤', '[절](kept.md "제목") 뒤'],
    ['[남음](kept.md "gone 은 제목일 뿐") 뒤', '[남음](kept.md "gone 은 제목일 뿐") 뒤'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(rewriteDanglingLinks(input, fakeJudge).text, expected, input);
  }
});

test('a badge keeps the part that still has a target', () => {
  // 안쪽 그림만 없어지면 글자 링크로, 바깥 대상만 없어지면 그림으로, 둘 다 없어지면 글자로 남는다.
  assert.equal(rewriteDanglingLinks('[![badge](gone.svg)](README.md)', fakeJudge).text, '[badge](README.md)');
  assert.equal(rewriteDanglingLinks('[![badge](kept.svg)](gone.md)', fakeJudge).text, '![badge](kept.svg)');
  assert.deepEqual(rewriteDanglingLinks('[![badge](gone.svg)](gone.md) 끝', fakeJudge), { text: 'badge 끝', unlinked: 2, defragmented: 0 });
  // 검사기도 바깥 대상과 안쪽 그림을 둘 다 본다(전에는 바깥 대상을 놓쳤다).
  assert.deepEqual(documentationLinks('[![badge](kept.svg)](gone.md)'), ['gone.md', 'kept.svg']);
  assert.deepEqual(documentationLinks('![t](guide(part).png)'), ['guide(part).png']);
});

test('the docs index drops only the rows that introduce a removed document', () => {
  const index = [
    '# 문서',
    '',
    '[kept.md](03-guides/kept.md) — 남는 문서.',
    '',
    '[gone.md](03-guides/gone.md) — 없어진 문서.',
    '',
    '| 문서 | 내용 |',
    '|---|---|',
    '| [kept.md](<03-guides/kept.md>) | 남는다 |',
    '| [gone.md](03-guides/gone.md) | 없어졌다 — [남는 문서](03-guides/kept.md)도 말한다 |',
    '| 설명 지도 | [없어진 가이드](03-guides/gone.md) — `npm run x` |',
    '| 두 링크 | [gone.md](03-guides/gone.md) 과 [kept.md](03-guides/kept.md) |',
    '| [kept.md](03-guides/kept.md#없는-절) | 절만 없다 |',
    '',
    '```md',
    '| [gone.md](03-guides/gone.md) | 예시 행 |',
    '```',
    '',
  ].join('\n');
  const root = artifact({
    'docs/README.md': index,
    'docs/03-guides/kept.md': '# Kept\n\n| 문서 | 내용 |\n|---|---|\n| [gone.md](gone.md) | 인덱스가 아닌 문서의 표는 행을 남긴다 |\n',
  });
  try {
    const summary = projectGeneratedDocs(root);
    assert.equal(read(root, 'docs/README.md'), [
      '# 문서',
      '',
      '[kept.md](03-guides/kept.md) — 남는 문서.',
      '',
      '| 문서 | 내용 |',
      '|---|---|',
      '| [kept.md](<03-guides/kept.md>) | 남는다 |',
      '| 두 링크 | gone.md 과 [kept.md](03-guides/kept.md) |',
      '| [kept.md](03-guides/kept.md) | 절만 없다 |',
      '',
      '```md',
      '| [gone.md](03-guides/gone.md) | 예시 행 |',
      '```',
      '',
    ].join('\n'));
    assert.equal(read(root, 'docs/03-guides/kept.md'),
      '# Kept\n\n| 문서 | 내용 |\n|---|---|\n| gone.md | 인덱스가 아닌 문서의 표는 행을 남긴다 |\n');
    assert.equal(summary.droppedIndexRows, 3);
    assert.deepEqual(dropDanglingIndexRows('[a](a.md) — 설명\n', () => 'keep'), { text: '[a](a.md) — 설명\n', dropped: 0 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generation stops when a kept document still has a broken link it cannot rewrite', () => {
  // 생성기가 다시 쓰는 공용 메모리는 고치지 않는다 — 끊긴 링크가 있으면 투영을 고쳐야 하므로 멈추고 고칠 곳을 알린다.
  const memory = artifact({
    '.agent/memory/decisions.md': '# 결정\n\n[없는 문서](../../docs/gone.md)\n',
    'docs/a.md': '# A\n',
  });
  // 참조형 링크는 풀지 않는다 — 원본 문서 계약(아래 시험)이 막고, 그래도 들어오면 여기서 멈춘다.
  const reference = artifact({ 'docs/a.md': '# A\n\n[도구][tool]\n\n[tool]: ../scripts/gone.mjs\n' });
  try {
    assert.throws(() => projectGeneratedDocs(memory), (error) => {
      assert.match(error.message, /생성물 문서에 끊긴 링크가 남았다\(1건\)/);
      assert.match(error.message, /buildGeneratedMemory/);
      assert.match(error.message, /\.agent\/memory\/decisions\.md -> \.\.\/\.\.\/docs\/gone\.md: missing target/);
      return true;
    });
    assert.equal(read(memory, '.agent/memory/decisions.md'), '# 결정\n\n[없는 문서](../../docs/gone.md)\n', '파생 문서는 그대로다');
    assert.throws(() => projectGeneratedDocs(reference), /그 밖의 문서 1건[\s\S]*docs\/a\.md -> \.\.\/scripts\/gone\.mjs: missing target/);
  } finally {
    rmSync(memory, { recursive: true, force: true });
    rmSync(reference, { recursive: true, force: true });
  }
});

test('the rewrite leaves nothing for the origin link checker to report in the documents', () => {
  const root = artifact({
    'AGENTS.md': '# Agents\n\n[적용 로그](docs/04-operations/apply-log.md)에 남긴다. [색인](docs/README.md#없는-절).\n',
    'README.md': '# Product\n\n구조는 Atlas(`npm run atlas:build`)에서 본다. [Atlas 가이드](docs/03-guides/atlas.md)\n\n## 시작\n',
    'docs/README.md': '# Docs\n\n| 문서 | 내용 |\n|---|---|\n| [apply-log.md](04-operations/apply-log.md) | 원본 환경 기록 |\n',
    '.githooks/README.md': '# Hooks\n\n[스크립트](../scripts/verify.mjs)\n',
    '.agent/knowledge/db-standard-constitution/artifacts/constitution.md': '# 헌법\n\n[런북](../../../../docs/archived/runbook.md)\n',
  });
  try {
    const files = ownedDocFiles(root);
    assert.deepEqual(files, ['.agent/knowledge/db-standard-constitution/artifacts/constitution.md', '.githooks/README.md',
      'AGENTS.md', 'README.md', 'docs/README.md']);
    assert.equal(validateDocumentationLinks({ repoRoot: root, files }).errors.length, 6, '고치기 전에는 검사기가 여섯 건을 본다');
    const summary = projectGeneratedDocs(root);
    assert.deepEqual(validateDocumentationLinks({ repoRoot: root, files }).errors, []);
    assert.equal(summary.metadataReferenceErrors, 0);
    assert.equal(read(root, 'AGENTS.md'), '# Agents\n\n적용 로그에 남긴다. [색인](docs/README.md).\n');
    assert.equal(read(root, 'README.md'), '# Product\n\n## 시작\n', 'Atlas 안내 문장은 문장째 걷는다');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('origin documents use inline links only, so every broken link in a generated project can be rewritten', () => {
  // 생성물의 링크 정리는 인라인 링크만 푼다. 참조형·<a href> 링크가 생성 프로젝트에 없는 대상을 가리키면 문서만 고친 PR 은
  // 통과하고(재사용 생성 잡이 돌지 않는다) 그 뒤 모든 시작 구성의 생성이 멈춘다 — 문서 변경 시점에 여기서 막는다.
  const offenders = ownedMarkdown(ROOT).flatMap(file => nonInlineLinks(readFileSync(join(ROOT, file), 'utf8'))
    .map(found => `${file}:${found.line} ${found.kind}`));
  assert.deepEqual(offenders, [], '문서 링크는 인라인 [글자](경로) 로 쓴다(reusable-source-docs.mjs)');
  // red 증명: 두 형식 모두 찾고, 코드 예시 안의 것은 세지 않는다.
  assert.deepEqual(nonInlineLinks('[a][tool]\n\n[tool]: ../scripts/x.mjs\n<a href="x.md">x</a>\n\n```\n[t]: y.md\n```\n'), [
    { line: 3, kind: 'reference-definition' }, { line: 4, kind: 'html-anchor' },
  ]);
});

test('the upstream Atlas guide leaves with the Atlas tools, and the README sentence that advertises them is still recognised', () => {
  assert.ok(UPSTREAM_ATLAS.assets.includes('docs/03-guides/governance-atlas-guide.md'));
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  assert.equal([...readme.matchAll(new RegExp(UPSTREAM_ATLAS_README_LINE.source, 'gmu'))].length, 1,
    'README 의 Atlas 안내 문장이 바뀌었으면 UPSTREAM_ATLAS_README_LINE 을 함께 고친다 — 아니면 생성 프로젝트에 없는 명령 안내가 남는다');
  const stripped = stripUpstreamAtlasMention(readme);
  assert.ok(!stripped.includes('atlas:build') && stripped.length < readme.length);
  assert.equal(stripUpstreamAtlasMention('# 제목\n\n본문\n'), '# 제목\n\n본문\n');
});

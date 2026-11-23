import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { documentationLinks, maskExamples, ownedMarkdown, validateDocumentationLinks } from './docs-link-integrity.mjs';
import { VENDOR_SCHEMA_ALIAS, vendorReadme } from './project-composer-vendor-project.mjs';
import { VENDOR_ADAPTERS, loadVendorLedger } from './project-composer-vendors.mjs';
import { UPSTREAM_ATLAS } from './reusable-harness-census.mjs';
import {
  UPSTREAM_ONLY_END, UPSTREAM_ONLY_START, dropDanglingIndexRows, dropUpstreamOnlyBlocks, generatedReadmeIntro, insertGeneratedReadmeIntro,
  nonInlineLinks, ownedDocFiles, projectGeneratedDocs, readmeMentionErrors, rewriteDanglingLinks, simulateGeneratedReadme, upstreamOnlySubjects,
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
    'README.md': '# Product\n\n구조는 [구조 안내](docs/03-guides/structure.md)에서 본다.\n\n## 시작\n',
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
    assert.equal(read(root, 'README.md'), '# Product\n\n구조는 구조 안내에서 본다.\n\n## 시작\n', '루트 README 의 끊긴 링크도 글자로 남긴다');
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

test('the upstream Atlas guide leaves with the Atlas tools, and the README mentions them only inside an upstream-only block', () => {
  assert.ok(UPSTREAM_ATLAS.assets.includes('docs/03-guides/governance-atlas-guide.md'));
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes('npm run atlas:build'));
  assert.ok(!dropUpstreamOnlyBlocks(readme).text.includes('atlas:'));
});

test('upstream-only blocks leave the README whole, and a malformed marker stops the projection', () => {
  const source = ['# 제목', '', '남는 문단', '', UPSTREAM_ONLY_START, '원본 전용 문단', '', '```bash', 'npm run base:verify', '```',
    UPSTREAM_ONLY_END, '', '다음 문단', ''].join('\r\n');
  assert.deepEqual(dropUpstreamOnlyBlocks(source), { text: ['# 제목', '', '남는 문단', '', '다음 문단', ''].join('\r\n'), blocks: 1 });
  // 목록 가운데의 구간은 앞뒤 항목을 붙여 둔다. 표는 통째로 감쌀 수 있다. 표지가 없으면 그대로다.
  assert.equal(dropUpstreamOnlyBlocks(`- 가\n${UPSTREAM_ONLY_START}\n- 나\n${UPSTREAM_ONLY_END}\n- 다\n`).text, '- 가\n- 다\n');
  assert.equal(dropUpstreamOnlyBlocks(`글\n\n${UPSTREAM_ONLY_START}\n| 가 |\n|---|\n| 나 |\n${UPSTREAM_ONLY_END}\n\n끝\n`).text, '글\n\n끝\n');
  assert.deepEqual(dropUpstreamOnlyBlocks('표지 없는 글\n'), { text: '표지 없는 글\n', blocks: 0 });
  for (const [broken, message] of [
    [`${UPSTREAM_ONLY_START}\n가\n`, /1행: 원본 전용 구간이 닫히지 않았다/],
    [`가\n${UPSTREAM_ONLY_END}\n`, /2행: 여는 표지 없는 닫는 표지/],
    [`${UPSTREAM_ONLY_START}\n${UPSTREAM_ONLY_START}\n가\n${UPSTREAM_ONLY_END}\n`, /2행: 원본 전용 구간이 겹쳤다\(1행에서 열림\)/],
    [`가 ${UPSTREAM_ONLY_START}\n나\n${UPSTREAM_ONLY_END}\n`, /1행: 원본 전용 표지는 한 줄을 통째로 쓴다/],
    [`\`\`\`\n${UPSTREAM_ONLY_START}\n\`\`\`\n`, /2행: 원본 전용 표지를 코드 예시 안에 둘 수 없다/],
    [`${UPSTREAM_ONLY_START}\n\`\`\`\n가\n${UPSTREAM_ONLY_END}\n\`\`\`\n`, /4행: 원본 전용 표지를 코드 예시 안에 둘 수 없다/],
    [`| 가 |\n|---|\n${UPSTREAM_ONLY_START}\n| 나 |\n${UPSTREAM_ONLY_END}\n`, /3행: 원본 전용 표지를 표의 행 사이에 둘 수 없다/],
    [`${UPSTREAM_ONLY_START}\n| 가 |\n|---|\n${UPSTREAM_ONLY_END}\n| 나 |\n`, /4행: 원본 전용 표지를 표의 행 사이에 둘 수 없다/],
  ]) assert.throws(() => dropUpstreamOnlyBlocks(broken), message);
});

test('the generated README states its own composition before the first section', () => {
  const intro = generatedReadmeIntro({ source: 'v1.2.3', features: ['board', 'survey'], layout: 'single-module', vendor: 'oracle' });
  const out = insertGeneratedReadmeIntro('# 제목\r\n\r\n```md\r\n## 예시 안의 제목\r\n```\r\n\r\n## 첫 절\r\n본문\r\n', intro);
  assert.ok(out.startsWith('# 제목\r\n\r\n```md\r\n## 예시 안의 제목\r\n```\r\n\r\n## 이 프로젝트\r\n'));
  assert.ok(out.endsWith('---\r\n\r\n## 첫 절\r\n본문\r\n'));
  assert.ok(!/(?<!\r)\n/.test(out), '머리의 줄 끝은 본문을 따른다');
  for (const expected of ['`v1.2.3`', '- 기능: board, survey', 'single-module — Gradle 프로젝트는 루트 하나다', '- 데이터베이스: oracle',
    '[REUSABLE_BASE.md](./REUSABLE_BASE.md)', '[REUSABLE_VERIFICATION.md](./REUSABLE_VERIFICATION.md)']) assert.ok(out.includes(expected), expected);
  const plain = generatedReadmeIntro({ source: 'abc', features: [], layout: 'multi-module' }).join('\n');
  for (const expected of ['- 기능: (공통 기반만)\n', '- backend layout: multi-module\n', '- 데이터베이스: PostgreSQL\n']) assert.ok(plain.includes(expected), expected);
  assert.equal(insertGeneratedReadmeIntro('제목 없는 글\n', ['## 이 프로젝트', '']), '제목 없는 글\n\n## 이 프로젝트\n\n');
  // 머리 자체가 걷은 도구의 별칭이나 경로를 말하면 모든 생성이 멈춘다.
  const subjects = upstreamOnlySubjects(ROOT, JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts);
  for (const lines of [intro, generatedReadmeIntro({ source: 'abc', features: [], layout: 'multi-module' })]) {
    assert.deepEqual(readmeMentionErrors(lines.join('\n'), { removedAliases: subjects.aliases, removedAssets: subjects.assets, scripts: {} }), []);
  }
});

test('a README line that advertises a removed command or asset is reported with its line', () => {
  const options = { removedAliases: ['verify:migration', 'base:verify'], removedAssets: ['migration-tool', 'tools/requirements-workspace'],
    scripts: { dev: 'x', verify: 'y' } };
  assert.deepEqual(readmeMentionErrors(['# 제목', '`npm run dev` 와 `npm run verify` 는 있다.',
    '[설계](docs/legacy-migration-tool-design.md) 는 다른 이름이다.', 'verify:migration-extra 와 pre-base:verify 도 다른 이름이다.'].join('\n'), options), []);
  assert.deepEqual(readmeMentionErrors(['`npm run verify:migration`', '`review:x` / `base:verify`', '```', 'cd migration-tool/', '```',
    '`tools/requirements-workspace/package-lock.json`', 'npm run unknown'].join('\r\n'), options), [
    'README.md:1 생성 프로젝트에 없는 명령 `verify:migration`',
    'README.md:2 생성 프로젝트에 없는 명령 `base:verify`',
    'README.md:4 생성 프로젝트에 없는 자산 `migration-tool`',
    'README.md:6 생성 프로젝트에 없는 자산 `tools/requirements-workspace`',
    'README.md:7 package.json 에 없는 명령 `npm run unknown`',
  ]);
  // scripts 를 주지 않으면(원본 README 계약) package.json 대조는 하지 않는다.
  assert.deepEqual(readmeMentionErrors('npm run unknown\n', { removedAliases: ['base:verify'] }), []);
});

test('the origin README, projected as a generated project sees it, advertises nothing the project lacks', () => {
  // README 만 고친 PR 에는 재사용 생성 잡이 돌지 않는다. 표지 밖에 원본 전용 문장을 더하면 그 PR 은 통과하고 그 뒤 모든 시작 구성의
  // 생성이 멈춘다 — 문서 변경 시점에 여기서 막는다.
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
  const subjects = upstreamOnlySubjects(ROOT, scripts);
  // 모집단: 상시 제거 원장 셋의 별칭·자산, Atlas, 원장 없이 규칙으로 걷는 별칭(verify:e2e 는 규칙에만 있다).
  for (const alias of ['base:verify', 'project:ui', 'migration:export', 'verify:migration', 'verify:e2e', 'verify:ops', 'review:migration',
    'requirements:ui', 'atlas:build']) assert.ok(subjects.aliases.includes(alias), alias);
  assert.ok(subjects.aliases.every(alias => !alias.startsWith('//')));
  for (const asset of ['migration-tool', 'tools/requirements-workspace', 'frontend/atlas',
    'docs/02-architecture/legacy-migration-tool-design.md']) assert.ok(subjects.assets.includes(asset), asset);
  const errorsOf = text => readmeMentionErrors(simulateGeneratedReadme(ROOT, text, subjects.assets),
    { removedAliases: subjects.aliases, removedAssets: subjects.assets });
  assert.deepEqual(errorsOf(readme), [],
    '생성 프로젝트에 없는 도구·명령은 원본 전용 구간 표지 안에서만 말한다(README.md 의 upstream-only 표지, reusable-source-docs.mjs)');
  // 벤더 프로젝트는 PostgreSQL 전용 자산을 더 걷는다. 그 모집단으로 보아도 원본 본문과 벤더가 덧붙이는 「데이터베이스」 절이 깨끗해야 한다
  // — PR 의 재사용 생성 잡은 벤더를 거의 돌지 않으므로 여기서 본다.
  const vendorSubjects = upstreamOnlySubjects(ROOT, scripts, { vendor: true });
  for (const alias of ['ui-quality:baseline:build', ...subjects.aliases]) assert.ok(vendorSubjects.aliases.includes(alias), alias);
  assert.ok(vendorSubjects.assets.includes('scripts/restore-drill.mjs') && !subjects.assets.includes('scripts/restore-drill.mjs'));
  const vendorScripts = Object.fromEntries([...Object.keys(scripts).filter(alias => !vendorSubjects.aliases.includes(alias)), VENDOR_SCHEMA_ALIAS]
    .map(alias => [alias, 'x']));
  const vendorLedger = loadVendorLedger(ROOT);
  const vendorIds = Object.keys(VENDOR_ADAPTERS);
  assert.ok(vendorIds.length >= 5, String(vendorIds));
  for (const vendorId of vendorIds) {
    const whole = `${simulateGeneratedReadme(ROOT, readme, vendorSubjects.assets)}${vendorReadme(vendorId, vendorLedger)}`;
    assert.deepEqual(readmeMentionErrors(whole, { removedAliases: vendorSubjects.aliases, removedAssets: vendorSubjects.assets, scripts: vendorScripts }),
      [], vendorId);
  }
  const projected = simulateGeneratedReadme(ROOT, readme, subjects.assets);
  // 구간째 걷어도 글의 뼈대가 남는다: 구분선이 겹치지 않고, 내용 없는 절이 생기지 않는다.
  assert.ok(!/^---\r?\n(?:\r?\n)*---\r?$/m.test(projected), '겹친 구분선');
  assert.ok(!/^#{2,4} [^\r\n]*\r?\n(?:\r?\n)*(?:---\r?$|## )/m.test(projected), '내용 없는 절');
  // 실행 안내는 남고, 원본 저장소만의 절과 걷힌 문서를 소개하는 표의 행은 빠진다.
  for (const kept of ['make bootstrap', 'npm run dev', './gradlew :api-server:bootRun', '## 📚 문서 (Documentation)', '## 📄 라이선스 (License)']) {
    assert.ok(projected.includes(kept), kept);
  }
  for (const gone of ['Atlas', '검증 진입점', '기여 가이드', '레거시 이관 도구 설계']) {
    assert.ok(readme.includes(gone) && !projected.includes(gone), gone);
  }
  // red 증명: 표지 밖에 원본 전용 명령·자산을 적으면 그 줄이 붉고, 표지를 닫지 않으면 투영이 멈춘다.
  const anchor = '## 📚 문서 (Documentation)';
  assert.ok(errorsOf(readme.replace(anchor, `\`npm run base:verify\` 로 검증한다.\n\n${anchor}`))
    .some(error => error.endsWith('생성 프로젝트에 없는 명령 `base:verify`')));
  assert.ok(errorsOf(readme.replace(anchor, `이관은 \`migration-tool/\` 에서 한다.\n\n${anchor}`))
    .some(error => error.endsWith('생성 프로젝트에 없는 자산 `migration-tool`')));
  assert.throws(() => errorsOf(readme.replace(UPSTREAM_ONLY_END, '')), /원본 전용 구간이 겹쳤다|닫히지 않았다/);
  // 함수만 시험하면 생성기가 부르지 않아도 초록이다. 생성기의 README 처리 순서를 본다: 구간 걷기 → 링크 정리 → 마지막 검사.
  const generator = readFileSync(join(ROOT, 'scripts/generate-reusable-base-source.mjs'), 'utf8');
  const main = generator.indexOf('async function main');
  const order = ['dropUpstreamOnlyBlocks(', 'projectGeneratedDocs(output)', 'readmeMentionErrors('].map(call => generator.indexOf(call, main));
  assert.ok(main > 0 && order.every(index => index > main) && order[0] < order[1] && order[1] < order[2], String(order));
});

test('the root README drops the table rows that introduce a removed document, like the docs index', () => {
  const root = artifact({
    'README.md': ['# Product', '', '| 문서 | 설명 |', '|---|---|', '| [남는 문서](docs/kept.md) | 설명 |', '| [없는 문서](docs/gone.md) | 설명 |', '',
      '본문의 [없는 문서](docs/gone.md) 언급은 글자로 남는다.', ''].join('\n'),
    'docs/kept.md': '# Kept\n',
  });
  try {
    const summary = projectGeneratedDocs(root);
    assert.equal(read(root, 'README.md'), ['# Product', '', '| 문서 | 설명 |', '|---|---|', '| [남는 문서](docs/kept.md) | 설명 |', '',
      '본문의 없는 문서 언급은 글자로 남는다.', ''].join('\n'));
    assert.equal(summary.droppedIndexRows, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

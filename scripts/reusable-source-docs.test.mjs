import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { validateDocumentationLinks } from './docs-link-integrity.mjs';
import {
  dropDanglingIndexRows, maskExamples, ownedDocFiles, projectGeneratedDocs, rewriteDanglingLinks,
} from './reusable-source-docs.mjs';

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

test('code examples and line endings are left as they are', () => {
  const source = [
    '# 예시',
    '',
    '`[인라인](missing.md)` 은 예시다.',
    '',
    '```md',
    '[펜스 안](missing.md)',
    '```',
    '',
    '<!-- [주석](missing.md) -->',
    '실제 링크는 [여기](missing.md)다.',
    '',
  ].join('\r\n');
  const masked = maskExamples(source);
  assert.equal(masked.length, source.length, '가린 글의 길이는 원문과 같다');
  assert.equal(masked.split('\r\n').length, source.split('\r\n').length);
  const rewritten = rewriteDanglingLinks(source, () => 'unlink');
  assert.equal(rewritten.unlinked, 1);
  assert.equal(rewritten.text, source.replace('[여기](missing.md)', '여기'));
  assert.ok(rewritten.text.includes('\r\n') && !/[^\r]\n/.test(rewritten.text), 'CRLF 가 그대로다');
});

test('the docs index drops the rows that introduce removed documents, other documents only lose the link', () => {
  const index = [
    '# 문서',
    '',
    '[kept.md](03-guides/kept.md) — 남는 문서.',
    '',
    '[gone.md](03-guides/gone.md) — 없어진 문서.',
    '',
    '| 문서 | 내용 |',
    '|---|---|',
    '| [kept.md](03-guides/kept.md) | 남는다 |',
    '| [gone.md](03-guides/gone.md) | 없어졌다 |',
    '| 일반 행 | [gone.md](03-guides/gone.md) 을 본문에서 말한다 |',
    '',
  ].join('\n');
  const root = artifact({
    'docs/README.md': index,
    'docs/03-guides/kept.md': '# Kept\n\n| 문서 | 내용 |\n|---|---|\n| [gone.md](gone.md) | 표의 행은 남는다 |\n',
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
      '| [kept.md](03-guides/kept.md) | 남는다 |',
      '| 일반 행 | gone.md 을 본문에서 말한다 |',
      '',
    ].join('\n'));
    assert.equal(read(root, 'docs/03-guides/kept.md'), '# Kept\n\n| 문서 | 내용 |\n|---|---|\n| gone.md | 표의 행은 남는다 |\n');
    assert.equal(summary.droppedIndexRows, 2);
    assert.deepEqual(dropDanglingIndexRows('[a](a.md) — 설명\n', () => 'keep'), { text: '[a](a.md) — 설명\n', dropped: 0 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generation stops when a kept document still has a broken link it cannot rewrite', () => {
  // 생성기가 다시 쓰는 공용 메모리는 고치지 않는다 — 끊긴 링크가 있으면 투영을 고쳐야 하므로 멈춘다.
  const root = artifact({
    '.agent/memory/decisions.md': '# 결정\n\n[없는 문서](../../docs/gone.md)\n',
    'docs/a.md': '# A\n',
  });
  try {
    assert.throws(() => projectGeneratedDocs(root), /생성물 문서에 끊긴 링크가 남았다\(1건\)[\s\S]*\.agent\/memory\/decisions\.md -> \.\.\/\.\.\/docs\/gone\.md: missing target/);
    assert.equal(read(root, '.agent/memory/decisions.md'), '# 결정\n\n[없는 문서](../../docs/gone.md)\n', '파생 문서는 그대로다');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the rewrite leaves nothing for the origin link checker to report in the documents', () => {
  const root = artifact({
    'AGENTS.md': '# Agents\n\n[적용 로그](docs/04-operations/apply-log.md)에 남긴다. [색인](docs/README.md#없는-절).\n',
    'docs/README.md': '# Docs\n\n| 문서 | 내용 |\n|---|---|\n| [apply-log.md](04-operations/apply-log.md) | 원본 환경 기록 |\n',
    '.githooks/README.md': '# Hooks\n\n[스크립트](../scripts/verify.mjs)\n',
    '.agent/knowledge/db-standard-constitution/artifacts/constitution.md': '# 헌법\n\n[런북](../../../../docs/archived/runbook.md)\n',
  });
  try {
    const files = ownedDocFiles(root);
    assert.deepEqual(files, ['.agent/knowledge/db-standard-constitution/artifacts/constitution.md', '.githooks/README.md',
      'AGENTS.md', 'README.md', 'docs/README.md']);
    const before = validateDocumentationLinks({ repoRoot: root, files }).errors;
    assert.equal(before.length, 5, '고치기 전에는 검사기가 다섯 건을 본다');
    const summary = projectGeneratedDocs(root);
    assert.deepEqual(validateDocumentationLinks({ repoRoot: root, files }).errors, []);
    assert.equal(summary.metadataReferenceErrors, 0);
    assert.equal(read(root, 'AGENTS.md'), '# Agents\n\n적용 로그에 남긴다. [색인](docs/README.md).\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

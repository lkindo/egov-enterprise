import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CONSTITUTION_ROOTS, documentAnchors, documentationLinks, isOwnedDoc,
  ownedMarkdown, validateDocumentationLinks,
} from './docs-link-integrity.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Existing coverage floors remain; anchor checks cannot narrow the old catalog.
const MIN_DOCS = 30;
const MIN_LINKS = 200;

test('owned documentation paths, headings and constitution metadata references resolve', () => {
  const files = ownedMarkdown(repoRoot);
  assert.ok(files.length >= MIN_DOCS, `documentation census collapsed: ${files.length}`);
  for (const root of CONSTITUTION_ROOTS) {
    assert.ok(files.includes(`${root}/artifacts/constitution.md`), `missing constitution: ${root}`);
  }
  const result = validateDocumentationLinks({ repoRoot, files });
  assert.ok(result.localLinks >= MIN_LINKS, `local link census collapsed: ${result.localLinks}`);
  assert.deepEqual(result.errors, [], `Broken documentation links:\n${result.errors.join('\n')}`);
});

test('owned scope includes all constitution artifacts without absorbing vendored skill examples', () => {
  for (const root of CONSTITUTION_ROOTS) assert.equal(isOwnedDoc(`${root}/artifacts/example.md`), true);
  assert.equal(isOwnedDoc('.agent/skills/generic/SKILL.md'), false);
  assert.equal(isOwnedDoc('build/probe.md'), false);
  assert.equal(isOwnedDoc('docs/archived/PRD.MD'), true);
});

test('heading anchors preserve Korean and inline code, distinguish duplicates, and support HTML IDs', () => {
  const source = [
    '# 변경과 `검증` (API)', '## 반복', '## 반복', '## 반복-1',
    '<a id="explicit-한글"></a>', '<a name="legacy"></a>', 'Setext 제목', '---',
    '```md', '# 보이지 않음', '<div id="fake"></div>', '```',
    '`<span id="sample"></span>`', '<!-- <div id="hidden"></div> -->',
    '<div data-id="not-an-id"></div>', '<input name="not-an-anchor">',
    '<script>const decoy = \'<div id="not-rendered"></div>\';</script>',
  ].join('\n');
  assert.deepEqual([...documentAnchors(source)], [
    'explicit-한글', 'legacy', '변경과-검증-api', '반복', '반복-1', '반복-1-1', 'setext-제목',
  ]);
});

test('link extraction ignores fenced and inline examples while preserving real titled and reference links', () => {
  const source = [
    '[real](guide(part-two).md#한국어 "Title")', '[space](<some guide.md#detail>)',
    '[named][ref]', '[ref]: other.md#section "Reference"', '<a href="#explicit">jump</a>',
    '![image](diagram.svg)', '`[sample](missing.md)`',
    '````md', '[fenced](absent.md)', '```', '[still fenced](absent2.md)', '````',
    '~~~', '[tilde](absent3.md)', '~~~', '<!-- [comment](absent4.md) -->',
  ].join('\n');
  assert.deepEqual(documentationLinks(source), [
    'guide(part-two).md#한국어', 'some guide.md#detail', 'other.md#section', 'diagram.svg', '#explicit',
  ]);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owned-doc-links-'));
  t.after(() => {
    const absolute = path.resolve(root);
    assert.ok(absolute.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(absolute).startsWith('owned-doc-links-'));
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(root, 'README.md'), '# 시작\n\n[본문](guide.md#본문)\n[자체](#시작)\n');
  fs.writeFileSync(path.join(root, 'guide.md'), '# 본문\n<a id="explicit"></a>\n');
  for (const constitution of CONSTITUTION_ROOTS) {
    fs.mkdirSync(path.join(root, constitution), { recursive: true });
    fs.writeFileSync(path.join(root, constitution, 'metadata.json'), JSON.stringify({
      references: ['guide.md#explicit', 'table://public.meta_standard_terms'],
    }));
  }
  return root;
}

test('missing target, changed heading and pure-anchor drift are reproducible red', t => {
  const root = fixture(t);
  const run = () => validateDocumentationLinks({ repoRoot: root, files: ['README.md'] });
  assert.deepEqual(run().errors, []);
  fs.writeFileSync(path.join(root, 'guide.md'), '# 바뀐 제목\n<a id="explicit"></a>\n');
  assert.match(run().errors.join('\n'), /guide\.md#본문: missing heading/);
  fs.writeFileSync(path.join(root, 'README.md'), '# 다른 시작\n[자체](#시작)\n');
  assert.match(run().errors.join('\n'), /#시작: missing heading/);
  fs.writeFileSync(path.join(root, 'README.md'), '[missing](absent.md)\n[file](file:///private/doc.md)\n');
  assert.match(run().errors.join('\n'), /absent\.md: missing target/);
  assert.match(run().errors.join('\n'), /machine-local file URL/);
});

test('constitution metadata missing file or fragment cannot silently pass', t => {
  const root = fixture(t);
  const metadata = path.join(root, CONSTITUTION_ROOTS[0], 'metadata.json');
  fs.writeFileSync(metadata, JSON.stringify({ references: ['guide.md#absent', 'missing.java'] }));
  const result = validateDocumentationLinks({ repoRoot: root, files: ['README.md'] });
  assert.match(result.errors.join('\n'), /metadata\.json -> guide\.md#absent: missing heading/);
  assert.match(result.errors.join('\n'), /metadata\.json -> missing\.java: missing target/);
});

test('owned documentation does not revive the retired CI billing-block narrative', () => {
  const stale = ownedMarkdown(repoRoot).filter(file =>
    /CI\s*과금\s*차단|과금차단/i.test(fs.readFileSync(path.join(repoRoot, file), 'utf8')));
  assert.deepEqual(stale, [], `Use current workflow evidence instead of retired billing claims: ${stale.join(', ')}`);
});

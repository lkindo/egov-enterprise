import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderAtlas, checkAtlas, ATLAS_INPUTS, ATLAS_OUTPUT } from './build-atlas.mjs';
import { buildAtlasCatalog } from './atlas-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = buildAtlasCatalog(repoRoot);
const generated = renderAtlas(repoRoot, catalog);

// 신선도의 유일한 소유자다. Atlas vitest 는 이 바이트 일치를 전제로 HTML 에 실린 catalog 를 기대값으로 쓴다(FE-CONTRACT-05).
test('committed Atlas exactly matches owned source catalogs and presentation inputs', () => {
  assert.ok(fs.readFileSync(path.join(repoRoot, ATLAS_OUTPUT), 'utf8').replace(/\r\n/g, '\n') === generated,
    'Run npm run atlas:build; source or generated presentation has drifted');
  assert.ok(checkAtlas(repoRoot));
});

test('every displayed fact is generated from the catalog and dangerous data cannot close the JSON script', () => {
  const facts = [...generated.matchAll(/<span\b[^>]*data-fact="([^"]+)"[^>]*>([^<]*)<\/span>/g)];
  assert.ok(facts.length >= 10, 'fact discovery must not collapse');
  for (const [, key, value] of facts) assert.equal(value, String(catalog.facts[key]).replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;'));
  const hostile = structuredClone(catalog);
  hostile.catalogs.documents[0].summary = '</script><script>window.unsafeAtlas=true</script>';
  const html = renderAtlas(repoRoot, hostile);
  assert.ok(!html.includes('<script>window.unsafeAtlas=true'));
  const embedded = html.match(/<script id="atlas-catalog-data" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  assert.equal(JSON.parse(embedded).catalogs.documents[0].summary, hostile.catalogs.documents[0].summary);
});

test('rendered artifact changes on catalog, population, style or template changes and not on output-neutral generator edits', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-atlas-generation-'));
  t.after(() => {
    const absolute = path.resolve(temp);
    assert.ok(absolute.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(absolute).startsWith('egov-atlas-generation-'));
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  for (const file of ATLAS_INPUTS) {
    const output = path.join(temp, file);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, file), output);
  }
  assert.equal(renderAtlas(temp, catalog), generated);
  // 생성기 코드는 본문에 실리지 않는다 — 출력을 바꾸지 않는 수정은 재생성을 요구하지 않는다.
  fs.appendFileSync(path.join(temp, 'scripts/atlas-catalog.mjs'), '\n// Comment-only generator change.\n');
  assert.equal(renderAtlas(temp, catalog), generated, 'a generator edit that changes no output must not require regeneration');
  const style = path.join(temp, 'frontend/atlas/atlas.css');
  fs.appendFileSync(style, '\n/* Source change requires regeneration. */\n');
  assert.notEqual(renderAtlas(temp, catalog), generated);
  const changed = structuredClone(catalog);
  changed.facts.nodeVersion = `${changed.facts.nodeVersion}-changed`;
  assert.notEqual(renderAtlas(repoRoot, changed), generated, 'a changed catalog fact must change the artifact');
  const added = structuredClone(catalog);
  added.sources.push({ path: 'docs/synthetic-new-input.md' });
  assert.notEqual(renderAtlas(repoRoot, added), generated, 'a changed input population must change the artifact');
  const embedded = JSON.parse(generated.match(/<script id="atlas-catalog-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal('sourceDigest' in embedded, false, 'the artifact must not embed a bundle content hash');
  for (const source of [...embedded.sources, ...embedded.presentationSources]) {
    assert.deepEqual(Object.keys(source), ['path'], 'the artifact must not embed per-file content hashes');
  }
  const template = path.join(temp, 'frontend/atlas/atlas.template.html');
  fs.writeFileSync(template, fs.readFileSync(template, 'utf8').replace('<!-- ATLAS_RUNTIME -->', ''));
  assert.throws(() => renderAtlas(temp, catalog), /marker must occur once/);
});

test('new generation and catalog checks are consumed by the required operational test path', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['atlas:build'], 'node scripts/build-atlas.mjs');
  assert.equal(pkg.scripts['atlas:check'], 'node scripts/build-atlas.mjs --check');
  assert.ok(pkg.scripts['test:operational-contracts'].includes('"scripts/*.test.mjs"'));
  for (const file of ['scripts/verify.mjs', '.githooks/pre-push', '.github/workflows/ci.yml']) {
    assert.ok(fs.readFileSync(path.join(repoRoot, file), 'utf8').includes('npm run test:operational-contracts'), file);
  }
});

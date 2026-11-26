import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { buildAtlasCatalog, parseAtlasWorkflow, classifyConstitutionEnforcement } from './atlas-catalog.mjs';

const CURRENT_DECISION_INDEX = '.agent/memory/decisions.md';
const DECISION_ARCHIVE = 'docs/archived/operational-decisions-history.md';
const ADR_REGISTRY = 'docs/02-architecture/decisions/README.md';
const GAP_INDEX = '.agent/memory/known-gaps.md';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = buildAtlasCatalog(repo);
const scratchParent = path.resolve(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(scratchParent, 'egov-atlas-catalog-'));
const fixture = path.join(scratch, 'repository');

for (const source of baseline.sources) {
  const target = path.join(fixture, source.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(repo, source.path), target);
}

after(() => {
  const target = path.resolve(scratch);
  assert.equal(path.dirname(target), scratchParent);
  assert.ok(path.basename(target).startsWith('egov-atlas-catalog-'));
  fs.rmSync(target, { recursive: true, force: true });
});

function mutate(relative, transform, callback) {
  const target = path.resolve(fixture, relative);
  assert.ok(target.startsWith(`${fixture}${path.sep}`));
  const original = fs.readFileSync(target, 'utf8');
  fs.writeFileSync(target, transform(original));
  try { callback(); } finally { fs.writeFileSync(target, original); }
}

function add(relative, content, callback) {
  const target = path.resolve(fixture, relative);
  assert.ok(target.startsWith(`${fixture}${path.sep}`));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, { flag: 'wx' });
  try { callback(); } finally { fs.unlinkSync(target); }
}

function addAll(entries, callback) {
  if (entries.length === 0) return callback();
  const [[relative, content], ...rest] = entries;
  return add(relative, content, () => addAll(rest, callback));
}

test('catalog is deterministic and covers source-owned modules, articles, gates, gaps and decisions', () => {
  assert.deepEqual(buildAtlasCatalog(fixture), baseline);
  const registry = JSON.parse(fs.readFileSync(path.join(repo, 'config/governance/gates.json'), 'utf8'));
  const expectedGates = registry.gateSets.flatMap(set => set.rules ?? []).map(rule => rule.id).sort();
  assert.deepEqual(baseline.catalogs.gates.map(gate => gate.id), expectedGates);
  assert.equal(baseline.facts.gateCount, expectedGates.length);
  assert.equal(baseline.facts.clauseCount, baseline.catalogs.constitutions.length);
  assert.equal(baseline.catalogs.modules.filter(module => module.id !== 'frontend').length,
    [...fs.readFileSync(path.join(repo, 'settings.gradle'), 'utf8').matchAll(/^include\s+/gm)].length);
  const adrCount = [...fs.readFileSync(path.join(repo, ADR_REGISTRY), 'utf8').matchAll(/^\| \[ADR-\d{4}\]/gm)].length;
  const decCount = [...fs.readFileSync(path.join(repo, DECISION_ARCHIVE), 'utf8').matchAll(/^\| DEC-OPS-\d{3} \|/gm)].length;
  assert.equal(baseline.catalogs.decisions.length, adrCount + decCount);
  assert.ok(baseline.catalogs.constitutions.every(article => article.details.some(item => item.label === '조문 원문' && item.value.length > 0)));
  assert.ok(baseline.catalogs.gaps.every(gap => /^GAP-[A-Z]+-\d{3}$/.test(gap.id) && gap.source === GAP_INDEX));
});

test('decision records track canonical archive rationale, supersedes graph, and integrity checks', () => {
  const byId = new Map(baseline.catalogs.decisions.map(item => [item.id, item]));
  assert.ok(byId.get('DEC-OPS-381').supersededBy.includes('DEC-OPS-435'));
  assert.deepEqual(byId.get('DEC-OPS-001').links[0], { label: '원문', path: `${DECISION_ARCHIVE}#dec-ops-001` });

  mutate(DECISION_ARCHIVE, text => text.replace(/^\| DEC-OPS-001 \|.*$/m, line => {
    const cells = line.replace(/^\|\s*|\s*\|$/g, '').split(/\s+\|\s+/);
    cells[2] = `${'long decision '.repeat(40)}full-decision-tail-probe`;
    cells[3] = 'rationale-only-search-probe';
    return `| ${cells.join(' | ')} |`;
  }), () => {
    const decision = buildAtlasCatalog(fixture).catalogs.decisions.find(item => item.id === 'DEC-OPS-001');
    assert.match(decision.searchText, /full-decision-tail-probe/);
    assert.match(decision.searchText, /rationale-only-search-probe/);
  });

  mutate(DECISION_ARCHIVE, text => text.replace(/^\| DEC-OPS-001 \|.*\r?\n/m, ''), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /DEC-OPS-001 decision history section must contain its same-ID row/);
  });
  mutate(DECISION_ARCHIVE, text => text.replace(/^\| DEC-OPS-001 \|.*$/m, row => `${row}\n${row}`), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /decision history duplicate ID/);
  });
  mutate(CURRENT_DECISION_INDEX, text => `${text}\n| DEC-OPS-999 | accepted | ghost decision | 2026-11-26 | - |\n`, () => {
    assert.throws(() => buildAtlasCatalog(fixture), /DEC-OPS-999 decision history section missing/);
  });
  mutate(CURRENT_DECISION_INDEX, text => text.replace('| DEC-OPS-001 | accepted |', '| DEC-OPS-001 | superseded |'), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /DEC-OPS-001 decision history status\/date\/supersedes differs from index/);
  });
});

test('only the registry same-ID Accepted ADR supplies canonical search text', () => {
  const id = 'ADR-0001';
  const source = 'docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md';
  const record = baseline.catalogs.decisions.find(item => item.id === id);
  assert.equal(record.source, ADR_REGISTRY);
  assert.equal(record.title, fs.readFileSync(path.join(repo, source), 'utf8').match(/^#\s+(.+)$/m)[1].trim());
  assert.ok(record.links.some(link => link.path === source));
  mutate(source, text => `${text}\n## Canonical body search probe\nADR-body-only-probe\n`, () => {
    const indexed = buildAtlasCatalog(fixture).catalogs.decisions.find(item => item.id === id);
    assert.match(indexed.searchText, /ADR-body-only-probe/);
  });
  mutate(source, text => text.replace('상태: Accepted', '상태: Proposed') + '\nnot-approved-body-probe\n', () => {
    const indexed = buildAtlasCatalog(fixture).catalogs.decisions.find(item => item.id === id);
    assert.equal(indexed.searchText.includes('not-approved-body-probe'), false);
  });
  mutate(ADR_REGISTRY, text => text.replace('[ADR-0001](ADR-0001-core-app-product-boundary.md)', '[ADR-0001](ADR-0002-korean-first-frontend.md)'), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /ADR-0001 must link exactly one same-ID ADR/);
  });
  mutate(source, text => text.replace('# ADR-0001:', '# ADR-9999:'), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /ADR-0001 canonical ADR heading differs/);
  });
});

// ─── 유용 검사 ③: 헌법 조문 ↔ 실제 게이트 연결 (+ H5 red 증명) ───────────────────────────────────────────

test('every constitution article retains exact text and distinguishes explicit partial mappings from unverified coverage', () => {
  for (const article of baseline.catalogs.constitutions) {
    const source = fs.readFileSync(path.join(repo, article.source), 'utf8').replace(/\r\n?/g, '\n');
    const headings = [...source.matchAll(/^###\s+제(\d+)조\s*([^\n]*)$/gm)];
    const index = headings.findIndex(heading => Number(heading[1]) === article.article);
    const expected = source.slice(headings[index].index + headings[index][0].length, headings[index + 1]?.index ?? source.length).trim();
    assert.equal(article.details.find(item => item.label === '조문 원문').value, expected);
    assert.ok(['partial', 'unverified'].includes(article.enforcement.status));
    assert.equal(article.enforcement.status === 'partial', article.enforcement.mappings.length > 0);
    for (const mapping of article.enforcement.mappings) {
      assert.ok(baseline.sources.some(input => input.path === mapping.source));
      assert.ok(article.links.some(link => link.path === mapping.source));
      assert.ok(article.links.some(link => link.path === 'config/governance/gates.json'));
    }
  }
  const builder = baseline.catalogs.constitutions.find(article => article.id === 'backend-5');
  assert.ok(builder.enforcement.mappings.some(mapping => mapping.id === 'GH-ENTITY-LOMBOK-SOURCE'));
  assert.equal(builder.enforcement.status, 'partial');
  assert.equal(baseline.catalogs.constitutions.find(article => article.id === 'frontend-1').enforcement.status, 'unverified');
});

test('article mapping rejects title similarity, comments, ambiguous symbols and unrelated runner paths', () => {
  const source = '.agent/knowledge/test/artifacts/constitution.md';
  const registry = { gateSets: [
    { id: 'GATES', rules: [{ id: 'EXACT-RULE', source: 'tests/ExactRuleTest.java' }] },
    { id: 'RUNNER', selector: { catalogs: [{ root: 'frontend/src/__tests__', suffixes: ['.test.ts'], recursive: true }] } },
  ] };
  const classify = body => classifyConstitutionEnforcement(body, source, registry);
  for (const body of [
    'ExactRuleTest와 유사한 명칭이지만 gate 연결 근거 없음',
    '`ExactRuleTestAlternative`',
    '<!-- `EXACT-RULE` -->',
    '```java\n`EXACT-RULE`\n```',
    '[설계 문서](../../../../docs/ExactRuleTest.md)',
    '[다른 파일](../../../../frontend/src/unrelated/example.test.ts)',
  ]) assert.equal(classify(body).status, 'unverified', body);
  assert.equal(classify('`EXACT-RULE`').status, 'partial');
  assert.equal(classify('[명시 검사](../../../../tests/ExactRuleTest.java)').mappings[0].evidenceKind, 'explicit-source-path');
  assert.equal(classify('[명시 계약](../../../../frontend/src/__tests__/example.test.ts)').mappings[0].id, 'RUNNER');
  registry.gateSets[0].rules.push({ id: 'OTHER-RULE', source: 'other/ExactRuleTest.java' });
  assert.equal(classify('`ExactRuleTest`').status, 'unverified');
});

test('domain links use module-qualified declaration references and expose unconfirmed mappings', () => {
  const schedule = baseline.catalogs.domains.find(domain => domain.id === 'business-app/schedule');
  assert.ok(schedule.serviceSources.some(source => source.endsWith('/schedule/ScheduleService.java')));
  assert.ok(schedule.controllerSources.some(source => source.endsWith('/smarttoolkit/ScheduleApiController.java')));
  const help = baseline.catalogs.domains.find(domain => domain.id === 'business-app/help');
  assert.ok(help.serviceSources.some(source => source.endsWith('/help/HelpService.java')));
  const service = 'business-app/src/main/java/nuri/business/service/schedule/ScheduleService.java';
  mutate(service, text => text.replace(/^import nuri\.business\.domain\.schedule\.[^;]+;\r?\n/gm, '')
    + '\n/*\nimport nuri.business.domain.schedule.Schedule;\n*/\n', () => {
    const changed = buildAtlasCatalog(fixture).catalogs.domains.find(domain => domain.id === 'business-app/schedule');
    assert.ok(!changed.serviceSources.includes(service));
  });
});

test('catalog lists input paths without content hashes and ignores dependency pins', () => {
  assert.ok(baseline.sources.every(source => Object.keys(source).join(',') === 'path'));
  for (const declaration of ['.nvmrc', 'gradle/libs.versions.toml', 'frontend/pnpm-lock.yaml', 'package-lock.json']) {
    assert.ok(!baseline.sources.some(source => source.path === declaration));
  }
  const route = baseline.catalogs.routes[0].source;
  mutate(route, text => `${text}\n// catalog-invisible edit\n`, () => {
    assert.deepEqual(buildAtlasCatalog(fixture), baseline);
  });
});

test('new documentation, declared modules, count facts and fail-closed checks work', () => {
  add('docs/03-guides/synthetic-atlas-note.MD', '# 신규 문서\n\n상태: 제안\n', () => {
    const changed = buildAtlasCatalog(fixture);
    assert.equal(changed.facts.documentCount, baseline.facts.documentCount + 1);
  });
  add('synthetic-module/build.gradle', "dependencies {\n    implementation project(':foundation')\n}\n", () => {
    mutate('settings.gradle', text => `${text}\ninclude 'synthetic-module'\n`, () => {
      const changed = buildAtlasCatalog(fixture);
      assert.deepEqual(changed.catalogs.modules.find(module => module.id === 'synthetic-module').dependencies, ['foundation']);
    });
  });

  const migrationTests = 'migration-tool/src/test/java/nuri/migration';
  addAll([
    [`${migrationTests}/SyntheticAtlasCountTest.java`, 'class SyntheticAtlasCountTest {\n  @Test void plain() {}\n}\n'],
  ], () => {
    assert.equal(buildAtlasCatalog(fixture).facts.migrationTestCount, baseline.facts.migrationTestCount + 1);
  });

  const settingsTarget = path.join(fixture, 'settings.gradle');
  const original = fs.readFileSync(settingsTarget);
  fs.unlinkSync(settingsTarget);
  try { assert.throws(() => buildAtlasCatalog(fixture), /ENOENT/); } finally { fs.writeFileSync(settingsTarget, original); }

  mutate('settings.gradle', text => `${text}\ninclude '../outside'\n`, () =>
    assert.throws(() => buildAtlasCatalog(fixture), /source escapes repository/));

  const workflow = parseAtlasWorkflow('name: Fixture\non:\n  workflow_dispatch:\npermissions:\n  contents: read\njobs:\n  publish:\n    steps:\n      - name: Publish\n        run: gh release create v-test\n', '.github/workflows/fixture.yml');
  assert.deepEqual(workflow.jobs[0].writeIndicators, ['release-publication']);
});

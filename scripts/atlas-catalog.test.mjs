import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { buildAtlasCatalog, parseAtlasWorkflow, classifyConstitutionEnforcement } from './atlas-catalog.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = buildAtlasCatalog(repo);
const scratchParent = path.resolve(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(scratchParent, 'egov-atlas-catalog-'));
const fixture = path.join(scratch, 'repository');

// Copy only declared public inputs once; never change the shared worktree for red proofs.
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

test('fixture additions reject an existing file without overwriting or removing it', () => {
  const relative = 'existing-fixture-sentinel.txt';
  add(relative, 'original sentinel', () => {
    let callbackInvoked = false;
    assert.throws(() => add(relative, 'replacement', () => { callbackInvoked = true; }), { code: 'EEXIST' });
    assert.equal(fs.readFileSync(path.join(fixture, relative), 'utf8'), 'original sentinel');
    assert.equal(callbackInvoked, false);
  });
});

test('catalog is deterministic and covers source-owned modules, articles, gates and decision IDs', () => {
  assert.deepEqual(buildAtlasCatalog(fixture), baseline);
  const registry = JSON.parse(fs.readFileSync(path.join(repo, 'config/governance/gates.json'), 'utf8'));
  const expectedGates = registry.gateSets.flatMap(set => set.rules ?? []).map(rule => rule.id).sort();
  assert.deepEqual(baseline.catalogs.gates.map(gate => gate.id), expectedGates);
  assert.equal(baseline.facts.gateCount, expectedGates.length);
  assert.equal(baseline.facts.clauseCount, baseline.catalogs.constitutions.length);
  assert.equal(baseline.catalogs.modules.filter(module => module.id !== 'frontend').length,
    [...fs.readFileSync(path.join(repo, 'settings.gradle'), 'utf8').matchAll(/^include\s+/gm)].length);
  assert.equal(baseline.catalogs.decisions.length,
    [...fs.readFileSync(path.join(repo, '.agent/memory/decisions.md'), 'utf8').matchAll(/^\| (?:ADR-\d{4}|DEC-OPS-\d{3}) \|/gm)].length);
  assert.ok(baseline.catalogs.constitutions.every(article => article.details.some(item => item.label === '조문 원문' && item.value.length > 0)));
  assert.ok(baseline.catalogs.gaps.every(gap => /^GAP-[A-Z]+-\d{3}$/.test(gap.id)));
  assert.ok(baseline.catalogs.documents.some(doc => doc.id === 'docs/archived/PRD.MD'));
  assert.ok(baseline.catalogs.documents.some(doc => doc.id === 'docs/archived/TRD.MD'));
});

test('route uncertainty and historical decisions retain their source status', () => {
  const routes = JSON.parse(fs.readFileSync(path.join(repo, 'config/ui-route-capabilities.json'), 'utf8')).routes;
  for (const source of routes) {
    const actual = baseline.catalogs.routes.find(route => route.id === source.route);
    assert.equal(actual.status, source.status ?? 'unverified');
    assert.deepEqual(actual.roles, source.roles);
    assert.equal(actual.menuExposure, source.menuExposure);
    assert.deepEqual(actual.capabilities.map(capability => capability.status), source.capabilities.map(capability => capability.status));
    assert.deepEqual(actual.capabilities.map(capability => capability.evidenceLevel), source.capabilities.map(capability => capability.evidenceLevel));
  }
  assert.ok(baseline.catalogs.routes.some(route => route.roles.includes('UNVERIFIED')));
  const historical = baseline.catalogs.decisions.find(decision => decision.id === 'DEC-OPS-013');
  const successor = baseline.catalogs.decisions.find(decision => decision.id === 'DEC-OPS-025');
  assert.equal(historical.status, 'accepted');
  assert.ok(successor.references.includes(historical.id));
  assert.match(successor.supersedes, /부분/u);
  assert.ok(baseline.catalogs.operations.some(operation => operation.status === 'unwired'));
  assert.ok(baseline.catalogs.operations.some(operation => operation.status === 'documented-operation'));
});

test('every constitution article retains exact text and distinguishes explicit partial mappings from unverified coverage', () => {
  for (const article of baseline.catalogs.constitutions) {
    const source = fs.readFileSync(path.join(repo, article.source), 'utf8').replace(/\r\n?/g, '\n');
    const headings = [...source.matchAll(/^###\s+제(\d+)조\s*([^\n]*)$/gm)];
    const index = headings.findIndex(heading => Number(heading[1]) === article.article);
    const expected = source.slice(headings[index].index + headings[index][0].length, headings[index + 1]?.index ?? source.length).trim();
    assert.equal(article.details.find(item => item.label === '조문 원문').value, expected);
    assert.ok(['partial', 'unverified'].includes(article.enforcement.status));
    assert.ok(article.details.some(item => item.label === '집행 대응 상태'));
    assert.equal(article.enforcement.status === 'partial', article.enforcement.mappings.length > 0);
    for (const mapping of article.enforcement.mappings) {
      assert.ok(baseline.sources.some(input => input.path === mapping.source));
      assert.ok(article.links.some(link => link.path === mapping.source));
      assert.ok(article.links.some(link => link.path === 'config/governance/gates.json'));
    }
  }
  const builder = baseline.catalogs.constitutions.find(article => article.id === 'backend-5');
  assert.ok(builder.enforcement.mappings.some(mapping => mapping.id === 'GH-ENTITY-LOMBOK-SOURCE'));
  assert.equal(builder.enforcement.status, 'partial', 'explicit builder gates do not prove every encapsulation obligation');
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
  assert.equal(classify('`ExactRuleTest.some_rule`').status, 'partial');
  const linked = classify('[명시 검사](../../../../tests/ExactRuleTest.java)');
  assert.equal(linked.mappings[0].evidenceKind, 'explicit-source-path');
  const runner = classify('[명시 계약](../../../../frontend/src/__tests__/example.test.ts)');
  assert.equal(runner.mappings[0].id, 'RUNNER');
  registry.gateSets[0].rules.push({ id: 'OTHER-RULE', source: 'other/ExactRuleTest.java' });
  assert.equal(classify('`ExactRuleTest`').status, 'unverified', 'ambiguous class names require an exact path or ID');
});

test('domain links use module-qualified declaration references and expose unconfirmed mappings', () => {
  const schedule = baseline.catalogs.domains.find(domain => domain.id === 'business-app/schedule');
  assert.ok(schedule.serviceSources.some(source => source.endsWith('/schedule/ScheduleService.java')));
  assert.ok(schedule.controllerSources.some(source => source.endsWith('/smarttoolkit/ScheduleApiController.java')));
  const help = baseline.catalogs.domains.find(domain => domain.id === 'business-app/help');
  assert.ok(help.serviceSources.some(source => source.endsWith('/help/HelpService.java')), 'wildcard + actual type references remain discoverable');
  for (const domain of baseline.catalogs.domains) {
    assert.ok(domain.serviceSources.every(source => source.startsWith(`${domain.module}/`)));
    assert.ok(domain.details.some(item => item.label === '화면 연결' && item.value.startsWith('미확인')));
    if (domain.serviceSources.length === 0) assert.ok(domain.details.some(item => item.value === '연결 미확인'));
  }
  const service = 'business-app/src/main/java/nuri/business/service/schedule/ScheduleService.java';
  mutate(service, text => text.replace(/^import nuri\.business\.domain\.schedule\.[^;]+;\r?\n/gm, '')
    + '\n/*\nimport nuri.business.domain.schedule.Schedule;\n*/\n', () => {
    const changed = buildAtlasCatalog(fixture).catalogs.domains.find(domain => domain.id === 'business-app/schedule');
    assert.ok(!changed.serviceSources.includes(service), 'comment-only fake imports must not create a declaration edge');
  });
});

test('source digest ignores line endings, not source content, and avoids output self-cycles', () => {
  mutate('.nvmrc', text => text.replace(/\r?\n/g, '\r\n'), () => {
    assert.deepEqual(buildAtlasCatalog(fixture), baseline);
  });
  mutate('.nvmrc', () => '24\n', () => {
    const changed = buildAtlasCatalog(fixture);
    assert.equal(changed.facts.nodeVersion, '24');
    assert.notEqual(changed.sources.find(source => source.path === '.nvmrc').digest,
      baseline.sources.find(source => source.path === '.nvmrc').digest);
    assert.notDeepEqual(changed, baseline);
  });
  assert.ok(baseline.sources.every(source => /^[a-f0-9]{64}$/.test(source.digest)));
  assert.ok(baseline.sources.every(source => !/\.env(?:\.|$)|governance_harness_atlas\.html|frontend\/atlas\//.test(source.path)));
  assert.equal('generatedAt' in baseline, false);
  assert.equal('head' in baseline, false);
});

test('new documentation and a new declared module are visible without editing the generator', () => {
  add('docs/03-guides/synthetic-atlas-note.MD', '# 신규 문서\n\n상태: 제안\n', () => {
    const changed = buildAtlasCatalog(fixture);
    assert.equal(changed.facts.documentCount, baseline.facts.documentCount + 1);
    assert.ok(changed.catalogs.documents.some(doc => doc.title === '신규 문서'));
  });
  add('synthetic-module/build.gradle', "dependencies {\n    implementation project(':foundation')\n}\n", () => {
    mutate('settings.gradle', text => `${text}\ninclude 'synthetic-module'\n`, () => {
      const changed = buildAtlasCatalog(fixture);
      assert.deepEqual(changed.catalogs.modules.find(module => module.id === 'synthetic-module').dependencies, ['foundation']);
      assert.equal(changed.catalogs.modules.length, baseline.catalogs.modules.length + 1);
    });
  });
});

test('new OpenAPI operations are inventoried without falsely asserting a working consumer', () => {
  mutate('api-docs.json', text => {
    const api = JSON.parse(text);
    api.paths['/synthetic-catalog-probe'] = { get: { operationId: 'syntheticCatalogProbe', summary: 'probe', responses: { 200: { description: 'ok' } } } };
    return JSON.stringify(api);
  }, () => {
    const changed = buildAtlasCatalog(fixture);
    const added = changed.catalogs.operations.find(operation => operation.id === 'syntheticCatalogProbe');
    assert.equal(added.status, 'documented-operation');
    assert.equal(changed.catalogs.operations.length, baseline.catalogs.operations.length + 1);
  });
});

test('missing source, duplicate operation ID and escaping module paths fail closed', () => {
  const target = path.join(fixture, 'settings.gradle');
  const original = fs.readFileSync(target);
  fs.unlinkSync(target);
  try { assert.throws(() => buildAtlasCatalog(fixture), /ENOENT/); } finally { fs.writeFileSync(target, original); }

  mutate('api-docs.json', text => {
    const api = JSON.parse(text);
    api.paths['/synthetic-duplicate'] = { get: { operationId: baseline.catalogs.operations[0].id, responses: {} } };
    return JSON.stringify(api);
  }, () => assert.throws(() => buildAtlasCatalog(fixture), /operations duplicate ID/));

  mutate('settings.gradle', text => `${text}\ninclude '../outside'\n`, () =>
    assert.throws(() => buildAtlasCatalog(fixture), /source escapes repository/));

  mutate('config/governance/gates.json', text => {
    const registry = JSON.parse(text);
    registry.gateSets.find(set => set.rules).rules[0].source = 'missing-gate-source.java';
    return JSON.stringify(registry);
  }, () => assert.throws(() => buildAtlasCatalog(fixture), /ENOENT/));
});

test('workflow catalog distinguishes declarations, write indicators and unsupported structure', () => {
  const workflow = parseAtlasWorkflow(`name: Fixture\non:\n  workflow_dispatch:\npermissions:\n  contents: read\njobs:\n  publish:\n    permissions:\n      contents: write\n    steps:\n      - name: Publish a release\n        run: gh release create v-test\n`, '.github/workflows/fixture.yml');
  assert.equal(workflow.status, 'static-declaration');
  assert.match(workflow.triggers, /workflow_dispatch/);
  assert.match(workflow.jobs[0].permissions, /contents: write/);
  assert.deepEqual(workflow.jobs[0].writeIndicators, ['release-publication']);
  const unknown = parseAtlasWorkflow('name: Alias\non: *unknown\njobs: *unknown\n', '.github/workflows/unknown.yml');
  assert.equal(unknown.status, 'unverified-parser');
  assert.match(unknown.permissions, /미선언/u);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { buildAtlasCatalog, parseAtlasWorkflow, classifyConstitutionEnforcement } from './atlas-catalog.mjs';
import { ALL_DECISION_INDEXES, CURRENT_DECISION_INDEX, DECISION_ARCHIVE, DECISION_AREA_INDEXES, GAP_DETAIL, GAP_INDEX, HISTORICAL_DECISION_INDEX } from './decision-indexes.mjs';

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

function addAll(entries, callback) {
  if (entries.length === 0) return callback();
  const [[relative, content], ...rest] = entries;
  return add(relative, content, () => addAll(rest, callback));
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
    ALL_DECISION_INDEXES
      .map(file => [...fs.readFileSync(path.join(repo, file), 'utf8').matchAll(/^\| (?:ADR-\d{4}|DEC-OPS-\d{3}) \|/gm)].length)
      .reduce((sum, count) => sum + count, 0));
  assert.ok(baseline.catalogs.constitutions.every(article => article.details.some(item => item.label === '조문 원문' && item.value.length > 0)));
  assert.ok(baseline.catalogs.gaps.every(gap => /^GAP-[A-Z]+-\d{3}$/.test(gap.id)));
  assert.ok(baseline.catalogs.documents.some(doc => doc.id === 'docs/archived/PRD.MD'));
  assert.ok(baseline.catalogs.documents.some(doc => doc.id === 'docs/archived/TRD.MD'));
});

// [DEC-OPS-389] gap 카탈로그는 자동 로드 표에 남은 전문 행과 영역 상세로 옮긴 행을 함께 싣고, 레지스트리 줄은 싣지 않는다.
test('gap catalog reads full rows from the auto-loaded index and the gap area detail', () => {
  const full = (file) => fs.readFileSync(path.join(repo, file), 'utf8').split(/\r?\n/)
    .filter(line => /^\| GAP-[A-Z]+-\d{3} \|/.test(line) && line.trim().slice(1, -1).split('|').length === 9)
    .map(line => line.match(/^\| (GAP-[A-Z]+-\d{3}) \|/)[1]);
  const kept = full(GAP_INDEX);
  const moved = full(GAP_DETAIL);
  assert.ok(kept.length > 0 && moved.length > 0);
  assert.deepEqual(baseline.catalogs.gaps.map(gap => gap.id).sort(), [...kept, ...moved].sort());
  assert.ok(baseline.catalogs.gaps.filter(gap => moved.includes(gap.id)).every(gap => gap.source === GAP_DETAIL));
  // red 재현: 상세 행을 지우면 카탈로그에서 빠진다 — 레지스트리 줄이 남아도 그 줄로 대신 싣지 않는다.
  const [first] = moved;
  mutate(GAP_DETAIL, text => text.split(/(?<=\n)/).filter(line => !line.startsWith(`| ${first} |`)).join(''), () => {
    assert.ok(!buildAtlasCatalog(fixture).catalogs.gaps.some(gap => gap.id === first));
  });
});

// [DEC-OPS-389] 역방향 대체: 뒤 결정의 supersedes 칸이 인용한 결정에 그 뒤 결정 ID 를 보인다(색인 행은 고치지 않는다).
test('decision records show the later decisions whose supersedes cell cites them', () => {
  const byId = new Map(baseline.catalogs.decisions.map(item => [item.id, item]));
  assert.ok(byId.get('DEC-OPS-381').supersededBy.includes('DEC-OPS-385'));
  assert.ok(byId.get('DEC-OPS-381').details.some(item => item.label === '뒤 결정의 대체 범위에 인용' && item.value.includes('DEC-OPS-385')));
  const cited = new Set(baseline.catalogs.decisions.flatMap(item => (String(item.supersedes ?? '').match(/\b(?:ADR-\d{4}|DEC-OPS-\d{3})\b/g) ?? [])
    .filter(id => id !== item.id)));
  for (const item of baseline.catalogs.decisions) {
    assert.equal(Boolean(item.supersededBy), cited.has(item.id), `${item.id}: 역방향 표시는 뒤 결정의 supersedes 인용과 같아야 합니다.`);
  }
  // red 재현: DEC-OPS-385 의 supersedes 에서 DEC-OPS-381 인용을 지우면 381 의 역방향 표시도 사라진다.
  // 색인 행과 보관 원문의 supersedes 는 같아야 하므로(카탈로그가 대조한다) 둘을 함께 바꾼다.
  const citation = "| DEC-OPS-381 의 '공용 결정 인덱스에는 Accepted ADR(5열)' 가운데";
  const uncite = text => {
    assert.equal(text.split(citation).length, 2, 'DEC-OPS-385 의 supersedes 인용이 한 번 있어야 합니다.');
    return text.replace(citation, "| 앞 결정의 '공용 결정 인덱스에는 Accepted ADR(5열)' 가운데");
  };
  mutate(CURRENT_DECISION_INDEX, uncite, () => mutate(DECISION_ARCHIVE, uncite, () => {
    const mutated = buildAtlasCatalog(fixture).catalogs.decisions.find(item => item.id === 'DEC-OPS-381');
    assert.ok(!(mutated.supersededBy ?? []).includes('DEC-OPS-385'));
  }));
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

test('decision search preserves full rationale, late evidence links and stable record identity', () => {
  const source = 'docs/archived/operational-decisions-history.md';
  const original = baseline.catalogs.decisions.find(item => item.id === 'DEC-OPS-001');
  mutate(source, text => text.replace(/^\| DEC-OPS-001 \|.*$/m, line => {
    const cells = line.replace(/^\|\s*|\s*\|$/g, '').split(/\s+\|\s+/);
    cells[2] = `${'long decision '.repeat(45)}full-decision-tail-probe`;
    cells[3] = 'rationale-only-search-probe';
    cells[4] += ', [late evidence probe](../README.md#문서-인덱스-documentation-index)';
    return `| ${cells.join(' | ')} |`;
  }), () => {
    const decision = buildAtlasCatalog(fixture).catalogs.decisions.find(item => item.id === original.id);
    assert.equal(decision.source, original.source);
    assert.equal(decision.status, original.status);
    assert.equal(decision.summary.includes('full-decision-tail-probe'), false, 'display excerpt stays bounded');
    assert.match(decision.searchText, /full-decision-tail-probe/);
    assert.match(decision.searchText, /rationale-only-search-probe/);
    assert.ok(decision.details.some(item => item.label === '시행일' && item.value === '2026-08-18'));
    assert.deepEqual(decision.links.slice(0, original.links.length), original.links);
    assert.deepEqual(decision.links.at(-1), { label: 'late evidence probe', path: 'docs/README.md#문서-인덱스-documentation-index' });
  });
});

test('compact decision indexes preserve every archived decision body and rationale', () => {
  const source = 'docs/archived/operational-decisions-history.md';
  const history = fs.readFileSync(path.join(repo, source), 'utf8');
  const rows = [...history.matchAll(/^\| DEC-OPS-\d{3} \|.*$/gm)];
  assert.ok(rows.length > 0);
  // 각 결정은 그 ID 를 가진 색인(공용·영역·역사) 하나에서 온다.
  const indexOf = new Map(ALL_DECISION_INDEXES.flatMap(file => [...fs.readFileSync(path.join(repo, file), 'utf8')
    .matchAll(/^\| (DEC-OPS-\d{3}) \|/gm)].map(match => [match[1], file])));
  for (const file of [HISTORICAL_DECISION_INDEX, ...DECISION_AREA_INDEXES.map(({ path: areaPath }) => areaPath)]) {
    assert.ok([...indexOf.values()].includes(file), `${file} must hold the moved decisions`);
  }
  for (const [row] of rows) {
    const cells = row.replace(/^\|\s*|\s*\|$/g, '').split(/\s+\|\s+/).map(cell => cell.trim());
    const actual = baseline.catalogs.decisions.find(item => item.id === cells[0]);
    assert.equal(actual.source, indexOf.get(cells[0]));
    assert.equal(actual.status, cells[1]);
    assert.equal(actual.supersedes, cells[6]);
    assert.equal(actual.details.find(item => item.label === '결정 원문').value, cells[2]);
    assert.equal(actual.details.find(item => item.label === '이유').value, cells[3]);
    assert.ok(actual.searchText.includes(cells[2]));
    assert.ok(actual.searchText.includes(cells[3]));
    assert.ok(actual.links.some(link => link.path === `${source}#${cells[0].toLowerCase()}`));
  }
});

test('decision history cannot silently substitute another ID or divergent approval metadata', () => {
  const history = 'docs/archived/operational-decisions-history.md';
  const memory = '.agent/memory/decisions.md';
  // The ID is the archive anchor: an index row cannot point itself at another (or any) archive section.
  for (const anchor of ['#dec-ops-002', '#dec-ops-001']) {
    mutate(memory, text => {
      const mutated = text.replace(/^(\| DEC-OPS-001 \| accepted \| )/m, `$1[원문](../../docs/archived/operational-decisions-history.md${anchor}) `);
      assert.notEqual(mutated, text);
      return mutated;
    }, () => {
      assert.throws(() => buildAtlasCatalog(fixture), /DEC-OPS-001 must not link a decision history section; its ID is the archive anchor/);
    });
  }
  mutate(history, text => text.replace(/^\| DEC-OPS-001 \|.*\r?\n/m, ''), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /DEC-OPS-001 decision history section must contain its same-ID row/);
  });
  mutate(history, text => text.replace(/^\| DEC-OPS-001 \|.*$/m, row => `${row}\n${row}`), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /decision history duplicate ID/);
  });
  mutate(history, text => text.replace(/^## DEC-OPS-00[12]$/gm, heading =>
    heading.endsWith('1') ? '## DEC-OPS-002' : '## DEC-OPS-001'), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /decision history section must contain its same-ID row/);
  });
  for (const index of [1, 5, 6]) {
    mutate(history, text => text.replace(/^\| DEC-OPS-001 \|.*$/m, row => {
      const cells = row.replace(/^\|\s*|\s*\|$/g, '').split(/\s+\|\s+/);
      cells[index] = 'unapproved-metadata-probe';
      return `| ${cells.join(' | ')} |`;
    }), () => {
      assert.throws(() => buildAtlasCatalog(fixture), /DEC-OPS-001 decision history status\/date\/supersedes differs from index/);
    });
  }
  mutate(history, text => `${text}\nUnlinked archive paragraph search probe.\n`, () => {
    const decision = buildAtlasCatalog(fixture).catalogs.decisions.find(item => item.id === 'DEC-OPS-001');
    assert.equal(decision.searchText.includes('Unlinked archive paragraph search probe.'), false);
  });
});

test('operational decision rows take their archive anchor from the ID and keep five columns', () => {
  const history = 'docs/archived/operational-decisions-history.md';
  const memory = '.agent/memory/decisions.md';
  for (const decision of baseline.catalogs.decisions.filter(item => item.id.startsWith('DEC-'))) {
    assert.deepEqual(decision.links[0], { label: '원문', path: `${history}#${decision.id.toLowerCase()}` });
  }
  // A new decision without its archive section has no anchor to resolve.
  mutate(memory, text => `${text}\n| DEC-OPS-999 | accepted | new decision probe | 2026-10-17 | - |\n`, () => {
    assert.throws(() => buildAtlasCatalog(fixture), /DEC-OPS-999 decision history section missing; its ID is the archive anchor/);
  });
  // The repeated reason/source columns do not come back, and a row cannot lose a column either.
  const rowPattern = /^\| DEC-OPS-001 \| accepted \| (.+?) \| (2026-08-18) \| - \|/m;
  for (const [label, replacement] of [
    ['seven columns', '| DEC-OPS-001 | accepted | $1 | 승인·근거는 보관 원문 | [원문](../../docs/archived/operational-decisions-history.md#dec-ops-001) | $2 | - |'],
    ['four columns', '| DEC-OPS-001 | accepted | $1 | $2 |'],
  ]) {
    mutate(memory, text => {
      const mutated = text.replace(rowPattern, replacement);
      assert.notEqual(mutated, text, label);
      return mutated;
    }, () => {
      assert.throws(() => buildAtlasCatalog(fixture), /DEC-OPS-001 decision index row requires five columns/, label);
    });
  }
  // ADR 행도 5열이다 — 걷은 이유·정본 열을 되돌리면 붉다(DEC-OPS-381).
  mutate(memory, text => {
    const mutated = text.replace(/^(\| ADR-0001 \| accepted \| [^|]+ \| )/m,
      '$1probe reason | [ADR-0001](../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md) | ');
    assert.notEqual(mutated, text);
    return mutated;
  }, () => {
    assert.throws(() => buildAtlasCatalog(fixture), /ADR-0001 decision index row requires five columns/);
  });
});

test('current, area and historical decision indexes partition every archived decision exactly once', () => {
  const memory = CURRENT_DECISION_INDEX;
  const historical = HISTORICAL_DECISION_INDEX;
  const historicalText = fs.readFileSync(path.join(repo, historical), 'utf8');
  const row = historicalText.split(/\r?\n/).find(line => /^\| DEC-OPS-\d{3} \|/.test(line));
  assert.ok(row, 'the historical index must hold at least one decision');
  const id = row.match(/^\| (DEC-OPS-\d{3}) \|/)[1];
  const cells = row.replace(/^\|\s*|\s*\|$/g, '').split(/\s+\|\s+/);
  const record = baseline.catalogs.decisions.find(item => item.id === id);
  assert.equal(record.source, historical);
  assert.ok(record.details.some(item => item.label === '역사 분류' && item.value === cells[5]));
  assert.equal(record.supersedes, cells[4]);
  const withRow = (file, transform) => text => {
    const mutated = transform(text);
    assert.notEqual(mutated, text, `${file} mutation did not apply`);
    return mutated;
  };
  // 누락: 역사 색인에서 행 하나를 빼면 어느 색인에도 없다.
  mutate(historical, withRow(historical, text => text.replace(new RegExp(`^\\| ${id} \\|.*\\r?\\n`, 'm'), '')), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${id} archived decision is missing from every decision index`));
  });
  // 중복: 같은 결정을 현재 색인에도 두면 두 번 색인된다.
  mutate(memory, withRow(memory, text => text.replace(/^(\| DEC-OPS-001 \|.*)$/m, `$1\n| ${cells.slice(0, 5).join(' | ')} |`)), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${id} is indexed more than once across the decision indexes`));
  });
  // 상태 불일치: 역사 색인 행도 보관 원문과 상태·시행일·supersedes 가 같아야 한다.
  for (const index of [1, 3, 4]) {
    mutate(historical, withRow(historical, text => text.replace(row, `| ${cells.map((cell, at) => at === index ? 'drifted-probe' : cell).join(' | ')} |`)), () => {
      assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${id} decision history status/date/supersedes differs from index`));
    });
  }
  // 형식: 분류 어휘·열 수·DEC 전용.
  mutate(historical, withRow(historical, text => text.replace(row, `| ${cells.map((cell, at) => at === 5 ? '보관' : cell).join(' | ')} |`)), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${id} historical decision kind must be one of 퇴역, 대체됨, 일회성 실행, 구현 기록`));
  });
  mutate(historical, withRow(historical, text => text.replace(row, `| ${cells.slice(0, 5).join(' | ')} |`)), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${id} historical decision index row requires seven columns`));
  });
  // 다른 색인에 없는 ID 로 본다 — 이미 색인된 ADR 이면 중복 검사가 먼저 붉다.
  mutate(historical, withRow(historical, text => `${text}| ADR-9999 | accepted | probe | 2026-08-15 | - | 대체됨 | probe |\n`), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /ADR-9999 historical decision index accepts only operational decisions/);
  });
  // 영역 색인도 같은 분할에 든다(DEC-OPS-381): 행 하나를 빼면 누락, 공용 색인에도 두면 중복, 원문과 다르면 불일치다.
  const { label: areaLabel, path: area } = DECISION_AREA_INDEXES[0];
  const areaRow = fs.readFileSync(path.join(repo, area), 'utf8').split(/\r?\n/).find(line => /^\| DEC-OPS-\d{3} \|/.test(line));
  assert.ok(areaRow, 'the first area index must hold at least one decision');
  const areaId = areaRow.match(/^\| (DEC-OPS-\d{3}) \|/)[1];
  const areaCells = areaRow.replace(/^\|\s*|\s*\|$/g, '').split(/\s+\|\s+/);
  const areaRecord = baseline.catalogs.decisions.find(item => item.id === areaId);
  assert.equal(areaRecord.source, area);
  assert.ok(areaRecord.details.some(item => item.label === '결정 영역' && item.value === areaLabel));
  mutate(area, withRow(area, text => text.replace(new RegExp(`^\\| ${areaId} \\|.*\\r?\\n`, 'm'), '')), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${areaId} archived decision is missing from every decision index`));
  });
  mutate(memory, withRow(memory, text => text.replace(/^(\| DEC-OPS-001 \|.*)$/m, `$1\n${areaRow}`)), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${areaId} is indexed more than once across the decision indexes`));
  });
  mutate(area, withRow(area, text => text.replace(areaRow, `| ${areaCells.map((cell, at) => at === 1 ? 'drifted-probe' : cell).join(' | ')} |`)), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${areaId} decision history status/date/supersedes differs from index`));
  });
  mutate(area, withRow(area, text => text.replace(areaRow, `| ${[...areaCells, 'extra'].join(' | ')} |`)), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${areaId} decision index row requires five columns`));
  });
  // 특정 경로에만 걸리는 Accepted ADR 은 영역 색인 표 맨 위에 있고(DEC-OPS-385) 영역 라벨을 단다. 공용 색인에도 두면 중복이다.
  const areaAdrRow = fs.readFileSync(path.join(repo, area), 'utf8').split(/\r?\n/).find(line => /^\| ADR-\d{4} \|/.test(line));
  assert.ok(areaAdrRow, 'the first area index must hold at least one Accepted ADR');
  const areaAdrId = areaAdrRow.match(/^\| (ADR-\d{4}) \|/)[1];
  const areaAdr = baseline.catalogs.decisions.find(item => item.id === areaAdrId);
  assert.equal(areaAdr.source, area);
  assert.ok(areaAdr.details.some(item => item.label === '결정 영역' && item.value === areaLabel));
  assert.ok(areaAdr.links.some(link => link.path.startsWith(`docs/02-architecture/decisions/${areaAdrId}-`)));
  mutate(memory, withRow(memory, text => text.replace(/^(\| ADR-0001 \|.*)$/m, `$1\n${areaAdrRow}`)), () => {
    assert.throws(() => buildAtlasCatalog(fixture), new RegExp(`${areaAdrId} is indexed more than once across the decision indexes`));
  });
});

test('only the registry\'s same-ID Accepted ADR supplies canonical search text', () => {
  const id = 'ADR-0001';
  const source = 'docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md';
  const record = baseline.catalogs.decisions.find(item => item.id === id);
  assert.equal(record.source, '.agent/memory/decisions.md');
  assert.equal(record.title, fs.readFileSync(path.join(repo, source), 'utf8').match(/^#\s+(.+)$/m)[1].trim());
  assert.ok(record.links.some(link => link.path === source));
  mutate(source, text => `${text}\n## Canonical body search probe\nADR-body-only-probe\n`, () => {
    const indexed = buildAtlasCatalog(fixture).catalogs.decisions.find(item => item.id === id);
    assert.match(indexed.searchText, /ADR-body-only-probe/);
    assert.equal(indexed.id, record.id);
    assert.deepEqual(indexed.links, record.links);
  });
  mutate(source, text => text.replace('상태: Accepted', '상태: Proposed') + '\nnot-approved-body-probe\n', () => {
    const indexed = buildAtlasCatalog(fixture).catalogs.decisions.find(item => item.id === id);
    assert.equal(indexed.status, 'accepted', 'the historical memory status is not silently rewritten');
    assert.ok(indexed.details.some(item => item.label === 'ADR 선언 상태' && item.value === 'Proposed'));
    assert.equal(indexed.searchText.includes('not-approved-body-probe'), false);
  });
  // ADR 링크의 정본은 ADR 색인이다(DEC-OPS-381): 색인 링크가 다른 ADR 을 가리키거나 행이 없으면 붉다.
  const registry = 'docs/02-architecture/decisions/README.md';
  mutate(registry, text => {
    const mutated = text.replace('[ADR-0001](ADR-0001-core-app-product-boundary.md)', '[ADR-0001](ADR-0002-korean-first-frontend.md)');
    assert.notEqual(mutated, text);
    return mutated;
  }, () => {
    assert.throws(() => buildAtlasCatalog(fixture), /ADR-0001 must link exactly one same-ID ADR/);
  });
  mutate(registry, text => {
    const mutated = text.replace(/^\| \[ADR-0001\]\(.*\r?\n/m, '');
    assert.notEqual(mutated, text);
    return mutated;
  }, () => {
    assert.throws(() => buildAtlasCatalog(fixture), /ADR-0001 is missing from the ADR registry/);
  });
  mutate(source, text => text.replace('# ADR-0001:', '# ADR-9999:'), () => {
    assert.throws(() => buildAtlasCatalog(fixture), /ADR-0001 canonical ADR heading differs/);
  });
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

// 읽은 원본은 경로만 싣는다. 파일별 내용 해시를 다시 실으면 catalog 사실과 무관한 소스 한 줄 수정마다 Atlas 를 다시 만들어야 한다.
test('catalog lists input paths without content hashes: only catalog-visible source changes alter it', () => {
  mutate('settings.gradle', text => text.replace(/\r?\n/g, '\r\n'), () => {
    assert.deepEqual(buildAtlasCatalog(fixture), baseline);
  });
  const route = baseline.catalogs.routes[0].source;
  assert.ok(baseline.sources.some(source => source.path === route), 'the route source must be a read input');
  mutate(route, text => `${text}\n// catalog-invisible edit\n`, () => {
    assert.deepEqual(buildAtlasCatalog(fixture), baseline, 'a source edit that changes no catalog fact must not change the catalog');
  });
  // catalog 가 싣는 사실(공용 메모리 행의 문서 링크 경로)이 바뀌면 catalog 도 바뀐다.
  mutate('.agent/memory/project-context.md', text => text.replaceAll('](../../settings.gradle)', '](../../settings-renamed.gradle)'), () => {
    const changed = buildAtlasCatalog(fixture);
    assert.ok(changed.catalogs.memory.some(item => item.links.some(link => link.path === 'settings-renamed.gradle')));
    assert.notDeepEqual(changed, baseline);
  });
  assert.ok(baseline.sources.length > 0);
  assert.ok(baseline.sources.every(source => Object.keys(source).join(',') === 'path'),
    'sources must carry only the path — per-file content hashes force regeneration on catalog-invisible edits');
  assert.ok(baseline.sources.every(source => !/\.env(?:\.|$)|governance_harness_atlas\.html|frontend\/atlas\//.test(source.path)));
  assert.equal('generatedAt' in baseline, false);
  assert.equal('head' in baseline, false);
});

// Dependabot 이 고치는 값(의존성·패키지 관리자 버전, 액션 커밋 핀)은 catalog 에 싣지 않는다. 실으면 봇 PR 마다 Atlas 가 낡아
// 생성물 계약이 붉는데 봇 PR 은 재생성을 돌리지 못한다(2026-10-19 Next 16.4.0≠16.4.2). 값의 정본은 선언 파일이고 화면은 그 파일로 링크한다.
test('dependency versions and action commit pins never reach the catalog', () => {
  const sourcePaths = baseline.sources.map(source => source.path);
  // 값이 버전뿐인 선언 파일은 읽지 않는다. build.gradle 은 게이트 원장이 가리키는 원본이라 경로로 읽지만 내용은 싣지 않는다(아래 범프).
  for (const declaration of ['.nvmrc', 'gradle/libs.versions.toml', 'gradle/wrapper/gradle-wrapper.properties',
    'frontend/pnpm-lock.yaml', 'package-lock.json']) {
    assert.ok(!sourcePaths.includes(declaration), `${declaration} declares versions — link it from the template instead of reading it`);
  }
  assert.deepEqual(Object.keys(baseline.facts).filter(key => /version/i.test(key)), [], 'no version facts');
  const actions = baseline.catalogs.workflows.flatMap(workflow => workflow.jobs.flatMap(job => job.actions));
  assert.ok(actions.includes('actions/checkout'), 'workflow actions are still listed by name');
  assert.deepEqual(actions.filter(action => action.includes('@')), [], 'workflow actions carry no commit pin');
  assert.equal(baseline.catalogs.modules.find(module => module.id === 'frontend').details.find(item => item.label === '도구체인')?.value, 'pnpm');
  const bumpPackage = text => {
    const pkg = JSON.parse(text);
    for (const field of ['dependencies', 'devDependencies']) for (const name of Object.keys(pkg[field] ?? {})) pkg[field][name] = '99.0.0';
    if (pkg.packageManager) pkg.packageManager = pkg.packageManager.replace(/@.*$/, '@99.0.0');
    return `${JSON.stringify(pkg, null, 2)}\n`;
  };
  const workflow = baseline.catalogs.workflows.find(item => item.jobs.some(job => job.actions.includes('actions/checkout'))).source;
  const bumpPins = text => text.replace(/(uses:\s*actions\/checkout@)[0-9a-f]{40}/g, `$1${'a'.repeat(40)}`);
  assert.ok(sourcePaths.includes('build.gradle'), 'the Boot bump below must reach a read input');
  const bumpGradle = text => text.replace(/(id 'org\.springframework\.boot' version ')[^']+/, '$199.0.0')
    .replace(/(spring-boot-dependencies:)[^"]+/, '$199.0.0');
  mutate('frontend/package.json', bumpPackage, () => mutate('package.json', bumpPackage, () => mutate(workflow, bumpPins,
    () => mutate('build.gradle', bumpGradle, () => {
      assert.match(fs.readFileSync(path.join(fixture, 'frontend/package.json'), 'utf8'), /"next": "99\.0\.0"/);
      assert.match(fs.readFileSync(path.join(fixture, 'frontend/package.json'), 'utf8'), /"packageManager": "pnpm@99\.0\.0"/);
      assert.match(fs.readFileSync(path.join(fixture, workflow), 'utf8'), new RegExp(`actions/checkout@${'a'.repeat(40)}`));
      assert.match(fs.readFileSync(path.join(fixture, 'build.gradle'), 'utf8'), /id 'org\.springframework\.boot' version '99\.0\.0'/);
      assert.deepEqual(buildAtlasCatalog(fixture), baseline, 'a dependency, package manager or action pin bump must not change the catalog');
    }))));
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

// [FE-CONTRACT-05] 이 수들의 계수 규칙은 생성기 한 곳에 있다. Atlas vitest 가 같은 정규식을 복사해 다시 세던 것을
// 걷고, 규칙의 회귀는 여기서 합성 파일로 본다. 파일을 한꺼번에 더하고 catalog 는 한 번만 다시 만든다.
test('independent count facts follow their rules for test annotations, shared PostgreSQL classes and waiver markers', () => {
  const migrationTests = 'migration-tool/src/test/java/nuri/migration';
  const schemaTests = 'api-server/src/test/java/nuri/api/schema';
  const migrations = 'api-server/src/main/resources/db/migration';
  addAll([
    [`${migrationTests}/SyntheticAtlasCountTest.java`, [
      'class SyntheticAtlasCountTest {',
      '  @Test void plain() {}',
      '  @ParameterizedTest @ValueSource(ints = 1) void parameterized(int value) {}',
      '  @RepeatedTest(2) void repeated() {}',
      '  @TestFactory Object factory() { return null; }',
      '  @TestTemplate void template() {}',
      '  // @Test void commentedOut() {}',
      '  @TestInstance(TestInstance.Lifecycle.PER_CLASS) static class NotATestMethod {}',
      '}',
      '',
    ].join('\n')],
    [`${migrationTests}/SyntheticAtlasFixtures.java`, 'class SyntheticAtlasFixtures {}\n'],
    [`${schemaTests}/SyntheticAtlasSharedIntegrationTest.java`,
      'class SyntheticAtlasSharedIntegrationTest extends SharedPostgresMigrationTestSupport {}\n'],
    [`${schemaTests}/SyntheticAtlasOtherBaseTest.java`,
      'class SyntheticAtlasOtherBaseTest extends SharedPostgresMigrationTestSupportFactory {}\n'],
    [`${migrations}/V9_999__synthetic_atlas_waivers.sql`, '-- linter:ignore first\nSELECT 1; -- linter:ignore second\n'],
    [`${migrations}/V9_998__synthetic_atlas_plain.sql`, 'SELECT 1;\n'],
  ], () => {
    const { facts } = buildAtlasCatalog(fixture);
    // 다섯 시험 annotation 만 세고(주석·@TestInstance 제외), 파일 수는 *Test.java 만, 공유 PostgreSQL 은 정확한
    // 부모 이름만, waiver 는 표지 수와 표지가 있는 파일 수다. 나머지 수치는 바뀌지 않아야 한다.
    assert.deepEqual(facts, {
      ...baseline.facts,
      migrationTestCount: baseline.facts.migrationTestCount + 5,
      migrationTestFileCount: baseline.facts.migrationTestFileCount + 1,
      sharedPostgresClassCount: baseline.facts.sharedPostgresClassCount + 1,
      waiverCount: baseline.facts.waiverCount + 2,
      waiverFileCount: baseline.facts.waiverFileCount + 1,
    });
  });
  assert.ok(baseline.facts.sharedPostgresClassCount > 0, 'shared PostgreSQL discovery must not collapse');
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

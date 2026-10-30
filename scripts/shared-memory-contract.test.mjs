import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  GAP_FILES, LEDGER_MEMORY_BINDINGS, TEST_SOURCE_ROOTS, decisionIndexIds, ledgerCountFacts, ledgerMemoryViolations, restatementMessage,
  testSourceFiles, testSourceRestatements, testSourceViolations,
} from './ledger-count-restatement.mjs';
import {
  DECISION_AREA_INDEXES, DECISION_AREA_ROUTES, GAP_DETAIL, HISTORICAL_DECISION_INDEX, NO_EXTRA_INDEX_PATHS, UNASSIGNED_TOP_LEVEL,
  adrHolders, decisionReadingPlan, decisionRoute, matchesGlob, unassignedTopLevels,
} from './decision-indexes.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const memoryDir = path.join(repoRoot, '.agent', 'memory');

const documents = {
  'project-context.md': {
    kind: 'project-context',
    authority: 'derived-index',
    headings: [
      '이 문서의 권위와 읽기 순서',
      '제품 목적과 현재 경계',
      '모듈·런타임 지도',
      '검증된 현재 사실',
      '개발·검증·배포 흐름',
      '공유 워킹트리와 에이전트 인수인계',
      '재검증 트리거',
    ],
  },
  'decisions.md': {
    kind: 'decisions',
    authority: 'adr-index',
    headings: ['범위와 승격 규칙', 'Accepted ADR index', '운영 결정 index', '영역 결정 색인', '기록 템플릿'],
  },
  'known-gaps.md': {
    kind: 'known-gaps',
    authority: 'derived-active-index',
    headings: ['범위·상태 정의', '활성 Gap registry', '재검증 대기', '영역 상세 gap 레지스트리', '해결 규칙'],
  },
};

function readRepoFile(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8');
}

/** 영역 결정 색인(DEC-OPS-381) — 자동 로드하지 않지만 공용 메모리와 같은 행 규칙을 지킨다(H2: 옮긴 행을 검사 밖으로 빼지 않는다). */
function areaIndexFiles() {
  return Object.fromEntries(DECISION_AREA_INDEXES.map(({ path: areaPath }) => [path.posix.basename(areaPath), readRepoFile(areaPath)]));
}

function parseFrontmatter(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(match, `${file}: YAML frontmatter가 필요합니다.`);

  const values = {};
  let listKey = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    const item = rawLine.match(/^\s+-\s+(.+)$/);
    if (item && listKey) {
      values[listKey].push(item[1].trim());
      continue;
    }
    const field = rawLine.match(/^([a-z_]+):\s*(.*)$/);
    assert.ok(field, `${file}: 해석할 수 없는 frontmatter 행: ${rawLine}`);
    const [, key, rawValue] = field;
    if (rawValue === '') {
      values[key] = [];
      listKey = key;
    } else {
      values[key] = rawValue.trim();
      listKey = null;
    }
  }
  return values;
}

function headingCount(text, heading) {
  return text.split(/\r?\n/).filter((line) => line === `## ${heading}`).length;
}

function markdownTableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function markdownSection(text, heading, nextHeading) {
  const lines = text.split(/\r?\n/);
  const startIndexes = lines.flatMap((line, index) => line === `## ${heading}` ? [index] : []);
  assert.equal(startIndexes.length, 1, `'${heading}' section은 정확히 한 번 있어야 합니다.`);
  const endIndex = lines.indexOf(`## ${nextHeading}`, startIndexes[0] + 1);
  assert.ok(endIndex > startIndexes[0], `'${heading}' 다음에 '${nextHeading}' section이 있어야 합니다.`);
  return lines.slice(startIndexes[0] + 1, endIndex).join('\n');
}

function markdownTableRows(text, expectedHeader) {
  const lines = text.split(/\r?\n/);
  const headerIndexes = lines.flatMap((line, index) => {
    const cells = markdownTableCells(line);
    return cells.length === expectedHeader.length
      && cells.every((cell, cellIndex) => cell === expectedHeader[cellIndex])
      ? [index]
      : [];
  });
  assert.equal(headerIndexes.length, 1, `markdown table header가 정확히 한 번 있어야 합니다: ${expectedHeader.join(' | ')}`);

  const headerIndex = headerIndexes[0];
  const separator = markdownTableCells(lines[headerIndex + 1] ?? '');
  assert.equal(separator.length, expectedHeader.length, 'markdown table separator 열 수가 header와 다릅니다.');
  assert.ok(separator.every((cell) => /^:?-{3,}:?$/u.test(cell)), 'markdown table separator가 잘못됐습니다.');

  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    const cells = markdownTableCells(line);
    if (cells.length === 0) break;
    assert.equal(cells.length, expectedHeader.length, 'markdown table data 열 수가 header와 다릅니다.');
    rows.push(cells);
  }
  return rows;
}

function acceptedAdrIds(registry) {
  const entries = markdownTableRows(registry, ['ADR', '결정', '상태']).map((cells) => {
    const idCell = cells[0] ?? '';
    const idMatch = idCell.match(/^\[(ADR-\d{4})\]\([^\r\n)]+\)$/u);
    assert.ok(idMatch, `ADR registry ID는 exact markdown link여야 합니다: ${idCell}`);
    return { id: idMatch[1], status: cells[2] ?? '' };
  });
  const allIds = entries.map(({ id }) => id);
  assert.equal(allIds.length, new Set(allIds).size, `ADR registry에 중복 ID가 있습니다: ${allIds.join(', ')}`);
  return entries.flatMap(({ id, status }) => /^Accepted(?:\s+—\s+\S.*)?$/u.test(status) ? [id] : []);
}

function decisionMemoryAdrIds(decisions) {
  const acceptedSection = markdownSection(decisions, 'Accepted ADR index', '운영 결정 index');
  // ADR ID 가 ADR 색인의 키라 이유·정본 열을 두지 않는다(DEC-OPS-381) — 링크는 ADR 색인이 갖는다.
  const ids = markdownTableRows(acceptedSection, DECISION_INDEX_HEADER).map((cells) => {
    assert.match(cells[0] ?? '', /^ADR-\d{4}$/u, 'Accepted ADR index에 잘못된 ADR ID가 있습니다.');
    assert.equal(cells[1], 'accepted', `${cells[0]}: Accepted ADR index 상태는 exact accepted여야 합니다.`);
    return cells[0];
  });
  assert.equal(ids.length, new Set(ids).size, `decisions memory에 중복 ADR ID가 있습니다: ${ids.join(', ')}`);
  // 표 밖(목록 뒤 등)에 놓인 ADR 행은 표 파서가 세지 않는다 — 집합 대조를 빠져나가지 않게 붉힌다.
  const rowLines = acceptedSection.split(/\r?\n/).filter((line) => /^\| ADR-\d{4} \|/u.test(line)).length;
  assert.equal(rowLines, ids.length, 'Accepted ADR index 의 ADR 행은 표 안에만 둔다.');
  return ids;
}

/*
 * 운영 결정 표는 이유·정본 열을 두지 않는다 — 모든 행이 같은 값('승인·근거는 보관 원문', ID 로 만드는 보관 링크)이었다.
 * ID 가 보관 원문의 앵커이고, 그 앵커가 실제 절로 풀리는지와 상태·시행일·supersedes 일치는 Atlas 카탈로그가 본다.
 */
export const DECISION_ARCHIVE = '../../docs/archived/operational-decisions-history.md';
// 지금의 작업을 제약하지 않는 결정은 자동 로드되지 않는 역사 색인에, 특정 경로에만 걸리는 결정은 영역 색인에 있다(DEC-OPS-381).
// 색인 사이의 누락·중복·원문 일치는 Atlas 카탈로그가 본다.
const fromMemory = (repoPath) => path.posix.relative('.agent/memory', repoPath);
export const DECISION_HISTORICAL_INDEX = fromMemory(HISTORICAL_DECISION_INDEX);
export const DECISION_INDEX_HEADER = Object.freeze(['ID', '상태', '결정', '시행일', 'supersedes']);

function decisionRowId(cells, label) {
  assert.match(cells[0] ?? '', /^DEC-OPS-\d{3}$/u, `${label}에 잘못된 DEC ID가 있습니다: ${cells[0]}`);
  assert.match(cells[1] ?? '', /^(?:accepted|superseded|rejected)$/u, `${cells[0]}: 허용되지 않은 결정 상태입니다.`);
  assert.match(cells[3] ?? '', /^\d{4}-\d{2}-\d{2}$/u, `${cells[0]}: 시행일 열은 날짜여야 합니다.`);
  return cells[0];
}

/** 결정 색인 표(공용·영역)의 행 형식: 머리글 정확히 한 번, DEC ID·상태 어휘·시행일 형식, 표 안 중복 없음. */
export function decisionTableIds(text, label) {
  const ids = markdownTableRows(text, DECISION_INDEX_HEADER).map((cells) => decisionRowId(cells, label));
  assert.equal(ids.length, new Set(ids).size, `${label}에 중복 DEC ID가 있습니다.`);
  return ids;
}

/**
 * [2026-10-26 DEC-OPS-385] 영역 색인 표는 그 영역 경로에만 걸리는 Accepted ADR 행을 맨 위(운영 결정 행 앞)에 두고 운영 결정 행이
 * 뒤따른다. ADR 행은 공용 인덱스의 ADR 표와 같은 형식(exact accepted)이고, 운영 결정 행은 decisionTableIds 와 같은 규칙이다.
 */
export function areaIndexIds(text, label) {
  const rows = markdownTableRows(text, DECISION_INDEX_HEADER);
  const adrCount = rows.findIndex(([id]) => !/^ADR-/u.test(id ?? ''));
  const adr = rows.slice(0, adrCount === -1 ? rows.length : adrCount).map((cells) => {
    assert.match(cells[0] ?? '', /^ADR-\d{4}$/u, `${label}에 잘못된 ADR ID가 있습니다: ${cells[0]}`);
    assert.equal(cells[1], 'accepted', `${cells[0]}: 영역 색인의 ADR 상태는 exact accepted여야 합니다.`);
    return cells[0];
  });
  const dec = rows.slice(adr.length).map((cells) => {
    assert.ok(!/^ADR-/u.test(cells[0] ?? ''), `${label}: ADR 행(${cells[0]})은 표 맨 위, 운영 결정 행 앞에 둔다.`);
    return decisionRowId(cells, label);
  });
  assert.equal(adr.length, new Set(adr).size, `${label}에 중복 ADR ID가 있습니다.`);
  assert.equal(dec.length, new Set(dec).size, `${label}에 중복 DEC ID가 있습니다.`);
  const rowLines = text.split(/\r?\n/).filter((line) => /^\| (?:ADR-\d{4}|DEC-OPS-\d{3}) \|/u.test(line)).length;
  assert.equal(rowLines, rows.length, `${label}: 결정 행은 표 안에만 둔다.`);
  return { adr, dec };
}

/**
 * [2026-10-26 DEC-OPS-385] 공용 인덱스의 영역별 ADR 목록. 영역에 둔 ADR 대부분이 집행 계약·시험 때문에 다른 영역 경로에도 걸려
 * 경로 라우팅만으로는 닿지 않으므로, 자동 로드되는 이 목록이 모든 ADR 의 ID·제목을 싣는다. 영역 줄은 그 영역 색인의 ADR 행과 같다.
 */
export const ADR_DIRECTORY_READING_RULE = '대상 경로가 그 영역에 걸리지 않아도 제목이 작업과 닿으면 그 행을 읽는다';

export function decisionMemoryAdrDirectory(decisions) {
  const section = markdownSection(decisions, 'Accepted ADR index', '운영 결정 index');
  // 이 목록은 읽기 규칙과 함께여야 쓸모가 있다 — 규칙 문장을 지우면 42개 ADR 행이 '경로가 맞을 때만' 읽히는 상태로 조용히 바뀐다.
  assert.ok(section.includes(ADR_DIRECTORY_READING_RULE), 'ADR 목록에는 제목이 작업과 닿으면 행을 읽는다는 규칙 문장이 있어야 합니다.');
  const directory = new Map();
  for (const line of section.split(/\r?\n/)) {
    const match = /^- \[[^\]]+\]\(([^)\s]+)\): (.+)$/u.exec(line);
    if (!match) continue;
    assert.ok(!directory.has(match[1]), `ADR 목록에 같은 영역 줄이 두 번 있습니다: ${match[1]}`);
    directory.set(match[1], [...match[2].matchAll(/\bADR-\d{4}\b/gu)].map((id) => id[0]));
  }
  return directory;
}

function assertAdrDirectoryMatchesAreas(decisions, areaTexts) {
  const directory = decisionMemoryAdrDirectory(decisions);
  const links = DECISION_AREA_INDEXES.map(({ path: areaPath }) => fromMemory(areaPath));
  assert.deepEqual([...directory.keys()], links, 'ADR 목록의 영역 줄은 영역 색인마다 하나씩, 경로 원장 순서로 둔다.');
  for (const { path: areaPath } of DECISION_AREA_INDEXES) {
    const rows = areaIndexIds(areaTexts[path.posix.basename(areaPath)], areaPath).adr;
    assert.deepEqual(directory.get(fromMemory(areaPath)), rows,
      `${areaPath}: 공용 인덱스 ADR 목록의 영역 줄이 영역 색인의 ADR 행과 다릅니다 — 행을 옮기거나 더하면 목록도 함께 고친다.`);
  }
}

/** 공용 인덱스와 영역 색인이 나눠 가진 Accepted ADR — 한 ADR 은 색인 하나에만 있다(DEC-OPS-385). */
function bindingAdrIds(decisions, areaTexts) {
  const indexed = [
    ...decisionMemoryAdrIds(decisions).map((id) => [id, 'decisions.md']),
    ...Object.entries(areaTexts).flatMap(([file, text]) => areaIndexIds(text, file).adr.map((id) => [id, file])),
  ];
  for (const [id, file] of indexed) {
    const holders = indexed.filter(([other]) => other === id).map(([, holder]) => holder);
    assert.equal(holders.length, 1, `${id}: ADR 은 공용·영역 색인 가운데 한 곳에만 둔다(${holders.join(', ')}, ${file}).`);
  }
  return indexed.map(([id]) => id);
}

export function decisionMemoryOperationalIds(decisions) {
  const section = markdownSection(decisions, '운영 결정 index', '영역 결정 색인');
  assert.ok(
    section.split(/\r?\n/).some((line) => line.startsWith('ID가 보관 원문의 앵커다') && line.includes(`](${DECISION_ARCHIVE})`)),
    '운영 결정 index 에는 ID 가 보관 원문의 앵커라는 규칙 줄과 보관 기록 링크가 있어야 합니다.',
  );
  assert.ok(
    section.includes(`](${DECISION_HISTORICAL_INDEX})`),
    '운영 결정 index 에는 역사 색인 링크가 있어야 합니다 — 옮긴 결정을 찾는 길은 그 링크뿐입니다.',
  );
  return decisionTableIds(section, '운영 결정 index');
}

/*
 * 「영역 결정 색인」 표는 경로를 영역 색인에 잇는다. 영역 색인은 자동으로 읽히지 않으므로 이 표가 그리로 가는 유일한 길이다 —
 * 링크 집합은 결정 색인 경로 원장(scripts/decision-indexes.mjs)과 정확히 같아야 하고, 어느 행에도 걸리지 않는 경로는 넷을 모두
 * 읽게 하는 행(fail-closed)이 있어야 한다.
 */
export function decisionAreaRoutes(decisions) {
  const section = markdownSection(decisions, '영역 결정 색인', '기록 템플릿');
  const rows = markdownTableRows(section, ['영역 색인', '이 경로를 고치면 읽는다']);
  const linked = rows.flatMap(([cell]) => [...cell.matchAll(/^\[[^\]]+\]\(([^)\s]+)\)$/gu)].map((match) => match[1]));
  assert.deepEqual(linked, DECISION_AREA_INDEXES.map(({ path: areaPath }) => fromMemory(areaPath)),
    '영역 결정 색인 표의 링크가 결정 색인 경로 원장과 다릅니다 — 영역 색인을 더하거나 옮기면 둘을 함께 고친다.');
  assert.ok(rows.some(([cell, routes]) => cell === '넷 모두' && /어느 행에도[^|]*걸리지 않는/u.test(routes)),
    '영역 결정 색인 표에는 어느 행에도 걸리지 않는 경로를 넷 모두로 보내는 행이 있어야 합니다(fail-closed).');
  return linked;
}

/*
 * [DEC-OPS-389] 경로 → 영역 색인 판정의 정본은 scripts/decision-indexes.mjs 의 DECISION_AREA_ROUTES 다. 표는 사람용 요약이므로
 * 영역 행의 경로 패턴(백틱)이 원장의 `paths` 와 정확히 같고, 경로가 아닌 조건 문장이 그대로 있으며, '추가 색인 없음' 행이 원장의
 * NO_EXTRA_INDEX_PATHS 와 같아야 한다 — 표에만 있는 경로는 읽기를 빠뜨리게 하고(안전 쪽 위반), 원장에만 있는 경로는 표만 보는
 * 에이전트가 넷 모두를 읽게 한다(낭비).
 */
const backtickTokens = (cell) => [...cell.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
function setDrift(label, shown, canonical) {
  const extra = shown.filter((glob) => !canonical.includes(glob));
  const missing = canonical.filter((glob) => !shown.includes(glob));
  const duplicated = shown.filter((glob, index) => shown.indexOf(glob) !== index);
  return extra.length + missing.length + duplicated.length === 0 ? []
    : [`${label}: 표와 경로 원장이 다릅니다 — 표에만 [${extra.join(', ')}], 원장에만 [${missing.join(', ')}], 중복 [${duplicated.join(', ')}]`];
}

export function decisionRouteTableViolations(decisions) {
  const section = markdownSection(decisions, '영역 결정 색인', '기록 템플릿');
  const rows = markdownTableRows(section, ['영역 색인', '이 경로를 고치면 읽는다']);
  const violations = [];
  for (const { area, label, path: areaPath } of DECISION_AREA_INDEXES) {
    const row = rows.find(([cell]) => cell === `[${label}](${fromMemory(areaPath)})`);
    if (!row) {
      violations.push(`${area}: 영역 행이 없습니다.`);
      continue;
    }
    let cell = row[1];
    for (const condition of DECISION_AREA_ROUTES[area].conditions) {
      if (!cell.includes(condition)) violations.push(`${area}: 경로가 아닌 조건 '${condition}' 이 표에 없습니다.`);
      cell = cell.split(condition).join('');
    }
    violations.push(...setDrift(area, backtickTokens(cell), DECISION_AREA_ROUTES[area].paths));
  }
  const derived = rows.find(([cell]) => cell === '추가 색인 없음');
  if (!derived) violations.push('추가 색인 없음 행이 없습니다 — 생성물·공용 메모리·결정 색인을 입력 경로로 판정한다는 규칙이 표에서 사라진다.');
  else violations.push(...setDrift('추가 색인 없음', backtickTokens(derived[1]), NO_EXTRA_INDEX_PATHS));
  return violations;
}

function assertExactAdrSet(registryIds, memoryIds) {
  const registrySet = new Set(registryIds);
  const memorySet = new Set(memoryIds);
  const missing = [...registrySet].filter((id) => !memorySet.has(id)).sort();
  const ghost = [...memorySet].filter((id) => !registrySet.has(id)).sort();
  assert.equal(
    missing.length + ghost.length,
    0,
    `Accepted ADR exact-set 불일치: missing=[${missing.join(', ')}], ghost=[${ghost.join(', ')}]`,
  );
}

function authoritativeE2eShardContract(requiredChecksText) {
  const manifest = JSON.parse(requiredChecksText);
  const e2eCheck = manifest.requiredChecks?.find(({ context }) => context === 'e2e-test');
  assert.ok(e2eCheck, 'required-checks에 e2e-test context가 없습니다.');

  const matrix = e2eCheck.aggregate?.sourceMatrix;
  assert.equal(matrix?.key, 'shard', 'e2e-test sourceMatrix key는 shard여야 합니다.');
  assert.equal(matrix?.completeCoordinates, true, 'e2e-test sourceMatrix는 completeCoordinates여야 합니다.');
  assert.ok(Array.isArray(matrix?.values) && matrix.values.length > 0, 'e2e-test shard 좌표가 없습니다.');

  const coordinates = matrix.values.map((value) => {
    const match = String(value).match(/^(\d+)\/(\d+)$/u);
    assert.ok(match, `e2e-test shard 좌표 형식이 잘못됐습니다: ${value}`);
    return { index: Number(match[1]), total: Number(match[2]) };
  });
  const totals = new Set(coordinates.map(({ total }) => total));
  assert.equal(totals.size, 1, 'e2e-test shard 좌표의 전체 shard 수가 서로 다릅니다.');
  const count = coordinates[0].total;
  assert.equal(coordinates.length, count, 'e2e-test sourceMatrix 좌표 수와 shard 분모가 다릅니다.');
  assert.deepEqual(
    coordinates.map(({ index }) => index).sort((left, right) => left - right),
    Array.from({ length: count }, (_, index) => index + 1),
    'e2e-test sourceMatrix shard 좌표가 연속 집합이 아닙니다.',
  );
  return { count, coordinates: matrix.values.map(String) };
}

function projectContextE2eShardContract(context) {
  const rows = context.split(/\r?\n/).filter((line) => line.startsWith('| CTX-009 |'));
  assert.equal(rows.length, 1, 'project-context의 CTX-009는 정확히 한 행이어야 합니다.');
  const counts = [...rows[0].matchAll(/(\d+)개 shard/gu)].map((match) => Number(match[1]));
  assert.equal(counts.length, 1, 'CTX-009는 E2E shard 수를 정확히 한 번 명시해야 합니다.');
  const coordinates = [...rows[0].matchAll(/`(\d+\/\d+)`/gu)].map((match) => match[1]);
  return { count: counts[0], coordinates };
}

function assertE2eShardContractMatches(context, requiredChecksText) {
  const actual = projectContextE2eShardContract(context);
  const expected = authoritativeE2eShardContract(requiredChecksText);
  assert.equal(
    actual.count,
    expected.count,
    'CTX-009의 E2E shard 수가 required-checks sourceMatrix와 다릅니다.',
  );
  assert.deepEqual(
    actual.coordinates,
    expected.coordinates,
    'CTX-009의 E2E shard 좌표·순서가 required-checks sourceMatrix와 다릅니다.',
  );
}

/*
 * [2026-10-17 DEC-OPS-340] 원장이 세는 수는 원장 하나가 정본이다. 판정(공용 메모리 행·시험 소스)은 ledger-count-restatement.mjs 하나이고
 * 이 계약이 두 모집단을 실행하며 붉음을 증명한다. 공용 메모리 쪽 규칙의 설명도 그 모듈에 있다.
 */
function memoryFiles() {
  return Object.fromEntries(Object.keys(documents).map((file) => [file, fs.readFileSync(path.join(memoryDir, file), 'utf8')]));
}

/** gap 영역 상세(DEC-OPS-389) — 자동 로드하지 않지만 옮긴 gap 행이 공용 메모리와 같은 행 규칙을 받는다. */
function gapDetailFiles() {
  return { [path.posix.basename(GAP_DETAIL)]: readRepoFile(GAP_DETAIL) };
}

/** 행 규칙(원장 재진술·행 길이·공개 안전·ID 유일성)을 받는 모집단: 자동 로드 세 파일, 영역 결정 색인(DEC-OPS-381), gap 영역 상세(DEC-OPS-389). */
function memoryRuleFiles() {
  return { ...memoryFiles(), ...areaIndexFiles(), ...gapDetailFiles() };
}

test('row rules cover the auto-loaded memory, every area decision index and the gap area detail', () => {
  // 행을 자동 로드 밖으로 옮겨 검사를 피하지 않는다(H2) — 영역 색인이나 gap 상세가 이 모집단에서 빠지면 붉다.
  assert.deepEqual(Object.keys(memoryRuleFiles()).sort(),
    [...Object.keys(documents), ...DECISION_AREA_INDEXES.map(({ path: areaPath }) => path.posix.basename(areaPath)),
      path.posix.basename(GAP_DETAIL)].sort());
  // 원장 재진술 검출이 gap 행을 찾는 두 파일이 이 모집단의 이름과 같다 — 이름이 갈라지면 상세 행이 검출에서 조용히 빠진다.
  assert.deepEqual([...GAP_FILES].sort(), ['known-gaps.md', path.posix.basename(GAP_DETAIL)].sort());
});

test('ledger-derived counts stay in their ledgers and memory rows link to them', () => {
  // 영역 결정 색인도 같은 검출을 받는다(DEC-OPS-381) — 행을 자동 로드 밖으로 옮겨 재진술 검사를 피하지 않는다.
  assert.deepEqual(ledgerMemoryViolations(memoryRuleFiles()), []);
});

/** gap 전문 행(9열)을 가진 파일과 그 행 — 자동 로드 표에 남았거나 영역 상세로 옮겼다(DEC-OPS-389). */
function fullGapRow(files, id) {
  const holders = GAP_FILES.flatMap((file) => (files[file] ?? '').split(/\r?\n/)
    .filter((line) => line.startsWith(`| ${id} |`) && markdownTableCells(line).length === 9).map((line) => [file, line]));
  assert.equal(holders.length, 1, `${id}: gap 전문 행이 정확히 하나여야 합니다.`);
  return holders[0];
}

test('ledger memory bindings are red for restated counts, a missing link and a missing row', () => {
  const files = { ...memoryFiles(), ...gapDetailFiles() };
  const gaps = files['known-gaps.md'];
  for (const { id, ledger, labels } of LEDGER_MEMORY_BINDINGS) {
    // 행이 자동 로드 표에 있든 영역 상세로 옮겼든 같은 검출을 받는다.
    const [holder, row] = fullGapRow(files, id);
    const text = files[holder];
    for (const [label, restated] of labels.flatMap((name) => [[name, `${name} **10개**`], [name, `${name} 39건`]])) {
      const cells = row.split(' | ');
      cells[4] = `${restated} ${cells[4]}`;
      const mutated = text.replace(row, cells.join(' | '));
      assert.notEqual(mutated, text);
      assert.ok(
        ledgerMemoryViolations({ ...files, [holder]: mutated }).some((message) => message.includes(`'${label}' 수를 다시 적었습니다`)),
        `${id}: '${restated}' 재진술이 red 가 아닙니다(${holder}).`,
      );
    }
    const unlinked = text.replace(row, row.split(`](../../${ledger})`).join('](../../config/governance/unrelated.json)'));
    assert.notEqual(unlinked, text);
    assert.ok(
      ledgerMemoryViolations({ ...files, [holder]: unlinked }).some((message) => message.startsWith(`${id}: 원장 링크`)),
      `${id}: 원장 링크를 지워도 red 가 아닙니다(${holder}).`,
    );
    const missing = text.replace(`${row}\n`, '').replace(`${row}\r\n`, '');
    assert.notEqual(missing, text);
    assert.ok(
      ledgerMemoryViolations({ ...files, [holder]: missing }).some((message) => message === `${id}: 활성 gap 행이 필요합니다.`),
      `${id}: 행을 지워도 red 가 아닙니다(${holder}) — 레지스트리 줄이 남아도 전문 행이 없으면 붉다.`,
    );
    // 옮긴 행의 레지스트리 줄(자동 로드)에 수를 적어도 붉다.
    const registryLine = gaps.split(/\r?\n/).find((line) => line.startsWith(`| ${id} |`) && markdownTableCells(line).length === 6);
    if (registryLine) {
      const restated = gaps.replace(registryLine, registryLine.replace(' | [상세](', ` ${labels[0]} 39건 | [상세](`));
      assert.notEqual(restated, gaps);
      assert.ok(ledgerMemoryViolations({ ...files, 'known-gaps.md': restated }).some((message) => message.startsWith('known-gaps.md:')),
        `${id}: 레지스트리 줄의 재진술이 red 가 아닙니다.`);
    }
  }
  assert.ok(LEDGER_MEMORY_BINDINGS.some(({ id }) => fullGapRow(files, id)[0] !== 'known-gaps.md'),
    '영역 상세로 옮긴 원장 결속 행이 하나 이상 있어야 이 시험이 상세 쪽 검출을 증명한다.');
  // 다른 메모리 파일의 행에 같은 수를 옮겨 적어도 red 다.
  const elsewhere = `${files['project-context.md']}\n| CTX-999 | unwired **10개** · app→core **10건** | [원장](../../config/governance/operation-consumer-census.json) | 2099-01-01 |\n`;
  assert.equal(
    ledgerMemoryViolations({ ...files, 'project-context.md': elsewhere }).filter((message) => message.startsWith('project-context.md:')).length,
    2,
  );
  // 표기를 바꿔도 같은 재진술이다 — 조사·기호·'수'·짧은 낱말을 건너거나, 어순·굵게 표시·띄어쓰기·화살표·대소문자를 바꿔도 붉다.
  const [wiringHolder, wiringRow] = fullGapRow(files, 'GAP-WIRING-001');
  const wiringText = files[wiringHolder];
  const operationCount = ledgerCountFacts(repoRoot).find(({ id }) => id === 'operation-count').value;
  for (const [label, restated] of [
    ['operation', `operation **${operationCount}**개`],
    ['operation', `operation은 ${operationCount + 1}개`],
    ['unwired', 'unwired는 10개'],
    ['unwired', 'unwired: 10개'],
    ['unwired', 'unwired(10개)'],
    ['unwired', 'unwired 수 10개'],
    ['unwired', '10개 unwired'],
    ['unwired', 'Unwired 10개'],
    ['app→core', 'app→core 참조 10건'],
    ['app→core', 'app → core 10건'],
    ['app→core', 'app->core 10건'],
    ['app→core', 'app→core: **10**건'],
    ['app→app', 'app→app 0'],
    ['app→app', 'app→app 은 0개'],
    ['화면 고아', '화면고아 28개'],
    ['화면 고아', '화면 고아 **28**'],
  ]) {
    const cells = wiringRow.split(' | ');
    cells[4] = `${restated} ${cells[4]}`;
    const mutated = wiringText.replace(wiringRow, cells.join(' | '));
    assert.notEqual(mutated, wiringText);
    assert.ok(
      ledgerMemoryViolations({ ...files, [wiringHolder]: mutated }).some((message) => message.includes(`'${label}' 수를 다시 적었습니다`)),
      `'${restated}' 재진술이 red 가 아닙니다.`,
    );
  }
  // 수가 없는 라벨 언급·방향 서술, 라벨을 품은 경로·파일 이름, 라벨 근처의 ID·날짜·절 번호는 재진술이 아니다.
  for (const sentence of [
    'operation 수·unwired·화면 고아 상한은 원장이 정본이다. app→app 결합은 만들지 않는다.',
    '[배선과 분석 한계](../../docs/04-operations/readiness-followups.md#api와-화면-연결)',
    '`config/governance/operation-consumer-census.json` 의 `expected`',
    '결합 원장이 동결한다(DEC-OPS-090). app→app·app→core의 현재 수는 원장이 정본이다.',
    'operation(unwired, 축 1의 부채)과 화면 고아(축 2)가 남아 있다.',
    'app→core 2026-10-17 실측, operation 3.2절, unwired 항목은 2026-10-16 정리',
    '원장 갱신 1건 operation-consumer-census.json, 문서 2건 docs/04-operations/readiness-followups.md',
  ]) {
    assert.deepEqual(
      ledgerMemoryViolations({ 'known-gaps.md': '', 'x.md': sentence }).filter((message) => message.startsWith('x.md:')),
      [],
      `재진술이 아닌 문장이 붉다: ${sentence}`,
    );
  }
});

/*
 * [2026-10-20] 같은 원칙을 시험 소스로 넓힌다. 원장이 지금 세는 값(operation 수·메뉴 수·기능 수·시작 구성 수·schema-validation 등록 수·
 * PIT 범위 수 등)과 같은 수를 그 라벨 가까이의 단언·비교·선언·'N개' 문자열에 적으면 원장이 바뀔 때 그 사본만 붉어진다 — 2026-10 의
 * 고정값 실패 71(활성 메뉴)·412(operation)·22(기능)·60(migration 검증)이 모두 이 형태였다. 시험은 원장을 읽는다.
 * 숫자 리터럴 일반은 막지 않는다. 판정 규칙과 경계는 ledger-count-restatement.mjs 머리말이 정본이다.
 */
test('test sources read ledger-derived counts from their ledgers instead of copying them', () => {
  assert.deepEqual(testSourceViolations(repoRoot), []);
});

test('ledger count facts are counted from existing ledgers and the test-source population covers every test tree', () => {
  const facts = ledgerCountFacts(repoRoot);
  for (const id of ['operation-count', 'menu-rows', 'active-menus', 'navigation-grants', 'features', 'presets', 'schema-validation-rules', 'pit-scopes']) {
    assert.ok(facts.some((fact) => fact.id === id), `원장 값 '${id}' 를 세지 않습니다.`);
  }
  for (const fact of facts) {
    assert.ok(Number.isInteger(fact.value) && fact.value >= 0, `${fact.id}: 원장에서 센 값이 아닙니다.`);
    assert.ok(fs.existsSync(path.join(repoRoot, fact.ledger)), `${fact.id}: 원장 ${fact.ledger} 이 없습니다.`);
    assert.ok(fact.labels.length > 0, `${fact.id}: 라벨이 없습니다.`);
  }
  const files = testSourceFiles(repoRoot);
  for (const { root } of TEST_SOURCE_ROOTS) {
    assert.ok(files.some((file) => file.startsWith(`${root}/`)), `${root}: 시험 소스 모집단이 비었습니다.`);
  }
});

test('a copied ledger count beside its label is red in every test language, and only the copy is red', () => {
  const facts = ledgerCountFacts(repoRoot);
  const decisions = decisionIndexIds(repoRoot);
  const value = (id) => facts.find((fact) => fact.id === id).value;
  const scan = (file, text) => testSourceRestatements(file, text, facts, decisions);
  const violations = (file, text) => scan(file, text).filter((finding) => !finding.pinned).map(restatementMessage);
  const active = value('active-menus');

  // 활성 메뉴 수를 '메뉴' 라벨 옆 toHaveLength 에 적으면 붉다 — 위반 문장은 원장과 값의 이름을 말한다.
  assert.deepEqual(violations('frontend/e2e/contracts/synthetic.spec.ts', `// 관리자에게 보이는 활성 메뉴\nexpect(visible).toHaveLength(${active});\n`), [
    `frontend/e2e/contracts/synthetic.spec.ts:2: '메뉴' 가까이의 ${active} 은(는) config/project-composer-menus.json 가 세는 값(active-menus)의 사본입니다 — 시험은 원장을 읽어 기대값을 얻으십시오.`,
  ]);

  // 2026-10 의 실제 실패 형태 넷이 각자 붉다.
  const shapes = [
    ['api-server/src/test/java/nuri/api/schema/Synthetic.java', `assertThat(number(statement,"SELECT count(*) FROM tb_menu_info WHERE use_yn='Y'")).isEqualTo(${active});`, 'active-menus'],
    ['scripts/synthetic.test.mjs', `assert.equal(operations.length, ${value('operation-count')});`, 'operation-count'],
    ['scripts/synthetic.test.mjs', `const ids = { domains: [...ids] };\nassert.equal(selections.length, ${value('presets')} + 2 + ${value('features')} + 231);`, 'features'],
    ['scripts/synthetic.test.mjs', `const pairs = [['EXPECTED_MIGRATION_TEST_COUNT = ${value('schema-validation-rules')};', 'x']];`, 'schema-validation-rules'],
  ];
  for (const [file, text, fact] of shapes) {
    assert.ok(scan(file, text).some((finding) => finding.fact === fact && !finding.pinned), `${fact}: ${text} 가 붉지 않습니다.`);
  }

  // 모든 원장 값과 라벨이 TS·JS·Java 의 단언과 'N개' 문자열에서 붉다(2 미만의 값은 보지 않는다).
  for (const fact of facts.filter(({ value: count }) => count >= 2)) {
    for (const label of fact.labels) {
      for (const [file, text] of [
        ['frontend/src/__tests__/synthetic.test.ts', `// ${label}\nexpect(found).toHaveLength(${fact.value});`],
        ['business-core/src/test/java/Synthetic.java', `// ${label}\nassertThat(found).hasSize(${fact.value});`],
        ['scripts/synthetic.test.mjs', `assert.ok(message.includes('${label} ${fact.value}개'));`],
      ]) {
        assert.ok(scan(file, text).some((finding) => finding.fact === fact.id && finding.label === label),
          `${fact.id}: '${label}' 곁의 ${fact.value} 가 ${file} 에서 붉지 않습니다.`);
      }
    }
  }

  // 같은 수라도 센 값 자리가 아니거나, 라벨이 멀거나, 값이 다르거나, 원장을 읽으면 사본이 아니다.
  const green = [
    `menu(${active}, '게시글 하나', '/admin/community/boards/12'); // 메뉴`,
    `const options = { maxRetries: ${value('presets')} }; // 시작 구성`,
    `// 활성 메뉴는 ${active}개다`,
    `const replacements = ['      max-parallel: ${value('pit-scopes-mutation-scope-migration')}\\n']; // PIT`,
    `// 메뉴\n\n\n\nexpect(visible).toHaveLength(${active});`,
    `expect(visible).toHaveLength(${active + 1}); // 메뉴`,
    `expect(visible).toHaveLength(adminVisibleMenuCount(MENU_SNAPSHOT)); // 메뉴`,
  ];
  for (const text of green) {
    assert.deepEqual(violations('frontend/e2e/contracts/synthetic.spec.ts', text), [], `사본이 아닌데 붉다: ${text}`);
  }
});

test('a deliberate ledger pin needs an indexed decision, so the marker alone cannot hide a copy', () => {
  const facts = ledgerCountFacts(repoRoot);
  const decisions = decisionIndexIds(repoRoot);
  const pit = facts.find((fact) => fact.id === 'pit-scopes').value;
  const line = `assert.equal(pit.selector.matrixScopes.length, ${pit}, 'PIT matrix scope count changed');`;
  const scan = (text) => testSourceRestatements('scripts/synthetic.test.mjs', text, facts, decisions).filter((finding) => finding.fact === 'pit-scopes');
  assert.ok(decisions.has('DEC-OPS-371'), '고정 표기가 가리킬 결정이 공용 결정 인덱스에 없습니다.');
  assert.deepEqual(scan(`// PIT 범위 수의 유일한 확인 지점이다(ledger-pin(DEC-OPS-371)).\n${line}`).map(({ pinned }) => pinned), [true]);
  assert.deepEqual(scan(`${line} // ledger-pin(DEC-OPS-371)`).map(({ pinned }) => pinned), [true]);
  // 표기가 없거나, 인덱스에 없는 결정을 가리키거나, 두 줄 위에 있으면 고정이 아니다.
  for (const text of [line, `// ledger-pin(DEC-OPS-0000)\n${line}`, `// ledger-pin(DEC-OPS-371)\n\n${line}`]) {
    const findings = scan(text);
    assert.deepEqual(findings.map(({ pinned }) => pinned), [false], text);
  }
  assert.match(restatementMessage(scan(`// ledger-pin(DEC-OPS-0000)\n${line}`)[0]), /ledger-pin\(DEC-OPS-0000\) 이 가리키는 결정이 지금의 작업을 제약하는 결정 색인에 없습니다/u);
  // 영역 색인의 결정은 고정 근거가 되고(지금의 작업을 제약한다), 역사 색인에만 있는 결정은 되지 않는다(DEC-OPS-381).
  const firstId = (file) => readRepoFile(file).match(/^\| (DEC-OPS-\d{3}) \|/mu)[1];
  const areaId = firstId(DECISION_AREA_INDEXES[0].path);
  const historicalId = firstId(HISTORICAL_DECISION_INDEX);
  assert.ok(decisions.has(areaId) && !decisions.has(historicalId));
  assert.deepEqual(scan(`// ledger-pin(${areaId})\n${line}`).map(({ pinned }) => pinned), [true]);
  assert.deepEqual(scan(`// ledger-pin(${historicalId})\n${line}`).map(({ pinned }) => pinned), [false]);
});

/*
 * ADR 목록은 ADR 색인(docs/02-architecture/decisions/README.md) 하나가 정본이고, 공용 결정 인덱스는 그 Accepted 집합을
 * 그대로 색인한다(아래 'decision memory exactly indexes …'). 문서 인덱스(docs/README.md)는 ADR 색인에 링크만 하므로
 * 세 번째 사본과의 exact 대조는 두지 않는다 — ADR 하나를 더할 때 고칠 목록이 셋에서 둘로 준다(적용 범위는 줄지 않는다).
 */
test('the documentation index points to the ADR registry instead of copying it', () => {
  const section = readRepoFile('docs/README.md').split('### 02-architecture/decisions — ADR')[1]?.split('## 03-guides')[0] ?? '';
  assert.match(section, /\]\(02-architecture\/decisions\/README\.md\)/u, 'docs/README.md: ADR 색인 링크가 없습니다.');
  assert.doesNotMatch(section, /^\| \[ADR-\d{4}\]\(/mu, 'docs/README.md: ADR 목록을 다시 복제하지 말고 ADR 색인에 링크하십시오.');
});

test('the input contract row is red for the ledger counts it used to restate, and its generic labels stay row-scoped', () => {
  const files = { ...memoryFiles(), ...gapDetailFiles() };
  const gaps = files['known-gaps.md'];
  const [holder, row] = fullGapRow(files, 'GAP-CONTRACT-001');
  // 이 행이 2026-10-19 까지 적던 형태 그대로다(행을 영역 상세로 옮겨도 같은 검출을 받는다).
  const cells = row.split(' | ');
  cells[4] = `원장 기준 길이 246·필수 95·읽기 전용 62필드, enum 18·중첩 검증 13개, 날짜 12필드의 달력 형식을 검사한다. ${cells[4]}`;
  const messages = ledgerMemoryViolations({ ...files, [holder]: files[holder].replace(row, cells.join(' | ')) });
  for (const label of ['길이', '필수', '읽기 전용', 'enum', '중첩 검증', '날짜']) {
    assert.ok(messages.some((message) => message.includes(`'${label}' 수를 다시 적었습니다`)),
      `GAP-CONTRACT-001 의 '${label}' 재진술이 red 가 아닙니다.`);
  }
  // 같은 낱말이 다른 행·파일에서 원장과 무관한 수 곁에 쓰이는 것은 재진술이 아니다(컬럼 길이·인덱스 수·ADR 의 표준 길이 수).
  const unrelated = '엔티티의 길이 12는 baseline과 같고 날짜 인덱스 4개를 둔다. 표준 길이 24개를 맞추고 필수 3개를 둔다.';
  const otherRow = `${gaps}\n| GAP-XYZ-001 | P3 | open | x | ${unrelated} | x | x | x | 2099-01-01 |\n`;
  assert.deepEqual(ledgerMemoryViolations({ ...files, 'known-gaps.md': otherRow }), [], '다른 gap 행의 일반 낱말이 붉다');
  assert.deepEqual(ledgerMemoryViolations({ ...files, 'decisions.md': `${files['decisions.md']}\n| ADR-9999 | ${unrelated} |\n` }), [],
    '다른 메모리 파일의 일반 낱말이 붉다');
});

test('shared memory files have a stable schema and valid canonical sources', () => {
  const seenKinds = new Set();

  for (const [file, expected] of Object.entries(documents)) {
    const absolute = path.join(memoryDir, file);
    assert.ok(fs.existsSync(absolute), `${file}: 공용 메모리 파일이 없습니다.`);
    const text = fs.readFileSync(absolute, 'utf8');
    assert.ok(text.length > 500, `${file}: 비어 있거나 지나치게 짧습니다.`);

    const fm = parseFrontmatter(text, file);
    assert.equal(fm.schema_version, '1', `${file}: schema_version은 1이어야 합니다.`);
    assert.equal(fm.memory_kind, expected.kind);
    assert.equal(fm.authority, expected.authority);
    assert.equal(fm.status, 'active');
    assert.equal(fm.scope, 'repository');
    assert.equal(fm.sensitivity, 'public-repo-safe');
    assert.match(fm.verified_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(fm.verified_against, /^[0-9a-f]{7,40}$/);
    assert.ok(Array.isArray(fm.canonical_sources) && fm.canonical_sources.length > 0);
    assert.ok(Array.isArray(fm.refresh_triggers) && fm.refresh_triggers.length > 0);
    assert.ok(!seenKinds.has(fm.memory_kind), `중복 memory_kind: ${fm.memory_kind}`);
    seenKinds.add(fm.memory_kind);

    execFileSync('git', ['cat-file', '-e', `${fm.verified_against}^{commit}`], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    execFileSync('git', ['merge-base', '--is-ancestor', fm.verified_against, 'HEAD'], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    const verifiedAt = Date.parse(`${fm.verified_at}T00:00:00Z`);
    assert.ok(Number.isFinite(verifiedAt), `${file}: verified_at을 날짜로 해석할 수 없습니다.`);
    assert.ok(verifiedAt <= Date.now() + 26 * 60 * 60 * 1000, `${file}: verified_at이 미래 날짜입니다.`);

    for (const source of fm.canonical_sources) {
      assert.ok(!path.isAbsolute(source), `${file}: canonical source는 상대경로여야 합니다: ${source}`);
      const resolved = path.resolve(memoryDir, source);
      assert.ok(
        resolved === repoRoot || resolved.startsWith(`${repoRoot}${path.sep}`),
        `${file}: 저장소 밖 canonical source는 금지합니다: ${source}`,
      );
      assert.ok(fs.existsSync(resolved), `${file}: canonical source가 없습니다: ${source}`);
    }

    for (const heading of expected.headings) {
      assert.equal(headingCount(text, heading), 1, `${file}: 필수 heading '${heading}'은 정확히 한 번 있어야 합니다.`);
    }
  }
});

test('all agent entrypoints discover the same shared memory', () => {
  const entrypoints = ['AGENTS.md', 'GEMINI.md', 'CLAUDE.md'];
  for (const entrypoint of entrypoints) {
    const text = readRepoFile(entrypoint);
    for (const file of Object.keys(documents)) {
      assert.match(text, new RegExp(file.replace('.', '\\.'), 'u'), `${entrypoint}: ${file} 연결이 없습니다.`);
    }
  }

  const agents = readRepoFile('AGENTS.md');
  assert.match(agents, /vendor-neutral 프로젝트 규칙 SSOT/u);
  assert.match(agents, /Gemini.*Claude Code.*Codex/u);

  for (const adapter of ['GEMINI.md', 'CLAUDE.md']) {
    const text = readRepoFile(adapter);
    assert.match(text, /@\.?\/?AGENTS\.md/u, `${adapter}: AGENTS.md import가 없습니다.`);
    assert.ok(text.includes('](AGENTS.md#공유-워킹트리와-git)'), `${adapter}: 브랜치 완료 범위는 공통 Git 규칙에 연결해야 합니다.`);
    assert.ok(text.split(/\r?\n/).length <= 40, `${adapter}: 얇은 어댑터가 40행을 넘었습니다.`);
    assert.doesNotMatch(text, /[A-Za-z]:[\\/]Users[\\/]/u, `${adapter}: 사용자 홈 절대경로를 고정하면 안 됩니다.`);
  }

  const expectedImports = {
    'GEMINI.md': [
      '@./AGENTS.md',
      '@./.agent/memory/project-context.md',
      '@./.agent/memory/decisions.md',
      '@./.agent/memory/known-gaps.md',
    ],
    'CLAUDE.md': [
      '@AGENTS.md',
      '@.agent/memory/project-context.md',
      '@.agent/memory/decisions.md',
      '@.agent/memory/known-gaps.md',
    ],
  };
  for (const [adapter, expected] of Object.entries(expectedImports)) {
    const imports = readRepoFile(adapter).split(/\r?\n/).filter((line) => line.startsWith('@'));
    assert.deepEqual(imports, expected, `${adapter}: import 집합·순서가 공통 계약과 다릅니다.`);
  }

  const docsIndex = readRepoFile('docs/README.md');
  for (const file of Object.keys(documents)) {
    assert.match(docsIndex, new RegExp(file.replace('.', '\\.'), 'u'), `docs/README.md: ${file} 링크가 없습니다.`);
  }
});

test('project context covers every Gradle module', () => {
  const settings = readRepoFile('settings.gradle');
  const context = fs.readFileSync(path.join(memoryDir, 'project-context.md'), 'utf8');
  const modules = [...settings.matchAll(/^include\s+['"]([^'"]+)['"]/gm)].map((match) => match[1]);
  assert.ok(modules.length >= 5, 'settings.gradle module census가 비정상적으로 작습니다.');
  for (const module of modules) {
    assert.ok(context.includes(`\`${module}\``), `project-context에 ${module}이 없습니다.`);
  }

  const requiredChecks = JSON.parse(readRepoFile('.github/required-checks.json')).requiredChecks;
  const requiredRow = context.split(/\r?\n/).find((line) => line.startsWith('| CTX-005 |')) ?? '';
  assert.match(requiredRow, new RegExp(`${requiredChecks.length}개 required context`, 'u'));
  for (const { context: requiredContext } of requiredChecks) {
    assert.ok(requiredRow.includes(`\`${requiredContext}\``), `CTX-005에 ${requiredContext}가 없습니다.`);
  }
  assert.doesNotMatch(requiredRow, /e2e-tests \([1-9]\/[1-9]\)/u, '내부 shard를 required context로 기록하면 안 됩니다.');
});

test('project context E2E shard count and coordinates match the authoritative required-check matrix', () => {
  assertE2eShardContractMatches(
    readRepoFile('.agent/memory/project-context.md'),
    readRepoFile('.github/required-checks.json'),
  );
});

test('decision memory and area indexes together index every plain and qualified Accepted ADR once', () => {
  const registry = readRepoFile('docs/02-architecture/decisions/README.md');
  const decisions = readRepoFile('.agent/memory/decisions.md');
  const accepted = acceptedAdrIds(registry);
  assert.ok(accepted.length > 0, 'Accepted ADR census가 0건입니다.');
  assertExactAdrSet(accepted, bindingAdrIds(decisions, areaIndexFiles()));
  // 자동 로드 인덱스에는 어느 경로를 고치든 걸리는 ADR 의 행만 남고, 나머지는 영역 줄 목록으로 ID·제목만 싣는다(DEC-OPS-385).
  assert.ok(decisionMemoryAdrIds(decisions).length < accepted.length, '나머지 ADR 의 행은 영역 색인에 둔다.');
  assertAdrDirectoryMatchesAreas(decisions, areaIndexFiles());
});

test('the auto-loaded ADR directory is red when it drifts from the area rows', () => {
  const decisions = readRepoFile('.agent/memory/decisions.md');
  const areas = areaIndexFiles();
  const lines = decisions.split(/\r?\n/);
  const first = lines.find((line) => line.startsWith('- [') && /: ADR-\d{4} /u.test(line));
  assert.ok(first, '합성 변이를 넣을 ADR 목록 줄이 없습니다.');
  const firstId = first.match(/: (ADR-\d{4}) /u)[1];
  for (const [label, mutated, pattern] of [
    ['목록에서 빠짐', decisions.replace(first, first.replace(`${firstId} `, '')), /영역 색인의 ADR 행과 다릅니다/u],
    ['유령 ID', decisions.replace(first, `${first} · ADR-9999 유령`), /영역 색인의 ADR 행과 다릅니다/u],
    ['영역 줄 없음', decisions.replace(`${first}\n`, '').replace(`${first}\r\n`, ''), /영역 색인마다 하나씩/u],
    ['영역 줄 중복', decisions.replace(first, `${first}\n${first}`), /같은 영역 줄이 두 번/u],
    ['읽기 규칙 삭제', decisions.replace(ADR_DIRECTORY_READING_RULE, '목록을 참고한다'), /행을 읽는다는 규칙 문장/u],
  ]) {
    assert.notEqual(mutated, decisions, label);
    assert.throws(() => assertAdrDirectoryMatchesAreas(mutated, areas), pattern, label);
  }
  // 영역 색인에 행을 더했는데 목록을 고치지 않으면 붉다.
  const [areaFile, areaText] = Object.entries(areas)[0];
  const adrRow = areaText.split(/\r?\n/).find((line) => /^\| ADR-\d{4} \|/u.test(line));
  const extra = areaText.replace(adrRow, `| ADR-0001 | accepted | probe | 2026-08-15 | - |\n${adrRow}`);
  assert.throws(() => assertAdrDirectoryMatchesAreas(decisions, { ...areas, [areaFile]: extra }), /영역 색인의 ADR 행과 다릅니다/u);
});

test('operational decision index keeps the five-column schema and its archive anchor rule', () => {
  const decisions = readRepoFile('.agent/memory/decisions.md');
  const ids = decisionMemoryOperationalIds(decisions);
  assert.ok(ids.length > 0, '운영 결정 index 가 비었습니다.');

  // 걷은 이유·정본 열을 되돌리면 머리글이 다시 7열이 되어 붉다. ADR 표도 같은 5열 머리글이라 절 안에서만 바꾼다.
  const sevenColumnHeader = (text, heading) => {
    const [head, ...rest] = text.split(new RegExp(`(?=^## ${heading}\\r?$)`, 'mu'));
    assert.equal(rest.length, 1, `'${heading}' 절이 하나여야 합니다.`);
    return head + rest[0].replace(/\| ID \| 상태 \| 결정 \| 시행일 \| supersedes \|(\r?\n)\|---\|---\|---\|---\|---\|/u,
      '| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |$1|---|---|---|---|---|---|---|');
  };
  const sevenColumns = sevenColumnHeader(decisions, '운영 결정 index');
  assert.notEqual(sevenColumns, decisions, '합성 7열 머리글 mutation 이 적용되지 않았습니다.');
  assert.throws(() => decisionMemoryOperationalIds(sevenColumns), /markdown table header가 정확히 한 번 있어야 합니다: ID \| 상태 \| 결정 \| 시행일 \| supersedes/u);
  const sevenColumnAdr = sevenColumnHeader(decisions, 'Accepted ADR index');
  assert.notEqual(sevenColumnAdr, decisions, '합성 ADR 7열 머리글 mutation 이 적용되지 않았습니다.');
  assert.throws(() => decisionMemoryAdrIds(sevenColumnAdr), /markdown table header가 정확히 한 번 있어야 합니다: ID \| 상태 \| 결정 \| 시행일 \| supersedes/u);
  const adrRow = decisions.split(/\r?\n/).find((line) => line.startsWith('| ADR-0001 |'));
  const adrCells = markdownTableCells(adrRow);
  assert.throws(() => decisionMemoryAdrIds(decisions.replace(adrRow, `| ${[...adrCells.slice(0, 3), 'probe reason', '[ADR-0001](x.md)', ...adrCells.slice(3)].join(' | ')} |`)),
    /markdown table data 열 수가 header와 다릅니다/u);

  // 한 행만 옛 형식(이유·정본 열)으로 쓰면 열 수가 달라 붉다.
  const row = decisions.split(/\r?\n/).find((line) => line.startsWith(`| ${ids[0]} |`));
  const cells = markdownTableCells(row);
  const legacyRow = `| ${[...cells.slice(0, 3), '승인·근거는 보관 원문', `[원문](${DECISION_ARCHIVE}#${ids[0].toLowerCase()})`, ...cells.slice(3)].join(' | ')} |`;
  assert.throws(() => decisionMemoryOperationalIds(decisions.replace(row, legacyRow)), /markdown table data 열 수가 header와 다릅니다/u);

  // 앵커 규칙 줄이 없으면 ID 로 원문을 찾는 근거가 사라진다.
  const ruleLine = decisions.split(/\r?\n/).find((line) => line.startsWith('ID가 보관 원문의 앵커다'));
  assert.ok(ruleLine);
  assert.throws(() => decisionMemoryOperationalIds(decisions.replace(ruleLine, '')), /ID 가 보관 원문의 앵커라는 규칙 줄/u);
  // 역사 색인 링크가 없으면 옮긴 결정을 찾을 길이 없다.
  const historicalLink = `](${DECISION_HISTORICAL_INDEX})`;
  assert.ok(decisions.includes(historicalLink));
  assert.throws(() => decisionMemoryOperationalIds(decisions.split(historicalLink).join('](../../docs/README.md)')), /역사 색인 링크가 있어야 합니다/u);
});

test('area decision indexes keep the operational row schema and are reachable from the auto-loaded index', () => {
  const decisions = readRepoFile('.agent/memory/decisions.md');
  assert.equal(decisionAreaRoutes(decisions).length, DECISION_AREA_INDEXES.length);
  const universal = new Set(decisionMemoryOperationalIds(decisions));
  const seen = new Set();
  for (const { path: areaPath } of DECISION_AREA_INDEXES) {
    const text = readRepoFile(areaPath);
    const { adr: areaAdrs, dec: ids } = areaIndexIds(text, areaPath);
    assert.ok(areaAdrs.length + ids.length > 0, `${areaPath}: 영역 색인이 비었습니다.`);
    for (const id of ids) {
      assert.ok(!universal.has(id) && !seen.has(id), `${id}: 결정은 색인 하나에만 둔다(공용·영역 중복).`);
      seen.add(id);
    }
    // 영역 색인도 ID 가 보관 원문의 앵커라는 규칙 줄과 공용·역사 색인 링크를 갖는다 — 자동 로드 밖에서 읽는 사람이 길을 잃지 않는다.
    assert.ok(text.split(/\r?\n/).some((line) => line.startsWith('ID가 보관 원문의 앵커다') && line.includes('](../archived/operational-decisions-history.md)')),
      `${areaPath}: 보관 원문 앵커 규칙 줄이 필요합니다.`);
    assert.ok(text.includes('](../../.agent/memory/decisions.md)') && text.includes('](../archived/operational-decisions-index-historical.md)'),
      `${areaPath}: 공용·역사 색인 링크가 필요합니다.`);
    assert.match(text, /^> 상태: 영역 결정 색인 — .*upstream 이력이며 도입 기관의 현재 결정이 아니다\.$/mu,
      `${areaPath}: 생성물에서도 참인 상태 줄이 필요합니다 — 복사된 원본 결정을 도입 기관의 현재 결정으로 읽지 않게 한다.`);
  }
  // red 재현: 상태 어휘·시행일·중복은 영역 색인에서도 붉고, 링크 표가 원장과 다르거나 fail-closed 행이 없으면 붉다.
  const { path: firstArea } = DECISION_AREA_INDEXES[0];
  const areaText = readRepoFile(firstArea);
  const row = areaText.split(/\r?\n/).find((line) => /^\| DEC-OPS-\d{3} \|/u.test(line));
  const cells = markdownTableCells(row);
  for (const [label, changed, pattern] of [
    ['상태 오타', row.replace(` | ${cells[1]} | `, ' | acepted | '), /허용되지 않은 결정 상태/u],
    ['시행일 형식', `| ${cells.map((cell, at) => at === 3 ? '2026-1-5' : cell).join(' | ')} |`, /시행일 열은 날짜여야/u],
    ['중복', `${row}\n${row}`, /중복 DEC ID/u],
  ]) {
    assert.notEqual(changed, row, label);
    assert.throws(() => areaIndexIds(areaText.replace(row, changed), firstArea), pattern, label);
  }
  // 영역 색인의 ADR 행(DEC-OPS-385): 상태는 exact accepted, 표 맨 위에만, 공용 인덱스와 겹치면 붉다.
  const adrRow = areaText.split(/\r?\n/).find((line) => /^\| ADR-\d{4} \|/u.test(line));
  assert.ok(adrRow, `${firstArea}: 합성 변이를 넣을 ADR 행이 없습니다.`);
  const adrId = adrRow.match(/^\| (ADR-\d{4}) \|/u)[1];
  // 줄째로 지운다 — 빈 줄을 남기면 표가 거기서 끝나 뒤 행을 읽지 않는다.
  const withoutLine = (text, line) => text.split(/(?<=\n)/u).filter((part) => part.replace(/\r?\n$/u, '') !== line).join('');
  assert.throws(() => areaIndexIds(areaText.replace(adrRow, adrRow.replace(' | accepted | ', ' | superseded | ')), firstArea),
    /영역 색인의 ADR 상태는 exact accepted여야/u);
  assert.throws(() => areaIndexIds(withoutLine(areaText, adrRow).replace(row, `${row}\n${adrRow}`), firstArea),
    /표 맨 위, 운영 결정 행 앞에 둔다/u);
  const duplicated = decisions.replace(/^(\| ADR-0001 \|.*)$/mu, `$1\n${adrRow}`);
  assert.notEqual(duplicated, decisions, '합성 공용·영역 ADR 중복 mutation 이 적용되지 않았습니다.');
  assert.throws(() => bindingAdrIds(duplicated, areaIndexFiles()), new RegExp(`${adrId}: ADR 은 공용·영역 색인 가운데 한 곳에만`, 'u'));
  const dropped = { ...areaIndexFiles(), [path.posix.basename(firstArea)]: withoutLine(areaText, adrRow) };
  assert.throws(() => assertExactAdrSet(acceptedAdrIds(readRepoFile('docs/02-architecture/decisions/README.md')), bindingAdrIds(decisions, dropped)),
    new RegExp(`missing=\\[${adrId}\\]`, 'u'));
  const routeRow = decisions.split(/\r?\n/).find((line) => line.startsWith('| [') && line.includes(fromMemory(firstArea)));
  assert.throws(() => decisionAreaRoutes(decisions.replace(routeRow, '')), /결정 색인 경로 원장과 다릅니다/u);
  const closing = decisions.split(/\r?\n/).find((line) => line.startsWith('| 넷 모두 |'));
  assert.throws(() => decisionAreaRoutes(decisions.replace(closing, '')), /넷 모두로 보내는 행/u);
});

test('the area route table shows exactly the path patterns of the routing ledger', () => {
  const decisions = readRepoFile('.agent/memory/decisions.md');
  assert.deepEqual(decisionRouteTableViolations(decisions), []);
  // red 재현: 표에만 있는 경로, 원장에만 있는 경로, 빠진 조건 문장, 빠진 '추가 색인 없음' 행이 각자 붉다.
  const section = markdownSection(decisions, '영역 결정 색인', '기록 템플릿');
  const ciRow = section.split('\n').find((line) => line.startsWith('| [CI·검증·거버넌스]'));
  const composerRow = section.split('\n').find((line) => line.startsWith('| [프로젝트 생성기·재사용 투영]'));
  const derivedRow = section.split('\n').find((line) => line.startsWith('| 추가 색인 없음 |'));
  const [condition] = DECISION_AREA_ROUTES.composer.conditions;
  for (const [label, mutated, expected] of [
    ['표에만 있는 경로', decisions.replace(ciRow, ciRow.replace('`.zap/**`', '`.zap/**`, `ghost/**`')), '표에만 [ghost/**]'],
    ['원장에만 있는 경로', decisions.replace(ciRow, ciRow.replace('`.zap/**`, ', '')), '원장에만 [.zap/**]'],
    ['중복 경로', decisions.replace(ciRow, ciRow.replace('`.zap/**`', '`.zap/**`, `.zap/**`')), '중복 [.zap/**]'],
    ['조건 문장 삭제', decisions.replace(composerRow, composerRow.replace(condition, '화면')), '경로가 아닌 조건'],
    ['추가 색인 없음 행 삭제', decisions.replace(`${derivedRow}\n`, '').replace(`${derivedRow}\r\n`, ''), '추가 색인 없음 행이 없습니다'],
    ['추가 색인 없음에 영역 경로', decisions.replace(derivedRow, derivedRow.replace('`api-docs.json`', '`api-docs.json`, `scripts/**`')), '추가 색인 없음: 표와 경로 원장이 다릅니다'],
  ]) {
    assert.notEqual(mutated, decisions, label);
    const messages = decisionRouteTableViolations(mutated);
    assert.ok(messages.some((message) => message.includes(expected)), `${label}: ${JSON.stringify(messages)}`);
  }
});

/*
 * [DEC-OPS-389] fail-closed 를 지키면서 넷 모두로 떨어지는 집합을 고정한다. 어느 원장에도 걸리지 않는 추적 파일의 최상위 이름은
 * UNASSIGNED_TOP_LEVEL 과 같아야 한다 — 새 최상위 디렉터리가 미배정으로 생기면 붉고, 원장의 경로·문서 패턴이 아무 파일에도 맞지
 * 않으면(이름이 바뀐 문서 등) 붉다.
 */
function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z', '--cached'], { cwd: repoRoot, encoding: 'utf8' }).split('\0').filter(Boolean);
}

export function routeLedgerGhosts(files, routes = DECISION_AREA_ROUTES, derived = NO_EXTRA_INDEX_PATHS) {
  const ghosts = [];
  for (const [area, { paths, documents }] of Object.entries(routes)) {
    for (const glob of paths) if (!files.some((file) => matchesGlob(file, glob))) ghosts.push(`${area}: ${glob}`);
    for (const document of documents) if (!files.includes(document)) ghosts.push(`${area}: ${document}`);
  }
  for (const glob of derived) if (!files.some((file) => matchesGlob(file, glob))) ghosts.push(`추가 색인 없음: ${glob}`);
  return ghosts;
}

test('every tracked path routes to an area, a no-extra-index rule or a fixed fail-closed top-level set', () => {
  const files = trackedFiles();
  const holders = adrHolders(readRepoFile);
  assert.deepEqual(unassignedTopLevels(files, holders), [...UNASSIGNED_TOP_LEVEL].sort(),
    '넷 모두로 떨어지는 경로의 최상위 집합이 바뀌었습니다 — 새 경로를 scripts/decision-indexes.mjs 에 배정하거나, 넷 모두가 맞으면 UNASSIGNED_TOP_LEVEL 에 더한다.');
  assert.deepEqual(routeLedgerGhosts(files), [], '경로 원장의 패턴이 아무 파일에도 맞지 않습니다.');
  // red 재현: 미배정 새 최상위 디렉터리, 이름이 바뀐 문서 배정.
  assert.deepEqual(unassignedTopLevels([...files, 'newtool/run.mjs'], holders), [...UNASSIGNED_TOP_LEVEL, 'newtool'].sort());
  const renamed = files.filter((file) => file !== DECISION_AREA_ROUTES.product.documents[0]);
  assert.deepEqual(routeLedgerGhosts(renamed), [`product: ${DECISION_AREA_ROUTES.product.documents[0]}`]);
});

test('routing keeps derived outputs on their inputs, ADR documents on their holder index and unassigned paths on all four', () => {
  const holders = adrHolders(readRepoFile);
  const areaOf = (file) => decisionRoute(file, holders);
  assert.deepEqual(areaOf('.agent/memory/known-gaps.md'), { kind: 'derived' });
  assert.deepEqual(areaOf(GAP_DETAIL), { kind: 'derived' });
  assert.deepEqual(areaOf('frontend/src/types/generated-zod/board.ts'), { kind: 'derived' }, '생성물은 frontend/src/** 보다 먼저 판정한다');
  assert.deepEqual(areaOf('frontend/src/app/page.tsx'), { kind: 'areas', areas: ['product'] });
  assert.deepEqual(areaOf('frontend/src/extensions/hub.tsx'), { kind: 'areas', areas: ['composer', 'product'] });
  assert.deepEqual(areaOf('scripts\\reusable-x.mjs'), { kind: 'areas', areas: ['ci-governance', 'composer'] }, '역슬래시 경로도 같다');
  assert.deepEqual(areaOf('docs/03-guides/orchestration-protocol.md'), { kind: 'areas', areas: ['ci-governance'] });
  // ADR 문서는 그 행이 있는 색인으로 간다 — 공용 인덱스의 ADR 은 추가 색인이 없고, 행이 없는 ADR 은 넷 모두다.
  const adrFiles = fs.readdirSync(path.join(repoRoot, 'docs/02-architecture/decisions'));
  const documentOf = (id) => `docs/02-architecture/decisions/${adrFiles.find((name) => name.startsWith(`${id}-`))}`;
  const [areaAdr, areaHolder] = [...holders].find(([, holder]) => holder !== 'common');
  assert.deepEqual(areaOf(documentOf(areaAdr)), { kind: 'areas', areas: [areaHolder] });
  assert.deepEqual(areaOf(documentOf('ADR-0001')), { kind: 'common' });
  assert.deepEqual(areaOf('docs/02-architecture/decisions/ADR-9999-unindexed.md'), { kind: 'unassigned' });
  assert.deepEqual(decisionRoute(documentOf(areaAdr), new Map()), { kind: 'unassigned' }, '색인을 읽지 못하면 넷 모두다');
  // 하나라도 미배정이면 넷 모두다.
  const plan = decisionReadingPlan(['frontend/src/app/page.tsx', 'docs/04-operations/readiness-followups.md'], holders);
  assert.equal(plan.all, true);
  assert.deepEqual(plan.areas.map(({ area }) => area), DECISION_AREA_INDEXES.map(({ area }) => area));
  assert.ok(plan.areas.every(({ gapDetail }) => gapDetail.startsWith(`${GAP_DETAIL}#`)));
  const narrow = decisionReadingPlan(['frontend/src/app/page.tsx', '.agent/memory/decisions.md'], holders);
  assert.equal(narrow.all, false);
  assert.deepEqual(narrow.areas.map(({ area }) => area), ['product']);
});

/** AGENTS 필수 읽기 3 이 대상 경로의 정의와 판정 명령을 갖는다(DEC-OPS-389). */
export const AGENTS_TARGET_PATH_DEFINITION = '대상 경로는 작업이 직접 고치는 입력 파일이다(생성물·공용 메모리·결정 색인 제외';
export const AGENTS_ROUTE_COMMAND = '`node scripts/decision-indexes.mjs --for <경로…>`';
export function agentsRoutingViolations(agents) {
  const reading = markdownSection(agents, '작업 시작 시 필수 읽기', '공통 작업 원칙');
  return [
    ...(reading.includes(AGENTS_TARGET_PATH_DEFINITION) ? [] : ['AGENTS 필수 읽기에 대상 경로의 정의가 없습니다.']),
    ...(reading.includes(AGENTS_ROUTE_COMMAND) ? [] : ['AGENTS 필수 읽기에 경로 판정 명령이 없습니다.']),
    ...(reading.includes('](docs/04-operations/known-gaps-detail.md)') ? [] : ['AGENTS 필수 읽기가 gap 영역 상세를 가리키지 않습니다.']),
  ];
}

test('AGENTS defines the target path and points to the routing command and the gap area detail', () => {
  const agents = readRepoFile('AGENTS.md');
  assert.deepEqual(agentsRoutingViolations(agents), []);
  for (const [from, expected] of [
    [AGENTS_TARGET_PATH_DEFINITION, '대상 경로의 정의'],
    [AGENTS_ROUTE_COMMAND, '경로 판정 명령'],
    ['](docs/04-operations/known-gaps-detail.md)', 'gap 영역 상세'],
  ]) {
    const mutated = agents.split(from).join('');
    assert.notEqual(mutated, agents);
    assert.ok(agentsRoutingViolations(mutated).some((message) => message.includes(expected)), from);
  }
});

test('memory truth bindings fail closed for synthetic shard and ADR drift', () => {
  const requiredChecks = readRepoFile('.github/required-checks.json');
  const context = readRepoFile('.agent/memory/project-context.md');
  const currentShardCount = projectContextE2eShardContract(context).count;
  const driftedContext = context.replace(
    `${currentShardCount}개 shard`,
    `${currentShardCount + 1}개 shard`,
  );
  assert.notEqual(driftedContext, context, '합성 CTX-009 shard mutation이 적용되지 않았습니다.');
  assert.throws(
    () => assertE2eShardContractMatches(driftedContext, requiredChecks),
    /CTX-009의 E2E shard 수가 required-checks sourceMatrix와 다릅니다/u,
  );

  const authoritativeCoordinates = authoritativeE2eShardContract(requiredChecks).coordinates;
  const wrongCoordinate = authoritativeCoordinates[0].replace(
    /\/\d+$/u,
    `/${authoritativeCoordinates.length + 1}`,
  );
  const coordinateDrift = context.replace(
    `\`${authoritativeCoordinates[0]}\``,
    `\`${wrongCoordinate}\``,
  );
  assert.notEqual(coordinateDrift, context, '합성 CTX-009 shard 좌표 mutation이 적용되지 않았습니다.');
  assert.throws(
    () => assertE2eShardContractMatches(coordinateDrift, requiredChecks),
    /CTX-009의 E2E shard 좌표·순서가 required-checks sourceMatrix와 다릅니다/u,
  );

  const registry = readRepoFile('docs/02-architecture/decisions/README.md');
  const decisions = readRepoFile('.agent/memory/decisions.md');
  const registryIds = acceptedAdrIds(registry);
  const removedId = registryIds[0];
  const missingDecision = decisions.replace(
    new RegExp(`^\\| ${removedId} \\|[^\\n]*(?:\\r?\\n|$)`, 'mu'),
    '',
  );
  assert.notEqual(missingDecision, decisions, '합성 missing ADR mutation이 적용되지 않았습니다.');
  assert.throws(
    () => assertExactAdrSet(registryIds, bindingAdrIds(missingDecision, areaIndexFiles())),
    new RegExp(`missing=\\[${removedId}\\]`, 'u'),
  );

  const statusDrift = decisions.replace(
    `| ${removedId} | accepted |`,
    `| ${removedId} | superseded |`,
  );
  assert.notEqual(statusDrift, decisions, '합성 ADR status mutation이 적용되지 않았습니다.');
  assert.throws(
    () => decisionMemoryAdrIds(statusDrift),
    /Accepted ADR index 상태는 exact accepted여야 합니다/u,
  );

  const ghostId = 'ADR-9999';
  assert.ok(!registryIds.includes(ghostId), `${ghostId}는 합성 ghost ID로 사용할 수 없습니다.`);
  const ghostRow = `| ${ghostId} | accepted | synthetic ghost | 2099-01-01 | - |`;
  const ghostDecision = decisions.replace(/^(\| ADR-0001 \|.*)$/mu, `$1\n${ghostRow}`);
  assert.notEqual(ghostDecision, decisions, '합성 ghost ADR mutation이 Accepted ADR 표에 적용되지 않았습니다.');
  assert.throws(
    () => assertExactAdrSet(registryIds, bindingAdrIds(ghostDecision, areaIndexFiles())),
    new RegExp(`ghost=\\[${ghostId}\\]`, 'u'),
  );
  // 절 끝(목록 뒤)처럼 표 밖에 둔 행도 붉다 — 표 파서가 세지 않아도 빠져나가지 못한다.
  const strayDecision = decisions.replace(/\r?\n\r?\n## 운영 결정 index/u, `\n${ghostRow}\n\n## 운영 결정 index`);
  assert.notEqual(strayDecision, decisions, '합성 표 밖 ADR 행 mutation이 Accepted ADR 구간에 적용되지 않았습니다.');
  assert.throws(() => decisionMemoryAdrIds(strayDecision), /ADR 행은 표 안에만 둔다/u);
  const [areaFile, areaText] = Object.entries(areaIndexFiles())[0];
  assert.throws(() => areaIndexIds(`${areaText}\n\n${ghostRow}\n`, areaFile), /결정 행은 표 안에만 둔다/u);

  const qualifiedRegistry = [
    '| ADR | 결정 | 상태 |',
    '|---|---|---|',
    '| [ADR-9001](ADR-9001.md) | plain | Accepted |',
    '| [ADR-9002](ADR-9002.md) | qualified | Accepted — provisional scope |',
    '| [ADR-9003](ADR-9003.md) | pending | Proposed |',
  ].join('\n');
  const qualifiedIds = acceptedAdrIds(qualifiedRegistry);
  assert.deepEqual(qualifiedIds, ['ADR-9001', 'ADR-9002']);
  assert.throws(
    () => assertExactAdrSet(qualifiedIds, ['ADR-9001']),
    /missing=\[ADR-9002\]/u,
  );

  const malformedIdRegistry = qualifiedRegistry.replace(
    '[ADR-9001](ADR-9001.md)',
    '[ADR-9001-old](ADR-9001.md)',
  );
  assert.notEqual(malformedIdRegistry, qualifiedRegistry, '합성 malformed ADR ID mutation이 적용되지 않았습니다.');
  assert.throws(
    () => acceptedAdrIds(malformedIdRegistry),
    /ADR registry ID는 exact markdown link여야 합니다/u,
  );

  const duplicateIdRegistry = [
    qualifiedRegistry,
    '| [ADR-9001](ADR-9001-duplicate.md) | duplicate proposed row | Proposed |',
  ].join('\n');
  assert.throws(
    () => acceptedAdrIds(duplicateIdRegistry),
    /ADR registry에 중복 ID가 있습니다/u,
  );
});

/*
 * [DEC-OPS-389] known-gaps 분할. 자동 로드 파일에는 모든 작업에 걸리거나 글로만 지켜지고 어기면 피해가 큰 금지가 있는 행의 전문과,
 * 특정 경로에서만 필요한 행의 레지스트리 줄(6열)을 둔다. 그 행의 전문은 gap 영역 상세의 영역 절에 있다. 레지스트리와 상세는 ID 가
 * 양방향으로 같고 우선순위·상태·영역이 같으며, 레지스트리 줄의 링크는 그 행이 있는 영역 절을 가리킨다. 행 길이·원장 재진술·공개
 * 안전은 memoryRuleFiles 모집단으로 상세 행에도 그대로 적용된다.
 */
export const GAP_STATES = /^(?:open|blocked-external|deferred|accepted-risk|needs-revalidation)$/u;
export const GAP_ROW_HEADER = Object.freeze(['GAP-ID', '우선순위', '상태', '영역', '요약', '근거', '다음 행동/재개 조건', '결정권자', '검증일']);
export const GAP_REGISTRY_HEADER = Object.freeze(['GAP-ID', '우선순위', '상태', '영역', '한 줄 요약', '상세']);
export const GAP_SUMMARY_LIMIT = 160;
const GAP_LINE = /^\| GAP-(?!ID\b)[A-Z0-9-]+ \|/u;
const gapDetailLink = (area) => `[상세](${fromMemory(GAP_DETAIL)}#${area})`;

function withoutGapRegistryLines(text) {
  return text.split(/\r?\n/).filter((line) => !(GAP_LINE.test(line) && markdownTableCells(line).length === 6)).join('\n');
}

const assertionMessage = (action) => {
  try {
    action();
    return null;
  } catch (error) {
    return error.message.split('\n')[0];
  }
};

test('memory registries use unique IDs and allowed gap states', () => {
  /*
    `| GAP-ID |` 는 표 머리글이지 memory ID 가 아니다 — 바로 아래 행 검사가 이미 `(?!ID\b)` 로
    그렇게 본다. 종전 수집기만 그 예외를 몰라, 표가 둘이 되면(활성 registry + 외부 증거 대기)
    머리글끼리 중복으로 잡혔다. 같은 의도로 맞춘다.
    ⚠ 완화가 아님을 아래 합성 probe 가 증명한다 — 진짜 중복은 그대로 잡힌다.
  */
  const collectIds = (text) =>
    [...text.matchAll(/^\| ((?:CTX|ADR|DEC|GAP)-(?!ID\b)[A-Z0-9-]+) \|/gm)].map((match) => match[1]);
  // 영역 결정 색인의 DEC 도 공용 메모리 ID 와 겹치지 않는다(한 결정은 색인 하나에만). 영역 상세로 옮긴 gap 의 레지스트리 줄(6열)은
  // 상세 행을 가리키는 요약이라 한 번 빼고 센다 — 전문 행이 자동 로드 표와 상세에 함께 있으면 그대로 중복이다.
  const ruleTexts = Object.entries(memoryRuleFiles()).map(([file, text]) => (file === 'known-gaps.md' ? withoutGapRegistryLines(text) : text));
  const ids = collectIds(ruleTexts.join('\n'));
  assert.equal(ids.length, new Set(ids).size, `중복 memory ID가 있습니다: ${ids.join(', ')}`);

  // 머리글은 몇 개가 있어도 ID 가 아니고, 실제 ID 중복은 반드시 잡힌다.
  assert.deepEqual(collectIds('| GAP-ID | 우선순위 |\n| GAP-ID | 우선순위 |'), []);
  const duplicated = collectIds('| GAP-X-001 | P1 |\n| GAP-X-001 | P2 |');
  assert.equal(duplicated.length, 2);
  assert.equal(new Set(duplicated).size, 1, '합성 중복이 잡히지 않으면 이 검사는 무력하다');

  // 전문 행은 자동 로드 표와 영역 상세 어디에 있든 같은 어휘·근거·재개 조건을 갖는다.
  const rows = Object.entries({ ...memoryFiles(), ...gapDetailFiles() })
    .filter(([file]) => GAP_FILES.includes(file))
    .flatMap(([, text]) => text.split(/\r?\n/).filter((line) => GAP_LINE.test(line) && markdownTableCells(line).length === 9));
  assert.ok(rows.length >= 3, '활성 gap registry가 비정상적으로 작습니다.');
  for (const row of rows) {
    const cells = markdownTableCells(row);
    assert.match(cells[0], /^GAP-[A-Z0-9-]+$/);
    assert.match(cells[1], /^P[0-3]$/);
    assert.match(cells[2], GAP_STATES);
    assert.match(cells[5], /\]\([^)]*\)/, `${cells[0]}: 근거 링크가 필요합니다.`);
    assert.ok(cells[6].length >= 10, `${cells[0]}: 다음 행동/재개 조건이 필요합니다.`);
    assert.match(cells[8], /^\d{4}-\d{2}-\d{2}$/);
  }
});

/** gap 영역 상세의 행 — 영역 앵커 절마다 9열 표 하나. */
export function gapDetailRows(detail) {
  const violations = [];
  const text = detail.replace(/\r\n?/gu, '\n');
  const anchors = [...text.matchAll(/^<a id="([^"]+)"><\/a>$/gmu)];
  if (anchors.map((match) => match[1]).join(',') !== DECISION_AREA_INDEXES.map(({ area }) => area).join(',')) {
    violations.push('gap 상세의 절 앵커는 영역 결정 색인마다 하나씩, 경로 원장 순서로 둔다.');
  }
  const rows = [];
  anchors.forEach((match, index) => {
    const section = text.slice(match.index, anchors[index + 1]?.index ?? text.length);
    const label = DECISION_AREA_INDEXES.find(({ area }) => area === match[1])?.label;
    if (!label || !section.includes(`\n## ${label}\n`)) violations.push(`${match[1]}: 절 제목이 영역 결정 색인 이름과 다릅니다.`);
    let cells = [];
    const problem = assertionMessage(() => { cells = markdownTableRows(section, GAP_ROW_HEADER); });
    if (problem) violations.push(`${match[1]}: ${problem}`);
    for (const row of cells) rows.push({ id: row[0], area: match[1], cells: row });
  });
  if (text.split('\n').filter((line) => GAP_LINE.test(line)).length !== rows.length) {
    violations.push('gap 상세의 행은 영역 절의 표 안에만 둔다.');
  }
  if (!/^> 상태: gap 영역 상세 — .*upstream 이력이며 도입 기관의 현재 위험이 아니다\.$/mu.test(text)) {
    violations.push('gap 상세에는 생성물에서도 참인 상태 줄이 필요합니다 — 복사된 원본 위험을 도입 기관의 현재 위험으로 읽지 않게 한다.');
  }
  return { rows, violations };
}

/** 자동 로드 gap 인덱스와 영역 상세의 일대일 대응 위반 문장들. */
export function gapSplitViolations(knownGaps, detail) {
  const violations = [];
  let registry = [];
  const problem = assertionMessage(() => {
    registry = markdownTableRows(markdownSection(knownGaps, '영역 상세 gap 레지스트리', '해결 규칙'), GAP_REGISTRY_HEADER);
  });
  if (problem) violations.push(`known-gaps.md: ${problem}`);
  const gapLines = knownGaps.split(/\r?\n/).filter((line) => GAP_LINE.test(line));
  const fullIds = gapLines.filter((line) => markdownTableCells(line).length === 9).map((line) => markdownTableCells(line)[0]);
  const registryLines = gapLines.filter((line) => markdownTableCells(line).length === 6);
  for (const line of gapLines.filter((row) => ![6, 9].includes(markdownTableCells(row).length))) {
    violations.push(`${markdownTableCells(line)[0]}: gap 줄은 전문(9열) 또는 레지스트리(6열)여야 합니다.`);
  }
  if (registryLines.length !== registry.length) violations.push('레지스트리 줄은 「영역 상세 gap 레지스트리」 표 안에만 둔다.');
  const detailParsed = gapDetailRows(detail);
  violations.push(...detailParsed.violations);
  const detailById = new Map(detailParsed.rows.map((row) => [row.id, row]));
  const registryIds = registry.map(([id]) => id);
  if (registryIds.length !== new Set(registryIds).size) violations.push('레지스트리에 같은 gap ID 가 두 번 있습니다.');
  for (const [id, priority, state, area, summary, link] of registry) {
    const detailRow = detailById.get(id);
    if (!detailRow) {
      violations.push(`${id}: 레지스트리 줄이 가리키는 상세 행이 없습니다.`);
      continue;
    }
    if (priority !== detailRow.cells[1] || state !== detailRow.cells[2] || area !== detailRow.cells[3]) {
      violations.push(`${id}: 레지스트리의 우선순위·상태·영역이 상세 행과 다릅니다.`);
    }
    if (link !== gapDetailLink(detailRow.area)) violations.push(`${id}: 상세 링크는 그 행이 있는 영역 절(${gapDetailLink(detailRow.area)})을 가리켜야 합니다.`);
    if (!summary || summary.length > GAP_SUMMARY_LIMIT) violations.push(`${id}: 한 줄 요약은 1~${GAP_SUMMARY_LIMIT}자입니다(${summary.length}자).`);
  }
  for (const { id } of detailParsed.rows) {
    if (!registryIds.includes(id)) violations.push(`${id}: 상세 행에 맞는 레지스트리 줄이 없습니다 — 자동 로드에서 그 gap 이 사라진다.`);
    if (fullIds.includes(id)) violations.push(`${id}: 전문 행은 자동 로드 표나 영역 상세 가운데 한 곳에만 둔다.`);
  }
  return violations;
}

test('the auto-loaded gap registry and the gap area detail stay one-to-one', () => {
  const knownGaps = readRepoFile('.agent/memory/known-gaps.md');
  const detail = readRepoFile(GAP_DETAIL);
  assert.deepEqual(gapSplitViolations(knownGaps, detail), []);
  assert.ok(gapDetailRows(detail).rows.length > 0, 'gap 상세가 비었습니다 — 분할을 되돌렸으면 이 시험도 함께 고친다.');

  // red 재현: 각 변이가 그 규칙의 문장으로 붉다.
  const registryLine = knownGaps.split(/\r?\n/).find((line) => GAP_LINE.test(line) && markdownTableCells(line).length === 6);
  const [id, priority, state] = markdownTableCells(registryLine);
  const { area } = gapDetailRows(detail).rows.find((row) => row.id === id);
  const detailRow = detail.split(/\r?\n/).find((line) => line.startsWith(`| ${id} |`));
  const otherArea = DECISION_AREA_INDEXES.find((index) => index.area !== area).area;
  const fullRow = knownGaps.split(/\r?\n/).find((line) => GAP_LINE.test(line) && markdownTableCells(line).length === 9);
  const dropLine = (text, line) => text.split(/(?<=\n)/u).filter((part) => part.replace(/\r?\n$/u, '') !== line).join('');
  const cases = [
    ['레지스트리 줄 삭제', dropLine(knownGaps, registryLine), detail, '레지스트리 줄이 없습니다'],
    ['상세 행 삭제', knownGaps, dropLine(detail, detailRow), '가리키는 상세 행이 없습니다'],
    ['다른 영역 절 링크', knownGaps.replace(registryLine, registryLine.replace(`#${area})`, `#${otherArea})`)), detail, '영역 절'],
    ['상태 불일치', knownGaps.replace(registryLine, registryLine.replace(` | ${priority} | ${state} | `, ` | ${priority} | deferred | `)), detail, '상세 행과 다릅니다'],
    ['긴 요약', knownGaps.replace(registryLine, registryLine.replace(' | [상세](', ` ${'가'.repeat(GAP_SUMMARY_LIMIT)} | [상세](`)), detail, '한 줄 요약은'],
    ['표 밖 레지스트리 줄', knownGaps.replace(fullRow, `${fullRow}\n${registryLine}`), detail, '표 안에만 둔다'],
    ['전문 행 중복', knownGaps, detail.replace(detailRow, `${detailRow}\n${fullRow}`), '한 곳에만 둔다'],
    ['상태 줄 삭제', knownGaps, detail.replace(/^> 상태: .*$/mu, '> 상태: 메모'), '상태 줄'],
    ['절 앵커 삭제', knownGaps, detail.replace(`<a id="${otherArea}"></a>`, ''), '절 앵커'],
  ];
  for (const [label, gaps, details, expected] of cases) {
    assert.ok(gaps !== knownGaps || details !== detail, `${label}: 변이가 적용되지 않았습니다.`);
    const messages = gapSplitViolations(gaps, details);
    assert.ok(messages.some((message) => message.includes(expected)), `${label}: ${JSON.stringify(messages)}`);
  }
});

/**
 * [2026-09-14 AGENTS.md 거버넌스 총량 관리] 공용 메모리는 인덱스다. 행에는 결론·근거 링크·다음 행동만 두고
 * 경위·실측 로그·red 증명 상세는 커밋·PR·링크 문서에 둔다. 결정 행은 소급 편집하지 않으므로 상한은
 * FIRST_CAPPED_DECISION 이후 행에만 적용한다. gap·context 행은 현재 상태라 전부 적용한다.
 */
// [2026-10-26 DEC-OPS-385] ADR 행은 요지·시행일·대체 범위만 둔다 — 이유·전문은 ADR 색인이 가리키는 ADR 문서에 있다.
export const MEMORY_ROW_LIMITS = Object.freeze({ DEC: 1200, GAP: 1600, CTX: 700, ADR: 400 });
export const FIRST_CAPPED_DECISION = 97;

export function memoryRowLengthViolations(text) {
  const violations = [];
  for (const row of text.split(/\r?\n/)) {
    const id = row.match(/^\| ((DEC|GAP|CTX|ADR)-[A-Z0-9-]+) \|/);
    if (!id || id[1] === 'GAP-ID') continue;
    const kind = id[2];
    if (kind === 'DEC') {
      const number = Number(id[1].match(/-(\d+)$/)?.[1]);
      if (!Number.isFinite(number) || number < FIRST_CAPPED_DECISION) continue;
    }
    if (row.length > MEMORY_ROW_LIMITS[kind]) {
      violations.push(`${id[1]}: 행 ${row.length}자 > 상한 ${MEMORY_ROW_LIMITS[kind]}자 — 경위·실측·red 증명 상세는 링크 문서·커밋으로 옮기십시오.`);
    }
  }
  return violations;
}

test('shared memory rows stay index-sized', () => {
  const violations = Object.values(memoryRuleFiles()).flatMap((text) => memoryRowLengthViolations(text));
  assert.deepEqual(violations, []);

  const agents = readRepoFile('AGENTS.md');
  assert.match(agents, /## 거버넌스 총량 관리/u, 'AGENTS.md 에 거버넌스 총량 규칙이 있어야 이 상한의 근거가 선다.');
  assert.ok(agents.includes('(scripts/shared-memory-contract.test.mjs)'), 'AGENTS.md 규칙은 집행 계약을 가리켜야 한다(H5).');
});

/**
 * [2026-10-24 DEC-OPS-381] 진입점이 매 세션 읽는 세 파일의 전체 크기 상한. 행 상한은 행 수가 느는 것을 못 잡는다.
 * 단위는 행 상한과 같은 문자 수(CRLF 를 LF 로 맞춘 뒤) — 작업 트리는 CRLF·CI 는 LF 라 맞추지 않으면 판정이 갈린다.
 * 상한에 닿으면 행을 줄이거나 기준상 더는 늘 걸리지 않게 된 행만 옮긴다. 늘 걸리는 행을 크기 때문에 옮기거나 상한을 올리는 것은
 * H2 판단이다(AGENTS.md 거버넌스 총량 관리).
 * [DEC-OPS-389] known-gaps.md 는 특정 경로에서만 필요한 행을 gap 영역 상세로 옮긴 뒤(약 28.6k → 17.5k자) 실측 근처로 내렸다.
 */
export const MEMORY_FILE_LIMITS = Object.freeze({ 'project-context.md': 20000, 'decisions.md': 20000, 'known-gaps.md': 19000 });
export const memoryFileSize = (text) => text.replace(/\r\n?/gu, '\n').length;

export function memoryFileSizeViolations(files) {
  return Object.entries(files).flatMap(([file, text]) => {
    const limit = MEMORY_FILE_LIMITS[file];
    if (!Number.isInteger(limit)) return [`${file}: 파일 크기 상한이 없습니다 — 자동 로드되는 공용 메모리 파일은 상한이 필요합니다.`];
    const size = memoryFileSize(text);
    return size > limit ? [`${file}: ${size}자 > 상한 ${limit}자 — 경위·실측은 링크 문서로, 더는 늘 걸리지 않는 행은 영역·역사 색인으로 옮기십시오.`] : [];
  });
}

test('auto-loaded shared memory files stay within their size budget', () => {
  assert.deepEqual(Object.keys(MEMORY_FILE_LIMITS).sort(), Object.keys(documents).sort(), '자동 로드되는 파일마다 상한이 하나씩 있어야 합니다.');
  assert.deepEqual(memoryFileSizeViolations(memoryFiles()), []);
  // red 재현: 상한 경계, 줄 끝 정규화, 상한이 없는 파일.
  for (const [file, limit] of Object.entries(MEMORY_FILE_LIMITS)) {
    assert.deepEqual(memoryFileSizeViolations({ [file]: 'x'.repeat(limit) }), [], `${file}: 상한과 같은 크기는 통과한다`);
    assert.equal(memoryFileSizeViolations({ [file]: 'x'.repeat(limit + 1) }).length, 1, `${file}: 상한을 넘으면 붉다`);
  }
  assert.equal(memoryFileSize('a\r\nb\r\n'), memoryFileSize('a\nb\n'), 'CRLF 와 LF 의 크기가 같아야 한다');
  assert.match(memoryFileSizeViolations({ 'new-memory.md': 'x' })[0], /파일 크기 상한이 없습니다/u);
  const decisions = memoryFiles()['decisions.md'];
  assert.match(memoryFileSizeViolations({ 'decisions.md': `${decisions}${'x'.repeat(MEMORY_FILE_LIMITS['decisions.md'])}` })[0], /decisions\.md: \d+자 > 상한 20000자/u);
});

test('memory row limits are red for oversized new rows and leave accepted history alone', () => {
  const pad = (n) => 'x'.repeat(n);
  assert.deepEqual(memoryRowLengthViolations(`| DEC-OPS-096 | accepted | ${pad(3000)} |`), [], '상한 이전 결정은 소급 편집 대상이 아니다');
  assert.equal(memoryRowLengthViolations(`| DEC-OPS-097 | accepted | ${pad(1300)} |`).length, 1);
  assert.equal(memoryRowLengthViolations(`| DEC-OPS-120 | accepted | ${pad(1000)} |`).length, 0);
  assert.equal(memoryRowLengthViolations(`| GAP-NEW-001 | P2 | open | ${pad(1700)} |`).length, 1);
  assert.equal(memoryRowLengthViolations(`| CTX-099 | ${pad(800)} |`).length, 1);
  assert.equal(memoryRowLengthViolations(`| ADR-0099 | accepted | ${pad(400)} | 2026-10-26 | - |`).length, 1);
  assert.equal(memoryRowLengthViolations(`| ADR-0099 | accepted | ${pad(300)} | 2026-10-26 | - |`).length, 0);
  assert.equal(memoryRowLengthViolations(`| GAP-ID | 우선순위 | ${pad(2000)} |`).length, 0, '표 머리글은 행이 아니다');
});

test('shared memory is public-repository safe', () => {
  const text = Object.values(memoryRuleFiles()).join('\n');
  const forbidden = [
    /file:\/\//iu,
    /[A-Za-z]:[\\/]Users[\\/]/u,
    /(?:^|\s)\/(?:Users|home)\//u,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
    /(?:api[_-]?key|access[_-]?token|password|client[_-]?secret)\s*[:=]\s*['"][^'"]+['"]/iu,
    /~\/\.(?:agents|gemini|claude|codex)\//u,
    /(?:\bNTFS\b|\bFile\s*ID\b|\bhardlink\b|하드링크)/iu,
  ];
  for (const pattern of forbidden) assert.doesNotMatch(text, pattern);

  assert.match(text, /원시 세션/u, '원시 provider session을 이관하지 않는 경계가 필요합니다.');
  assert.match(text, /실시간.*(?:claim|lock)/u, '공용 memory가 실시간 조정 버스가 아니라는 경계가 필요합니다.');

  for (const file of Object.keys(documents)) {
    const relative = path.posix.join('.agent/memory', file);
    try {
      execFileSync('git', ['check-ignore', '--quiet', '--', relative], { cwd: repoRoot });
      assert.fail(`${relative}: .gitignore에 의해 무시되고 있습니다.`);
    } catch (error) {
      assert.notEqual(error?.code, 'ERR_ASSERTION', error?.message);
    }
  }
});

test('active instructions do not recreate deleted session journals', () => {
  const instructionFiles = [
    '.agent/skills/deep-context-mapper/SKILL.md',
    '.agent/skills/visual-auditor/SKILL.md',
    'api-server/src/test/java/nuri/api/harness/HarnessBaselineIntegrityTest.java',
    'api-server/src/test/java/nuri/api/harness/SignupContractLinterTest.java',
  ];
  for (const file of instructionFiles) {
    assert.doesNotMatch(readRepoFile(file), /\.gemini\/tasks\//u, `${file}: 삭제한 세션 저널 경로를 다시 지시합니다.`);
  }
});

// Static instruction regressions only: these checks do not evaluate an agent's actual behavior.
const workflowSkills = [
  'verification-before-completion',
  'finishing-a-development-branch',
  'test-driven-development',
  'dispatching-parallel-agents',
  'subagent-driven-development',
  // [2026-10-26] 남은 실행 스킬도 상위 권위를 가리키고 승인·중단·검토 횟수를 SOP 에 맡긴다.
  'executing-plans',
  'requesting-code-review',
  'writing-plans',
  'using-git-worktrees',
  'brainstorming',
  // [2026-10-27] 동작 확인·CI 판별 실행 스킬도 같은 상위 권위를 가리킨다.
  'verify-app',
  'ci-triage',
];
const workflowInstructionRegressions = [
  ['unscoped npm test', /^\s*(?:\$\s*)?npm test\b/mu],
  ['unconditional full suite', /\b(?:Run|Execute) (?:the )?(?:FULL command|full test suite|full suite)\b/iu],
  ['message-bound verification', /haven't run the verification command in this message/iu],
  ['scoped evidence dismissed', /Partial proves nothing/iu],
  ['mandatory two-stage review', /two-stage review (?:after each|first)|two reviews per task are required/iu],
  ['unbounded retry', /Repeat until approved|re-run until it fails correctly/iu],
  ['main-agent repair forbidden', /Don't try to fix manually/iu],
  ['mandatory completion menu', /Present exactly (?:these )?4 (?:structured )?options/iu],
  ['repeated merge approval', /merge only when the user asks/iu],
  ['premature PR worktree cleanup', /\*\*For Options 1, 2, 4:\*\*/u],
  ['wait between batches', /Between batches: just report and wait|Say: "Ready for feedback\."/u],
  ['stop at first blocker', /STOP executing immediately/u],
  ['review after every task', /Review after EACH task|\*\*Mandatory:\*\*\s*\n- After each task/u],
  ['forced separate-session executor', /REQUIRED SUB-SKILL:(?:\*\*)? (?:Use|New session uses) executing-plans/u],
  ['worktree before every task', /REQUIRED before executing any tasks/u],
  ['mandatory brainstorming', /You MUST use this before any creative work/u],
  ['approval after every section', /Ask after each section whether it looks right/u],
  ['implementation readiness prompt', /Ready to set up for implementation\?/u],
  ['baseline failures need permission', /get explicit permission to proceed/u],
  ['mandatory re-review', /Don't skip the re-review/u],
  ['generated code needs a human', /Exceptions \(ask your human partner\)/u],
  // [2026-10-27 DEC-OPS-387] 다른 회사 검토자는 메인 에이전트 기준이다 — Claude 메인만 가정한 고정 목록으로 되돌리지 않는다.
  ['reviewer vendor fixed to one main agent', /this machine has Codex \(`codex exec`\) and Antigravity/u],
];

function workflowSkillViolations(files) {
  const violations = [];
  for (const skill of workflowSkills) {
    const text = files[skill] ?? '';
    if (!text.includes('](../../../AGENTS.md#verification-by-change-scope)')) {
      violations.push(`${skill}: missing scope-verification authority`);
    }
    if (!text.includes('](../../../docs/03-guides/orchestration-protocol.md)')) {
      violations.push(`${skill}: missing orchestration authority`);
    }
    if (skill === 'finishing-a-development-branch' && !text.includes('](../../../AGENTS.md#공유-워킹트리와-git)')) {
      violations.push(`${skill}: missing branch-completion authority`);
    }
    // [2026-10-27 DEC-OPS-387] 다른 회사 검토자는 메인 에이전트 기준·모델 기준이다 — 그 문장이 빠지면 어느 판으로 되돌려도 붉다.
    if (skill === 'requesting-code-review' && (!text.includes('the model you — the main agent doing the work — run on')
      || !text.includes('Judge the vendor by the model, not by the CLI'))) {
      violations.push(`${skill}: missing main-agent-relative reviewer vendor`);
    }
    for (const [label, pattern] of workflowInstructionRegressions) {
      if (pattern.test(text)) violations.push(`${skill}: ${label}`);
    }
  }
  return violations;
}

function readWorkflowSkills() {
  return Object.fromEntries(workflowSkills.map((skill) => [skill, readRepoFile(`.agent/skills/${skill}/SKILL.md`)]));
}

test('workflow skills defer verification and delegation to project authorities', () => {
  assert.deepEqual(workflowSkillViolations(readWorkflowSkills()), []);
});

test('workflow skills reject restored conflicting instructions and missing authority links', () => {
  const files = readWorkflowSkills();
  const regressions = [
    ['finishing-a-development-branch', 'npm test / cargo test / pytest / go test ./...', 'unscoped npm test'],
    ['test-driven-development', '$ npm test path/to/test.test.ts', 'unscoped npm test'],
    ['dispatching-parallel-agents', '- Run full test suite', 'unconditional full suite'],
    ['verification-before-completion', '2. RUN: Execute the FULL command (fresh, complete)', 'unconditional full suite'],
    ['verification-before-completion', "If you haven't run the verification command in this message, you cannot claim it passes.", 'message-bound verification'],
    ['verification-before-completion', '| Partial check is enough | Partial proves nothing |', 'scoped evidence dismissed'],
    ['subagent-driven-development', 'Two-stage review after each task: spec compliance first, then code quality', 'mandatory two-stage review'],
    ['subagent-driven-development', '- Repeat until approved', 'unbounded retry'],
    ['test-driven-development', 'Fix error, re-run until it fails correctly.', 'unbounded retry'],
    ['subagent-driven-development', "- Don't try to fix manually (context pollution)", 'main-agent repair forbidden'],
    ['finishing-a-development-branch', 'Present exactly these 4 options:', 'mandatory completion menu'],
    ['finishing-a-development-branch', '- Present exactly 4 structured options', 'mandatory completion menu'],
    ['finishing-a-development-branch', 'Use Option 2, and merge only when the user asks.', 'repeated merge approval'],
    ['finishing-a-development-branch', '**For Options 1, 2, 4:**', 'premature PR worktree cleanup'],
    ['executing-plans', '- Between batches: just report and wait', 'wait between batches'],
    ['executing-plans', '- Say: "Ready for feedback."', 'wait between batches'],
    ['executing-plans', '**STOP executing immediately when:**', 'stop at first blocker'],
    ['requesting-code-review', '- Review after EACH task', 'review after every task'],
    ['requesting-code-review', '**Mandatory:**\n- After each task in subagent-driven development', 'review after every task'],
    ['writing-plans', '> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.', 'forced separate-session executor'],
    ['writing-plans', '- **REQUIRED SUB-SKILL:** New session uses executing-plans', 'forced separate-session executor'],
    ['using-git-worktrees', '- **subagent-driven-development** - REQUIRED before executing any tasks', 'worktree before every task'],
    ['brainstorming', 'description: "You MUST use this before any creative work - creating features"', 'mandatory brainstorming'],
    ['brainstorming', '- Ask after each section whether it looks right so far', 'approval after every section'],
    ['brainstorming', '- Ask: "Ready to set up for implementation?"', 'implementation readiness prompt'],
    ['using-git-worktrees', '- **Fix:** Report failures, get explicit permission to proceed', 'baseline failures need permission'],
    ['subagent-driven-development', "- Don't skip the re-review", 'mandatory re-review'],
    ['test-driven-development', '**Exceptions (ask your human partner):**', 'generated code needs a human'],
    ['requesting-code-review', 'prefer a model from a different vendor when one is installed — this machine has Codex (`codex exec`) and Antigravity (`agy -p`)', 'reviewer vendor fixed to one main agent'],
  ];
  for (const [skill, instruction, label] of regressions) {
    const mutated = { ...files, [skill]: `${files[skill]}\n${instruction}\n` };
    assert.deepEqual(workflowSkillViolations(mutated), [`${skill}: ${label}`]);
    assert.throws(() => assert.deepEqual(workflowSkillViolations(mutated), []), { code: 'ERR_ASSERTION' });
  }
  for (const skill of workflowSkills) {
    for (const [link, label] of [
      ['](../../../AGENTS.md#verification-by-change-scope)', 'missing scope-verification authority'],
      ['](../../../docs/03-guides/orchestration-protocol.md)', 'missing orchestration authority'],
    ]) {
      const mutated = { ...files, [skill]: files[skill].replaceAll(link, '') };
      assert.deepEqual(workflowSkillViolations(mutated), [`${skill}: ${label}`]);
      assert.throws(() => assert.deepEqual(workflowSkillViolations(mutated), []), { code: 'ERR_ASSERTION' });
    }
  }
});

test('review skill rejects removal of the main-agent-relative reviewer vendor rule', () => {
  const files = readWorkflowSkills();
  const skill = 'requesting-code-review';
  // 두 번째 커밋 직전의 판(Claude 메인만 가정한 문장)으로 되돌린 경우도 같은 오류로 붉어야 한다(2026-10-27 Codex 재검토).
  const previous = 'For the required review above, prefer a model from a different vendor when one is installed — check with `agy --help` / `codex --help` first';
  for (const [from, to] of [
    ['the model you — the main agent doing the work — run on', 'the model of this agent'],
    ['Judge the vendor by the model, not by the CLI', 'Judge the vendor by the CLI'],
  ]) {
    const mutated = { ...files, [skill]: files[skill].replace(from, to) };
    assert.deepEqual(workflowSkillViolations(mutated), [`${skill}: missing main-agent-relative reviewer vendor`]);
  }
  const reverted = { ...files, [skill]: files[skill].replace(/A reviewer on the same model tends to share your blind spots\.[^\n]*/u, `A reviewer on the same model tends to share your blind spots. ${previous}.`) };
  assert.deepEqual(workflowSkillViolations(reverted), [`${skill}: missing main-agent-relative reviewer vendor`]);
});

test('finishing skill rejects removal of the branch-completion authority', () => {
  const files = readWorkflowSkills();
  const skill = 'finishing-a-development-branch';
  const mutated = { ...files, [skill]: files[skill].replace('](../../../AGENTS.md#공유-워킹트리와-git)', '') };
  assert.deepEqual(workflowSkillViolations(mutated), [`${skill}: missing branch-completion authority`]);
  assert.throws(() => assert.deepEqual(workflowSkillViolations(mutated), []), { code: 'ERR_ASSERTION' });
});

test('constitution metadata points to the project rule SSOT, not tool adapters', () => {
  const metadataFiles = [
    '.agent/knowledge/backend-api-constitution/metadata.json',
    '.agent/knowledge/frontend-ux-constitution/metadata.json',
    '.agent/knowledge/db-standard-constitution/metadata.json',
  ];
  for (const file of metadataFiles) {
    const metadata = JSON.parse(readRepoFile(file));
    const references = metadata.references ?? [];
    assert.ok(!references.includes('GEMINI.md'), `${file}: GEMINI 어댑터를 규칙 원본으로 참조합니다.`);
    assert.ok(!references.includes('CLAUDE.md'), `${file}: CLAUDE 어댑터를 규칙 원본으로 참조합니다.`);
  }
  for (const file of metadataFiles.slice(0, 2)) {
    const metadata = JSON.parse(readRepoFile(file));
    assert.ok(metadata.references.includes('AGENTS.md'), `${file}: AGENTS.md 규칙 SSOT 참조가 없습니다.`);
  }
});

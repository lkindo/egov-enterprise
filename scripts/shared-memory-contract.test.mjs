import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
    headings: ['범위와 승격 규칙', 'Accepted ADR index', '운영 결정 index', '기록 템플릿'],
  },
  'known-gaps.md': {
    kind: 'known-gaps',
    authority: 'derived-active-index',
    headings: ['범위·상태 정의', '활성 Gap registry', '재검증 대기', '해결 규칙'],
  },
};

function readRepoFile(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8');
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
  const ids = markdownTableRows(
    acceptedSection,
    ['ID', '상태', '결정', '이유', '정본', '시행일', 'supersedes'],
  ).map((cells) => {
    assert.match(cells[0] ?? '', /^ADR-\d{4}$/u, 'Accepted ADR index에 잘못된 ADR ID가 있습니다.');
    assert.equal(cells[1], 'accepted', `${cells[0]}: Accepted ADR index 상태는 exact accepted여야 합니다.`);
    return cells[0];
  });
  assert.equal(ids.length, new Set(ids).size, `decisions memory에 중복 ADR ID가 있습니다: ${ids.join(', ')}`);
  return ids;
}

/*
 * 운영 결정 표는 이유·정본 열을 두지 않는다 — 모든 행이 같은 값('승인·근거는 보관 원문', ID 로 만드는 보관 링크)이었다.
 * ID 가 보관 원문의 앵커이고, 그 앵커가 실제 절로 풀리는지와 상태·시행일·supersedes 일치는 Atlas 카탈로그가 본다.
 */
export const DECISION_ARCHIVE = '../../docs/archived/operational-decisions-history.md';
// 지금의 작업을 제약하지 않는 결정은 자동 로드되지 않는 역사 색인에 있다. 두 색인의 누락·중복·원문 일치는 Atlas 카탈로그가 본다.
export const DECISION_HISTORICAL_INDEX = '../../docs/archived/operational-decisions-index-historical.md';
export const OPERATIONAL_DECISION_HEADER = Object.freeze(['ID', '상태', '결정', '시행일', 'supersedes']);

export function decisionMemoryOperationalIds(decisions) {
  const section = markdownSection(decisions, '운영 결정 index', '기록 템플릿');
  assert.ok(
    section.split(/\r?\n/).some((line) => line.startsWith('ID가 보관 원문의 앵커다') && line.includes(`](${DECISION_ARCHIVE})`)),
    '운영 결정 index 에는 ID 가 보관 원문의 앵커라는 규칙 줄과 보관 기록 링크가 있어야 합니다.',
  );
  assert.ok(
    section.includes(`](${DECISION_HISTORICAL_INDEX})`),
    '운영 결정 index 에는 역사 색인 링크가 있어야 합니다 — 옮긴 결정을 찾는 길은 그 링크뿐입니다.',
  );
  const ids = markdownTableRows(section, OPERATIONAL_DECISION_HEADER).map((cells) => {
    assert.match(cells[0] ?? '', /^DEC-OPS-\d{3}$/u, `운영 결정 index에 잘못된 DEC ID가 있습니다: ${cells[0]}`);
    assert.match(cells[1] ?? '', /^(?:accepted|superseded|rejected)$/u, `${cells[0]}: 허용되지 않은 결정 상태입니다.`);
    assert.match(cells[3] ?? '', /^\d{4}-\d{2}-\d{2}$/u, `${cells[0]}: 시행일 열은 날짜여야 합니다.`);
    return cells[0];
  });
  assert.equal(ids.length, new Set(ids).size, '운영 결정 index에 중복 DEC ID가 있습니다.');
  return ids;
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
 * [2026-10-17 DEC-OPS-340] 원장이 세는 수는 원장 하나가 정본이다. 결합 census(config/governance/cross-domain-coupling-census.json,
 * DEC-OPS-090)와 배선 census(config/governance/operation-consumer-census.json 의 `expected`)를 공용 메모리 행에 다시 적으면
 * 원장이 바뀔 때마다 메모리 행을 같이 고쳐야 하고, 빠뜨리면 낡은 수가 남는다(2026-09-10 원장 갱신 371→385·32→29 가 메모리에
 * 남지 않은 것도 이 복제에서 생겼다). 그래서 수치 일치를 대조하지 않고, 행이 원장에 링크하는지와 원장 라벨 가까이의 수치 표기가
 * 어느 공용 메모리 행에도 없는지를 본다. 정본 게이트(배선 census 의 단조 래칫, 결합 원장의 edge 정확 집합)는 그대로라 판정 신호는
 * 줄지 않는다.
 * 수치 표기는 라벨 뒤에 조사·기호 하나·'수'·짧은 한글 낱말 하나를 건너 붙은 수(단위 개·건, 또는 단위 없이 날짜·ID 의 일부가 아닌 수)와
 * 'N개 라벨' 어순이다. 굵게 표시를 수의 안팎 어디에 달아도, 라벨을 띄어 쓰거나 붙여 써도, '→' 를 '->' 로 써도, 대소문자가 달라도 같다.
 * 라벨 앞뒤가 영문·경로 문자면 다른 낱말이다(docs/04-operations, operation-consumer-census). 라벨에서 떨어진 문장 속 서술
 * ('… 역전해 0이 됐다')은 보지 않는다 — 그 몫은 행이 수를 쓰지 않는다는 규약이 지킨다.
 * 입력 계약 원장(GAP-CONTRACT-001)의 라벨은 '길이'·'날짜' 처럼 다른 행에서도 원장과 무관한 수(컬럼 길이, 인덱스 수, ADR 의 표준 길이 수)
 * 곁에 쓰이는 일반 낱말이라 rowOnly 로 그 gap 행 안에서만 본다. 원장 이름이 고유한 라벨(app→core·unwired 등)은 모든 메모리 행에서 본다.
 */
export const LEDGER_MEMORY_BINDINGS = Object.freeze([
  Object.freeze({ id: 'GAP-ARCH-001', ledger: 'config/governance/cross-domain-coupling-census.json', labels: Object.freeze(['app→app', 'app→core']) }),
  Object.freeze({ id: 'GAP-WIRING-001', ledger: 'config/governance/operation-consumer-census.json', labels: Object.freeze(['operation', 'unwired', '화면 고아']) }),
  Object.freeze({ id: 'GAP-CONTRACT-001', ledger: 'config/governance/input-contract-mirror-census.json', rowOnly: true,
    labels: Object.freeze(['길이', '필수', '읽기 전용', 'enum', '중첩 검증', '날짜']) }),
]);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
// 라벨은 띄어 쓰든 붙여 쓰든, '→' 를 '->' 로 쓰든 같은 라벨이다. 앞뒤가 영문·경로 문자면 다른 낱말이다.
const labelPattern = (label) => `(?<![A-Za-z_/.-])${escapeRegExp(label)
  .replace(/\s*→\s*/gu, '\\s*(?:→|->)\\s*')
  .replace(/ +/gu, '\\s*')}(?![A-Za-z_/.-])`;
// 수는 굵게 표시를 안팎 어디에 달아도 같다. 단위(개·건)가 없으면 날짜·ID·경로의 일부가 아니어야 한다.
const RESTATED_COUNT = String.raw`\*{0,2}\d[\d,]*\*{0,2}(?:\s*(?:개|건)|(?![\d/.:-]))`;
// 라벨과 수 사이에는 조사·기호 하나, '수', 또는 짧은 한글 낱말 하나(뒤에 공백)까지만 둔다.
const LABEL_COUNT_BRIDGE = String.raw`(?:(?:[은는이가의:(=]|수)\s*|[가-힣]{1,6}\s+)?`;
const ledgerCountRestatement = (label) => new RegExp(
  `${labelPattern(label)}\\s*\\*{0,2}\\s*${LABEL_COUNT_BRIDGE}${RESTATED_COUNT}`
  + `|\\d[\\d,]*\\*{0,2}\\s*(?:개|건)\\*{0,2}\\s*(?:의\\s*)?${labelPattern(label)}`,
  'iu',
);

/** files: { 'known-gaps.md': text, ... } — 공용 메모리 파일 이름과 원문. 위반 문장 목록을 돌려준다. */
export function ledgerMemoryViolations(files) {
  const violations = [];
  const gapRows = (files['known-gaps.md'] ?? '').split(/\r?\n/);
  for (const { id, ledger } of LEDGER_MEMORY_BINDINGS) {
    const row = gapRows.find((line) => line.startsWith(`| ${id} |`));
    if (!row) {
      violations.push(`${id}: 활성 gap 행이 필요합니다.`);
    } else if (!row.includes(`](../../${ledger})`)) {
      violations.push(`${id}: 원장 링크(${ledger})가 필요합니다 — 현재 수는 원장이 정본입니다.`);
    }
  }
  for (const [file, text] of Object.entries(files)) {
    for (const line of text.split(/\r?\n/)) {
      for (const { id, ledger, labels, rowOnly } of LEDGER_MEMORY_BINDINGS) {
        if (rowOnly && !(file === 'known-gaps.md' && line.startsWith(`| ${id} |`))) continue;
        for (const label of labels) {
          if (ledgerCountRestatement(label).test(line)) {
            violations.push(`${file}: '${label}' 수를 다시 적었습니다 — ${ledger} 가 정본이니 링크만 남기십시오.`);
          }
        }
      }
    }
  }
  return violations;
}

function memoryFiles() {
  return Object.fromEntries(Object.keys(documents).map((file) => [file, fs.readFileSync(path.join(memoryDir, file), 'utf8')]));
}

test('ledger-derived counts stay in their ledgers and memory rows link to them', () => {
  assert.deepEqual(ledgerMemoryViolations(memoryFiles()), []);
});

test('ledger memory bindings are red for restated counts, a missing link and a missing row', () => {
  const files = memoryFiles();
  const gaps = files['known-gaps.md'];
  for (const { id, ledger, labels } of LEDGER_MEMORY_BINDINGS) {
    const row = gaps.split(/\r?\n/).find((line) => line.startsWith(`| ${id} |`));
    assert.ok(row, `${id}: 합성 변이를 넣을 행이 없습니다.`);
    for (const [label, restated] of labels.flatMap((name) => [[name, `${name} **10개**`], [name, `${name} 39건`]])) {
      const cells = row.split(' | ');
      cells[4] = `${restated} ${cells[4]}`;
      const mutated = gaps.replace(row, cells.join(' | '));
      assert.notEqual(mutated, gaps);
      assert.ok(
        ledgerMemoryViolations({ ...files, 'known-gaps.md': mutated }).some((message) => message.includes(`'${label}' 수를 다시 적었습니다`)),
        `${id}: '${restated}' 재진술이 red 가 아닙니다.`,
      );
    }
    const unlinked = gaps.replace(row, row.split(`](../../${ledger})`).join('](../../config/governance/unrelated.json)'));
    assert.notEqual(unlinked, gaps);
    assert.ok(
      ledgerMemoryViolations({ ...files, 'known-gaps.md': unlinked }).some((message) => message.startsWith(`${id}: 원장 링크`)),
      `${id}: 원장 링크를 지워도 red 가 아닙니다.`,
    );
    const missing = gaps.replace(`${row}\n`, '').replace(`${row}\r\n`, '');
    assert.notEqual(missing, gaps);
    assert.ok(
      ledgerMemoryViolations({ ...files, 'known-gaps.md': missing }).some((message) => message === `${id}: 활성 gap 행이 필요합니다.`),
      `${id}: 행을 지워도 red 가 아닙니다.`,
    );
  }
  // 다른 메모리 파일의 행에 같은 수를 옮겨 적어도 red 다.
  const elsewhere = `${files['project-context.md']}\n| CTX-999 | unwired **10개** · app→core **39건** | [원장](../../config/governance/operation-consumer-census.json) | 2099-01-01 |\n`;
  assert.equal(
    ledgerMemoryViolations({ ...files, 'project-context.md': elsewhere }).filter((message) => message.startsWith('project-context.md:')).length,
    2,
  );
  // 표기를 바꿔도 같은 재진술이다 — 조사·기호·'수'·짧은 낱말을 건너거나, 어순·굵게 표시·띄어쓰기·화살표·대소문자를 바꿔도 붉다.
  const wiringRow = gaps.split(/\r?\n/).find((line) => line.startsWith('| GAP-WIRING-001 |'));
  for (const [label, restated] of [
    ['operation', 'operation **436**개'],
    ['operation', 'operation은 437개'],
    ['unwired', 'unwired는 10개'],
    ['unwired', 'unwired: 10개'],
    ['unwired', 'unwired(10개)'],
    ['unwired', 'unwired 수 10개'],
    ['unwired', '10개 unwired'],
    ['unwired', 'Unwired 10개'],
    ['app→core', 'app→core 참조 39건'],
    ['app→core', 'app → core 39건'],
    ['app→core', 'app->core 39건'],
    ['app→core', 'app→core: **39**건'],
    ['app→app', 'app→app 0'],
    ['app→app', 'app→app 은 0개'],
    ['화면 고아', '화면고아 28개'],
    ['화면 고아', '화면 고아 **28**'],
  ]) {
    const cells = wiringRow.split(' | ');
    cells[4] = `${restated} ${cells[4]}`;
    const mutated = gaps.replace(wiringRow, cells.join(' | '));
    assert.notEqual(mutated, gaps);
    assert.ok(
      ledgerMemoryViolations({ ...files, 'known-gaps.md': mutated }).some((message) => message.includes(`'${label}' 수를 다시 적었습니다`)),
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
  const files = memoryFiles();
  const gaps = files['known-gaps.md'];
  const row = gaps.split(/\r?\n/).find((line) => line.startsWith('| GAP-CONTRACT-001 |'));
  assert.ok(row, 'GAP-CONTRACT-001: 합성 변이를 넣을 행이 없습니다.');
  // 이 행이 2026-10-19 까지 적던 형태 그대로다.
  const cells = row.split(' | ');
  cells[4] = `원장 기준 길이 246·필수 95·읽기 전용 62필드, enum 18·중첩 검증 13개, 날짜 12필드의 달력 형식을 검사한다. ${cells[4]}`;
  const messages = ledgerMemoryViolations({ ...files, 'known-gaps.md': gaps.replace(row, cells.join(' | ')) });
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

test('decision memory exactly indexes every plain and qualified Accepted ADR', () => {
  const registry = readRepoFile('docs/02-architecture/decisions/README.md');
  const decisions = readRepoFile('.agent/memory/decisions.md');
  const accepted = acceptedAdrIds(registry);
  assert.ok(accepted.length > 0, 'Accepted ADR census가 0건입니다.');
  assertExactAdrSet(accepted, decisionMemoryAdrIds(decisions));
});

test('operational decision index keeps the five-column schema and its archive anchor rule', () => {
  const decisions = readRepoFile('.agent/memory/decisions.md');
  const ids = decisionMemoryOperationalIds(decisions);
  assert.ok(ids.length > 0, '운영 결정 index 가 비었습니다.');

  // 걷은 이유·정본 열을 되돌리면 머리글이 다시 7열이 되어 붉다.
  const sevenColumns = decisions
    .replace('| ID | 상태 | 결정 | 시행일 | supersedes |\r\n|---|---|---|---|---|', '| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |\r\n|---|---|---|---|---|---|---|')
    .replace('| ID | 상태 | 결정 | 시행일 | supersedes |\n|---|---|---|---|---|', '| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |\n|---|---|---|---|---|---|---|');
  assert.notEqual(sevenColumns, decisions, '합성 7열 머리글 mutation 이 적용되지 않았습니다.');
  assert.throws(() => decisionMemoryOperationalIds(sevenColumns), /markdown table header가 정확히 한 번 있어야 합니다: ID \| 상태 \| 결정 \| 시행일 \| supersedes/u);

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
    () => assertExactAdrSet(registryIds, decisionMemoryAdrIds(missingDecision)),
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
  const ghostDecision = decisions.replace(
    /\r?\n\r?\n## 운영 결정 index/u,
    `\n| ${ghostId} | accepted | synthetic ghost | synthetic reason | synthetic source | 2099-01-01 | - |\n\n## 운영 결정 index`,
  );
  assert.notEqual(ghostDecision, decisions, '합성 ghost ADR mutation이 Accepted ADR 구간에 적용되지 않았습니다.');
  assert.throws(
    () => assertExactAdrSet(registryIds, decisionMemoryAdrIds(ghostDecision)),
    new RegExp(`ghost=\\[${ghostId}\\]`, 'u'),
  );

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

test('memory registries use unique IDs and allowed gap states', () => {
  const allText = Object.keys(documents)
    .map((file) => fs.readFileSync(path.join(memoryDir, file), 'utf8'))
    .join('\n');
  /*
    `| GAP-ID |` 는 표 머리글이지 memory ID 가 아니다 — 바로 아래 행 검사가 이미 `(?!ID\b)` 로
    그렇게 본다. 종전 수집기만 그 예외를 몰라, 표가 둘이 되면(활성 registry + 외부 증거 대기)
    머리글끼리 중복으로 잡혔다. 같은 의도로 맞춘다.
    ⚠ 완화가 아님을 아래 합성 probe 가 증명한다 — 진짜 중복은 그대로 잡힌다.
  */
  const collectIds = (text) =>
    [...text.matchAll(/^\| ((?:CTX|ADR|DEC|GAP)-(?!ID\b)[A-Z0-9-]+) \|/gm)].map((match) => match[1]);
  const ids = collectIds(allText);
  assert.equal(ids.length, new Set(ids).size, `중복 memory ID가 있습니다: ${ids.join(', ')}`);

  // 머리글은 몇 개가 있어도 ID 가 아니고, 실제 ID 중복은 반드시 잡힌다.
  assert.deepEqual(collectIds('| GAP-ID | 우선순위 |\n| GAP-ID | 우선순위 |'), []);
  const duplicated = collectIds('| GAP-X-001 | P1 |\n| GAP-X-001 | P2 |');
  assert.equal(duplicated.length, 2);
  assert.equal(new Set(duplicated).size, 1, '합성 중복이 잡히지 않으면 이 검사는 무력하다');

  const gaps = fs.readFileSync(path.join(memoryDir, 'known-gaps.md'), 'utf8');
  const rows = gaps.split(/\r?\n/).filter((line) => /^\| GAP-(?!ID\b)/.test(line));
  assert.ok(rows.length >= 3, '활성 gap registry가 비정상적으로 작습니다.');
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    assert.match(cells[0], /^GAP-[A-Z0-9-]+$/);
    assert.match(cells[1], /^P[0-3]$/);
    assert.match(cells[2], /^(open|blocked-external|deferred|accepted-risk|needs-revalidation)$/);
    assert.match(cells[5], /\]\([^)]*\)/, `${cells[0]}: 근거 링크가 필요합니다.`);
    assert.ok(cells[6].length >= 10, `${cells[0]}: 다음 행동/재개 조건이 필요합니다.`);
    assert.match(cells[8], /^\d{4}-\d{2}-\d{2}$/);
  }
});

/**
 * [2026-09-14 AGENTS.md 거버넌스 총량 관리] 공용 메모리는 인덱스다. 행에는 결론·근거 링크·다음 행동만 두고
 * 경위·실측 로그·red 증명 상세는 커밋·PR·링크 문서에 둔다. 결정 행은 소급 편집하지 않으므로 상한은
 * FIRST_CAPPED_DECISION 이후 행에만 적용한다. gap·context 행은 현재 상태라 전부 적용한다.
 */
export const MEMORY_ROW_LIMITS = Object.freeze({ DEC: 1200, GAP: 1600, CTX: 700 });
export const FIRST_CAPPED_DECISION = 97;

export function memoryRowLengthViolations(text) {
  const violations = [];
  for (const row of text.split(/\r?\n/)) {
    const id = row.match(/^\| ((DEC|GAP|CTX)-[A-Z0-9-]+) \|/);
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
  const violations = Object.keys(documents)
    .flatMap((file) => memoryRowLengthViolations(fs.readFileSync(path.join(memoryDir, file), 'utf8')));
  assert.deepEqual(violations, []);

  const agents = readRepoFile('AGENTS.md');
  assert.match(agents, /## 거버넌스 총량 관리/u, 'AGENTS.md 에 거버넌스 총량 규칙이 있어야 이 상한의 근거가 선다.');
  assert.ok(agents.includes('(scripts/shared-memory-contract.test.mjs)'), 'AGENTS.md 규칙은 집행 계약을 가리켜야 한다(H5).');
});

test('memory row limits are red for oversized new rows and leave accepted history alone', () => {
  const pad = (n) => 'x'.repeat(n);
  assert.deepEqual(memoryRowLengthViolations(`| DEC-OPS-096 | accepted | ${pad(3000)} |`), [], '상한 이전 결정은 소급 편집 대상이 아니다');
  assert.equal(memoryRowLengthViolations(`| DEC-OPS-097 | accepted | ${pad(1300)} |`).length, 1);
  assert.equal(memoryRowLengthViolations(`| DEC-OPS-120 | accepted | ${pad(1000)} |`).length, 0);
  assert.equal(memoryRowLengthViolations(`| GAP-NEW-001 | P2 | open | ${pad(1700)} |`).length, 1);
  assert.equal(memoryRowLengthViolations(`| CTX-099 | ${pad(800)} |`).length, 1);
  assert.equal(memoryRowLengthViolations(`| GAP-ID | 우선순위 | ${pad(2000)} |`).length, 0, '표 머리글은 행이 아니다');
});

test('shared memory is public-repository safe', () => {
  const text = Object.keys(documents)
    .map((file) => fs.readFileSync(path.join(memoryDir, file), 'utf8'))
    .join('\n');
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

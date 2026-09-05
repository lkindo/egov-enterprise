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
  const ids = [...allText.matchAll(/^\| ((?:CTX|ADR|DEC|GAP)-[A-Z0-9-]+) \|/gm)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, `중복 memory ID가 있습니다: ${ids.join(', ')}`);

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

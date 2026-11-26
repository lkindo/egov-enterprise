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
    headings: ['제품 목적과 현재 경계', '모듈·런타임 지도', '핵심 사실 (요약 인덱스)', '개발·검증·배포 흐름'],
  },
  'decisions.md': {
    kind: 'decisions',
    authority: 'adr-index',
    headings: ['Do-Not-Break 체크리스트 (자동 게이트 미커버 확정 규칙)', '저장소 공통 활성 운영 결정'],
  },
  'known-gaps.md': {
    kind: 'known-gaps',
    authority: 'derived-active-index',
    headings: ['활성 Gap', '해결 규칙'],
  },
};

function readRepoFile(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8');
}

function memoryFiles() {
  return Object.fromEntries(Object.keys(documents).map((file) => [file, fs.readFileSync(path.join(memoryDir, file), 'utf8')]));
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

const GAP_STATES = /^(?:open|blocked-external|deferred|accepted-risk|needs-revalidation)$/;
const GAP_LINE = /^\| GAP-(?!ID\b)[A-Z0-9-]+ \|/u;

const FORBIDDEN_PUBLIC_PATTERNS = [
  ['file-url', /file:\/\//iu],
  ['windows-user-path', /[A-Za-z]:[\\/]Users[\\/]/u],
  ['unix-home-path', /(?:^|\s)\/(?:Users|home)\//u],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
  ['hardcoded-secret', /(?:api[_-]?key|access[_-]?token|password|client[_-]?secret)\s*[:=]\s*['"][^'"]+['"]/iu],
  ['provider-home-dotdir', /~\/\.(?:agents|gemini|claude|codex)\//u],
  ['local-fs-metadata', /(?:\bNTFS\b|\bFile\s*ID\b|\bhardlink\b|하드링크)/iu],
];

function publicSafetyViolations(files) {
  const violations = [];
  const combined = Object.values(files).join('\n');
  for (const [label, pattern] of FORBIDDEN_PUBLIC_PATTERNS) {
    if (pattern.test(combined)) violations.push(`forbidden-public-pattern:${label}`);
  }
  if (!/원시 세션/u.test(combined)) {
    violations.push('missing-raw-session-boundary');
  }
  if (!/실시간.*(?:claim|lock)/u.test(combined)) {
    violations.push('missing-no-realtime-claim-lock-boundary');
  }
  return violations;
}

// ─── 기본 스키마·모듈·Do-Not-Break·유일 ID ───────────────────────────────────────────────────────────────

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

    execFileSync('git', ['cat-file', '-e', `${fm.verified_against}^{commit}`], { cwd: repoRoot, stdio: 'ignore' });
    execFileSync('git', ['merge-base', '--is-ancestor', fm.verified_against, 'HEAD'], { cwd: repoRoot, stdio: 'ignore' });
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

const DO_NOT_BREAK_ITEMS = [
  [1, ['GAP-DATA-002', '추정 보정']],
  [2, ['DEC-OPS-358', '재부여']],
  [3, ['DEC-OPS-375', 'shared-oci-migration-apply-log.md']],
  [4, ['DEC-OPS-379', 'Expand']],
  [5, ['GAP-STD-001', 'DEC-OPS-378']],
  [6, ['GAP-ZDM-001', 'V2_127']],
  [7, ['DEC-OPS-396', 'Asia/Seoul']],
  [8, ['DEC-OPS-134', 'DEC-OPS-417', '금지']],
  [9, ['GAP-DEPT-001', 'unloadedParentId']],
  [10, ['GAP-FILE-001', 'FileAccessPolicy']],
  [11, ['GAP-LOGIN-001', 'dpcn_prm_yn']],
  [12, ['GAP-LOGIN-002', 'MFA_REQUIRE_PROTECTED']],
  [13, ['GAP-CODE-001', 'procSe']],
  [14, ['GAP-WIRING-001', 'operation-consumer-census.json']],
  [15, ['GAP-UI-001', 'ServerSortWhitelist']],
  [16, ['GAP-COPY-001', 'frontend-visible-terms.json']],
  [17, ['GAP-UIQ-001', 'a3-1-form-container-census.json']],
  [18, ['GAP-UIF-001', 'ui-url-state-approval.json']],
  [19, ['DEC-OPS-431', 'GAP-PACK-001', '리다이렉트']],
  [20, ['DEC-OPS-382', 'ADR-0018', 'uatBaseDecisionHash']],
  [21, ['DEC-OPS-422', 'ADR-0060', 'JWT_SECRET']],
  [22, ['GAP-COMPOSE-001', 'ADR-0057', 'ADR-0062']],
  [23, ['GAP-MIG-001', 'UNVERIFIED']],
  [24, ['GAP-SEC-004', 'ADR-0019', 'TRUSTED_EDGE_PROXY']],
  [25, ['GAP-WIN-001', 'heavy-run-queue']],
];

function doNotBreakViolations(decisionsText) {
  const byNumber = new Map();
  for (const line of decisionsText.split(/\r?\n/)) {
    const match = line.match(/^(\d+)\.\s+(.+)$/u);
    if (match) byNumber.set(Number(match[1]), match[2]);
  }
  const violations = [];
  for (const [num, requiredTokens] of DO_NOT_BREAK_ITEMS) {
    const line = byNumber.get(num);
    if (!line) {
      violations.push(`do-not-break:${num}:missing`);
      continue;
    }
    for (const token of requiredTokens) {
      if (!line.includes(token)) {
        violations.push(`do-not-break:${num}:missing:${token}`);
      }
    }
  }
  return violations;
}

test('Do-Not-Break checklist in decisions.md promotes all 25 core unguarded rules (including H5 red proofs)', () => {
  const decisions = readRepoFile('.agent/memory/decisions.md');
  assert.deepEqual(doNotBreakViolations(decisions), []);

  const withoutRedirectRule = decisions.replace(/^(19\.\s+).*$/mu, '$1`DEC-OPS-431`: 빈 줄 대체');
  assert.ok(doNotBreakViolations(withoutRedirectRule).includes('do-not-break:19:missing:리다이렉트'));
  const droppedLast = decisions.replace(/^25\.\s+.*$/mu, '');
  assert.deepEqual(doNotBreakViolations(droppedLast), ['do-not-break:25:missing']);
});

test('project context covers every Gradle module and authoritative required checks', () => {
  const settings = readRepoFile('settings.gradle');
  const context = readRepoFile('.agent/memory/project-context.md');
  const modules = [...settings.matchAll(/^include\s+['"]([^'"]+)['"]/gm)].map((match) => match[1]);
  assert.ok(modules.length >= 5, 'settings.gradle module census가 비정상적으로 작습니다.');
  for (const module of modules) {
    assert.ok(context.includes(`\`${module}\``), `project-context에 ${module}이 없습니다.`);
  }

  const requiredChecks = JSON.parse(readRepoFile('.github/required-checks.json'));
  const requiredRow = context.split(/\r?\n/).find((line) => line.startsWith('| CTX-005 |')) ?? '';
  assert.match(requiredRow, new RegExp(`${requiredChecks.requiredChecks.length}개 required context`, 'u'));
  for (const { context: requiredContext } of requiredChecks.requiredChecks) {
    assert.ok(requiredRow.includes(`\`${requiredContext}\``), `CTX-005에 ${requiredContext}가 없습니다.`);
  }
  assert.doesNotMatch(requiredRow, /e2e-tests \([1-9]\/[1-9]\)/u, '내부 shard를 required context로 기록하면 안 됩니다.');

  const e2eMatrix = requiredChecks.requiredChecks.find(({ context: c }) => c === 'e2e-test')?.aggregate?.sourceMatrix;
  const ctx009 = context.split(/\r?\n/).find((line) => line.startsWith('| CTX-009 |')) ?? '';
  assert.ok(ctx009.includes(`${e2eMatrix.values.length}개 shard`), 'CTX-009에 E2E shard 수가 있어야 합니다.');
  for (const coord of e2eMatrix.values) {
    assert.ok(ctx009.includes(`\`${coord}\``), `CTX-009에 E2E shard 좌표 ${coord}가 없습니다.`);
  }
});

test('memory registries use unique IDs and allowed gap states (including synthetic duplicate red proof)', () => {
  const collectIds = (text) =>
    [...text.matchAll(/^\| ((?:CTX|DEC|GAP)-(?!ID\b)[A-Z0-9-]+) \|/gm)].map((match) => match[1]);
  const files = memoryFiles();
  const ids = collectIds(Object.values(files).join('\n'));
  assert.equal(ids.length, new Set(ids).size, `중복 memory ID가 있습니다: ${ids.join(', ')}`);

  assert.deepEqual(collectIds('| GAP-ID | 우선순위 |\n| GAP-ID | 우선순위 |'), []);
  const duplicated = collectIds('| GAP-X-001 | P1 |\n| GAP-X-001 | P2 |');
  assert.equal(duplicated.length, 2);
  assert.equal(new Set(duplicated).size, 1, '합성 중복이 잡히지 않으면 이 검사는 무력하다');

  const gapRows = files['known-gaps.md'].split(/\r?\n/).filter((line) => GAP_LINE.test(line));
  assert.ok(gapRows.length >= 10, '활성 gap 표가 비정상적으로 작습니다.');
  for (const row of gapRows) {
    const cells = markdownTableCells(row);
    assert.equal(cells.length, 9, `${cells[0]}: 활성 gap 행은 9열이어야 합니다.`);
    assert.match(cells[0], /^GAP-[A-Z0-9-]+$/);
    assert.match(cells[1], /^P[0-3]$/);
    assert.match(cells[2], GAP_STATES);
    assert.match(cells[5], /\]\([^)]*\)/, `${cells[0]}: 근거 링크가 필요합니다.`);
    assert.ok(cells[6].length >= 10, `${cells[0]}: 다음 행동/재개 조건이 필요합니다.`);
    assert.match(cells[8], /^\d{4}-\d{2}-\d{2}$/);
  }
});

// ─── 유용 검사 ①: 공개 저장소 비밀·개인경로 유입 차단 (+ H5 red 증명) ───────────────────────────────────────────

test('shared memory is public-repository safe and rejects injected secrets, paths, or removed boundaries', () => {
  const files = memoryFiles();
  assert.deepEqual(publicSafetyViolations(files), []);

  for (const file of Object.keys(documents)) {
    const relative = path.posix.join('.agent/memory', file);
    try {
      execFileSync('git', ['check-ignore', '--quiet', '--', relative], { cwd: repoRoot });
      assert.fail(`${relative}: .gitignore에 의해 무시되고 있습니다.`);
    } catch (error) {
      assert.notEqual(error?.code, 'ERR_ASSERTION', error?.message);
    }
  }

  const secretProbe = {
    ...files,
    'decisions.md': `${files['decisions.md']}\n| DEC-OPS-999 | accepted | api_key: "sk-live-probe" | 2026-11-26 | - |\n`,
  };
  assert.deepEqual(publicSafetyViolations(secretProbe), ['forbidden-public-pattern:hardcoded-secret']);

  const userPathProbe = { ...files, 'project-context.md': `${files['project-context.md']}\nC:\\Users\\alice\\secret\n` };
  assert.deepEqual(publicSafetyViolations(userPathProbe), ['forbidden-public-pattern:windows-user-path']);

  const missingSessionBoundary = Object.fromEntries(
    Object.entries(files).map(([k, v]) => [k, v.replaceAll('원시 세션', '대화 내용')]),
  );
  assert.ok(publicSafetyViolations(missingSessionBoundary).includes('missing-raw-session-boundary'));

  const missingClaimLockBoundary = Object.fromEntries(
    Object.entries(files).map(([k, v]) => [k, v.replaceAll('실시간', '상시')]),
  );
  assert.ok(publicSafetyViolations(missingClaimLockBoundary).includes('missing-no-realtime-claim-lock-boundary'));
});

// ─── 유용 검사 ②: 3개 에이전트 진입점·스킬 권위 동기화 (+ H5 red 증명) ──────────────────────────────────────────

const EXPECTED_ADAPTER_IMPORTS = {
  'GEMINI.md': ['@./AGENTS.md', '@./.agent/memory/project-context.md', '@./.agent/memory/decisions.md', '@./.agent/memory/known-gaps.md'],
  'CLAUDE.md': ['@AGENTS.md', '@.agent/memory/project-context.md', '@.agent/memory/decisions.md', '@.agent/memory/known-gaps.md'],
};

function entrypointSyncViolations(files) {
  const violations = [];
  for (const entrypoint of ['AGENTS.md', 'GEMINI.md', 'CLAUDE.md']) {
    const text = files[entrypoint] ?? '';
    for (const file of Object.keys(documents)) {
      if (!text.includes(file)) violations.push(`${entrypoint}:missing-link:${file}`);
    }
  }

  const agents = files['AGENTS.md'] ?? '';
  if (!/vendor-neutral 프로젝트 규칙 SSOT/u.test(agents)) violations.push('AGENTS.md:missing-ssot-header');
  if (!/Gemini.*Claude Code.*Codex/u.test(agents)) violations.push('AGENTS.md:missing-vendors');

  for (const [adapter, expected] of Object.entries(EXPECTED_ADAPTER_IMPORTS)) {
    const text = files[adapter] ?? '';
    if (!/@\.?\/?AGENTS\.md/u.test(text)) violations.push(`${adapter}:missing-agents-import`);
    if (!text.includes('](AGENTS.md#공유-워킹트리와-git)')) violations.push(`${adapter}:missing-git-authority-link`);
    if (text.split(/\r?\n/).length > 40) violations.push(`${adapter}:exceeds-40-lines`);
    if (/[A-Za-z]:[\\/]Users[\\/]/u.test(text)) violations.push(`${adapter}:hardcoded-windows-user-path`);
    const imports = text.split(/\r?\n/).filter((line) => line.startsWith('@'));
    if (imports.length !== expected.length || imports.some((line, index) => line !== expected[index])) {
      violations.push(`${adapter}:mismatch-import-set`);
    }
  }

  const docsIndex = files['docs/README.md'] ?? '';
  for (const file of Object.keys(documents)) {
    if (!docsIndex.includes(file)) violations.push(`docs/README.md:missing-link:${file}`);
  }
  return violations;
}

test('all agent entrypoints discover the same shared memory and stay thin (including H5 red proofs)', () => {
  const files = {
    'AGENTS.md': readRepoFile('AGENTS.md'),
    'GEMINI.md': readRepoFile('GEMINI.md'),
    'CLAUDE.md': readRepoFile('CLAUDE.md'),
    'docs/README.md': readRepoFile('docs/README.md'),
  };
  assert.deepEqual(entrypointSyncViolations(files), []);

  const missingGeminiImport = {
    ...files,
    'GEMINI.md': files['GEMINI.md'].replace('@./.agent/memory/known-gaps.md', ''),
  };
  assert.deepEqual(entrypointSyncViolations(missingGeminiImport), [
    'GEMINI.md:missing-link:known-gaps.md',
    'GEMINI.md:mismatch-import-set',
  ]);

  const bloatedClaude = {
    ...files,
    'CLAUDE.md': `${files['CLAUDE.md']}${'\n'.repeat(30)}`,
  };
  assert.deepEqual(entrypointSyncViolations(bloatedClaude), ['CLAUDE.md:exceeds-40-lines']);
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

const workflowSkills = [
  'verification-before-completion',
  'finishing-a-development-branch',
  'test-driven-development',
  'dispatching-parallel-agents',
  'subagent-driven-development',
  'executing-plans',
  'requesting-code-review',
  'writing-plans',
  'using-git-worktrees',
  'brainstorming',
  'verify-app',
  'ci-triage',
  'requirements-intake',
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
    ['verification-before-completion', '2. RUN: Execute the FULL command (fresh, complete)', 'unconditional full suite'],
    ['verification-before-completion', "If you haven't run the verification command in this message, you cannot claim it passes.", 'message-bound verification'],
    ['subagent-driven-development', 'Two-stage review after each task: spec compliance first, then code quality', 'mandatory two-stage review'],
    ['finishing-a-development-branch', 'Use Option 2, and merge only when the user asks.', 'repeated merge approval'],
    ['executing-plans', '**STOP executing immediately when:**', 'stop at first blocker'],
    ['brainstorming', '- Ask after each section whether it looks right so far', 'approval after every section'],
    ['requesting-code-review', 'prefer a model from a different vendor when one is installed — this machine has Codex (`codex exec`) and Antigravity (`agy -p`)', 'reviewer vendor fixed to one main agent'],
  ];
  for (const [skill, instruction, label] of regressions) {
    const mutated = { ...files, [skill]: `${files[skill]}\n${instruction}\n` };
    assert.deepEqual(workflowSkillViolations(mutated), [`${skill}: ${label}`]);
  }
  for (const skill of workflowSkills) {
    const mutated = { ...files, [skill]: files[skill].replaceAll('](../../../docs/03-guides/orchestration-protocol.md)', '') };
    assert.deepEqual(workflowSkillViolations(mutated), [`${skill}: missing orchestration authority`]);
  }
  const mutatedFinish = { ...files, 'finishing-a-development-branch': files['finishing-a-development-branch'].replace('](../../../AGENTS.md#공유-워킹트리와-git)', '') };
  assert.deepEqual(workflowSkillViolations(mutatedFinish), ['finishing-a-development-branch: missing branch-completion authority']);
  const mutatedReview = {
    ...files,
    'requesting-code-review': files['requesting-code-review'].replace('the model you — the main agent doing the work — run on', 'the model of this agent'),
  };
  assert.deepEqual(workflowSkillViolations(mutatedReview), ['requesting-code-review: missing main-agent-relative reviewer vendor']);
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

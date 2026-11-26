import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { OPERATIONAL_CONTRACTS_RUNNER } from './operational-contracts-runner.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  agents: 'AGENTS.md',
  protocol: 'docs/03-guides/orchestration-protocol.md',
  reviewSkill: '.agent/skills/requesting-code-review/SKILL.md',
  subagentSkill: '.agent/skills/subagent-driven-development/SKILL.md',
  parallelSkill: '.agent/skills/dispatching-parallel-agents/SKILL.md',
  constitution: '.agent/knowledge/backend-api-constitution/artifacts/constitution.md',
  constitutionMetadata: '.agent/knowledge/backend-api-constitution/metadata.json',
  lombokLinter: 'api-server/src/test/java/nuri/api/harness/EntityLombokSourceLinterTest.java',
  entityRules: 'business-core/src/testFixtures/java/nuri/business/architecture/EntityConventionRules.java',
  gotchas: '.agent/knowledge/lombok-superbuilder-shadowing/artifacts/gotchas.md',
  gotchasMetadata: '.agent/knowledge/lombok-superbuilder-shadowing/metadata.json',
  registry: 'config/governance/gates.json',
  rootPackage: 'package.json',
};

const expectedBackendGates = {
  'ARCH-BUSINESS-APP-ENTITY-CONVENTION': {
    gateSetId: 'GATESET-ARCHITECTURE',
    source: 'business-app/src/test/java/nuri/business/architecture/EntityConventionArchTest.java',
    tier: ['ci', 'local-full'],
    requiredCiContext: 'backend-build',
  },
  'ARCH-BUSINESS-CORE-ENTITY-CONVENTION': {
    gateSetId: 'GATESET-ARCHITECTURE',
    source: 'business-core/src/test/java/nuri/business/architecture/EntityConventionArchTest.java',
    tier: ['ci', 'local-full'],
    requiredCiContext: 'backend-build',
  },
  'GH-ENTITY-LOMBOK-SOURCE': {
    gateSetId: 'GATESET-GOVERNANCE-HARNESS',
    source: files.lombokLinter,
    tier: ['ci', 'local-full', 'pre-push'],
    requiredCiContext: 'backend-build',
  },
};

const expectedGotchaReferences = [
  '.agent/knowledge/backend-api-constitution/artifacts/constitution.md',
  files.lombokLinter,
  files.entityRules,
].sort();

const expectedConstitutionReferences = [
  'AGENTS.md',
  'api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java',
  'api-server/src/test/java/nuri/api/harness/EntityLombokSourceLinterTest.java',
  'api-server/src/test/java/nuri/openapi/OpenApiDocumentationTest.java',
  'business-core/src/main/java/nuri/business/security/config/SecurityConfig.java',
  'business-core/src/testFixtures/java/nuri/business/architecture/EntityConventionRules.java',
  'config/governance/gates.json',
  'config/governance/permission-catalog.json',
  'config/governance/authorization-policies.json',
  'docs/02-architecture/decisions/ADR-0011-retire-anonymous-satisfaction-password-proof.md',
  'docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md',
  'docs/02-architecture/domain-resilience.md',
  'docs/03-guides/api-documentation-guide.md',
  'docs/03-guides/identity-model-guide.md',
  'foundation/src/main/java/nuri/foundation/security/filter/CredentialRequestTargetFilter.java',
  'foundation/src/main/java/nuri/foundation/security/filter/CredentialRequestTargetPolicy.java',
].sort();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8').replaceAll('\r\n', '\n');
}

function activeMarkdown(source) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/gu, ' ');
  let inFence = false;
  return withoutComments
    .split('\n')
    .map((line) => {
      if (/^\s*(?:```|~~~)/u.test(line)) {
        inFence = !inFence;
        return '';
      }
      return inFence ? '' : line;
    })
    .join('\n');
}

function section(source, start, end) {
  const startAt = source.indexOf(start);
  if (startAt < 0) return '';
  const endAt = end ? source.indexOf(end, startAt + start.length) : -1;
  return source.slice(startAt, endAt < 0 ? source.length : endAt);
}

function count(source, value) {
  return source.split(value).length - 1;
}

function numberedItem(article, number) {
  const lines = article.split('\n');
  const starts = lines
    .map((line, index) => ({ index, match: line.match(/^(\d+)\.\s/u) }))
    .filter(({ match }) => match);
  const targets = starts.filter(({ match }) => Number.parseInt(match[1], 10) === number);
  if (targets.length !== 1) return { count: targets.length, text: '' };
  const startAt = targets[0].index;
  const next = starts.find(({ index }) => index > startAt);
  return { count: 1, text: lines.slice(startAt, next?.index ?? lines.length).join('\n') };
}

/**
 * SOP 3대 핵심 경계(① 포괄 승인 vs 개별 명시 승인 경계, ② 위임 산출물 메인 직접 재검증, ③ 3회 실패 중단 원칙)와
 * AGENTS.md 서술의 정합성을 검증한다.
 */
function protocolTruthErrors({ agents, protocol, reviewSkill, subagentSkill, parallelSkill }) {
  const errors = [];
  const activeAgents = activeMarkdown(agents);
  const activeProtocol = activeMarkdown(protocol);
  const hierarchy = section(activeAgents, '## 규칙 계층과 단일 원본', '## 작업 시작 시 필수 읽기');
  const agentPrinciples = section(activeAgents, '## 공통 작업 원칙', '## Evidence guardrails');
  const agentBatchBudget = section(activeAgents, '## 연속 작업의 시간 예산', '## 공유 워킹트리와 Git');
  const agentGitRules = section(activeAgents, '## 공유 워킹트리와 Git', '## Documentation and memory');

  const dispatch = section(activeProtocol, '### [Stage 1] Dispatch', '### [Stage 2] Execution');
  const audit = section(activeProtocol, '#### 2.3 Audit 귀속 원칙', '#### 2.4 실패 복구 프로토콜');
  const recovery = section(activeProtocol, '#### 2.4 실패 복구 프로토콜', '### [Stage 3] Audit');
  const stage3 = section(activeProtocol, '### [Stage 3] Audit', '### [Stage 4] Verification');
  const designBudget = section(activeProtocol, '## 7. 설계 검토 예산', '## 8. 전 생명주기 연결');
  const batchBudget = section(activeProtocol, '## 6. 연속 배치 작업의 시간 예산', '## 7. 설계 검토 예산');
  const worktreeSection = section(activeProtocol, '### 6.6 작업 트리', '## 7. 설계 검토 예산');

  // 계층·AGENTS 핵심 경계
  if (hierarchy.indexOf('2. 이 파일 `AGENTS.md`') < 0 || hierarchy.indexOf('3. [오케스트레이션 프로토콜](docs/03-guides/orchestration-protocol.md)') < 0) {
    errors.push('AGENTS rule hierarchy must place orchestration protocol directly below AGENTS.md');
  }
  if (!agentPrinciples.includes('대량 삭제, 운영/코어 데이터 DML, DB 스키마·인프라 변경, 외부 발행·전송, 강제 푸시는 사전 설명과 사용자 승인이 필요')) {
    errors.push('AGENTS must retain explicit individual approval for destructive/external safety boundary');
  }
  if (!agentPrinciples.includes('같은 원인으로 세 번 실패하면 중단하고 증거와 선택지를 보고')) {
    errors.push('AGENTS must retain three-same-cause failure stop boundary');
  }
  if (!agentBatchBudget.includes('H1~H5·red 증명 생략의 근거로 쓰지 않는다')
    || !agentBatchBudget.includes('(docs/03-guides/orchestration-protocol.md#6-연속-배치-작업의-시간-예산-batch-time-budget)')) {
    errors.push('AGENTS batch time budget must preserve H1~H5/red proofs and link protocol §6');
  }
  if (!agentGitRules.includes('커밋·푸시·머지는 사용자가 요청한 범위에서만 수행')
    || !agentGitRules.includes('동시에 작업하고 있으면 별도 작업 트리에서 작업한다([SOP §6.6](docs/03-guides/orchestration-protocol.md#66-작업-트리))')) {
    errors.push('AGENTS must retain user-scoped git authority and SOP §6.6 link');
  }

  // SOP 경계 ①: 포괄 승인 vs 개별 명시 승인
  if (!dispatch.includes('포괄 승인 vs 개별 명시 승인 경계')
    || !dispatch.includes('개별 명시 승인**을 받는다')
    || !dispatch.includes('Fast-Track·포괄 승인으로 우회할 수 없으며')) {
    errors.push('SOP Stage 1 must preserve batch approval vs explicit individual approval boundary');
  }
  if (!designBudget.includes('**시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다.**')) {
    errors.push('SOP §7 must keep prototype confirmation separate from schema, data, authorization, and rollout approval');
  }
  if (!designBudget.includes('인가·스키마·데이터·게이트 L2') || !designBudget.includes('H1·H2·H3·동시성 관점은 채택률로 줄이지 않는다')) {
    errors.push('SOP §7 must retain data/concurrency review scope alongside H1·H2·H3');
  }

  // SOP 경계 ②: 위임 산출물 메인 직접 재검증 + H1·H2·H3 L2 필수 독립 적대 검토 + Audit 리포트
  if (!audit.includes('완료 증거로 신뢰하지 않고') || !audit.includes('직접 검토하고 게이트(§4.1)를 직접 재실행')) {
    errors.push('SOP §2.3 must require direct main-agent re-verification of delegated outputs');
  }
  if (!audit.includes('H1·H2·H3 변경의 필수 독립 검토')
    || !audit.includes('H1(물리 스키마·식별자 축)·H2(게이트/신호·동결 기준선·거버넌스 경계)·H3(인증·인가·개인정보)에 해당하는 변경은 병합 전 1회 독립 적대 검토를 둔다')
    || !audit.includes('그 외 L2 변경의 타사 독립 검토는 위험에 따라 선택 적용한다')
    || !audit.includes('사용자 원문 요청과 diff')) {
    errors.push('SOP §2.3 must preserve H1·H2·H3 mandatory independent adversarial review');
  }
  if (agentPrinciples && !agentPrinciples.includes('H1(물리 스키마·식별자 축)·H2(게이트/신호·동결 기준선·거버넌스 경계)·H3(인증·인가·개인정보) 필수 검토')) {
    errors.push('AGENTS safety-boundary exception must reflect H1·H2·H3 independent review scope');
  }
  if (reviewSkill !== undefined && (!/Required:[\s\S]*H1\s*·\s*H2\s*·\s*H3/u.test(reviewSkill) || !reviewSkill.includes('DEC-OPS-436'))) {
    errors.push('requesting-code-review skill must limit mandatory independent review to H1·H2·H3');
  }
  if (subagentSkill !== undefined && (!subagentSkill.includes('H1(물리 스키마·식별자 축)·H2(게이트/신호·동결 기준선·거버넌스 경계)·H3(인증·인가·개인정보)') || !subagentSkill.includes('H1·H2·H3') || !subagentSkill.includes('DEC-OPS-436'))) {
    errors.push('subagent-driven-development skill must align mandatory independent review scope to H1·H2·H3');
  }
  if (parallelSkill !== undefined && !parallelSkill.includes('H1(물리 스키마·식별자 축)·H2(게이트/신호·동결 기준선·거버넌스 경계)·H3(인증·인가·개인정보)')) {
    errors.push('dispatching-parallel-agents skill must align mandatory H1·H2·H3 criteria');
  }
  if (!stage3.includes('## Audit 리포트(L2)')) {
    errors.push('SOP Stage 3 must preserve the PR ## Audit 리포트(L2) section requirement');
  }

  // SOP 경계 ③: 3회 실패 중단 원칙
  if (!recovery.includes('원인 가설 → 표적 증거 → 최소 수정 → 재검증')
    || !recovery.includes('총 3회 실패하면 직접 재시도를 즉시 중단하고')) {
    errors.push('SOP §2.4 must preserve the three-same-cause failure stop rule');
  }

  // 훅 비우회·겹친 무거운 실행 금지·고정 작업 트리 3대 운영자 분리
  if (!batchBudget.includes('--no-verify') || !batchBudget.includes('SKIP_HARNESS=1')) {
    errors.push('SOP §6.2 must forbid hook bypass outside explicit user instruction');
  }
  if (!batchBudget.includes('green이든 red든 증거로 쓰지 않고 단독 재실행')) {
    errors.push('SOP §6.3 must forbid using overlapped heavy runs as evidence');
  }
  const assignedTrees = [...worktreeSection.matchAll(/^\| (Codex|Claude Code|Antigravity\/Gemini) \| `([^`]+)` \|$/gmu)];
  const assignedPaths = assignedTrees.map((match) => match[2].replaceAll('\\', '/').replace(/\/+$/u, '').toLowerCase());
  if (assignedTrees.length !== 3 || new Set(assignedTrees.map((m) => m[1])).size !== 3 || new Set(assignedPaths).size !== 3) {
    errors.push('SOP §6.6 must assign each operator a distinct persistent worktree');
  }

  return errors;
}

function registryRuleEntries(registry) {
  const entries = [];
  for (const gateSet of registry.gateSets ?? []) {
    for (const rule of gateSet.rules ?? []) {
      entries.push({
        ...rule,
        gateSetId: gateSet.id,
        tier: [...(gateSet.tier ?? [])].sort(),
        requiredCiContext: gateSet.requiredCiContext,
      });
    }
  }
  return entries;
}

function findRegistryRule(registry, id) {
  for (const gateSet of registry.gateSets ?? []) {
    const rule = (gateSet.rules ?? []).find((candidate) => candidate.id === id);
    if (rule) return rule;
  }
  return undefined;
}

function forbiddenLombokAnnotations(source) {
  const match = source.match(/FORBIDDEN_CLASS_ANNOTATIONS\s*=\s*Set\.of\(([\s\S]*?)\);/u);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/gu)].map((entry) => entry[1]).sort();
}

function backendEnforcementErrors({
  constitution,
  constitutionMetadata,
  lombokLinter,
  entityRules,
  gotchas,
  gotchasMetadata,
  registry,
}) {
  const errors = [];
  const activeConstitution = activeMarkdown(constitution);
  const activeGotchas = activeMarkdown(gotchas);
  const articleHeading = '### 제5조 (도메인 캡슐화)';
  if (count(activeConstitution, articleHeading) !== 1) {
    errors.push('backend constitution must contain exactly one active article 5 heading');
  }
  const article = section(activeConstitution, articleHeading, '---');
  const clauseItem = numberedItem(article, 3);
  if (clauseItem.count !== 1) errors.push('backend constitution article 5 must contain exactly one item 3');
  const clause = clauseItem.text;
  const expectedIds = Object.keys(expectedBackendGates).sort();
  const links = [...clause.matchAll(/\[([A-Z][A-Z0-9-]+)\]\(([^)]+)\)/gu)]
    .map((match) => ({ id: match[1], target: match[2] }));
  const linkedIds = links.map(({ id }) => id).sort();
  if (JSON.stringify(linkedIds) !== JSON.stringify(expectedIds)) {
    errors.push(`backend constitution clause 5.3 gate links must be exact: ${expectedIds.join(', ')}`);
  }

  const registryEntries = registryRuleEntries(registry);
  for (const id of expectedIds) {
    const target = links.find((link) => link.id === id)?.target;
    const matches = registryEntries.filter((entry) => entry.id === id);
    if (matches.length !== 1) {
      errors.push(`${id} must resolve to exactly one registry source`);
      continue;
    }
    const expected = expectedBackendGates[id];
    const actual = matches[0];
    if (actual.source !== expected.source
        || actual.gateSetId !== expected.gateSetId
        || actual.requiredCiContext !== expected.requiredCiContext
        || JSON.stringify(actual.tier) !== JSON.stringify(expected.tier)) {
      errors.push(`${id} registry provenance or execution tier drifted`);
    }
    if (!fs.existsSync(path.join(repoRoot, actual.source))) {
      errors.push(`${id} registry source does not exist: ${actual.source}`);
    }
    if (!target) continue;
    const resolved = path.relative(
      repoRoot,
      path.resolve(path.dirname(path.join(repoRoot, files.constitution)), target.split('#')[0]),
    ).replaceAll('\\', '/');
    if (resolved !== expected.source) {
      errors.push(`${id} constitution link must resolve to ${expected.source}`);
    }
  }

  if (!/규칙\(b\)[^\n]*현재 기계 게이트가 완전히 증명하지 못하므로 코드리뷰와 실제 `build\(\)` 결과 단위 테스트로 보완/u.test(clause)) {
    errors.push('rule (b) must remain explicitly review-and-result-test only');
  }
  if (/Checkstyle/iu.test(clause)) errors.push('clause 5.3 must not claim nonexistent Checkstyle enforcement');

  if (count(lombokLinter, '백엔드 헌법 제5조 3항 (a)') !== 2
      || lombokLinter.includes('백엔드 헌법 제3조 3항')) {
    errors.push('EntityLombokSourceLinterTest must cite backend constitution clause 5.3(a) twice');
  }
  if (JSON.stringify(forbiddenLombokAnnotations(lombokLinter))
      !== JSON.stringify(['AllArgsConstructor', 'Builder', 'SuperBuilder'])) {
    errors.push('the SOURCE linter must freeze all three forbidden class-level Lombok annotations');
  }
  if (!entityRules.includes('규칙(a) 의 회귀 차단은 {@code EntityLombokSourceLinterTest}')) {
    errors.push('EntityConventionRules must point rule (a) to the SOURCE linter');
  }
  if (!entityRules.includes('규칙(b) 의 수동 빌더 위임 의미는 현재 코드리뷰로 보완')) {
    errors.push('EntityConventionRules must keep rule (b) review-only');
  }
  if (entityRules.includes('Checkstyle')) errors.push('EntityConventionRules must not claim Checkstyle enforcement');
  for (const fragment of [
    'entityNoArgConstructorMustNotBePublic',
    '.areAnnotatedWith(Entity.class)',
    'boolean satisfied = hasNoArg && !hasPublicNoArg',
  ]) {
    if (!entityRules.includes(fragment)) errors.push(`EntityConventionRules is missing: ${fragment}`);
  }

  const constitutionReferences = [...(constitutionMetadata.references ?? [])].sort();
  if (JSON.stringify(constitutionReferences) !== JSON.stringify(expectedConstitutionReferences)) {
    errors.push('backend constitution metadata reference set must match its current norm and gates');
  }
  for (const reference of constitutionReferences) {
    if (!fs.existsSync(path.join(repoRoot, reference))) {
      errors.push(`backend constitution metadata reference does not exist: ${reference}`);
    }
  }
  if (!activeGotchas.includes('`EntityLombokSourceLinterTest`')
      || !activeGotchas.includes('두 모듈의 `EntityConventionArchTest`')) {
    errors.push('the Lombok gotcha must name both current enforcement boundaries');
  }
  if (!activeGotchas.includes('허용된 method-level `@Builder`의 수동 builder 확장')
      || !activeGotchas.includes('Entity의 class-level 빌더를 허용하는 근거가 아니다')) {
    errors.push('the Lombok gotcha must align its allowed scope with backend constitution rule (b)');
  }
  if (!gotchasMetadata.summary?.includes('Lombok 수동 빌더 구현')
      || gotchasMetadata.summary?.includes('엔티티 상속 구조')) {
    errors.push('the Lombok gotcha metadata must describe the neutral manual-builder boundary');
  }
  const gotchaReferences = [...(gotchasMetadata.references ?? [])].sort();
  if (JSON.stringify(gotchaReferences) !== JSON.stringify(expectedGotchaReferences)) {
    errors.push('the Lombok gotcha metadata reference set must match its current norm and gates');
  }
  for (const reference of gotchaReferences) {
    if (!fs.existsSync(path.join(repoRoot, reference))) {
      errors.push(`Lombok gotcha metadata reference does not exist: ${reference}`);
    }
  }

  return errors;
}

const current = {
  agents: read(files.agents),
  protocol: read(files.protocol),
  reviewSkill: read(files.reviewSkill),
  subagentSkill: read(files.subagentSkill),
  parallelSkill: read(files.parallelSkill),
  constitution: read(files.constitution),
  constitutionMetadata: JSON.parse(read(files.constitutionMetadata)),
  lombokLinter: read(files.lombokLinter),
  entityRules: read(files.entityRules),
  gotchas: read(files.gotchas),
  gotchasMetadata: JSON.parse(read(files.gotchasMetadata)),
  registry: JSON.parse(read(files.registry)),
};

test('orchestration core boundaries match AGENTS.md and SOP', () => {
  assert.deepEqual(protocolTruthErrors(current), []);
});

test('SOP 3 core boundary regressions become red without mutating repository files', () => {
  const mutants = [
    { ...current, agents: current.agents.replace('같은 원인으로 세 번 실패하면 중단하고 증거와 선택지를 보고한다.', '같은 원인으로 네 번 실패하면 중단한다.') },
    { ...current, protocol: current.protocol.replace('Fast-Track·포괄 승인으로 우회할 수 없으며', 'L0 Fast-Track으로 우회할 수 있으며') },
    { ...current, protocol: current.protocol.replace('**시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다.**', '**시안 확인은 스키마 승인을 겸한다.**') },
    { ...current, protocol: current.protocol.replace('직접 검토하고 게이트(§4.1)를 직접 재실행', '위임 보고만 신뢰하고 완료') },
    { ...current, protocol: current.protocol.replace('병합 전 1회 독립 적대 검토를 둔다', '병합 전 1회 독립 적대 검토를 둘 수 있다') },
    { ...current, protocol: current.protocol.replace('H1·H2·H3 변경의 필수 독립 검토', 'H1·H2·H3 변경의 선택 독립 검토') },
    { ...current, protocol: current.protocol.replace('인가·스키마·데이터·게이트 L2', '인가·스키마·게이트 L2') },
    { ...current, protocol: current.protocol.replace('H1·H2·H3·동시성 관점은', 'H1·H2·H3 관점은') },
    { ...current, agents: current.agents.replace('H1(물리 스키마·식별자 축)·H2(게이트/신호·동결 기준선·거버넌스 경계)·H3(인증·인가·개인정보) 필수 검토', 'L2 전체 필수 검토') },
    { ...current, reviewSkill: current.reviewSkill.replace('H1 · H2 · H3', 'trivial CSS changes') },
    { ...current, subagentSkill: current.subagentSkill.replace('H1(물리 스키마·식별자 축)·H2(게이트/신호·동결 기준선·거버넌스 경계)·H3(인증·인가·개인정보)', 'trivial CSS changes') },
    { ...current, parallelSkill: current.parallelSkill.replace('H1(물리 스키마·식별자 축)·H2(게이트/신호·동결 기준선·거버넌스 경계)·H3(인증·인가·개인정보)', 'trivial CSS changes') },
    { ...current, protocol: current.protocol.replace('총 3회 실패하면 직접 재시도를 즉시 중단하고', '총 5회 실패하면 중단하고') },
    { ...current, protocol: current.protocol.replace('green이든 red든 증거로 쓰지 않고 단독 재실행', 'red일 때만 단독으로 다시 확인') },
  ];
  for (const mutant of mutants) {
    assert.notDeepEqual(protocolTruthErrors(mutant), []);
  }
});

test('DEC-OPS-414 the guard that SOP §6.6 names asks before every git worktree add', async () => {
  const { RULES } = await import('./agent-guard.mjs');
  const rule = RULES.find(({ id }) => id === 'git-worktree-add');
  assert.ok(rule, 'SOP §6.6 이 말하는 가드 규칙이 규칙 표에 있다');
  assert.equal(rule.decision, 'ask', '임시 트리는 막지 않고 사용자 승인을 받는다');
  assert.match(rule.fix, /SOP §6\.6/u);
});

test('persistent worktree assignments require distinct operators and paths without freezing locations', () => {
  const worktreeSection = section(current.protocol, '### 6.6 작업 트리', '## 7. 설계 검토 예산');
  const rows = [...worktreeSection.matchAll(/^\| (Codex|Claude Code|Antigravity\/Gemini) \| `([^`]+)` \|$/gmu)];
  assert.equal(rows.length, 3);
  const relocated = rows.reduce((protocol, row, index) => protocol.replace(row[0], `| ${row[1]} | \`E:\\wt-project-operator-${index}\` |`), current.protocol);
  assert.deepEqual(protocolTruthErrors({ ...current, protocol: relocated }), []);

  const mutants = [
    current.protocol.replace(rows[0][0], ''),
    current.protocol.replace(rows[0][0], `| ${rows[1][1]} | \`${rows[0][2]}\` |`),
  ];
  for (const protocol of mutants) {
    assert.ok(protocolTruthErrors({ ...current, protocol }).some((error) => error.includes('distinct persistent worktree')));
  }
});

test('backend constitution enforcement links resolve to exact registered source gates', () => {
  assert.deepEqual(backendEnforcementErrors(current), []);
});

test('backend enforcement provenance and capability regressions become red', () => {
  const wrongClauseId = {
    ...current,
    constitution: current.constitution.replace('GH-ENTITY-LOMBOK-SOURCE', 'GH-GHOST-LOMBOK-SOURCE'),
  };
  const sameBasenameWrongModule = {
    ...current,
    constitution: current.constitution.replace(
      '../../../../business-core/src/test/java/nuri/business/architecture/EntityConventionArchTest.java',
      '../../../../business-app/src/test/java/nuri/business/architecture/EntityConventionArchTest.java',
    ),
  };
  const wrongRegistry = structuredClone(current.registry);
  const registeredLinter = findRegistryRule(wrongRegistry, 'GH-ENTITY-LOMBOK-SOURCE');
  assert.ok(registeredLinter);
  registeredLinter.source = 'api-server/src/test/java/nuri/api/harness/GhostLinterTest.java';
  const mutants = [
    wrongClauseId,
    sameBasenameWrongModule,
    { ...current, registry: wrongRegistry },
    { ...current, constitution: current.constitution.replace('3. **엔티티 빌더·생성자 규범', '1. **엔티티 빌더·생성자 규범') },
    { ...current, lombokLinter: current.lombokLinter.replace(', "SuperBuilder"', '') },
    { ...current, gotchasMetadata: { ...current.gotchasMetadata, summary: '엔티티 상속 구조의 빌더 확장 표준 패턴' } },
  ];
  for (const mutant of mutants) {
    assert.notDeepEqual(backendEnforcementErrors(mutant), []);
  }
});

test('the required operational runner includes this contract through the full scripts catalog', () => {
  const rootPackage = JSON.parse(read(files.rootPackage));
  assert.equal(rootPackage.scripts?.['test:operational-contracts'], OPERATIONAL_CONTRACTS_RUNNER);
  const operational = current.registry.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  assert.ok(operational);
  assert.ok(operational.selector.catalogs.some(({ root, suffixes, recursive }) => (
    root === 'scripts' && suffixes.includes('.test.mjs') && recursive === false
  )));
  assert.equal(operational.requiredCiContext, 'secret-scan');
});

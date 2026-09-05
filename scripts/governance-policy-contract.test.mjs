import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  agents: 'AGENTS.md',
  protocol: 'docs/03-guides/orchestration-protocol.md',
  atlas: 'frontend/public/governance_harness_atlas.html',
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
  'api-server/src/test/java/nuri/api/harness/EntityLombokSourceLinterTest.java',
  'business-core/src/testFixtures/java/nuri/business/architecture/EntityConventionRules.java',
  'config/governance/gates.json',
  'docs/02-architecture/domain-resilience.md',
  'docs/03-guides/api-documentation-guide.md',
  'docs/03-guides/identity-model-guide.md',
].sort();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8').replaceAll('\r\n', '\n');
}

function activeMarkdown(source) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/gu, '');
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

function activeHtml(source) {
  return source
    .replace(/<!--[\s\S]*?-->/gu, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, '');
}

function htmlText(source) {
  return source
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&amp;/gu, '&')
    .replace(/\s+/gu, ' ')
    .trim();
}

function atlasGradeRow(source, grade) {
  const active = activeHtml(source);
  const rows = [...active.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)]
    .map((match) => match[1])
    .filter((row) => new RegExp(`\\b${grade} \\(`, 'u').test(row));
  if (rows.length !== 1 || /<(?:script|style)\b|\bhidden\b|display\s*:\s*none/iu.test(rows[0])) return '';
  return htmlText(rows[0]);
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

function protocolTruthErrors({ agents, protocol, atlas }) {
  const errors = [];
  const activeAgents = activeMarkdown(agents);
  const activeProtocol = activeMarkdown(protocol);
  const hierarchy = section(activeAgents, '## 규칙 계층과 단일 원본', '## 작업 시작 시 필수 읽기');
  const agentPrinciples = section(activeAgents, '## 공통 작업 원칙', '## Evidence guardrails');
  const agentGitRules = section(activeAgents, '## 공유 워킹트리와 Git', '## Documentation and memory');
  const grading = section(activeProtocol, '## 2. 태스크 등급 분류', '## 3. 오케스트레이션 파이프라인');
  const dispatch = section(activeProtocol, '### [Stage 1] Dispatch', '### [Stage 2] Execution');
  const recovery = section(activeProtocol, '#### 2.4 실패 복구 프로토콜', '### [Stage 3] Audit');
  const violationResponse = section(activeProtocol, '#### 3.4 위반 대응', '#### 3.5 레거시 코드 정화 지침');
  const taskSpecification = section(activeProtocol, '## 4. 표준 위임 명세서', '## 5. 운영 원칙');
  const operatingPrinciples = section(activeProtocol, '## 5. 운영 원칙');

  const agentsEntry = hierarchy.indexOf('2. 이 파일 `AGENTS.md`');
  const protocolEntry = hierarchy.indexOf('3. [오케스트레이션 프로토콜](docs/03-guides/orchestration-protocol.md)');
  if (agentsEntry < 0 || protocolEntry <= agentsEntry) {
    errors.push('AGENTS rule hierarchy must place the orchestration protocol directly below AGENTS.md');
  }
  if (!activeAgents.includes('3. 변경 작업은 오케스트레이션 프로토콜에서 등급과 승인 경계를 확인')) {
    errors.push('AGENTS must scope orchestration grading to change work');
  }
  const agentFailureLimit = agentPrinciples.match(/같은 원인으로 (세|\d+) 번 실패하면 중단하고 증거와 선택지를 보고/u);
  const expectedFailureLimit = agentFailureLimit?.[1] === '세'
    ? 3
    : Number.parseInt(agentFailureLimit?.[1] ?? '', 10);
  if (expectedFailureLimit !== 3) {
    errors.push('AGENTS must retain its three-same-cause failure boundary');
  }
  if (!agentPrinciples.includes('대량 삭제, 운영/코어 데이터 DML, DB 스키마·인프라 변경, 외부 발행·전송, 강제 푸시는 사전 설명과 사용자 승인이 필요')) {
    errors.push('AGENTS must retain explicit approval for its destructive and external safety boundary');
  }
  if (!agentGitRules.includes('커밋·푸시·머지는 사용자가 요청한 범위에서만 수행')) {
    errors.push('AGENTS must retain user-scoped commit, push, and merge authority');
  }

  if (!grading.includes('**변경 작업**') || !grading.includes('답변·설명·읽기 전용 감사·상태 보고')) {
    errors.push('protocol grading must exclude answers, explanations, read-only audits, and status reports');
  }
  if (/모든 요청/u.test(grading)) errors.push('protocol grading must not claim every request');
  if (!grading.includes('**모든 변경 작업에서 판정·명시**')) {
    errors.push('protocol grading disclosure must be scoped to change work');
  }

  if (!dispatch.includes('현재 사용자 요청 또는 유효한 포괄 승인에 그 변경 권한이 이미 포함되면')) {
    errors.push('dispatch must accept authority already granted by the current request or standing approval');
  }
  if (!dispatch.includes('분석·진단 요청은 수정 권한으로 간주하지 않는다')) {
    errors.push('dispatch must keep analysis authority separate from mutation authority');
  }
  if (!dispatch.includes('정확한 대상과 영향을 이미 명시 승인했다면 그 승인으로 충분')) {
    errors.push('dispatch must not ask twice for an exactly approved safety-boundary action');
  }
  if (!dispatch.includes('[AGENTS.md의 안전 경계](../../AGENTS.md#공통-작업-원칙)')) {
    errors.push('standing approval must delegate its safety boundary to AGENTS.md');
  }
  if (!dispatch.includes('포괄 승인만으로 수행하지 않고 **개별 명시 승인**을 받는다')) {
    errors.push('standing approval alone must not authorize AGENTS safety-boundary actions');
  }
  if (!dispatch.includes('범위를 벗어난 새 대상·새 동작에만 추가 승인을 받는다')) {
    errors.push('dispatch must require fresh approval when target or action expands');
  }
  if (!dispatch.includes('안전 경계](../../AGENTS.md#공통-작업-원칙)에 해당하는 작업은 L0로 분류하거나 Fast-Track으로 우회할 수 없다')) {
    errors.push('L0 Fast-Track must not bypass the AGENTS safety boundary');
  }

  if (!recovery.includes('같은 원인 가설별로 최초 실패를 포함해')) {
    errors.push('failure counting must include the original failure for each root-cause hypothesis');
  }
  if (!recovery.includes('원인 가설 → 표적 증거 → 최소 수정 → 재검증')) {
    errors.push('failure recovery must preserve the AGENTS diagnostic sequence');
  }
  if (!recovery.includes('같은 원인으로 총 3회 실패하면 직접 재시도하지 않고')) {
    errors.push('failure recovery must stop direct retries after three same-cause failures');
  }
  const protocolFailureLimit = recovery.match(/같은 원인으로 총 (\d+)회 실패하면 직접 재시도하지 않고/u);
  if (Number.parseInt(protocolFailureLimit?.[1] ?? '', 10) !== expectedFailureLimit) {
    errors.push('protocol and AGENTS must use the same same-cause failure limit');
  }
  if (/재시도 초과[^\n]*직접 수정하거나/u.test(recovery)) {
    errors.push('retry exhaustion must not allow a fourth direct attempt for the same cause');
  }
  if (!violationResponse.includes('승인 범위 안의 명백한 구현 위반 수정은 재승인 없이 수행')) {
    errors.push('in-scope implementation violations must not require redundant approval');
  }
  if (!taskSpecification.includes('변경 작업 시작 시') || /모든 작업 시작 시/u.test(taskSpecification)) {
    errors.push('the task specification template must apply only to change work');
  }
  if (!operatingPrinciples.includes('같은 원인으로 최초 실패 포함 3회 실패하거나 새 권한·사용자 결정이 필요할 때')) {
    errors.push('operating principles must use the same three-failure or new-authority stop boundary');
  }
  if (/예상치 못한 (?:에러|오류)[^\n]*즉시 중단/u.test(operatingPrinciples)) {
    errors.push('one unexpected error must not force an immediate user round-trip');
  }

  const atlasL0 = atlasGradeRow(atlas, 'L0');
  const atlasL1 = atlasGradeRow(atlas, 'L1');
  const atlasL2 = atlasGradeRow(atlas, 'L2');
  if (!atlasL0.includes('AGENTS 안전 경계에는 Fast-Track 금지')) {
    errors.push('Atlas must not present L0 as a safety-boundary bypass');
  }
  if (!atlasL1.includes('현재 요청·포괄 승인에 변경 권한이 있으면 재승인 없이 실행')) {
    errors.push('Atlas must show the current-request approval rule');
  }
  if (!atlasL2.includes('정확한 대상·영향을 현재 요청에서 명시 승인해야 실행')) {
    errors.push('Atlas must preserve explicit approval for safety-boundary work');
  }
  if (!htmlText(activeHtml(atlas)).includes('같은 원인으로 세 번 실패하면 증거와 선택지를 보고')) {
    errors.push('Atlas must show the three-failure boundary');
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
  atlas: read(files.atlas),
  constitution: read(files.constitution),
  constitutionMetadata: JSON.parse(read(files.constitutionMetadata)),
  lombokLinter: read(files.lombokLinter),
  entityRules: read(files.entityRules),
  gotchas: read(files.gotchas),
  gotchasMetadata: JSON.parse(read(files.gotchasMetadata)),
  registry: JSON.parse(read(files.registry)),
};

test('orchestration scope, approval reuse, and failure recovery match AGENTS.md', () => {
  assert.deepEqual(protocolTruthErrors(current), []);
});

test('protocol regressions become red without mutating repository files', () => {
  const mutants = [
    { ...current, agents: current.agents.replace(
      '같은 원인으로 세 번 실패하면 중단하고 증거와 선택지를 보고한다.',
      '같은 원인으로 네 번 실패하면 중단하고 증거와 선택지를 보고한다.',
    ) },
    { ...current, agents: current.agents.replace(
      '강제 푸시는 사전 설명과 사용자 승인이 필요하다.',
      '강제 푸시는 포괄 승인만으로 수행할 수 있다.',
    ) },
    { ...current, agents: current.agents.replace(
      '커밋·푸시·머지는 사용자가 요청한 범위에서만 수행한다.',
      '커밋·푸시·머지는 에이전트가 필요하다고 판단하면 수행한다.',
    ) },
    { ...current, protocol: current.protocol.replace('**모든 변경 작업에서 판정·명시**', '**모든 요청에서 판정·명시**') },
    { ...current, protocol: current.protocol.replace(
      '현재 사용자 요청 또는 유효한 포괄 승인에 그 변경 권한이 이미 포함되면',
      '현재 사용자 요청 또는 유효한 포괄 승인에 그 변경 권한이 이미 포함되어도 다시 승인받은 뒤',
    ) },
    { ...current, protocol: current.protocol.replace(
      '같은 원인으로 총 3회 실패하면 직접 재시도하지 않고',
      '같은 원인으로 총 4회 실패하면 직접 재시도하지 않고',
    ) },
    { ...current, protocol: current.protocol.replace(
      '승인 범위 안의 명백한 구현 위반 수정은 재승인 없이 수행한다.',
      '승인 범위 안의 명백한 구현 위반 수정도 재승인 후 수행한다.',
    ) },
    { ...current, protocol: current.protocol.replace(
      '포괄 승인만으로 수행하지 않고 **개별 명시 승인**을 받는다.',
      '포괄 승인만으로 수행하며 개별 승인은 받지 않는다.',
    ) },
    { ...current, protocol: current.protocol.replace(
      '범위를 벗어난 새 대상·새 동작에만 추가 승인을 받는다.',
      '범위를 벗어난 새 대상·새 동작도 추가 승인 없이 수행한다.',
    ) },
    { ...current, protocol: current.protocol.replace(
      '안전 경계](../../AGENTS.md#공통-작업-원칙)에 해당하는 작업은 L0로 분류하거나 Fast-Track으로 우회할 수 없다.',
      '안전 경계](../../AGENTS.md#공통-작업-원칙)에 해당해도 L0 Fast-Track으로 수행할 수 있다.',
    ) },
    { ...current, protocol: `${current.protocol}\n- 예상치 못한 오류 발생 시 즉시 중단한다.\n` },
    { ...current, atlas: current.atlas.replace(
      '별도 승인 없이 실행 가능하되 AGENTS 안전 경계에는 Fast-Track 금지',
      '안전 경계도 별도 승인 없이 Fast-Track 실행',
    ) },
    { ...current, atlas: current.atlas.replace(
      '현재 요청·포괄 승인에 변경 권한이 있으면 재승인 없이 실행',
      'L1은 언제나 다시 승인받은 뒤 실행',
    ) },
    { ...current, atlas: current.atlas.replace(
      '정확한 대상·영향을 현재 요청에서 명시 승인해야 실행',
      '포괄 승인만으로 즉시 실행',
    ) },
    { ...current, atlas: current.atlas.replace(
      '같은 원인으로 세 번 실패하면 증거와 선택지를 보고합니다.',
      '<script>const decoy = "같은 원인으로 세 번 실패하면 증거와 선택지를 보고합니다.";</script>',
    ) },
  ];
  for (const mutant of mutants) {
    assert.ok(
      mutant.protocol !== current.protocol || mutant.agents !== current.agents || mutant.atlas !== current.atlas,
      'synthetic protocol mutant must change at least one governed source',
    );
    assert.notDeepEqual(protocolTruthErrors(mutant), []);
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
  const coordinatedGhostRegistry = structuredClone(current.registry);
  const coordinatedGhostRule = findRegistryRule(coordinatedGhostRegistry, 'GH-ENTITY-LOMBOK-SOURCE');
  assert.ok(coordinatedGhostRule);
  coordinatedGhostRule.source = 'api-server/src/test/java/nuri/api/harness/GhostLinterTest.java';
  const coordinatedGhost = {
    ...current,
    constitution: current.constitution.replace(
      '../../../../api-server/src/test/java/nuri/api/harness/EntityLombokSourceLinterTest.java',
      '../../../../api-server/src/test/java/nuri/api/harness/GhostLinterTest.java',
    ),
    registry: coordinatedGhostRegistry,
  };
  const mutants = [
    wrongClauseId,
    sameBasenameWrongModule,
    { ...current, registry: wrongRegistry },
    coordinatedGhost,
    { ...current, constitution: current.constitution.replace(
      '3. **엔티티 빌더·생성자 규범',
      '1. **엔티티 빌더·생성자 규범',
    ) },
    { ...current, constitution: current.constitution.replace(
      '코드리뷰와 실제 `build()` 결과 단위 테스트로 보완한다.',
      'Checkstyle로 보완한다.',
    ) },
    { ...current, lombokLinter: current.lombokLinter.replaceAll('제5조 3항', '제3조 3항') },
    { ...current, lombokLinter: current.lombokLinter.replace(', "SuperBuilder"', '') },
    { ...current, entityRules: current.entityRules.replace(
      '규칙(b) 의 수동 빌더 위임 의미는 현재 코드리뷰로 보완한다.',
      '규칙(b) 의 수동 빌더 위임 의미는 Checkstyle로 보완한다.',
    ) },
    { ...current, gotchas: current.gotchas.replace(
      '허용된 method-level `@Builder`의 수동 builder 확장, 비-Entity 상속 DTO 또는 기존 호환 코드에 적용하며 Entity의 class-level 빌더를 허용하는 근거가 아니다.',
      '비-Entity 상속 DTO 또는 기존 호환 코드에만 적용한다.',
    ) },
    { ...current, gotchas: current.gotchas.replace(
      '허용된 method-level `@Builder`의 수동 builder 확장, 비-Entity 상속 DTO 또는 기존 호환 코드에 적용하며 Entity의 class-level 빌더를 허용하는 근거가 아니다.',
      '비-Entity 상속 DTO 또는 기존 호환 코드에만 적용한다.',
    ) + "\n<!-- 허용된 method-level `@Builder`의 수동 builder 확장, Entity의 class-level 빌더를 허용하는 근거가 아니다 -->\n" },
    { ...current, gotchasMetadata: { ...current.gotchasMetadata, summary: '엔티티 상속 구조의 빌더 확장 표준 패턴' } },
    { ...current, gotchasMetadata: { ...current.gotchasMetadata, references: [] } },
    { ...current, constitutionMetadata: {
      ...current.constitutionMetadata,
      references: [...current.constitutionMetadata.references, 'business-suite/src/main/java/ghost/Entity.java'],
    } },
  ];
  for (const mutant of mutants) {
    assert.notDeepEqual(backendEnforcementErrors(mutant), []);
  }
});

test('the required operational runner includes this contract through the full scripts catalog', () => {
  const rootPackage = JSON.parse(read(files.rootPackage));
  assert.equal(
    rootPackage.scripts?.['test:operational-contracts'],
    'node --test "scripts/*.test.mjs" ".agent/scripts/*.test.js"',
  );
  const operational = current.registry.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  assert.ok(operational);
  assert.ok(operational.selector.catalogs.some(({ root, suffixes, recursive }) => (
    root === 'scripts' && suffixes.includes('.test.mjs') && recursive === false
  )));
  assert.equal(operational.requiredCiContext, 'secret-scan');
});

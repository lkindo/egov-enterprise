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

function activeHtml(source) {
  return source
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, ' ');
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

  // [2026-09-27 DEC-OPS-177] 연속 작업의 시간 예산 — 반복만 줄이고 안전 문장은 지운 채 남지 않게 고정한다.
  const agentBatchBudget = section(activeAgents, '## 연속 작업의 시간 예산', '## 공유 워킹트리와 Git');
  const protocolBatchBudget = section(activeProtocol, '## 6. 연속 배치 작업의 시간 예산');
  if (!agentBatchBudget.includes('H1~H5·red 증명 생략의 근거로 쓰지 않는다')) {
    errors.push('AGENTS batch time budget must not license hook bypass, skipped verification, or skipped red proofs');
  }
  if (!agentBatchBudget.includes('(docs/03-guides/orchestration-protocol.md#6-연속-배치-작업의-시간-예산-batch-time-budget)')) {
    errors.push('AGENTS batch time budget must delegate its procedure to protocol §6');
  }
  if (!protocolBatchBudget.includes('훅을 우회하지 않는다(`--no-verify`, `SKIP_HARNESS=1` 포함)')) {
    errors.push('protocol §6 must keep local hooks mandatory, including the harness skip switch');
  }
  if (!protocolBatchBudget.includes('예외는 사용자가 그 우회를 명시적으로 지시한 경우뿐')) {
    errors.push('protocol §6.2 must limit hook bypass to an explicit user instruction');
  }
  if (!protocolBatchBudget.includes('위임 산출물에 대한 메인 에이전트의 독립 재검증(§2.3)')) {
    errors.push('protocol §6 must keep delegated-output re-verification outside the duplicate rule');
  }
  if (!protocolBatchBudget.includes('required CI가 같은 범위를 돈다는 사실은 생략 사유가 아니다')) {
    errors.push('protocol §6 must not let required CI coverage justify skipping local checks');
  }
  if (!protocolBatchBudget.includes('**push 전에** 끝 PR의 base를 `main`으로 바꾼다')) {
    errors.push('protocol §6 must retarget a stacked PR to main before pushing the merged head');
  }
  if (!protocolBatchBudget.includes('green이든 red든 그 커밋의 증거로 쓰지 않는다')) {
    errors.push('protocol §6 must reject overlapped heavy runs as evidence either way');
  }
  // [2026-10-26 DEC-OPS-385] 문서 전용 변경의 넓은 경로를 작업 중 최소 검사로 읽거나, 병렬 에이전트와 겹친 무거운 검증을 허용하지 않는다.
  if (!protocolBatchBudget.includes('병렬 에이전트·워크플로(읽기 전용 검토 포함)가 도는 동안에는 메인도 무거운 검증을 시작하지 않는다')) {
    errors.push('protocol §6.3 must keep the main agent from overlapping heavy runs with parallel agents');
  }
  if (!activeProtocol.includes('문서 전용 변경의 **넓은** 경로다 — 작업 중 최소 검사가 아니다')) {
    errors.push('protocol must not present verify:docs as the minimum check during work');
  }
  // [2026-10-26 DEC-OPS-385] 공유 워킹트리: 섞인 경로는 --only 로 커밋하지 않고, 동시 작업은 작업 트리로 떼며, 잠금은 두지 않는다.
  // [2026-10-26 DEC-OPS-385] 영역 색인으로 옮긴 ADR 행은 경로 라우팅만으로는 닿지 않는다 — 제목으로 읽는 의무를 규범에 둔다.
  if (!activeAgents.includes('Accepted ADR 은 [decisions.md](.agent/memory/decisions.md)의 영역별 ID·제목 목록에서 작업과 닿는 것을 영역과 상관없이 읽는다')) {
    errors.push('AGENTS must make agents read Accepted ADRs whose titles touch the task, whatever their area');
  }
  if (!agentGitRules.includes('그 경로에 다른 작업의 변경이 섞여 있으면 `--only`도 파일 전체를 담으므로 커밋하지 않고 멈춰 섞인 경로와 선택지를 보고한다')) {
    errors.push('AGENTS must stop instead of committing a path that also holds another task\'s changes');
  }
  if (!agentGitRules.includes('동시에 작업하고 있으면 별도 작업 트리에서 작업한다([SOP §6.6](docs/03-guides/orchestration-protocol.md#66-작업-트리))')) {
    errors.push('AGENTS must send concurrent work to a separate worktree via protocol §6.6');
  }
  // [2026-10-26 DEC-OPS-385] 의미를 바꾸는 변경의 검토자는 재진술보다 사용자 원문과 diff 를 먼저 받고, 그 관점은 채택률로 줄이지 않는다.
  const audit = section(activeProtocol, '#### 2.3 Audit 귀속 원칙', '#### 2.4 실패 복구 프로토콜');
  if (!audit.includes('병합 전에 독립 적대 검토를 한 번 둔다') || !audit.includes('보다 먼저 **사용자 원문 요청(그대로 인용)과 diff** 를 주고')) {
    errors.push('protocol §2.3 must keep one pre-merge independent review that reads the user request and diff before the restatement');
  }
  // §7 의 설계 검토는 구현 전 재진술을 본다 — 설계를 검토했다는 이유로 구현 diff 검토를 면제하지 않는다.
  if (!audit.includes('§7 의 설계 검토는 구현 전의 재진술을 보므로 구현 diff 에 대한 이 검토를 대신하지 않는다')
    || /(?:설계 문서|§7)[^\n]{0,120}이를 대신한다/u.test(audit)) {
    errors.push('protocol §2.3 must not let a design review replace the pre-merge review of the diff');
  }
  // [2026-10-27 DEC-OPS-387] 다른 회사 모델은 메인 에이전트 기준이고 모델로 가린다 — `agy` 는 Claude 모델도 내준다.
  if (!audit.includes('메인 에이전트와 다른 회사의 모델로 두고 모델을 명시한다') || !audit.includes('회사는 실행 CLI 가 아니라 모델로 가린다')) {
    errors.push('protocol §2.3 must pick the other-vendor reviewer relative to the main agent, by model');
  }
  if (!activeProtocol.includes('식별자 축, 동시성·잠금, 게이트 의미를 보는 관점은 채택률로 줄이지 않는다')) {
    errors.push('protocol §7.4 must not let adoption rates retire high-severity review lenses');
  }
  const worktreeSection = section(activeProtocol, '### 6.6 작업 트리', '## 7. 설계 검토 예산');
  if (!worktreeSection.includes('실행 잠금은 두지 않는다')) {
    errors.push('protocol §6.6 must keep the no-lock boundary');
  }
  if (!worktreeSection.includes('상대 경로 `.githooks`')) {
    errors.push('protocol §6.6 must keep the relative hooks path');
  }
  if (!worktreeSection.includes('직접 만들지 않은 작업 트리는') || !worktreeSection.includes('지우기 전에 묻는다')) {
    errors.push('protocol §6.6 must ask before deleting a worktree it did not create');
  }

  // [2026-10-31 DEC-OPS-395] 고정 트리는 재사용하되 동시에 쓰거나 남은 작업을 지워 비우지 않는다.
  if (!agentGitRules.includes('변경 작업은 시작 경로와 관계없이 [SOP §6.6의 도구별 고정 작업 트리]')
    || !agentGitRules.includes('기존 세션의 진행 중인 작업은 자동으로 옮기거나 브랜치를 바꾸지 않는다')) {
    errors.push('AGENTS must prefer persistent worktrees without relocating existing work');
  }
  const assignedTrees = [...worktreeSection.matchAll(/^\| (Codex|Claude Code|Antigravity\/Gemini) \| `([^`]+)` \|$/gmu)];
  const assignedPaths = assignedTrees.map(match => match[2].replaceAll('\\', '/').replace(/\/+$/u, '').toLowerCase());
  if (assignedTrees.length !== 3 || new Set(assignedTrees.map(match => match[1])).size !== 3
    || new Set(assignedPaths).size !== 3) {
    errors.push('protocol §6.6 must assign each operator a distinct persistent worktree');
  }
  if (!worktreeSection.includes('한 작업 트리는 동시에 한 세션만 사용한다')
    || !worktreeSection.includes('고정 트리를 사용 중이면 고유한 임시')
    || !worktreeSection.includes('프로세스 명령줄에 경로가 없다는 이유만으로 미사용이라고 단정하지 않는다')
    || !worktreeSection.includes('사용 여부가 불명확하면 기존 트리를 보존하고 임시 트리로 분리한다')) {
    errors.push('protocol §6.6 must isolate busy or uncertain persistent worktrees');
  }
  if (!worktreeSection.includes('미커밋 변경·미추적 작업물·미병합 작업 브랜치가 있으면 보존')
    || !worktreeSection.includes('유휴 후보는 detached HEAD 이면서 clean 인 트리뿐이며')
    || !worktreeSection.includes('작업 브랜치가 checkout 되어 있으면 커밋이 없어도 사용 중으로 본다')
    || !worktreeSection.includes('clean 상태만으로 유휴라고 판단하지 않는다')
    || !worktreeSection.includes('재사용을 위해 자동 stash·강제 reset·`git clean -fdx` 를 실행하지 않는다')) {
    errors.push('protocol §6.6 must preserve pending work and reject destructive preparation');
  }
  const worktreeStart = section(worktreeSection, '- **최초 생성과 작업 시작**', '- **경로**');
  if (!worktreeStart.includes('고정 트리가 없을 때만')
    || !worktreeStart.includes('`git worktree add --detach <고정 경로> origin/main`')
    || !worktreeStart.includes('이미 존재하는 경로는 같은 저장소의 등록된 트리인지 확인하며 덮어쓰지 않는다')
    || !worktreeStart.includes('유휴 고정 트리는 `detached origin/main` 상태로 두고 그 상태에서는 수정·커밋하지 않는다')
    || !worktreeStart.includes('`git switch --no-track -c <고유 작업 브랜치> origin/main`')) {
    errors.push('protocol §6.6 must create once, park detached, and start a distinct task branch');
  }
  if (!worktreeStart.includes('브랜치 생성 직전에 detached HEAD·clean·미사용 상태를 다시 확인하며, 달라졌으면 멈추고 임시 트리로 분리한다')
    || !worktreeStart.includes('이 재확인은 원자적 세션 잠금이 아니므로 동시 진입 경쟁은 GAP-AGENT-001 의 잔여 위험이다')) {
    errors.push('protocol §6.6 must recheck admission without claiming an atomic session lock');
  }
  const worktreeGuard = section(worktreeSection, '- **실행 전 가드**', '- **의존성과 캐시**');
  if (!worktreeGuard.includes('고정 트리를 처음 사용하거나 세션 시작 경로와 다른 트리에서 작업하면')
    || !worktreeGuard.includes('수정 전에 대상 트리에서 `echo AGENT_GUARD_CANARY` 가 막히는지 확인한다')
    || !worktreeGuard.includes('막히지 않으면 그 도구의 프로젝트·훅 신뢰 설정을 사용자에게 요청하고 수정 작업을 진행하지 않는다')
    || !worktreeGuard.includes('신뢰 상태를 임의로 조작하거나 가드를 우회하지 않는다')) {
    errors.push('protocol §6.6 must verify target guard activation before editing and stop for user trust configuration if inactive');
  }
  const worktreeDependencies = section(worktreeSection, '- **의존성과 캐시**', '- **비밀 검사**');
  if (!worktreeDependencies.includes('의존성이 없거나 대응 lockfile 이 바뀌었을 때')
    || !worktreeDependencies.includes('디렉터리·의존성·캐시는 유지하며')) {
    errors.push('protocol §6.6 must retain caches while refreshing dependencies for changed lockfiles');
  }
  const worktreeFinish = section(worktreeSection, '- **작업 완료와 대기**', '- **정리**');
  if (!worktreeFinish.includes('PR 병합과 최신 로컬·원격 HEAD')
    || !worktreeFinish.includes('자신이 시작한 서버·검증 프로세스만 소유 근거를 확인해 종료하고')
    || !worktreeFinish.includes('미커밋 변경·미추적 작업물이 없을 때')
    || !worktreeFinish.includes('`git fetch --no-prune origin` 뒤 `git switch --detach origin/main`')
    || !worktreeFinish.includes('자기 작업 브랜치만 기존 완료 규칙에 따라 정리하며, 고정 작업 트리 디렉터리는 삭제하지 않는다')) {
    errors.push('protocol §6.6 must verify owned completion, park detached, and retain the directory');
  }

  // [2026-10-24 DEC-OPS-382] 설계 검토 예산 — 반복 비용만 줄이고 승인 분리·신호 보존·L2 검토는 지운 채 남지 않게 고정한다.
  const designReviewBudget = section(activeProtocol, '## 7. 설계 검토 예산');
  if (!designReviewBudget.includes('H1~H5, red 증명, 승인 경계는 그대로다')) {
    errors.push('protocol §7 must keep H1~H5, red proofs, and approval boundaries unchanged');
  }
  if (!designReviewBudget.includes('**시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다.**')) {
    errors.push('protocol §7 must keep prototype confirmation separate from schema, data, authorization, IA, menu, and rollout approval');
  }
  if (!/\| 인가·스키마·데이터를 건드리는 L2 \| 최대 2회\./u.test(designReviewBudget)) {
    errors.push('protocol §7 must keep a bounded but present review for authorization, schema, and data L2 designs');
  }
  if (!taskSpecification.includes('5번 칸(DESIGN BRIEF)을 채우고 [§7 설계 검토 예산](#7-설계-검토-예산-design-review-budget)을 따른다')) {
    errors.push('the task specification must route design-reviewed work to protocol §7');
  }
  // [2026-10-27 DEC-OPS-387] 승인 어휘의 두 뜻을 가르고, 플랫폼의 워크플로 동의와 다른 회사 모델 전송의 경계를 지운 채 남지 않게 고정한다.
  const delegation = section(activeProtocol, '#### 2.1 실행 방식', '#### 2.2 위임 패킷');
  if (!delegation.includes('"진행해" 같은 포괄 승인은 이 동의가 아니다') || /opt-in\[포괄 승인/u.test(delegation)) {
    errors.push('protocol §2.1 must not let batch approval stand in for the Workflow tool opt-in');
  }
  if (!dispatch.includes('이 상시 승인은 위 포괄 승인과 별개다')) {
    errors.push('protocol Stage 1 must keep batch approval and the completion standing approval apart');
  }
  if (!agentGitRules.includes('사용자가 맡긴 변경 작업은 아래 완료 범위까지가 그 요청이다')) {
    errors.push('AGENTS must tie user-scoped commits to the completion scope of assigned work');
  }
  if (!agentPrinciples.includes('비밀·토큰·쿠키·개인정보·운영 데이터·`.env` 내용은 보내지 않으며, 원문에 그런 내용이 있으면 빼거나 먼저 묻는다')) {
    errors.push('AGENTS must bound the cross-vendor review transmission exception');
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

  // [DEC-OPS-389] L2 는 다중 모듈 연동을 유지하면서 §2.3 의 의미 변경 범주를 포함하고, L2 Audit 리포트는 PR 설명의 고정 절이다.
  const l2Row = grading.split('\n').find((line) => line.startsWith('| **L2** |')) ?? '';
  if (!['다중 모듈 연동', '물리 스키마 H1', '인가·개인정보 H3', '식별자 축', '게이트 의미'].every((term) => l2Row.includes(term))) {
    errors.push('protocol §2 L2 must keep multi-module work and include the §2.3 semantic-change categories');
  }
  const auditLevels = section(activeProtocol, '#### 3.3 등급별 감사 수준', '#### 3.4 위반 대응');
  if (!auditLevels.includes('Audit 리포트는 PR 설명의 고정 절 `## Audit 리포트(L2)`')
    || !['① H 범주', '② 대조한 헌법 조항', '③ §2.3 독립 검토의 검토 모델', '④ red 증명이 있는 곳'].every((item) => auditLevels.includes(item))) {
    errors.push('protocol §3.3 must define the L2 Audit report as a fixed PR-description section with its four items');
  }
  if (!atlasL2.includes('의미 변경(H1·H3·식별자 축·게이트 의미)') || !atlasL2.includes('PR 설명의 Audit 리포트 절')) {
    errors.push('Atlas must show the L2 semantic-change scope and the PR Audit report section');
  }
  // [DEC-OPS-389] 승인된 운영 결정은 규칙 계층 5 에 ADR 과 나란히 있다 — 전문 정본은 보관 원문의 같은 ID 절이다.
  if (!hierarchy.includes('5. Accepted ADR, 승인된 운영 결정(DEC, 전문 정본은 보관 원문의 같은 ID 절)')) {
    errors.push('AGENTS rule hierarchy must rank approved operational decisions with Accepted ADRs');
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
    { ...current, agents: current.agents.replace('H1~H5·red 증명 생략의 근거로 쓰지 않는다', 'H1~H5·red 증명을 생략할 수 있다') },
    { ...current, agents: current.agents.replace(
      '(docs/03-guides/orchestration-protocol.md#6-연속-배치-작업의-시간-예산-batch-time-budget)',
      '(docs/03-guides/orchestration-protocol.md)',
    ) },
    { ...current, protocol: current.protocol.replace('훅을 우회하지 않는다(`--no-verify`, `SKIP_HARNESS=1` 포함)', '같은 검사를 돌렸으면 훅은 `SKIP_HARNESS=1` 로 건너뛴다') },
    { ...current, protocol: current.protocol.replace('위임 산출물에 대한 메인 에이전트의 독립 재검증(§2.3), ', '') },
    { ...current, protocol: current.protocol.replace(' required CI가 같은 범위를 돈다는 사실은 생략 사유가 아니다.', ' required CI가 같은 범위를 돌면 생략한다.') },
    { ...current, protocol: current.protocol.replace('**push 전에** 끝 PR의 base를 `main`으로 바꾼다', 'push 한 뒤에 끝 PR의 base를 `main`으로 바꾼다') },
    { ...current, protocol: current.protocol.replace('green이든 red든 그 커밋의 증거로 쓰지 않는다', 'red일 때만 단독으로 다시 확인한다') },
    { ...current, protocol: current.protocol.replace('H1~H5, red 증명, 승인 경계는 그대로다', '검토 상한 안에서는 red 증명을 생략할 수 있다') },
    { ...current, protocol: current.protocol.replace(
      '**시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다.**',
      '**시안 확인은 스키마·코어 데이터 승인을 겸한다.**',
    ) },
    { ...current, protocol: current.protocol.replace('| 인가·스키마·데이터를 건드리는 L2 | 최대 2회.', '| 인가·스키마·데이터를 건드리는 L2 | 시안 확인으로 대신한다.') },
    { ...current, protocol: current.protocol.replace('5번 칸(DESIGN BRIEF)을 채우고 [§7 설계 검토 예산](#7-설계-검토-예산-design-review-budget)을 따른다', '5번 칸은 원하면 채운다') },
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

// [2026-10-26 DEC-OPS-385] 각 변이는 아무 오류가 아니라 그 문장을 지키는 검사의 오류로 붉어야 한다.
test('DEC-OPS-385 protocol pins fail with their own message', () => {
  const cases = [
    ['protocol', '병렬 에이전트·워크플로(읽기 전용 검토 포함)가 도는 동안에는 메인도 무거운 검증을 시작하지 않는다', '병렬 에이전트가 도는 동안에도 메인은 무거운 검증을 시작할 수 있다', 'overlapping heavy runs with parallel agents'],
    ['protocol', '문서 전용 변경의 **넓은** 경로다 — 작업 중 최소 검사가 아니다', '문서 전용 변경의 최소 검사다', 'verify:docs as the minimum check'],
    ['agents', '그 경로에 다른 작업의 변경이 섞여 있으면 `--only`도 파일 전체를 담으므로 커밋하지 않고 멈춰 섞인 경로와 선택지를 보고한다', '그 경로에 다른 작업의 변경이 섞여 있어도 `--only`로 커밋한다', "path that also holds another task's changes"],
    ['agents', '동시에 작업하고 있으면 별도 작업 트리에서 작업한다', '동시에 작업해도 같은 워킹트리에서 작업한다', 'concurrent work to a separate worktree'],
    ['agents', '작업과 닿는 것을 영역과 상관없이 읽는다', '대상 경로가 걸릴 때만 읽는다', 'Accepted ADRs whose titles touch the task'],
    ['protocol', '병합 전에 독립 적대 검토를 한 번 둔다', '원하면 검토를 둔다', 'one pre-merge independent review'],
    ['protocol', '보다 먼저 **사용자 원문 요청(그대로 인용)과 diff** 를 주고', '와 함께 diff 를 주고', 'one pre-merge independent review'],
    ['protocol', '§7 의 설계 검토는 구현 전의 재진술을 보므로 구현 diff 에 대한 이 검토를 대신하지 않는다', '설계 문서를 두고 검토한 작업은 §7 의 검토 예산과 결정 카드의 부정 시험 열이 이를 대신한다', 'design review replace the pre-merge review'],
    ['protocol', '게이트 의미를 보는 관점은 채택률로 줄이지 않는다', '게이트 의미를 보는 관점도 채택률이 낮으면 줄인다', 'adoption rates retire high-severity review lenses'],
    ['protocol', '실행 잠금은 두지 않는다', '실행 잠금 파일을 둔다', 'no-lock boundary'],
    ['protocol', '상대 경로 `.githooks`', '절대 경로', 'relative hooks path'],
    ['protocol', '직접 만들지 않은 작업 트리는', '오래된 작업 트리는', 'worktree it did not create'],
    ['protocol', '지우기 전에 묻는다', '바로 지운다', 'worktree it did not create'],
  ];
  for (const [source, from, to, expected] of cases) {
    assert.equal(current[source].split(from).length, 2, `${source} must hold the pinned sentence exactly once: ${from}`);
    const errors = protocolTruthErrors({ ...current, [source]: current[source].replace(from, to) });
    assert.ok(errors.some(error => error.includes(expected)), `${from} → ${expected}: ${JSON.stringify(errors)}`);
  }
});

test('DEC-OPS-387 approval and transmission pins fail with their own message', () => {
  const cases = [
    ['protocol', '"진행해" 같은 포괄 승인은 이 동의가 아니다', '포괄 승인도 이 동의로 본다', 'Workflow tool opt-in'],
    ['protocol', '이 상시 승인은 위 포괄 승인과 별개다', '이 상시 승인은 위 포괄 승인과 같다', 'completion standing approval apart'],
    ['agents', '사용자가 맡긴 변경 작업은 아래 완료 범위까지가 그 요청이다', '커밋은 매번 따로 묻는다', 'completion scope of assigned work'],
    ['agents', '비밀·토큰·쿠키·개인정보·운영 데이터·`.env` 내용은 보내지 않으며, 원문에 그런 내용이 있으면 빼거나 먼저 묻는다', '무엇이든 보낸다', 'cross-vendor review transmission'],
    ['protocol', '예외는 사용자가 그 우회를 명시적으로 지시한 경우뿐', '예외는 에이전트가 필요하다고 판단한 경우', 'hook bypass to an explicit user instruction'],
    ['protocol', '메인 에이전트와 다른 회사의 모델로 두고 모델을 명시한다', '다른 회사 모델(codex·agy)로 두고', 'relative to the main agent, by model'],
    ['protocol', '회사는 실행 CLI 가 아니라 모델로 가린다', '회사는 실행 CLI 로 가린다', 'relative to the main agent, by model'],
  ];
  for (const [source, from, to, expected] of cases) {
    assert.equal(current[source].split(from).length, 2, `${source} must hold the pinned sentence exactly once: ${from}`);
    const errors = protocolTruthErrors({ ...current, [source]: current[source].replace(from, to) });
    assert.ok(errors.some(error => error.includes(expected)), `${from} → ${expected}: ${JSON.stringify(errors)}`);
  }
  const restored = current.protocol.replace('"진행해" 같은 포괄 승인은 이 동의가 아니다', '사용자 opt-in[포괄 승인/ultracode] 하에서만. "진행해" 같은 포괄 승인은 이 동의가 아니다');
  assert.ok(protocolTruthErrors({ ...current, protocol: restored }).some(error => error.includes('Workflow tool opt-in')));
});

test('DEC-OPS-389 grade, audit report and hierarchy pins fail with their own message', () => {
  const cases = [
    ['protocol', '(물리 스키마 H1·인가·개인정보 H3·식별자 축·게이트 의미 — §2.3)', '', 'semantic-change categories'],
    ['protocol', 'DB 스키마 변경, 다중 모듈 연동, 보안 관련 핵심 로직, 의미를', 'DB 스키마 변경, 보안 관련 핵심 로직, 의미를', 'semantic-change categories'],
    ['protocol', 'Audit 리포트는 PR 설명의 고정 절 `## Audit 리포트(L2)`', 'Audit 리포트는 필요하면 따로 쓴다', 'fixed PR-description section'],
    ['protocol', '④ red 증명이 있는 곳', '④ 기타', 'fixed PR-description section'],
    ['atlas', '의미 변경(H1·H3·식별자 축·게이트 의미)', '의미 변경', 'L2 semantic-change scope'],
    ['atlas', 'PR 설명의 Audit 리포트 절', '별도 Audit 문서', 'L2 semantic-change scope'],
    ['agents', '승인된 운영 결정(DEC, 전문 정본은 보관 원문의 같은 ID 절), ', '', 'approved operational decisions'],
  ];
  for (const [source, from, to, expected] of cases) {
    assert.equal(current[source].split(from).length, 2, `${source} must hold the pinned sentence exactly once: ${from}`);
    const errors = protocolTruthErrors({ ...current, [source]: current[source].replace(from, to) });
    assert.ok(errors.some(error => error.includes(expected)), `${from} → ${expected}: ${JSON.stringify(errors)}`);
  }
});

test('DEC-OPS-395 persistent worktree regressions fail with their own message', () => {
  const cases = [
    ['agents', '변경 작업은 시작 경로와 관계없이 [SOP §6.6의 도구별 고정 작업 트리]', '변경 작업은 현재 열린 폴더를 우선 사용하고 [SOP §6.6의 도구별 고정 작업 트리]', 'prefer persistent worktrees'],
    ['agents', '기존 세션의 진행 중인 작업은 자동으로 옮기거나 브랜치를 바꾸지 않는다', '기존 세션의 작업도 자동으로 옮긴다', 'without relocating existing work'],
    ['protocol', '한 작업 트리는 동시에 한 세션만 사용한다', '같은 도구의 여러 세션은 작업 트리를 공유한다', 'isolate busy or uncertain'],
    ['protocol', '고정 트리를 사용 중이면 고유한 임시', '고정 트리를 사용 중이어도 같은', 'isolate busy or uncertain'],
    ['protocol', '프로세스 명령줄에 경로가 없다는 이유만으로 미사용이라고 단정하지 않는다', '프로세스 명령줄에 경로가 없으면 미사용으로 본다', 'isolate busy or uncertain'],
    ['protocol', '사용 여부가 불명확하면 기존 트리를 보존하고 임시 트리로 분리한다', '사용 여부가 불명확해도 기존 트리를 재사용한다', 'isolate busy or uncertain'],
    ['protocol', '미커밋 변경·미추적 작업물·미병합 작업 브랜치가 있으면 보존', '미커밋 변경·미추적 작업물만 있으면 보존', 'preserve pending work'],
    ['protocol', '유휴 후보는 detached HEAD 이면서 clean 인 트리뿐이며', '유휴 후보는 clean 인 트리이며', 'preserve pending work'],
    ['protocol', '작업 브랜치가 checkout 되어 있으면 커밋이 없어도 사용 중으로 본다', '작업 브랜치에 커밋이 없으면 유휴로 본다', 'preserve pending work'],
    ['protocol', 'clean 상태만으로 유휴라고 판단하지 않는다', 'clean 상태면 유휴라고 판단한다', 'preserve pending work'],
    ['protocol', '재사용을 위해 자동 stash·강제 reset·`git clean -fdx` 를 실행하지 않는다', '재사용 전에 자동 정리로 트리를 비운다', 'reject destructive preparation'],
    ['protocol', '고정 트리가 없을 때만', '작업을 시작할 때마다', 'create once, park detached'],
    ['protocol', 'git worktree add --detach <고정 경로> origin/main', 'git worktree add <고정 경로> main', 'create once, park detached'],
    ['protocol', '이미 존재하는 경로는 같은 저장소의 등록된 트리인지 확인하며 덮어쓰지 않는다', '이미 존재하는 경로는 새 트리로 덮어쓴다', 'create once, park detached'],
    ['protocol', '유휴 고정 트리는 `detached origin/main` 상태로 두고', '유휴 고정 트리는 `main` 브랜치에 두고', 'park detached, and start'],
    ['protocol', '그 상태에서는 수정·커밋하지 않는다', '그 상태에서도 수정·커밋할 수 있다', 'park detached, and start'],
    ['protocol', 'git switch --no-track -c <고유 작업 브랜치> origin/main', 'git switch main', 'start a distinct task branch'],
    ['protocol', '브랜치 생성 직전에 detached HEAD·clean·미사용 상태를 다시 확인하며', '세션 시작 때 한 번 상태를 확인하며', 'recheck admission'],
    ['protocol', '달라졌으면 멈추고 임시 트리로 분리한다', '달라졌어도 같은 트리를 사용한다', 'recheck admission'],
    ['protocol', '이 재확인은 원자적 세션 잠금이 아니므로 동시 진입 경쟁은 GAP-AGENT-001 의 잔여 위험이다', '이 재확인으로 동시 진입 경쟁을 원자적으로 막는다', 'without claiming an atomic session lock'],
    ['protocol', '고정 트리를 처음 사용하거나 세션 시작 경로와 다른 트리에서 작업하면', '최초 세션 시작 경로에서만', 'verify target guard activation'],
    ['protocol', '수정 전에 대상 트리에서 `echo AGENT_GUARD_CANARY` 가 막히는지 확인한다', '수정 후에 대상 트리에서 가드 상태를 확인한다', 'before editing'],
    ['protocol', '막히지 않으면 그 도구의 프로젝트·훅 신뢰 설정을 사용자에게 요청하고 수정 작업을 진행하지 않는다', '막히지 않아도 수정 작업을 진행한다', 'stop for user trust configuration'],
    ['protocol', '신뢰 상태를 임의로 조작하거나 가드를 우회하지 않는다', '신뢰 상태를 자동으로 바꾸고 진행한다', 'stop for user trust configuration'],
    ['protocol', '의존성이 없거나 대응 lockfile 이 바뀌었을 때', '의존성이 없을 때만', 'changed lockfiles'],
    ['protocol', '디렉터리·의존성·캐시는 유지하며', '작업 뒤 디렉터리·의존성·캐시는 삭제하며', 'retain caches'],
    ['protocol', 'PR 병합과 최신 로컬·원격 HEAD', '브랜치 이름', 'verify owned completion'],
    ['protocol', '자신이 시작한 서버·검증 프로세스만 소유 근거를 확인해 종료하고', '모든 서버·검증 프로세스를 종료하고', 'verify owned completion'],
    ['protocol', '미커밋 변경·미추적 작업물이 없을 때', '미커밋 변경·미추적 작업물이 있어도', 'verify owned completion'],
    ['protocol', 'git fetch --no-prune origin', 'git fetch --prune origin', 'verify owned completion'],
    ['protocol', 'git switch --detach origin/main', 'git switch main', 'park detached, and retain'],
    ['protocol', '고정 작업 트리 디렉터리는 삭제하지 않는다', '고정 작업 트리 디렉터리도 삭제한다', 'retain the directory'],
  ];
  for (const [source, from, to, expected] of cases) {
    assert.equal(current[source].split(from).length, 2, `${source} must hold the pinned sentence exactly once: ${from}`);
    const errors = protocolTruthErrors({ ...current, [source]: current[source].replace(from, to) });
    assert.ok(errors.some(error => error.includes(expected)), `${from} → ${expected}: ${JSON.stringify(errors)}`);
  }
});

test('persistent worktree assignments require distinct operators and paths without freezing locations', () => {
  const worktreeSection = section(current.protocol, '### 6.6 작업 트리', '## 7. 설계 검토 예산');
  const rows = [...worktreeSection.matchAll(/^\| (Codex|Claude Code|Antigravity\/Gemini) \| `([^`]+)` \|$/gmu)];
  assert.equal(rows.length, 3);
  const relocated = rows.reduce((protocol, row, index) => protocol.replace(row[0], `| ${row[1]} | \`E:\\wt-project-operator-${index}\` |`), current.protocol);
  assert.deepEqual(protocolTruthErrors({ ...current, protocol: relocated }), []);

  const mutants = [
    current.protocol.replace(rows[0][0], ''),
    current.protocol.replace(rows[0][0], rows[1][0]),
    current.protocol.replace(rows[0][0], `| ${rows[1][1]} | \`${rows[0][2]}\` |`),
    current.protocol.replace(rows[0][0], `| ${rows[0][1]} | \`${rows[1][2].replaceAll('\\', '/').toUpperCase()}/\` |`),
  ];
  for (const protocol of mutants) {
    assert.notEqual(protocol, current.protocol);
    assert.ok(protocolTruthErrors({ ...current, protocol }).some(error => error.includes('distinct persistent worktree')));
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
    `node -e "require('node:fs').mkdirSync('build/operational-contracts',{recursive:true})" && node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=./scripts/node-test-junit-reporter.mjs --test-reporter-destination=build/operational-contracts/junit.xml "scripts/*.test.mjs" ".agent/scripts/*.test.js" "tools/migration-workspace/*.test.mjs" "tools/migration-workspace-prototype/*.test.mjs"`,
  );
  const operational = current.registry.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  assert.ok(operational);
  assert.ok(operational.selector.catalogs.some(({ root, suffixes, recursive }) => (
    root === 'scripts' && suffixes.includes('.test.mjs') && recursive === false
  )));
  assert.equal(operational.requiredCiContext, 'secret-scan');
});

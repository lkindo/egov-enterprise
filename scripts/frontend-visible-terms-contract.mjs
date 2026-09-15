import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_STATES = [
  'demo',
  'filtered-zero',
  'first-use-empty',
  'loading',
  'offline',
  'partial-failure',
  'permission-denied',
  'server-error',
  'success',
  'unavailable',
  'unsaved',
  'validation-error',
];

const REQUIRED_PILOT_ROUTES = [
  '/',
  '/admin',
  '/admin/community/boards/insert-board-article',
  // [2026-09-15] '/admin/survey/manage/create' 는 2026-09-12 부터 page-redirect 다(§A3-1 모달 이행).
  //   등록 모달은 설문 허브의 manage 탭이 embed 하는 목록이 렌더하므로 실제 도달 route 로 옮긴다.
  '/admin/survey/hub',
  '/admin/system/logs/user',
  '/admin/user/manage',
  '/login',
  '/smart-toolkit/schedule',
];

/*
  [2026-09-15 DEC-OPS-100] 계약 수준 규범은 작성 기준이자 필수 정보 규범이다. 종전 검증기는 필드가 비어 있지 않은지만
  봐서 필수 정보를 지우거나 형식 금지를 풀어도 통과했다. 아래 하한은 2026-09-15 규범 검토 결과다. 원장은 이보다
  넓어질 수 있지만(파생 제품의 추가 규범) 좁아지면 red 다. 하한을 낮추려면 규범 결정과 이 상수를 같은 변경에서 고친다.
*/
const SCHEMA_VERSION = '1.1.0';
const NORM_REVIEW_MAX_DAYS = 120;
const DECISION_REFERENCE = /^DEC-OPS-\d{3}$/;
const NORM_POLICY = Object.freeze({
  canonicalLabel: 'default-wording-for-new-copy',
  requiredInformation: 'normative',
  mustNotImply: 'normative',
  copyMigration: 'not-required',
});
const G15_IMPLEMENTATION = ['frontend/src/app/components/patterns/empty-result-message.ts'];
const STATE_NORM_FLOOR = {
  loading: { requiredInformation: ['대상', '진행 중 상태(보이는 문구와 보조기술 — role="status"·aria-busy 또는 sr-only 제목)'], mustNotImply: ['완료', '성공', '데이터 없음(빈 상태)'] },
  'first-use-empty': { requiredInformation: ['대상', '처음 시작하는 상태(조건 없는 조회도 비어 있음)', '권한이 있는 경우의 시작 행동(문구 또는 같은 화면의 역할별 주요 action — G10)'], mustNotImply: ['검색 결과 없음', '조회 실패', '권한 없는 사용자에게 가능한 시작 행동'], catalogRule: 'G15', sharedImplementation: G15_IMPLEMENTATION },
  'filtered-zero': { requiredInformation: ['적용된 조건(검색어는 인용; 검색어 외 조건만 적용됐으면 조회 조건에 맞는 대상이 없다고 밝히고 데이터 없음이라 하지 않음)', '조건 초기화 또는 수정 행동(문구 또는 같은 조회 조건 영역의 초기화·입력)'], mustNotImply: ['전체 데이터 없음', '조회 실패'], catalogRule: 'G15', sharedImplementation: G15_IMPLEMENTATION },
  'permission-denied': { requiredInformation: ['거부된 작업', '안전한 다음 행동 또는 문의 경로'], mustNotImply: ['데이터 없음', '로그인 실패', '권한 자동 부여', '일시적 오류(기다리거나 다시 시도하면 해결됨)'] },
  unavailable: { requiredInformation: ['지원하지 않는 범위', '가능한 대체 행동(있으면 반드시 안내하고, 없을 때만 대체 경로가 없다는 사실)'], mustNotImply: ['곧 제공됨', '제공 일정·계획 약속(준비 중, ~할 예정, 곧)', '실행 가능'] },
  demo: { requiredInformation: ['정적 또는 로컬 범위', '저장·전송 여부'], mustNotImply: ['운영 데이터', '실제 처리 완료'] },
  'partial-failure': { requiredInformation: ['성공한 범위', '실패한 범위', '재시도 행동', '기존 데이터 유지 여부'], mustNotImply: ['전체 성공', '전체 빈 상태', '실패한 항목을 0·빈 값으로 표시'] },
  offline: { requiredInformation: ['저장 여부', '연결 후 재시도 행동'], mustNotImply: ['서버 오류', '입력 폐기', '브라우저가 오프라인을 알리지 않았는데 네트워크 원인 단정'] },
  'validation-error': { requiredInformation: ['문제가 있는 필드', '수정 조건', '입력 유지'], mustNotImply: ['서버 저장 실패', '입력 초기화'] },
  'server-error': { requiredInformation: ['실패한 작업', '입력 또는 기존 데이터 유지 여부', '재시도 또는 문의 행동'], mustNotImply: ['데이터 없음', '성공', '예외·전송 오류 원문(영문 라이브러리 메시지, HTTP 상태 문구)을 안내처럼 표시'] },
  success: { requiredInformation: ['완료된 대상과 작업', 'authoritative readback 또는 다음 위치'], mustNotImply: ['서버 확인 전 완료', '부분 성공의 전체 성공'] },
  unsaved: { requiredInformation: ['떠날 때의 영향', '계속 편집·저장·나가기 행동'], mustNotImply: ['자동 저장됨', '안전한 폐기'], sharedImplementation: ['frontend/src/hooks/useDirtyCloseGuard.ts', 'frontend/src/contexts/UnsavedChangesContext.tsx'] },
};
const ACTION_RULE_FLOOR = {
  'verb-object': { catalogRule: 'G14', forbiddenExamples: ['확인 on a control that performs an operation (including useConfirm without confirmText)', '처리', '실행', '적용', '이동', 'GO', 'DEPLOY', '배포 or 동기화 as the label of a create or update save'] },
  'pending-action': { forbiddenExamples: ['완료', '성공', 'ACTIVE', 'bare 처리 중… that drops the object and operation named by the idle label'] },
  'destructive-action': { forbiddenExamples: ['정리', '대상 없는 삭제', '대상 없는 초기화(데이터·자격증명 삭제)', '확인 as a destructive confirm button', '취소 as dismiss beside a …취소 operation', '…하시겠습니까? without consequence or reversibility'] },
  'unsupported-action': { catalogRule: 'G10', forbiddenExamples: ['cursor-only card', 'handlerless button', 'a label promising an action that does not exist', 'a destination that is a page-redirect route', 'a disabled reason given only as a title tooltip'] },
};
const TERM_FLOOR = {
  'term-hub': { decision: 'replace-by-task-context', sourceTerms: ['Hub', '허브'] },
  'term-intelligence': { decision: 'forbidden-unless-source-proven', sourceTerms: ['Intelligence', '인텔리전스', '인텔리전트 엔진', '지능형', 'AI 기반'] },
  'term-matrix': { decision: 'replace-by-domain-noun', sourceTerms: ['Matrix', '매트릭스'] },
  'term-node': { decision: 'audience-and-context-required', sourceTerms: ['Node', '노드'] },
  'term-stream': { decision: 'replace-by-domain-noun', sourceTerms: ['Stream', '스트림'] },
  'term-architecture-protocol-core': { decision: 'audience-and-context-required', sourceTerms: ['Architecture', 'Protocol', 'Core', '아키텍처', '프로토콜', '코어'] },
  'term-operational-status': { decision: 'evidence-required', sourceTerms: ['ACTIVE', 'SAFE', 'HIGH', 'MEDIUM', 'LOW', 'OPTIMAL', 'UP', 'NOMINAL', '99.9%', '정상', '안전', '최적'] },
  'term-standard-acronyms': { decision: 'conditional', sourceTerms: ['ID', 'IP', 'URL', 'API', 'CSV', 'CPU'] },
};
const NORMATIVE_SOURCE_FLOOR = [
  '.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md',
  'config/ui-route-capabilities.json',
  'docs/02-architecture/decisions/ADR-0002-korean-first-frontend.md',
  'docs/02-architecture/decisions/ADR-0009-controlled-url-search-state.md',
  'docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md',
  'docs/02-architecture/work-screen-grammar-catalog.md',
  'docs/03-guides/frontend-content-style.md',
];
const FORMAT_RULE_PINS = [
  ['date.ambiguousNumericDates', 'forbidden'],
  ['time.relativeOnlyForAudit', 'forbidden'],
  ['time.referenceTimeZone', 'Asia/Seoul'],
  ['number.locale', 'ko-KR'],
  ['number.unknownAsZero', 'forbidden'],
  ['number.zeroAsBlank', 'forbidden'],
  ['number.scopeQualifierRequired', true],
  ['number.percentage.withoutRequired', 'do-not-display'],
  ['unit.requireUnit', true],
];
const PERCENTAGE_REQUIRES = ['분자', '분모', '기간', '데이터 원천'];
const POPULATION_KIND = 'pilot-candidate-static-census';
const ALLOWED_COMPLETION_CLAIM = 'internal draft writing guideline, required-information norm and bounded static census only';

function duplicates(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validReviewBy(value, reviewedAt) {
  return validDate(value) && validDate(reviewedAt) && value >= reviewedAt;
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function lostItems(actual, floor = []) {
  const present = new Set(Array.isArray(actual) ? actual : []);
  return floor.filter((item) => !present.has(item));
}

function readPath(value, dotted) {
  return dotted.split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), value);
}

export function validateVisibleTerms(contract, { root = ROOT, expectedPilotRoutes = REQUIRED_PILOT_ROUTES } = {}) {
  const errors = [];
  if (contract.schemaVersion !== SCHEMA_VERSION) errors.push('unsupported schemaVersion');
  if (contract.status !== 'draft-blocked-input') errors.push('status must preserve the approval boundary');
  if (contract.language !== 'ko-KR') errors.push('language must match ADR-0002');
  if (!validDate(contract.lastReviewedAt)) errors.push('lastReviewedAt must be a real YYYY-MM-DD date');
  if (!contract.owner?.trim() || !validReviewBy(contract.reviewBy, contract.lastReviewedAt)) {
    errors.push('contract needs owner and real reviewBy on or after lastReviewedAt');
  }
  const policy = contract.normPolicy;
  if (!policy || typeof policy !== 'object' || !DECISION_REFERENCE.test(policy.decisionRef ?? '')) {
    errors.push('normPolicy must record the approved reading with a DEC-OPS decision reference');
  } else {
    for (const [key, expected] of Object.entries(NORM_POLICY)) {
      if (policy[key] !== expected) errors.push(`normPolicy must keep the approved reading: ${key}`);
    }
  }
  // 규범을 검토하지 않고 기한만 옮기면 normsReviewedAt 이 그대로라 120일 상한에 걸린다.
  if (!validDate(contract.normsReviewedAt) || !validDate(contract.lastReviewedAt)
      || contract.normsReviewedAt > contract.lastReviewedAt) {
    errors.push('normsReviewedAt must be a real date on or before lastReviewedAt');
  } else if (!validDate(contract.reviewBy) || contract.reviewBy < contract.normsReviewedAt
      || contract.reviewBy > addDays(contract.normsReviewedAt, NORM_REVIEW_MAX_DAYS)) {
    errors.push(`contract reviewBy must fall within ${NORM_REVIEW_MAX_DAYS} days after normsReviewedAt`);
  }
  if (!contract.ownerAssignment?.trim()
      || (contract.ownerAssignment !== 'unassigned' && !DECISION_REFERENCE.test(contract.ownerAssignmentRef ?? ''))) {
    errors.push('ownerAssignment other than unassigned needs a DEC-OPS ownerAssignmentRef');
  }

  const stateIds = (contract.stateVocabulary ?? []).map(({ id }) => id);
  if (duplicates(stateIds).length) errors.push(`duplicate state id: ${duplicates(stateIds).join(', ')}`);
  if (JSON.stringify([...stateIds].sort()) !== JSON.stringify(REQUIRED_STATES)) {
    errors.push('state vocabulary is incomplete or contains an unknown state');
  }
  for (const state of contract.stateVocabulary ?? []) {
    if (!state.canonicalLabel || !state.requiredInformation?.length || !state.mustNotImply?.length) {
      errors.push(`state is unbounded: ${state.id ?? '<missing>'}`);
    }
  }

  const catalogPath = path.join(root, 'docs/02-architecture/work-screen-grammar-catalog.md');
  const catalogText = fs.existsSync(catalogPath) ? fs.readFileSync(catalogPath, 'utf8') : '';
  const checkNormBinding = (label, entry, floor = {}) => {
    if (floor.catalogRule && entry.catalogRule !== floor.catalogRule) {
      errors.push(`norm binding was weakened: ${label} lost catalogRule ${floor.catalogRule}`);
    }
    if (entry.catalogRule !== undefined
        && (!/^G\d+$/.test(entry.catalogRule) || !catalogText.includes(`| ${entry.catalogRule} |`))) {
      errors.push(`catalogRule does not name a work-screen grammar rule: ${label}/${entry.catalogRule}`);
    }
    for (const file of lostItems(entry.sharedImplementation, floor.sharedImplementation)) {
      errors.push(`norm binding was weakened: ${label} lost sharedImplementation ${file}`);
    }
    if (entry.sharedImplementation !== undefined && !Array.isArray(entry.sharedImplementation)) {
      errors.push(`sharedImplementation must list files: ${label}`);
    }
    for (const file of Array.isArray(entry.sharedImplementation) ? entry.sharedImplementation : []) {
      if (typeof file !== 'string' || !fs.existsSync(path.join(root, file))) {
        errors.push(`sharedImplementation file is missing: ${label}/${file}`);
      }
    }
  };
  for (const state of contract.stateVocabulary ?? []) {
    const floor = STATE_NORM_FLOOR[state.id];
    // 알 수 없는 상태 id 는 위의 정확한 상태 집합 검사가 이미 보고한다.
    if (!floor) continue;
    for (const field of ['requiredInformation', 'mustNotImply']) {
      for (const item of lostItems(state[field], floor[field])) {
        errors.push(`state norm was weakened: ${state.id}.${field} lost "${item}"`);
      }
    }
    checkNormBinding(state.id, state, floor);
  }

  // 검토한 네 규칙은 모두 있어야 하고, 파생 제품은 규칙을 더할 수 있다(하한 검사).
  const actionIds = (contract.actionRules ?? []).map(({ id }) => id);
  for (const id of Object.keys(ACTION_RULE_FLOOR)) {
    if (!actionIds.includes(id)) errors.push(`action rules are incomplete: ${id}`);
  }
  if (duplicates(actionIds).length) errors.push(`duplicate action rule id: ${duplicates(actionIds).join(', ')}`);
  for (const rule of contract.actionRules ?? []) {
    if (!rule.rule?.trim()) errors.push(`action rule is unbounded: ${rule.id ?? '<missing>'}`);
    const floor = ACTION_RULE_FLOOR[rule.id];
    if (!floor) continue;
    for (const item of lostItems(rule.forbiddenExamples, floor.forbiddenExamples)) {
      errors.push(`action rule was weakened: ${rule.id} lost "${item}"`);
    }
    checkNormBinding(rule.id, rule, floor);
  }

  const format = contract.formatRules;
  if (!format || typeof format !== 'object') {
    errors.push('format rules are missing');
  } else {
    for (const [rulePath, expected] of FORMAT_RULE_PINS) {
      if (readPath(format, rulePath) !== expected) errors.push(`format rule was weakened: ${rulePath}`);
    }
    for (const rulePath of ['date.display', 'time.display']) {
      const text = readPath(format, rulePath);
      if (typeof text !== 'string' || !text.trim()) errors.push(`format rule was weakened: ${rulePath}`);
    }
    for (const item of lostItems(readPath(format, 'number.percentage.requires'), PERCENTAGE_REQUIRES)) {
      errors.push(`format rule was weakened: number.percentage.requires lost "${item}"`);
    }
  }

  const populationRoutes = [...(contract.population?.exactRoutes ?? [])].sort();
  if (JSON.stringify(populationRoutes) !== JSON.stringify([...expectedPilotRoutes].sort())) {
    errors.push('pilot population drift');
  }
  const pilots = contract.pilotCensus ?? [];
  const pilotIds = pilots.map(({ id }) => id);
  const pilotRoutes = pilots.map(({ route }) => route);
  if (duplicates(pilotIds).length) errors.push(`duplicate pilot id: ${duplicates(pilotIds).join(', ')}`);
  if (duplicates(pilotRoutes).length) errors.push(`duplicate pilot route: ${duplicates(pilotRoutes).join(', ')}`);
  if (JSON.stringify([...pilotRoutes].sort()) !== JSON.stringify([...expectedPilotRoutes].sort())) {
    errors.push('pilot census does not exactly cover its population');
  }

  /*
    [2026-09-15 DEC-OPS-099] 문구를 고치지 않고 소유자가 현 상태를 확정하는 종결 경로.
    종전 스키마에는 이 상태가 없어, 결정이 내려져도 finding 은 영원히 활성으로 남았다.

    결정 종결은 remediated-local 과 반대로 **결정 대상 문자열이 여전히 있어야** 한다 — 결정한 뒤
    문구가 바뀌었다면 그 결정은 더 이상 지금 화면에 대한 것이 아니므로 red 다. 결정 참조와 결정일은
    산문 사유로 대신할 수 없다. 원장(decisions.md) 실재 대조는 재사용 산출물에서도 이 모듈이 호출되므로
    생산 저장소 테스트(frontend-visible-terms-contract.test.mjs)가 맡는다.
  */
  const OWNER_DECISION_STATUS = 'accepted-by-owner';
  const CLOSED_STATUSES = new Set(['remediated-local', OWNER_DECISION_STATUS]);
  const DECISION_REF = /^DEC-OPS-\d{3}$/;
  for (const pilot of pilots) {
    if (!pilot.owner?.trim() || !validReviewBy(pilot.reviewBy, contract.lastReviewedAt)) errors.push(`pilot is unbounded: ${pilot.id}`);
    if (!pilot.roles?.length || !pilot.sources?.length || !pilot.evidenceLevel || !pilot.status) {
      errors.push(`pilot evidence is incomplete: ${pilot.id}`);
    }
    for (const source of pilot.sources ?? []) {
      if (!fs.existsSync(path.join(root, source))) errors.push(`pilot source is missing: ${source}`);
    }
    for (const finding of pilot.findings ?? []) {
      if (!finding.kind || !finding.evidence || !finding.status || !finding.owner?.trim()
          || !validReviewBy(finding.reviewBy, contract.lastReviewedAt)) {
        errors.push(`finding is unbounded: ${pilot.id}/${finding.kind ?? '<missing>'}`);
      }
      const sourceText = (pilot.sources ?? [])
        .map((source) => fs.existsSync(path.join(root, source)) ? fs.readFileSync(path.join(root, source), 'utf8') : '')
        .join('\n');
      if (finding.status === 'remediated-local') {
        if (!finding.removedSourceEvidence?.length) {
          errors.push(`remediated finding needs removed literal evidence: ${pilot.id}/${finding.kind}`);
          continue;
        }
        for (const snippet of finding.removedSourceEvidence) {
          if (sourceText.includes(snippet)) {
            errors.push(`remediated finding source evidence still present: ${pilot.id}/${finding.kind}/${snippet}`);
          }
        }
      } else {
        if (finding.status === OWNER_DECISION_STATUS
            && (!DECISION_REF.test(finding.decisionRef ?? '') || !validDate(finding.decidedAt)
              || finding.decidedAt > contract.lastReviewedAt)) {
          errors.push(`owner decision needs a decision reference and a decision date on or before the review: ${pilot.id}/${finding.kind}`);
        }
        if (!finding.sourceEvidence?.length) {
          errors.push(`active finding needs literal source evidence: ${pilot.id}/${finding.kind}`);
          continue;
        }
        for (const snippet of finding.sourceEvidence) {
          if (!sourceText.includes(snippet)) {
            errors.push(`finding source evidence drift: ${pilot.id}/${finding.kind}/${snippet}`);
          }
        }
      }
    }
    // 닫힌 pilot 아래 활성 finding 이 남으면, pilot 상태만 보고 "이 화면은 끝났다"고 읽게 된다.
    if (CLOSED_STATUSES.has(pilot.status)) {
      const active = (pilot.findings ?? []).filter((finding) => !CLOSED_STATUSES.has(finding.status));
      if (active.length) {
        errors.push(`closed pilot still has active findings: ${pilot.id}/${active.map(({ kind }) => kind).join(',')}`);
      }
    }
  }

  const termIds = (contract.terms ?? []).map(({ id }) => id);
  if (termIds.length === 0 || duplicates(termIds).length) errors.push('term ids must be non-empty and unique');
  for (const term of contract.terms ?? []) {
    if (!term.sourceTerms?.length || !term.decision || !term.preferred || !term.rationale) {
      errors.push(`term decision is incomplete: ${term.id ?? '<missing>'}`);
    }
  }
  for (const [id, floor] of Object.entries(TERM_FLOOR)) {
    const term = (contract.terms ?? []).find((row) => row.id === id);
    if (!term) {
      errors.push(`term decision was dropped: ${id}`);
      continue;
    }
    if (term.decision !== floor.decision) errors.push(`term decision was weakened: ${id} must stay ${floor.decision}`);
    for (const item of lostItems(term.sourceTerms, floor.sourceTerms)) {
      errors.push(`term decision was weakened: ${id} lost "${item}"`);
    }
  }

  for (const source of contract.normativeSources ?? []) {
    if (!fs.existsSync(path.join(root, source))) errors.push(`normative source is missing: ${source}`);
  }
  for (const source of lostItems(contract.normativeSources, NORMATIVE_SOURCE_FLOOR)) {
    errors.push(`normative source was dropped: ${source}`);
  }
  if (contract.population?.kind !== POPULATION_KIND || !contract.population?.limitations?.length) {
    errors.push('population must stay a bounded pilot census with stated limitations');
  }
  const approval = contract.approval;
  if (!approval || typeof approval !== 'object') {
    errors.push('approval boundary is missing');
  } else {
    if (approval.contentOwnerApproved || approval.productOwnerApproved || approval.userValidated) {
      errors.push('approval cannot be asserted without reviewer evidence in this draft schema');
    }
    for (const flag of ['contentOwnerApproved', 'productOwnerApproved', 'userValidated']) {
      if (approval[flag] !== false) errors.push(`approval flag must be recorded as false: ${flag}`);
    }
    if (approval.allowedCompletionClaim !== ALLOWED_COMPLETION_CLAIM) errors.push('approval completion claim must stay bounded');
  }
  return errors;
}

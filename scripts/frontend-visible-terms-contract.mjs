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

export function validateVisibleTerms(contract, { root = ROOT, expectedPilotRoutes = REQUIRED_PILOT_ROUTES } = {}) {
  const errors = [];
  if (contract.schemaVersion !== '1.0.0') errors.push('unsupported schemaVersion');
  if (contract.status !== 'draft-blocked-input') errors.push('status must preserve the approval boundary');
  if (contract.language !== 'ko-KR') errors.push('language must match ADR-0002');
  if (!validDate(contract.lastReviewedAt)) errors.push('lastReviewedAt must be a real YYYY-MM-DD date');
  if (!contract.owner?.trim() || !validReviewBy(contract.reviewBy, contract.lastReviewedAt)) {
    errors.push('contract needs owner and real reviewBy on or after lastReviewedAt');
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

  for (const source of contract.normativeSources ?? []) {
    if (!fs.existsSync(path.join(root, source))) errors.push(`normative source is missing: ${source}`);
  }
  if (contract.approval?.contentOwnerApproved || contract.approval?.productOwnerApproved || contract.approval?.userValidated) {
    errors.push('approval cannot be asserted without reviewer evidence in this draft schema');
  }
  return errors;
}

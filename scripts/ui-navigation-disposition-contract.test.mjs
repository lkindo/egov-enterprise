import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  adrDecisionSha256,
  createUnreviewedProposal,
  dispositionManifestSha256,
  findDispositionSourceReferences,
  validateDispositionContract,
  validateOperationalBinding,
  validateSchemaDefinition,
} from './ui-navigation-disposition-contract.mjs';
import { discoverPageRoutes } from './ui-route-capabilities-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// [2026-08-31] 라우트 수의 단일 원본은 파일시스템 스캔이다(리터럴 120 삼중 하드코딩 제거).
const FILESYSTEM_ROUTE_COUNT = discoverPageRoutes(repoRoot).length;
const manifestRaw = readFileSync(path.join(repoRoot, 'config', 'ui-route-capabilities.json'));
const manifest = JSON.parse(manifestRaw);
const overlay = JSON.parse(
  readFileSync(path.join(repoRoot, 'config', 'ui-navigation-disposition-proposal.json'), 'utf8'),
);
const schema = JSON.parse(
  readFileSync(path.join(repoRoot, 'config', 'ui-navigation-disposition.schema.json'), 'utf8'),
);

function clone(value) {
  return structuredClone(value);
}

// 처분 기한이 실제 달력 날짜인지 본다 — 형식만 보면 2026-02-30 도 통과한다(2026-11-08 Codex 12차).
function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
// 라우트 원장 검토가 끝난 행의 처분 기한은 비교할 원장 값이 없다. 기한을 조용히 미루지 못하게 지금 쓰는 가장 늦은 기한을 고정한다 —
//   다시 검토해 기한을 옮길 때는 이 값과 함께 바꾸고 사유를 변경 설명에 남긴다.
const LATEST_DISPOSITION_REVIEW_BY = '2026-12-31';

function validate(candidate, options = {}) {
  return validateDispositionContract({
    manifest: options.manifest ?? manifest,
    overlay: candidate,
    schema: options.schema ?? schema,
    repoRoot: options.repoRoot ?? repoRoot,
    sourceReferences: options.sourceReferences ?? [],
  });
}

const PROVISIONAL_HYBRID_SCOPE = [
  'prototype-and-research-default',
  'preserve-canonical-urls',
  'separate-navigation-metadata-from-route-and-authorization',
  'isolate-high-risk-administration-in-management-center',
];
const PROVISIONAL_HYBRID_UNRESOLVED = [
  'exact-labels-groups-order-and-route-dispositions',
  'live-menu-authority-and-effective-role-exposure',
  'route-level-authorization-privacy-and-profile-ownership',
  'url-privacy-allowlists-and-external-telemetry',
  'user-research-thresholds-and-g1-approval',
];

// D5 웨이브 1 (2026-08-23): 저위험 8건만 owner PR 리뷰로 개별 approved 전이
// (ADR-0007 §Decision 4, 승인 채널 DEC-OPS-013). 종전의 "승인 0건" 고정은 이 값으로
// 갱신하고, 잔여 113건에는 기존 population·null 검사를 그대로 유지한다.
// ADR-0049: 종료한 워크플로우 목업 3개는 현행 승인 모집단에서 제외한다.
const WAVE1_APPROVED_ROUTES = [
  '/admin/survey/polls/manage',
  // '/admin/system/network' 은 DEC-OPS-129 로 퇴역했다(2026-09-25, 경로·API·권한 삭제).
  // '/approvals/draft' 의 웨이브 1 승인은 DEC-OPS-302 로 거뒀다(2026-10-13) — 2026-09-16 부터 실제 기안 창을 열게 되어
  // demo-isolated 의 근거(목업·미전송 고지·e2e 11)가 사라졌고, 인증 시작 구성 '공통 기반 + 결재' 가 이 화면을 싣는다.
  // 정본 /approvals 로의 consolidate-to-canonical 로 다시 제안한다(리다이렉트는 하지 않았다).
];
const WAVE1_APPROVED_ALIASES = [
  '/admin/community/boards/insertBoardArticle',
  '/admin/community/boards/selectBoardList',
];
const WAVE1_REVIEWER = 'lkindo (DEC-OPS-013)';
const WAVE1_REVIEWED_AT = '2026-08-23';

function isWave1Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE1_REVIEWER
    && approval.reviewedAt === WAVE1_REVIEWED_AT
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}

// D5 웨이브 2 (2026-09-06, DEC-OPS-040): 2026-09-05 감사가 남긴 overlay 제안 11건을 owner 승인으로 확정했다
// (사용자 위임 2026-09-06). consolidate 7건은 정본으로의 page-redirect(4건 신규 이행·3건은 이미 config redirect),
// demo-isolated 1건(/admin/system/layout), DEC-OPS-034 의 boards/write·[id] 2건과 login-policy 1건은 승인 기록만이다.
// 메뉴 노출 검토는 별칭이 리다이렉트로 흡수되는 consolidate 에서 'verified', demo 격리에서 'not-applicable' 이다.
const WAVE2_APPROVED_ROUTES = [
  '/admin/community',
  '/admin/community/boards',
  '/admin/community/boards/[id]',
  '/admin/community/boards/write',
  '/admin/observability',
  '/admin/security/audit',
  '/admin/system/audit',
  '/admin/system/ism',
  '/admin/system/layout',
  '/admin/system/monitoring',
  '/admin/user/login-policy',
];
const WAVE2_REVIEWER = 'lkindo (사용자 위임 2026-09-06 · DEC-OPS-040)';
const WAVE2_REVIEWED_AT = '2026-09-06';
function isWave2Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE2_REVIEWER
    && approval.reviewedAt === WAVE2_REVIEWED_AT
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}
// overlay 는 manifest(파일시스템 스캔) 순서를 따르므로 승인 집합도 같은 정렬로 비교한다.
// 웨이브 3 (2026-09-12, DEC-OPS-079): 업무 화면 문법 §A3-1(인라인 ≥ 모달 > 전용 페이지) 이행이다.
// 전용 입력 페이지를 목록 위 모달로 옮기면 그 라우트는 입력 기능을 잃고 정본 목록으로 보내는
// page-redirect 가 된다 — DEC-OPS-034·040 과 같은 형태이므로 같은 처분(consolidate-to-canonical)을 쓴다.
// ⚠ 이 웨이브의 근거는 IA 재편이 아니라 **맥락 손실 실측**이다: 목록의 조회 상태가 useState·URL
//   미탑재라 페이지 이동만으로 검색어·페이지가 전손됐다.
const WAVE3_APPROVED_ROUTES = [
  '/admin/collaboration/address-book/insert-address-book',
  '/admin/collaboration/scraps/insertScrap',
  '/admin/collaboration/scraps/selectScrapDetail/[id]',
  '/admin/survey/manage/create',
];
const WAVE3_REVIEWER = 'lkindo (사용자 위임 2026-08-23 · DEC-OPS-079)';
const WAVE3_REVIEWED_AT = '2026-09-12';

function isWave3Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE3_REVIEWER
    && approval.reviewedAt === WAVE3_REVIEWED_AT
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}

/*
  [2026-09-23 웨이브 4] 이미 리다이렉트로 구현된 통합만 승인 레코드로 남긴다.

  승인 대상은 "통합하자" 는 제안이 아니라 **이미 통합된 사실** 이다 — 각 라우트의 리다이렉트 실물과
  route census 의 routing.kind 가 근거다. 아직 page 인 3건(/admin/collaboration/scraps·/admin/help/faq·
  /admin/help/qna)은 통합이 일어나지 않았으므로 proposed 로 남는다. 그 셋은 메뉴 시드가 정본으로
  선언하는지부터 판정해야 하며(DEC-OPS-024 의 login-policy 선례), 그 판정은 별도 변경이다.
*/
const WAVE4_APPROVED_ROUTES = [
  '/admin/collaboration/address-book',
  '/admin/security/role',
  '/admin/survey',
  '/admin/survey/items',
  '/admin/survey/manage',
  '/admin/survey/questions',
  '/admin/survey/stats',
  '/admin/survey/templates',
];
const WAVE4_REVIEWER = 'lkindo (사용자 위임 2026-08-23 · DEC-OPS-040 승인 배치, 2026-09-23 웨이브 4)';
const WAVE4_REVIEWED_AT = '2026-09-23';

function isWave4Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE4_REVIEWER
    && approval.reviewedAt === WAVE4_REVIEWED_AT
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}

/*
  웨이브 5(2026-09-25, DEC-OPS-130): /admin/community/[id] 는 이름이 '커뮤니티 상세' 인데 경로의 id 를
  읽지 않고 선택한 게시판 글 목록을 보여 줬다. id 를 보존해 정본 커뮤니티 상세로 보내는 page-redirect 로
  통합했다. 근거는 route census 의 routing.kind 다.
*/
const WAVE5_APPROVED_ROUTES = ['/admin/community/[id]'];
const WAVE5_REVIEWER = 'lkindo (사용자 위임 2026-08-23 · DEC-OPS-130)';
const WAVE5_REVIEWED_AT = '2026-09-25';

function isWave5Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE5_REVIEWER
    && approval.reviewedAt === WAVE5_REVIEWED_AT
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}

/*
  웨이브 6(2026-11-08, DEC-OPS-404): 정기 검토 2차 행별 승인. 정본 유지 62·메뉴 밖 하위 10·시연 격리 1 을 그대로,
  4건은 처분을 바꿔 승인했다(약도 미지원 숨김, 투표 참여 정본 유지, 공통코드 하위 정본 통합, 개인정보 정책 메뉴 밖 하위).
  개인정보 검토는 처분 변경분만 본 것이다 — 승인 근거가 그 범위를 밝혀야 한다(화면 전체 검토 완료로 읽히지 않게).
*/
const WAVE6_APPROVED_ROUTES = [
  '/',
  '/admin/collaboration',
  '/admin/collaboration/address-book/select-address-book-detail/[id]',
  '/admin/collaboration/address-book/select-address-book-list',
  '/admin/collaboration/mail-history',
  '/admin/collaboration/mail-send',
  '/admin/collaboration/scraps/selectScrapList',
  '/admin/community/boards/detail',
  '/admin/community/boards/insert-board-article',
  '/admin/community/boards/maker',
  '/admin/community/boards/master',
  '/admin/community/boards/master/[id]',
  '/admin/community/boards/select-board-list',
  '/admin/community/templates',
  '/admin/help',
  '/admin/notifications',
  '/admin/operation/events',
  '/admin/operation/external-hr',
  '/admin/operation/memo-reports',
  '/admin/operation/rewards',
  '/admin/operation/rough-map',
  '/admin/patterns',
  '/admin/security/authority',
  '/admin/security/dept-authority',
  '/admin/security/group',
  '/admin/security/login-policy',
  '/admin/stats',
  '/admin/stats/board',
  '/admin/stats/screen',
  '/admin/stats/user',
  '/admin/survey/hub',
  '/admin/survey/manage/[id]',
  '/admin/survey/polls',
  '/admin/survey/polls/participate',
  '/admin/system/banner',
  '/admin/system/codes/administ',
  '/admin/system/codes/institution',
  '/admin/system/comments',
  '/admin/system/common-code',
  '/admin/system/common-code/codes',
  '/admin/system/content-pages',
  '/admin/system/durable-jobs',
  '/admin/system/hpcm',
  '/admin/system/logs',
  '/admin/system/logs/audit',
  '/admin/system/logs/login',
  '/admin/system/logs/privacy',
  '/admin/system/logs/system',
  '/admin/system/logs/user',
  '/admin/system/logs/web',
  '/admin/system/menus',
  '/admin/system/menus/by-authority',
  '/admin/system/policies',
  '/admin/system/programs',
  '/admin/user/absences',
  '/admin/user/departments',
  '/admin/user/indvdl-info-policy',
  '/admin/user/manage',
  '/admin/uss/ion/sms',
  '/admin/uss/olh/online-manual',
  '/approvals',
  '/cop/cmy/selectCommunityDetail/[id]',
  '/cop/cmy/selectCommunityList',
  '/help',
  '/login',
  '/note',
  '/pages',
  '/pages/[slug]',
  '/search',
  '/smart-toolkit/dept-job',
  '/smart-toolkit/dept-job/[id]',
  '/smart-toolkit/dept-job/create',
  '/smart-toolkit/schedule',
  '/smart-toolkit/work-report',
  '/survey',
  '/survey/[id]',
  '/survey/stats',
];
const WAVE6_REVIEWER = 'lkindo (2026-11-08 사용자 승인 · DEC-OPS-404)';
const WAVE6_REVIEWED_AT = '2026-11-08';

function isWave6Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE6_REVIEWER
    && approval.reviewedAt === WAVE6_REVIEWED_AT
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}

/*
  웨이브 7(2026-11-08, DEC-OPS-407): 결재 기안은 독립 기안 진입을 지켜 정본 유지(retain-canonical)로 처분을 바꿨다 — 통합하면
  결재함에 새 주소 키가 필요하다. 함께 남았던 Q&A 옛 경로의 통합은 기존 진입을 정확히 보존할 수 없어 보류했다(proposed).
*/
const WAVE7_APPROVED_ROUTES = ['/approvals/draft'];
const WAVE7_DISPOSITIONS = { '/approvals/draft': 'retain-canonical' };
const WAVE7_REVIEWER = 'lkindo (2026-11-08 사용자 승인 · DEC-OPS-407)';

function isWave7Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE7_REVIEWER
    && approval.reviewedAt === '2026-11-08'
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}

/*
  웨이브 8(2026-11-08, DEC-OPS-408): 옛 camelCase 별칭 넷을 퇴역 후보로 승인했다(소유자의 외부 공개·운영 배포 없음 확인, 삭제는 재기록
  묶음). 모니터링 허브는 표본 위젯 일부가 공통 허브 화면에 있어 모든 구성에 실리므로 소유 미확인·보류를 유지한다. 나머지 보류 행의
  방향(메뉴·권한 원장과 함께 승인할 일곱, 보류를 유지할 넷)은 DEC-OPS-408 보관 원문에 있다.
*/
const WAVE8_DISPOSITIONS = {
  '/cop/sms/selectSmsList': 'retire-candidate',
  '/smart-toolkit/dept-job/insertDeptJob': 'retire-candidate',
  '/smart-toolkit/dept-job/selectDeptJobDetail/[id]': 'retire-candidate',
  '/smart-toolkit/dept-job/selectDeptJobList': 'retire-candidate',
};
const WAVE8_APPROVED_ROUTES = Object.keys(WAVE8_DISPOSITIONS);
const WAVE8_REVIEWER = 'lkindo (2026-11-08 사용자 승인 · DEC-OPS-408)';

function isWave8Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE8_REVIEWER
    && approval.reviewedAt === '2026-11-08'
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}

const APPROVED_ROUTES = [
  ...WAVE1_APPROVED_ROUTES,
  ...WAVE2_APPROVED_ROUTES,
  ...WAVE3_APPROVED_ROUTES,
  ...WAVE4_APPROVED_ROUTES,
  ...WAVE5_APPROVED_ROUTES,
  ...WAVE6_APPROVED_ROUTES,
  ...WAVE7_APPROVED_ROUTES,
  ...WAVE8_APPROVED_ROUTES,
].sort();

test('the recommended hybrid is selected only as a bounded provisional direction', () => {
  assert.equal(overlay.state, 'proposed');
  assert.equal(overlay.acceptedDecision, null);
  assert.equal(overlay.provisionalDirection?.status, 'accepted-provisional-direction');
  assert.equal(overlay.provisionalDirection?.optionId, 'hybrid-task-centered-management-center');
  assert.equal(overlay.provisionalDirection?.adrId, 'ADR-0004');
  assert.equal(
    overlay.provisionalDirection?.adrPath,
    'docs/02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md',
  );
  assert.equal(overlay.provisionalDirection?.decidedAt, '2026-08-21');
  assert.equal(overlay.provisionalDirection?.decisionAuthority, 'repository-owner');
  assert.deepEqual(overlay.provisionalDirection?.scope, PROVISIONAL_HYBRID_SCOPE);
  assert.deepEqual(overlay.provisionalDirection?.unresolved, PROVISIONAL_HYBRID_UNRESOLVED);
  assert.equal(overlay.provisionalDirection?.reviewBy, '2026-10-31');
  assert.match(overlay.provisionalDirection?.adrSha256 ?? '', /^[a-f0-9]{64}$/u);
  assert.equal(overlay.consumerBindings.menu.enabled, false);
  assert.equal(overlay.consumerBindings.generator.enabled, false);
  assert.ok(overlay.routes.every(({ reviewState }) => ['proposed', 'approved'].includes(reviewState)));
  assert.deepEqual(
    overlay.routes.filter(({ reviewState }) => reviewState === 'approved').map(({ route }) => route),
    APPROVED_ROUTES,
  );
  assert.deepEqual(
    overlay.externalAliases.filter(({ reviewState }) => reviewState === 'approved').map(({ source }) => source),
    WAVE1_APPROVED_ALIASES,
  );
});

test('the proposed overlay drafts dispositions over the discovered pages and external aliases', () => {
  const initial = createUnreviewedProposal(manifest);
  const manifestLf = manifestRaw.toString('utf8').replace(/\r\n?/gu, '\n');
  assert.equal(initial.provisionalDirection, null);
  assert.equal(overlay.state, 'proposed');
  assert.equal(overlay.authority, 'non-normative-pre-decision-evidence');
  assert.deepEqual(overlay.manifestRef, {
    path: 'config/ui-route-capabilities.json',
    sha256: dispositionManifestSha256(manifest),
  });
  assert.equal(initial.manifestRef.sha256, overlay.manifestRef.sha256);
  assert.equal(
    dispositionManifestSha256(JSON.parse(manifestLf.replaceAll('\n', '\r\n'))),
    dispositionManifestSha256(manifest),
    'manifest identity must not drift between Windows CRLF and CI LF checkouts',
  );
  assert.deepEqual(overlay.routes.map(({ route }) => route), initial.routes.map(({ route }) => route));
  assert.deepEqual(
    overlay.externalAliases.map(({ source }) => source),
    initial.externalAliases.map(({ source }) => source),
  );
  assert.ok(FILESYSTEM_ROUTE_COUNT >= 100, `route discovery collapsed: ${FILESYSTEM_ROUTE_COUNT} < 100`);
  assert.equal(overlay.routes.length, FILESYSTEM_ROUTE_COUNT);
  assert.equal(overlay.externalAliases.length, 2);
  assert.ok(overlay.routes.every((record, index) => {
    // 라우트 원장에 남은 미확인 필드가 있으면 그 검토의 담당자·기한을 처분이 그대로 쓴다. 원장 검토가 끝나 검토 메타가
    // 없어진 행(2026-11-08 DEC-OPS-404 부터)은 라우트 담당자와 같고 처분 기한이 날짜여야 한다.
    const ledgerReview = manifest.routes[index].review;
    const shared = record.disposition !== 'blocked-review'
      && (ledgerReview
        ? record.owner === ledgerReview.owner && record.reviewBy === ledgerReview.reviewBy
        : record.owner === manifest.routes[index].owner && isCalendarDate(record.reviewBy)
          && record.reviewBy <= LATEST_DISPOSITION_REVIEW_BY);
    if (WAVE1_APPROVED_ROUTES.includes(record.route)) {
      return shared
        && record.reviewState === 'approved'
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && record.effectiveMenuExposureReview === 'not-applicable'
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave1Approval);
    }
    if (WAVE2_APPROVED_ROUTES.includes(record.route)) {
      return shared
        && record.reviewState === 'approved'
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && ['verified', 'not-applicable'].includes(record.effectiveMenuExposureReview)
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave2Approval);
    }
    if (WAVE3_APPROVED_ROUTES.includes(record.route)) {
      return shared
        && record.reviewState === 'approved'
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && ['verified', 'not-applicable'].includes(record.effectiveMenuExposureReview)
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave3Approval);
    }
    if (WAVE4_APPROVED_ROUTES.includes(record.route)) {
      return shared
        && record.reviewState === 'approved'
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && ['verified', 'not-applicable'].includes(record.effectiveMenuExposureReview)
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave4Approval);
    }
    if (WAVE7_APPROVED_ROUTES.includes(record.route)) {
      return shared
        && record.reviewState === 'approved'
        && record.disposition === WAVE7_DISPOSITIONS[record.route]
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && record.effectiveMenuExposureReview === 'verified'
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave7Approval)
        && record.approvals.securityPrivacy.evidence.some((entry) => entry.includes('처분 변경분'));
    }
    if (WAVE8_APPROVED_ROUTES.includes(record.route)) {
      const retiring = WAVE8_DISPOSITIONS[record.route] === 'retire-candidate';
      return shared
        && record.reviewState === 'approved'
        && record.disposition === WAVE8_DISPOSITIONS[record.route]
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && record.effectiveMenuExposureReview === 'verified'
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave8Approval)
        && record.approvals.securityPrivacy.evidence.some((entry) => entry.includes('처분 변경분'))
        // 퇴역 후보는 삭제 승인이 아니다 — 소유자의 외부 계약 확인과 삭제 시점·rollback 을 근거에 남긴다(IA §8.2).
        && (!retiring || (record.approvals.productIa.evidence.some((entry) => entry.includes('소유자가 2026-11-08'))
          && record.approvals.productIa.evidence.some((entry) => entry.includes('재기록 묶음') && entry.includes('rollback'))));
    }
    if (WAVE6_APPROVED_ROUTES.includes(record.route)) {
      return shared
        && record.reviewState === 'approved'
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && record.effectiveMenuExposureReview === 'verified'
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave6Approval)
        && record.approvals.securityPrivacy.evidence.some((entry) => entry.includes('처분 변경분'));
    }
    if (WAVE5_APPROVED_ROUTES.includes(record.route)) {
      return shared
        && record.reviewState === 'approved'
        && record.disposition === 'consolidate-to-canonical'
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && ['verified', 'not-applicable'].includes(record.effectiveMenuExposureReview)
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave5Approval);
    }
    return shared
      && record.reviewState === 'proposed'
      && record.authorizationReview === 'unverified'
      && record.privacyReview === 'unverified'
      && record.effectiveMenuExposureReview === 'unverified'
      && record.capabilityReview === 'unverified'
      && record.profileOwnershipReview === 'unverified'
      && Object.values(record.approvals).every((approval) => approval === null);
  }));
  assert.ok(overlay.externalAliases.every((record) => (
    record.reviewState === 'approved'
      && record.disposition === 'retain-alias-permanent'
      && record.consumerEvidenceReview === 'verified'
      && record.queryMappingReview === 'verified'
      && record.privacyReview === 'verified'
      && record.authorizationReview === 'verified'
      && record.owner === 'product/IA + domain owner'
      && record.reviewBy === '2026-10-31'
      && Object.values(record.approvals).every(isWave1Approval)
  )));
});

test('the current proposed artifact is structurally green but explicitly blocked from acceptance', () => {
  const result = validate(overlay, { sourceReferences: findDispositionSourceReferences(repoRoot) });
  assert.deepEqual(result.errors, []);
  assert.ok(result.blockers.length > 0);
  assert.ok(result.blockers.includes('acceptedDecision is blocked-input'));
  assert.ok(result.blockers.some((blocker) => /authorizationReview remains unverified/.test(blocker)));
  assert.ok(result.blockers.some((blocker) => /privacyReview remains unverified/.test(blocker)));
  // D5 2단계 (ADR-0007 §Decision 3): 연구·live census 계열 4축은 기관 채택 시점의
  // 재검증 의무로 이전 기록됐으므로 더 이상 blocked-input이 아니다.
  assert.ok(!result.blockers.some((blocker) => blocker.startsWith('acceptanceEvidence.')));
  assert.deepEqual(findDispositionSourceReferences(repoRoot), []);
});

test('acceptance evidence deferral must bind the reference-default ADR exactly', () => {
  // 전건 이전 기록: 4축 모두 exact deferral 레코드이고 ADR-0007 본문 hash에 결속된다.
  for (const key of [
    'researchArtifactSha256',
    'liveMenuArtifactSha256',
    'authorityAssignmentArtifactSha256',
    'effectiveMenuArtifactSha256',
  ]) {
    const record = overlay.acceptanceEvidence[key];
    assert.equal(record.status, 'deferred-to-institution-adoption');
    assert.equal(record.adrId, 'ADR-0007');
    assert.equal(
      record.adrPath,
      'docs/02-architecture/decisions/ADR-0007-reference-default-ia-approval.md',
    );
    assert.equal(record.acceptedRisk, 'approved-without-user-research');
    assert.equal(
      record.adrSha256,
      adrDecisionSha256(record.adrPath, readFileSync(path.join(repoRoot, record.adrPath), 'utf8')),
    );
  }

  const driftedAdr = clone(overlay);
  driftedAdr.acceptanceEvidence.researchArtifactSha256.adrSha256 = '0'.repeat(64);
  assert.match(
    validate(driftedAdr).errors.join('\n'),
    /acceptanceEvidence\.researchArtifactSha256\.adrSha256 drifted from the reference-default ADR/i,
  );

  const fabricatedStatus = clone(overlay);
  fabricatedStatus.acceptanceEvidence.liveMenuArtifactSha256.status = 'measured';
  assert.match(
    validate(fabricatedStatus).errors.join('\n'),
    /acceptanceEvidence\.liveMenuArtifactSha256\.status must equal deferred-to-institution-adoption/i,
  );

  const extraField = clone(overlay);
  extraField.acceptanceEvidence.effectiveMenuArtifactSha256.measuredAt = '2026-08-24';
  assert.match(
    validate(extraField).errors.join('\n'),
    /acceptanceEvidence\.effectiveMenuArtifactSha256 keys must exactly equal/i,
  );

  const wrongAdr = clone(overlay);
  wrongAdr.acceptanceEvidence.authorityAssignmentArtifactSha256.adrId = 'ADR-0004';
  assert.match(
    validate(wrongAdr).errors.join('\n'),
    /acceptanceEvidence\.authorityAssignmentArtifactSha256\.adrId must equal ADR-0007/i,
  );

  // null은 여전히 blocked-input이다 — 이전 기록이 지워지면 다시 acceptance blocker가 된다.
  const erasedDeferral = clone(overlay);
  erasedDeferral.acceptanceEvidence.researchArtifactSha256 = null;
  const erasedResult = validate(erasedDeferral);
  assert.deepEqual(erasedResult.errors, []);
  assert.ok(erasedResult.blockers.includes('acceptanceEvidence.researchArtifactSha256 is blocked-input'));
});

test('route and external alias populations fail closed on missing, duplicate, and extra keys', () => {
  const missingRoute = clone(overlay);
  const [removedRoute] = missingRoute.routes.splice(7, 1);
  assert.match(validate(missingRoute).errors.join('\n'), new RegExp(`missing manifest keys: ${removedRoute.route}`));

  const duplicateRoute = clone(overlay);
  duplicateRoute.routes.push(clone(duplicateRoute.routes[0]));
  assert.match(validate(duplicateRoute).errors.join('\n'), /duplicate route:/i);

  const extraRoute = clone(overlay);
  extraRoute.routes.push({ ...clone(extraRoute.routes[0]), route: '/__unreviewed-extra' });
  assert.match(validate(extraRoute).errors.join('\n'), /contains extra keys: \/__unreviewed-extra/i);

  const missingAlias = clone(overlay);
  const [removedAlias] = missingAlias.externalAliases.splice(0, 1);
  assert.match(
    validate(missingAlias).errors.join('\n'),
    new RegExp(`missing manifest keys: ${removedAlias.source.replaceAll('/', '\\/')}`),
  );

  const duplicateAlias = clone(overlay);
  duplicateAlias.externalAliases.push(clone(duplicateAlias.externalAliases[0]));
  assert.match(validate(duplicateAlias).errors.join('\n'), /duplicate source:/i);

  const extraAlias = clone(overlay);
  extraAlias.externalAliases.push({
    ...clone(extraAlias.externalAliases[0]),
    source: '/__unreviewed-external-alias',
  });
  assert.match(
    validate(extraAlias).errors.join('\n'),
    /contains extra keys: \/__unreviewed-external-alias/i,
  );
});

test('invalid disposition and manifest/schema drift are semantic red fixtures', () => {
  const invalidDisposition = clone(overlay);
  invalidDisposition.routes[0].disposition = 'keep-because-it-looks-useful';
  assert.match(validate(invalidDisposition).errors.join('\n'), /routes\[0\]\.disposition is invalid/i);

  const staleHash = clone(overlay);
  staleHash.manifestRef.sha256 = '0'.repeat(64);
  assert.match(validate(staleHash).errors.join('\n'), /manifestRef\.sha256 drifted/i);

  const weakenedSchema = clone(schema);
  weakenedSchema.$defs.disposition.enum = ['blocked-review'];
  assert.match(validateSchemaDefinition(weakenedSchema).join('\n'), /disposition enum must exactly match/i);

  const missingDirectionSchema = clone(schema);
  delete missingDirectionSchema.$defs.provisionalDirection;
  assert.match(
    validateSchemaDefinition(missingDirectionSchema).join('\n'),
    /provisionalDirection must reject extra fields and require the exact bounded decision/i,
  );

  const weakenedDeferralSchema = clone(schema);
  delete weakenedDeferralSchema.$defs.adoptionDeferredEvidence.properties.acceptedRisk.const;
  assert.match(
    validateSchemaDefinition(weakenedDeferralSchema).join('\n'),
    /adoptionDeferredEvidence must reject extra fields and pin the exact ADR-0007 deferral record/i,
  );

  const detachedEvidenceSchema = clone(schema);
  detachedEvidenceSchema.properties.acceptanceEvidence.properties.researchArtifactSha256 = {
    $ref: '#/$defs/nullableSha256',
  };
  assert.match(
    validateSchemaDefinition(detachedEvidenceSchema).join('\n'),
    /acceptanceEvidence\.researchArtifactSha256 must admit the ADR-0007 deferral record/i,
  );

  const droppedConsumerGuardSchema = clone(schema);
  droppedConsumerGuardSchema.allOf = [];
  assert.match(
    validateSchemaDefinition(droppedConsumerGuardSchema).join('\n'),
    /proposed-state consumer and accepted-decision guard/i,
  );
});

/*
  [2026-10-13 DEC-OPS-302] demo-isolated 는 시연 기능만 싣는 화면의 처분이다(IA §8.2). 결재 기안 화면은 실제 기안 창을 열게 되고
  인증 시작 구성 '공통 기반 + 결재' 가 그 화면을 실었는데도 웨이브 1 의 demo-isolated 승인이 남아 있었다. 처분 계약은 그 화면을
  싣는 시작 구성(라우트 원장의 directProjectionProfiles)을 보고, 시연이 아닌 구성이 하나라도 있으면 붉다.
*/
test('demo-isolated routes are not shipped by a non-demo preset', () => {
  const demoLeak = /demo-isolated route ships in non-demo presets/u;
  assert.doesNotMatch(validate(overlay).errors.join('\n'), demoLeak);

  // 결재 기안 화면을 다시 demo-isolated 로 돌리면 그 화면을 싣는 '공통 기반 + 결재' 가 드러난다.
  const reverted = clone(overlay);
  const draftIndex = reverted.routes.findIndex(({ route }) => route === '/approvals/draft');
  assert.ok(draftIndex >= 0, 'fixture requires the /approvals/draft overlay row');
  reverted.routes[draftIndex].disposition = 'demo-isolated';
  const revertedLeaks = validate(reverted).errors.filter((error) => demoLeak.test(error));
  assert.deepEqual(revertedLeaks, [
    `routes[${draftIndex}] /approvals/draft: demo-isolated route ships in non-demo presets: approval`,
  ]);

  // 대조군: 시연 구성만 싣는 화면 설정은 demo-isolated 로 남아도 통과한다.
  const layoutIndex = overlay.routes.findIndex(({ route }) => route === '/admin/system/layout');
  assert.equal(overlay.routes[layoutIndex]?.disposition, 'demo-isolated');
  assert.deepEqual(manifest.routes.find(({ route }) => route === '/admin/system/layout')?.directProjectionProfiles, ['demo']);

  // 시연 밖 구성이 그 화면을 싣게 되면 같은 처분이 붉다. 싣는 구성을 읽을 수 없어도 통과가 아니다.
  const shippedByCore = clone(manifest);
  shippedByCore.routes.find(({ route }) => route === '/admin/system/layout').directProjectionProfiles = ['core', 'demo'];
  assert.ok(validate(overlay, { manifest: shippedByCore }).errors.includes(
    `routes[${layoutIndex}] /admin/system/layout: demo-isolated route ships in non-demo presets: core`,
  ));
  const unknownShipping = clone(manifest);
  delete unknownShipping.routes.find(({ route }) => route === '/admin/system/layout').directProjectionProfiles;
  assert.ok(validate(overlay, { manifest: unknownShipping }).errors.includes(
    `routes[${layoutIndex}] /admin/system/layout: demo-isolated route ships in non-demo presets: (unknown)`,
  ));
});

test('the provisional direction cannot erase evidence blockers or drift from its accepted ADR', () => {
  const wrongOption = clone(overlay);
  wrongOption.provisionalDirection.optionId = 'role-portals';
  assert.match(
    validate(wrongOption).errors.join('\n'),
    /provisionalDirection\.optionId must equal hybrid-task-centered-management-center/i,
  );

  const missingUnresolvedBoundary = clone(overlay);
  missingUnresolvedBoundary.provisionalDirection.unresolved.pop();
  assert.match(
    validate(missingUnresolvedBoundary).errors.join('\n'),
    /provisionalDirection\.unresolved must preserve every final-acceptance blocker/i,
  );

  const staleAdr = clone(overlay);
  staleAdr.provisionalDirection.adrSha256 = '0'.repeat(64);
  assert.match(
    validate(staleAdr).errors.join('\n'),
    /provisionalDirection\.adrSha256 drifted from the bounded ADR/i,
  );

  const fabricatedFinalAcceptance = clone(overlay);
  fabricatedFinalAcceptance.provisionalDirection.status = 'accepted-final-ia';
  const result = validate(fabricatedFinalAcceptance);
  assert.match(
    result.errors.join('\n'),
    /provisionalDirection\.status must equal accepted-provisional-direction/i,
  );
  assert.ok(result.blockers.includes('acceptedDecision is blocked-input'));
});

test('unverified authorization/privacy and missing approvals cannot impersonate accepted state', () => {
  // 아직 제안 상태인 첫 행으로 본다 — 승인된 행을 다시 'approved' 로 적으면 아무것도 바꾸지 않는다(2026-11-08 부터 routes[0] 은 승인됐다).
  const index = overlay.routes.findIndex(({ reviewState }) => reviewState === 'proposed');
  assert.ok(index >= 0, 'a proposed route remains to exercise the guard');
  const at = (field) => new RegExp(`routes\\[${index}\\]\\.${field}`, 'i');
  const falseRouteApproval = clone(overlay);
  falseRouteApproval.routes[index].reviewState = 'approved';
  const routeErrors = validate(falseRouteApproval).errors.join('\n');
  assert.match(routeErrors, /approved route review is incomplete: /i);
  assert.match(routeErrors, at('authorizationReview remains unverified'));

  const falseAccepted = clone(overlay);
  falseAccepted.state = 'accepted';
  const errors = validate(falseAccepted).errors.join('\n');
  assert.match(errors, /accepted transition blocked: acceptedDecision is blocked-input/i);
  for (const field of ['authorizationReview remains unverified', 'privacyReview remains unverified', 'approvals\\.domain is blocked-input']) {
    assert.match(errors, new RegExp(`accepted transition blocked: routes\\[${index}\\]\\.${field}`, 'i'));
  }
});

test('proposed consumers unlock only through the ADR-0007 gates and stay fail-closed otherwise', () => {
  const prematureDecision = clone(overlay);
  prematureDecision.acceptedDecision = {};
  assert.match(
    validate(prematureDecision).errors.join('\n'),
    /proposed overlay must not carry acceptedDecision metadata/i,
  );

  const consumerEntrypoint = 'frontend/src/app/components/layout/sidebar.tsx';

  // 해제 경로(green): 참조-기본 결정 4축 기록 + 개별 approved record ≥ 1 + 등록된 entrypoint.
  const gatedMenu = clone(overlay);
  gatedMenu.consumerBindings.menu = { enabled: true, entrypoints: [consumerEntrypoint] };
  assert.deepEqual(
    validate(gatedMenu, { sourceReferences: [consumerEntrypoint] }).errors,
    [],
  );

  // red: 개별 approved record가 하나도 없으면 소비를 열 수 없다(일괄 승인 창작 금지).
  const noApprovedRecords = clone(gatedMenu);
  for (const record of noApprovedRecords.routes) {
    if (record.reviewState === 'approved') record.reviewState = 'proposed';
  }
  for (const record of noApprovedRecords.externalAliases) {
    if (record.reviewState === 'approved') record.reviewState = 'proposed';
  }
  assert.match(
    validate(noApprovedRecords).errors.join('\n'),
    /proposed consumers require at least one individually approved record/i,
  );

  // red: acceptanceEvidence 축이 하나라도 미기록(null)이면 소비를 열 수 없다.
  const missingEvidence = clone(gatedMenu);
  missingEvidence.acceptanceEvidence.researchArtifactSha256 = null;
  assert.match(
    validate(missingEvidence).errors.join('\n'),
    /proposed consumers require every acceptanceEvidence axis/i,
  );

  // red: entrypoint에 등록되지 않은 실행 소비자는 binding disabled 여부와 무관하게 차단된다.
  assert.match(
    validate(overlay, { sourceReferences: [consumerEntrypoint] }).errors.join('\n'),
    /proposed executable consumer is not registered/i,
  );

  // red: enabled인데 entrypoints가 비면 실행 소비자를 특정하지 못한다.
  const anonymousConsumer = clone(overlay);
  anonymousConsumer.consumerBindings.menu = { enabled: true, entrypoints: [] };
  assert.match(
    validate(anonymousConsumer).errors.join('\n'),
    /entrypoints must identify an executable consumer while enabled/i,
  );
});

test('package and governance bindings fail red when the operational catalog is narrowed', () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const registry = JSON.parse(readFileSync(path.join(repoRoot, 'config', 'governance', 'gates.json'), 'utf8'));
  const governanceTestSource = readFileSync(
    path.join(repoRoot, 'scripts', 'governance-gates-contract.test.mjs'),
    'utf8',
  );
  assert.deepEqual(validateOperationalBinding({ packageJson, registry, governanceTestSource }), []);

  const missingRequirements = clone(packageJson);
  missingRequirements.scripts['test:operational-contracts'] = missingRequirements.scripts['test:operational-contracts'].replace(' "tools/requirements-workspace/*.test.mjs"', '');
  assert.match(
    validateOperationalBinding({ packageJson: missingRequirements, registry, governanceTestSource }).join('\n'),
    /package operational runner no longer covers/i,
    'omitting the requirements workspace must still fail closed',
  );

  const narrowedPackage = clone(packageJson);
  narrowedPackage.scripts['test:operational-contracts'] = 'node --test scripts/required-checks-contract.test.mjs';
  assert.match(
    validateOperationalBinding({
      packageJson: narrowedPackage,
      registry,
      governanceTestSource,
    }).join('\n'),
    /package operational runner no longer covers/i,
  );

  const narrowedRegistry = clone(registry);
  const operational = narrowedRegistry.gateSets.find(
    ({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS',
  );
  operational.selector.catalogs = operational.selector.catalogs.filter(({ root }) => root !== 'scripts');
  assert.match(
    validateOperationalBinding({
      packageJson,
      registry: narrowedRegistry,
      governanceTestSource,
    }).join('\n'),
    /governance operational catalog no longer covers/i,
  );

  for (const asset of [
    'config/ui-navigation-disposition-proposal.json',
    'docs/02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md',
  ]) {
    const bindingLine = `  '${asset}',`;
    assert.equal(
      governanceTestSource.split(/\r?\n/u).filter((line) => line === bindingLine).length,
      1,
      `negative fixture requires exactly one governance binding for ${asset}`,
    );
    const missingFoundationBinding = governanceTestSource.replace(bindingLine, '');
    assert.notEqual(missingFoundationBinding, governanceTestSource);
    assert.match(
      validateOperationalBinding({
        packageJson,
        registry,
        governanceTestSource: missingFoundationBinding,
      }).join('\n'),
      new RegExp(`governance UI/UX foundation binding is missing ${asset.replaceAll('/', '\\/').replaceAll('.', '\\.')}`, 'i'),
    );
  }
});

// 처분 제안은 라우트 원장 파일 전체가 아니라 처분이 의존하는 범위(경로·별칭 모집단과 shell·role·menu·target·상태·구역·profile 소유)에만 결속한다.
test('the manifest binding follows route population and disposition metadata, not capability detail', () => {
  assert.deepEqual(validate(overlay).errors, []);
  const drifted = (changed) => validate(overlay, { manifest: changed }).errors.join('\n');

  const added = clone(manifest);
  added.routes.push({ ...clone(manifest.routes[0]), route: '/__unreviewed-route', source: 'frontend/src/app/__unreviewed-route/page.tsx' });
  const removed = clone(manifest);
  removed.routes.pop();
  const retargeted = clone(manifest);
  const redirect = retargeted.routes.find((row) => row.routing?.kind === 'page-redirect');
  redirect.routing = { ...redirect.routing, target: `${redirect.routing.target}-moved` };
  const menuChanged = clone(manifest);
  menuChanged.routes[0].menuExposure = menuChanged.routes[0].menuExposure === 'visible' ? 'hidden' : 'visible';
  for (const [reason, changed] of [['route added', added], ['route removed', removed],
    ['redirect target changed', retargeted], ['menu exposure changed', menuChanged]]) {
    assert.match(drifted(changed), /manifestRef\.sha256 drifted from the current manifest/i, reason);
  }
  assert.match(drifted(added), /overlay\.routes .*missing.*\/__unreviewed-route|\/__unreviewed-route/i, 'the population check still names the new route');

  const detail = clone(manifest);
  detail.routes[0].visibleLabel = `${detail.routes[0].visibleLabel} (renamed)`;
  detail.routes[0].supportedActions = [...detail.routes[0].supportedActions, 'synthetic-action'];
  detail.routes[0].capabilities[0].evidence = [...detail.routes[0].capabilities[0].evidence, 'docs/synthetic-evidence.md'];
  detail.routes[0].capabilities[0].lastVerifiedAt = '2099-01-01';
  detail.routes[0].observedPageRedirectCalls = [...detail.routes[0].observedPageRedirectCalls, 'synthetic'];
  detail.notes = [...detail.notes, 'synthetic note'];
  assert.equal(dispositionManifestSha256(detail), overlay.manifestRef.sha256);
  assert.deepEqual(validate(overlay, { manifest: detail }).errors, [], 'capability detail edits must not require rebinding the proposal');
});

test('ADR bindings cover the decision sections, not header metadata or link sections', (t) => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'egov-disposition-adr-'));
  t.after(() => {
    assert.ok(path.basename(temp).startsWith('egov-disposition-adr-'));
    rmSync(temp, { recursive: true, force: true });
  });
  const adr4 = 'docs/02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md';
  const adr7 = 'docs/02-architecture/decisions/ADR-0007-reference-default-ia-approval.md';
  const original = Object.fromEntries([adr4, adr7].map((file) => [file, readFileSync(path.join(repoRoot, file), 'utf8')]));
  const write = (contents) => {
    for (const [file, text] of Object.entries(contents)) {
      mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
      writeFileSync(path.join(temp, file), text);
    }
  };
  // ADR 결속 오류만 본다 — 라우트 원장 결속은 앞 시험이 따로 본다.
  const errorsWith = (contents) => {
    write(contents);
    return validate(overlay, { repoRoot: temp }).errors.filter((error) => /\.adr(?:Sha256|Path)\b/.test(error)).join('\n');
  };

  assert.equal(errorsWith(original), '');
  const headerEdited = {
    [adr4]: original[adr4].replace('- **Date:** 2026-08-21', '- **후속 결정:** 머리 줄 수정은 결속을 깨지 않는다.\n- **Date:** 2026-08-21'),
    [adr7]: `${original[adr7].trimEnd()}\n- [synthetic link](README.md) — 정본 연결 수정\n`,
  };
  assert.notEqual(headerEdited[adr4], original[adr4]);
  assert.equal(errorsWith(headerEdited), '', 'header and link edits outside the decision sections stay green');

  const decision4 = { ...original, [adr4]: original[adr4].replace('대안 3인', '대안 2인') };
  assert.notEqual(decision4[adr4], original[adr4]);
  assert.match(errorsWith(decision4), /provisionalDirection\.adrSha256 drifted from the bounded ADR/i);
  const risk7 = { ...original, [adr7]: original[adr7].replace('이 승인은 **사용자 연구 없이**', '이 승인은 **사용자 연구와 함께**') };
  assert.notEqual(risk7[adr7], original[adr7]);
  assert.match(errorsWith(risk7), /acceptanceEvidence\.researchArtifactSha256\.adrSha256 drifted from the reference-default ADR/i);
  const missing = { ...original, [adr4]: original[adr4].replace('## Decision', '## Decision (renamed)') };
  assert.match(errorsWith(missing), /provisionalDirection\.adrPath must contain each bound section exactly once: Decision/i);
});

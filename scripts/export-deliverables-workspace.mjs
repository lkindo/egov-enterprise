#!/usr/bin/env node
/**
 * 앞단 요구사항·백로그·Fit-Gap 작업공간 CLI (DEC-OPS-382 ②, DEC-OPS-397, DEC-OPS-399).
 *
 * 아키텍처 원칙:
 * 1. 기관 고유 요구사항(RFP·인터뷰·현행 장표·백로그)은 공개 원본 저장소 안에 커밋하지 않는다(DEC-OPS-382 ②).
 *    저장소 안 비무시 폴더에 미추적 파일(*.csv, *.md)을 두면 project:ui(generate-reusable-base-source.mjs --allow-dirty)나
 *    git add -A 경로에 노출되므로, 이 도구의 작업공간(--workspace)은 반드시 어느 Git 작업 트리에도 속하지 않는
 *    checkout 밖 경로여야 한다.
 * 2. 저장소는 가벼운 CLI 와 3종 교환 계약(context.snapshot.json / backlog.json / rtm.csv)만 소유한다.
 * 3. 완료 상태를 한 칸으로 뭉개지 않는다(4층 분리):
 *    - ① 계획·범위 층: solutionDisposition(fit/config/gap-dev/hybrid/undecided) + scopeDisposition(proposed/included/deferred/excluded) + linkIntent(candidate/planned/existing)
 *    - ② 도구 관측 층: found(저장소 원장 존재 여부 — true/false)
 *    - ③ 원장 검토 층: ledgerStatus(partial/unverified/unavailable/demo) + evidenceLevel(E0~E3)
 *    - ④ 기관 인수 층: acceptanceDisposition(pending/accepted/conditional/rejected)
 *    백로그에 수동 status: "implemented" 같은 완료 주장을 적는 것을 스키마 검증에서 거부한다.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANNED_CLAIMS, BLANK, cellText, loadInputs, mdCell, toCsv } from './export-deliverables.mjs';
import { requirementSheet, routeOwnerResolver } from './export-deliverables-trace.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

export const WORKSPACE_SCHEMA_VERSION = 1;
export const SOURCE_TYPES = Object.freeze(['rfp', 'interview', 'as-is-artifact', 'regulation', 'policy-memo', 'other']);
export const REQUIREMENT_TYPES = Object.freeze(['functional', 'non-functional', 'data', 'interface', 'constraint']);
export const SOLUTION_DISPOSITIONS = Object.freeze(['fit', 'config', 'gap-dev', 'hybrid', 'undecided']);
export const SCOPE_DISPOSITIONS = Object.freeze(['proposed', 'included', 'deferred', 'excluded']);
export const WORK_ITEM_TYPES = Object.freeze(['epic', 'story', 'configuration', 'verification', 'enabler']);
export const PRIORITIES = Object.freeze(['MUST', 'SHOULD', 'COULD', 'WONT']);
export const AC_POLARITIES = Object.freeze(['allow', 'forbid']);
export const VERIFICATION_METHODS = Object.freeze(['unit-test', 'integration-test', 'e2e', 'harness-gate', 'load-test', 'manual-uat', 'config-check']);
export const TARGET_KINDS = Object.freeze(['capability', 'screen', 'interface']);
export const LINK_INTENTS = Object.freeze(['candidate', 'planned', 'existing']);
export const ACCEPTANCE_DISPOSITIONS = Object.freeze(['pending', 'accepted', 'conditional', 'rejected']);

/** 백로그 엔터티 어디에도 수동 구현 완료 상태를 적지 못하게 막는 금지 키 목록 */
export const FORBIDDEN_STATUS_FIELDS = Object.freeze([
  'status',
  'state',
  'progress',
  'implementationStatus',
  'implemented',
  'devStatus',
  'done',
  'completed',
]);

export const ALLOWED_PACK_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'project',
  'contextSnapshotDigest',
  'isSample',
  'sources',
  'businessRequirements',
  'workItems',
  'acceptanceCriteria',
  'traceLinks',
]);

export const ALLOWED_SOURCE_KEYS = Object.freeze([
  'id',
  'sourceType',
  'title',
  'reference',
  'collectedOn',
  'stakeholder',
  'summary',
  'excerpts',
]);

export const ALLOWED_REQUIREMENT_KEYS = Object.freeze([
  'id',
  'sourceIds',
  'title',
  'description',
  'requirementType',
  'solutionDisposition',
  'scopeDisposition',
  'moduleCandidates',
  'nfrCriteria',
  'rationale',
  'openQuestions',
  'acceptanceDisposition',
]);

export const ALLOWED_WORK_ITEM_KEYS = Object.freeze([
  'id',
  'workItemType',
  'parentEpicId',
  'requirementIds',
  'title',
  'description',
  'asA',
  'iWant',
  'soThat',
  'priority',
  'batch',
  'archetype',
  'decisionCards',
]);

export const ALLOWED_AC_KEYS = Object.freeze([
  'id',
  'workItemId',
  'requirementIds',
  'polarity',
  'given',
  'when',
  'then',
  'verificationMethod',
]);

export const ALLOWED_TRACE_LINK_KEYS = Object.freeze([
  'id',
  'requirementId',
  'workItemId',
  'acId',
  'targetKind',
  'targetId',
  'linkIntent',
  'notes',
]);

export const ARCHETYPE_CATALOG = Object.freeze([
  { id: 'A1', name: '조회형 목록 (WorkListPage)', description: '검색·필터·표·페이지네이션·일괄/행 액션 중심의 기본 목록 화면' },
  { id: 'A2', name: '마스터-디테일 (Master-Detail)', description: '좌측/상단 목록 선택과 우측/하단 상세·하위 항목 편집 결합 화면' },
  { id: 'A3', name: '인라인·모달 폼 편집 (Form/Modal)', description: '단건 등록·수정 폼 검증 및 즉시 저장 화면' },
  { id: 'A4', name: '계층 트리 편집 (Hierarchy/Tree)', description: '메뉴·조직·분류 코드 등 상하위 트리 탐색·이동 화면' },
  { id: 'A5', name: '단계형 마법사 (Step Wizard)', description: '다단계 입력·검증·미리보기·확정 절차 화면' },
  { id: 'A6', name: '타임라인·캘린더·보드 (Schedule/Board)', description: '일정·승인 흐름·상태 전이 중심 화면' },
  { id: 'A7', name: '현황 대시보드 + 원본 표 (Status + Raw Table)', description: '집계 지표 카드와 근거 원본 목록을 함께 제시하는 화면' },
]);

export const DECISION_CARD_AXES = Object.freeze([
  { id: 'D-1', axis: '화면 유형·밀도·레이아웃', description: 'A1~A7 중 채택 유형, 탭/모달 분리, 열 구성 및 반응형 보존 기준' },
  { id: 'D-2', axis: '인가 의미 (H3)', description: 'owner-only / owner-or-admin / admin-only 및 비인가 시 403/404 존재 은닉 기준' },
  { id: 'D-3', axis: '식별자 축·물리 스키마 (H1)', description: 'esntlId vs loginId 조인 축, tb_/vw_/sq_ 물리 명명, 표준 단어·용어·도메인 정합' },
  { id: 'D-4', axis: '입력 계약·무결성', description: '필수/길이/형식 제약(DTO ↔ OpenAPI ↔ Zod), 서버 소유 READ_ONLY 필드, 잠금·원자성' },
  { id: 'D-5', axis: '상태·오류 정직성 및 부정 시험 (H5)', description: '빈 상태 vs 조회 실패 분리, 은닉 값 null 처리, 의도적 위반이 red 가 되는 부정 시험' },
]);

function sha256(text) {
  return createHash('sha256').update(text.replace(/\r\n/gu, '\n'), 'utf8').digest('hex');
}

function resolveExistingRealpath(targetPath) {
  const abs = resolve(targetPath);
  const tail = [];
  let current = abs;
  while (true) {
    try {
      const resolvedBase = realpathSync.native(current);
      return {
        resolvedPath: tail.length ? resolve(resolvedBase, ...tail) : resolvedBase,
        nearestExistingDir: resolvedBase,
      };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const parent = dirname(current);
      if (parent === current) {
        return {
          resolvedPath: tail.length ? resolve(current, ...tail) : current,
          nearestExistingDir: current,
        };
      }
      tail.unshift(relative(parent, current));
      current = parent;
    }
  }
}

function normCase(p) {
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

function isOutsideBase(baseReal, candidateReal) {
  const rel = relative(normCase(baseReal), normCase(candidateReal));
  if (!rel) return false;
  if (isAbsolute(rel)) return true;
  return rel === '..' || rel.startsWith(`..${sep}`);
}

/**
 * 작업공간 경로가 저장소 checkout 밖인지 검증한다.
 * - `..req-ws` 처럼 `..` 로 시작하는 저장소 내부 폴더명을 우회로 통과시키지 않는다.
 * - 심볼릭 링크·junction·대소문자 우회를 막기 위해 가장 가까운 실존 상위 경로의 native realpath 를 대조한다.
 * - 기본적으로 대상 경로의 가장 가까운 실존 상위 폴더가 어떤 Git 작업 트리(`git rev-parse --show-toplevel`) 안이면 거부한다.
 */
export function assertWorkspaceOutsideCheckout(root, workspaceDir, options = {}) {
  if (!workspaceDir || typeof workspaceDir !== 'string' || !workspaceDir.trim()) {
    throw new Error('--workspace requires a non-empty directory path outside the repository checkout');
  }
  const { resolvedPath: rootReal } = resolveExistingRealpath(root);
  const { resolvedPath: wsReal, nearestExistingDir } = resolveExistingRealpath(resolve(root, workspaceDir));
  if (!isOutsideBase(rootReal, wsReal)) {
    throw new Error(`requirements workspace must be outside the repository checkout (${rootReal}): ${workspaceDir}`);
  }
  if (options.checkGitWorktree !== false) {
    let gitTopLevel = null;
    try {
      gitTopLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: nearestExistingDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 3000,
      }).trim();
    } catch {
      gitTopLevel = null;
    }
    if (gitTopLevel) {
      throw new Error(`requirements workspace must be outside any git working tree (${gitTopLevel}): ${workspaceDir}`);
    }
  }
  return wsReal;
}

function readRepoCommit(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    }).trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 저장소 원장(inputs)으로부터 앞단 Fit-Gap·백로그 바인딩용 읽기 전용 스냅숏을 생성한다.
 * 커밋 SHA 와 무관한 결정적 snapshotDigest 를 계산해 원장 변경 여부를 추적한다.
 */
export function buildContextSnapshot(inputs, options = {}) {
  const ownersOf = routeOwnerResolver(inputs.moduleFiles ?? {});
  const modules = Object.entries(inputs.moduleFiles ?? {})
    .filter(([, mod]) => typeof mod?.id === 'string')
    .map(([, mod]) => ({
      id: mod.id,
      label: mod.label ?? mod.name ?? (mod.id === 'core' ? '공통 기반' : mod.id),
      group: mod.presentation?.group ?? (mod.id === 'core' ? 'core' : null),
      required: mod.id === 'core' || Boolean(mod.required),
      routesCount: Array.isArray(mod.owns?.routes) ? mod.owns.routes.length : 0,
      tablesCount: Array.isArray(mod.owns?.tables) ? mod.owns.tables.length : 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const routeMap = new Map(
    (inputs.routes?.routes ?? [])
      .filter((r) => r.routing?.kind !== 'page-redirect')
      .map((r) => [r.route, r]),
  );

  const screens = (inputs.registry?.screens ?? [])
    .map((scr) => {
      const routeEntry = routeMap.get(scr.route);
      return {
        route: scr.route,
        label: scr.label ?? null,
        modules: ownersOf(scr.route),
        status: routeEntry?.status ?? null,
        demo: Boolean(scr.demo),
        entryPermissions: scr.entry?.permissions ?? [],
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));

  const capabilities = [];
  for (const r of inputs.routes?.routes ?? []) {
    if (r.routing?.kind === 'page-redirect') continue;
    const mods = ownersOf(r.route);
    for (const cap of r.capabilities ?? []) {
      capabilities.push({
        id: `${r.route}#${cap.id}`,
        route: r.route,
        capabilityId: cap.id,
        modules: mods,
        status: cap.status ?? null,
        evidenceLevel: cap.evidenceLevel ?? null,
      });
    }
  }
  capabilities.sort((a, b) => a.id.localeCompare(b.id));

  const interfaces = (inputs.policies?.operationBindings ?? [])
    .map((op) => ({
      id: `${op.method} ${op.path}`,
      method: op.method,
      path: op.path,
      access: op.access ?? null,
      permission: op.permission ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const payloadForDigest = JSON.stringify({
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    modules,
    screens,
    capabilities,
    interfaces,
    archetypes: ARCHETYPE_CATALOG,
    decisionCardAxes: DECISION_CARD_AXES,
  });

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    kind: 'egov-enterprise-context-snapshot',
    commit: options.commit ?? 'unknown',
    snapshotDigest: sha256(payloadForDigest),
    summary: {
      modules: modules.length,
      screens: screens.length,
      capabilities: capabilities.length,
      interfaces: interfaces.length,
    },
    archetypes: ARCHETYPE_CATALOG,
    decisionCardAxes: DECISION_CARD_AXES,
    modules,
    screens,
    capabilities,
    interfaces,
  };
}

/**
 * 실제 프로젝트 착수 시 기본으로 생성하는 빈 작업공간 골격.
 * 합성 표본 데이터가 실제 프로젝트의 rtm.csv 와 산출물로 흘러들지 않도록 기본은 빈 배열로 시작한다.
 */
export function createEmptyBacklogPack(contextSnapshot) {
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    kind: 'egov-enterprise-requirements-backlog',
    isSample: false,
    project: {
      code: 'PRJ-YYYY-001',
      name: '프로젝트 이름을 입력하십시오',
      institution: '발주기관명을 입력하십시오',
      baselineProfile: 'core',
    },
    contextSnapshotDigest: contextSnapshot?.snapshotDigest ?? null,
    sources: [],
    businessRequirements: [],
    workItems: [],
    acceptanceCriteria: [],
    traceLinks: [],
  };
}

/**
 * --sample 옵션일 때만 생성하는 P0~P5 예시 백로그 패키지.
 */
export function createSampleBacklogPack(contextSnapshot) {
  const sampleCap = contextSnapshot?.capabilities?.find((c) => c.id === '/admin/content/banners-popups#popup.manage')
    ?? contextSnapshot?.capabilities?.[0]
    ?? { id: '/admin/content/banners-popups#popup.manage', route: '/admin/content/banners-popups' };
  const sampleScreen = contextSnapshot?.screens?.find((s) => s.route === '/admin/security/login-policy')
    ?? contextSnapshot?.screens?.[0]
    ?? { route: '/admin/security/login-policy' };

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    kind: 'egov-enterprise-requirements-backlog',
    isSample: true,
    project: {
      code: 'SAMPLE-PUBLIC-2026',
      name: 'OO기관 행정포털 차세대 구축사업 (합성 표본)',
      institution: 'OO기관 (합성 표본 — 실제 제출 금지)',
      baselineProfile: 'collaboration',
    },
    contextSnapshotDigest: contextSnapshot?.snapshotDigest ?? null,
    sources: [
      {
        id: 'SRC-RFP-001',
        sourceType: 'rfp',
        title: '제안요청서(RFP) 3.2 기능·성능·보안 요구사항',
        reference: 'RFP-p42-SFR-001',
        collectedOn: '2026-11-01',
        stakeholder: '정보화담당관실',
        summary: '포털 팝업·배너 공지 관리, 관리자 로그인 정책 설정, 다건 일괄 노출 중지 및 목록 응답성 기준.',
        excerpts: [
          'SFR-001: 관리자는 메인 팝업 공지를 등록·수정·조회하고 게시 기간을 설정할 수 있어야 한다.',
          'SFR-002: 기관 보안 지침에 따라 관리자 로그인 허용 IP 대역과 2단계 인증 정책을 설정할 수 있어야 한다.',
          'SFR-003: 긴급 점검 시 선택한 다수 팝업을 일괄 노출 중지하고 사유를 남길 수 있어야 한다.',
          'PER-001: 팝업 관리 목록 조회는 동시 50명 기준 95백분위 응답시간 800ms 이내여야 한다.',
          'INT-099: 레거시 대외 G4C 전용 단말 프로토콜 직접 연계를 지원해야 한다.',
        ],
      },
      {
        id: 'SRC-MIN-001',
        sourceType: 'interview',
        title: '착수 요구사항 상세화 인터뷰 회의록 #1',
        reference: 'MIN-2026-1102-01',
        collectedOn: '2026-11-02',
        stakeholder: '운영팀·보안담당',
        summary: '일괄 노출 중지 시 사유 필수 입력 확정, G4C 전용 단말 연계는 차기 고도화 사업으로 범위 제외 합의.',
        excerpts: [
          '일괄 노출 중지 시 사유(최소 2자, 최대 200자)를 필수로 입력받고 권한 없는 사용자는 403으로 차단한다.',
          'INT-099(G4C 전용 단말 연계)는 행안부 표준 API 전환 일정에 따라 금차 사업 범위에서 제외(excluded)한다.',
        ],
      },
    ],
    businessRequirements: [
      {
        id: 'REQ-SFR-001',
        sourceIds: ['SRC-RFP-001'],
        title: '팝업 공지 기본 관리 및 게시 기간 설정',
        description: '관리자가 포털 팝업 공지를 등록·수정·조회하고 게시 시작·종료 일시를 설정한다.',
        requirementType: 'functional',
        solutionDisposition: 'fit',
        scopeDisposition: 'included',
        moduleCandidates: ['promotion'],
        rationale: '기존 promotion 모듈의 배너·팝업 관리 화면과 역량을 그대로 재사용한다.',
        openQuestions: [],
        acceptanceDisposition: 'pending',
      },
      {
        id: 'REQ-SFR-002',
        sourceIds: ['SRC-RFP-001'],
        title: '기관 보안 지침에 따른 로그인 정책 구성',
        description: '기관 관리자 허용 IP 대역 및 OTP 의무 정책을 설정하고 마지막 관리자 잠금 보호 가드를 유지한다.',
        requirementType: 'functional',
        solutionDisposition: 'config',
        scopeDisposition: 'included',
        moduleCandidates: ['core'],
        rationale: '신규 코드 개발 없이 core 모듈의 로그인 정책 화면과 프로필 설정으로 충족한다.',
        openQuestions: [],
        acceptanceDisposition: 'pending',
      },
      {
        id: 'REQ-SFR-003',
        sourceIds: ['SRC-RFP-001', 'SRC-MIN-001'],
        title: '팝업 공지 다건 선택 일괄 노출 중지 및 사유 기록',
        description: '운영자가 다수 팝업을 선택해 사유를 입력하고 한 번에 노출 중지(ntceAt=N) 처리한다.',
        requirementType: 'functional',
        solutionDisposition: 'gap-dev',
        scopeDisposition: 'included',
        moduleCandidates: ['promotion'],
        rationale: '현재 단건 수정만 있으므로 일괄 노출 중지 API·화면 액션·부정 시험을 수직 슬라이스로 추가 개발한다.',
        openQuestions: [],
        acceptanceDisposition: 'pending',
      },
      {
        id: 'REQ-PER-001',
        sourceIds: ['SRC-RFP-001'],
        title: '팝업 목록 조회 응답 시간 기준 충족',
        description: '팝업 목록 조회 API 가 동시 사용자 부하에서 목표 응답 시간을 만족해야 한다.',
        requirementType: 'non-functional',
        solutionDisposition: 'fit',
        scopeDisposition: 'included',
        moduleCandidates: ['promotion'],
        nfrCriteria: {
          metric: 'p95_latency_ms',
          threshold: 'p95 <= 800ms at 50 VUs (dataset >= 10,000 rows)',
          verificationMethod: 'load-test',
        },
        rationale: '기존 인덱스·페이징 쿼리를 대상으로 부하 시험 시나리오로 검증한다.',
        openQuestions: [],
        acceptanceDisposition: 'pending',
      },
      {
        id: 'REQ-INT-099',
        sourceIds: ['SRC-RFP-001', 'SRC-MIN-001'],
        title: '레거시 G4C 전용 단말 프로토콜 직접 연계',
        description: '폐지 예정인 구형 G4C 전용 단말 소켓 프로토콜을 직접 연계한다.',
        requirementType: 'interface',
        solutionDisposition: 'undecided',
        scopeDisposition: 'excluded',
        moduleCandidates: [],
        rationale: '착수 회의록(MIN-2026-1102-01) 합의에 따라 표준 API 전환 후 차기 사업에서 추진하기로 금차 범위에서 제외.',
        openQuestions: [],
        acceptanceDisposition: 'pending',
      },
    ],
    workItems: [
      {
        id: 'EPIC-PROMO',
        workItemType: 'epic',
        parentEpicId: null,
        requirementIds: ['REQ-SFR-001', 'REQ-SFR-003', 'REQ-PER-001'],
        title: '포털 팝업·배너 공지 운영 관리',
        description: '팝업 기본 관리(Fit), 다건 일괄 노출 중지(Gap 개발), 목록 성능 검증을 포괄하는 에픽.',
        priority: 'MUST',
        batch: 'Batch-1',
      },
      {
        id: 'EPIC-SEC-POLICY',
        workItemType: 'epic',
        parentEpicId: null,
        requirementIds: ['REQ-SFR-002'],
        title: '기관 보안·로그인 정책 구성',
        description: '기관 환경에 맞는 관리자 접근 제어 및 2단계 인증 정책 구성 에픽.',
        priority: 'MUST',
        batch: 'Batch-1',
      },
      {
        id: 'US-PROMO-001',
        workItemType: 'story',
        parentEpicId: 'EPIC-PROMO',
        requirementIds: ['REQ-SFR-001'],
        title: '기존 팝업 목록 조회·단건 관리 역량 적합성 확인',
        asA: '포털 운영 관리자',
        iWant: '등록된 팝업 목록을 검색하고 게시 기간과 노출 상태를 관리',
        soThat: '대민 포털에 게시되는 공지 팝업을 통제할 수 있다',
        priority: 'MUST',
        batch: 'Batch-1',
        archetype: 'A1',
        decisionCards: ['D-1: 기존 A1 목록·폼 유지'],
      },
      {
        id: 'US-PROMO-002',
        workItemType: 'story',
        parentEpicId: 'EPIC-PROMO',
        requirementIds: ['REQ-SFR-003'],
        title: '팝업 다건 선택 일괄 노출 중지 및 사유 기록',
        asA: '포털 운영 관리자',
        iWant: '목록에서 여러 팝업을 선택해 사유를 입력하고 일괄 노출 중지 처리',
        soThat: '긴급 상황에서 다수의 팝업을 즉시 내리고 감사 근거를 남길 수 있다',
        priority: 'SHOULD',
        batch: 'Batch-2',
        archetype: 'A1',
        decisionCards: [
          'D-1: A1 WorkListPage 일괄 액션 바 사용',
          'D-2: POPUP_ADMIN_WRITE 권한 및 @AdminOrSystem 2차 가드(H3)',
          'D-3: popupId 물리 PK 및 표준 용어 준수(H1)',
          'D-4: 중지 사유 2~200자 필수 입력 검증',
          'D-5: 처리 건수 안내 토스트 및 권한 없는 호출 403 차단 부정 시험(H5)',
        ],
      },
      {
        id: 'CFG-SEC-001',
        workItemType: 'configuration',
        parentEpicId: 'EPIC-SEC-POLICY',
        requirementIds: ['REQ-SFR-002'],
        title: '기관 관리자 허용 IP 대역 및 OTP 의무 정책 반영',
        description: '로그인 정책 화면에서 기관 보안 지침을 반영하고 관리자 보호 계정 가드 동작을 확인한다.',
        priority: 'MUST',
        batch: 'Batch-1',
        archetype: 'A3',
        decisionCards: ['D-4: IP 대역 형식 및 시간대 검증 유지'],
      },
      {
        id: 'VRF-PERF-001',
        workItemType: 'verification',
        parentEpicId: 'EPIC-PROMO',
        requirementIds: ['REQ-PER-001'],
        title: '팝업 목록 조회 50 VU 부하 시험 수행',
        description: '10,000건 시드 데이터 기준 GET /api/v1/admin/system/popups 의 p95 <= 800ms 충족 여부를 측정한다.',
        priority: 'MUST',
        batch: 'Batch-2',
      },
    ],
    acceptanceCriteria: [
      {
        id: 'AC-PROMO-001-G1',
        workItemId: 'US-PROMO-001',
        requirementIds: ['REQ-SFR-001'],
        polarity: 'allow',
        given: 'BANNER_ADMIN_READ 권한이 있는 운영 관리자로 로그인했을 때',
        when: '배너·팝업 관리 화면에서 팝업 목록을 조회하면',
        then: '등록된 팝업 제목·기간·노출 상태 목록이 정상 표시된다',
        verificationMethod: 'e2e',
      },
      {
        id: 'AC-PROMO-002-G1',
        workItemId: 'US-PROMO-002',
        requirementIds: ['REQ-SFR-003'],
        polarity: 'allow',
        given: '노출 중인 팝업 2건을 선택하고 중지 사유를 입력했을 때',
        when: '일괄 노출 중지를 실행하면',
        then: '선택한 팝업의 노출 여부가 N으로 변경되고 사유가 기록된다',
        verificationMethod: 'integration-test',
      },
      {
        id: 'AC-PROMO-002-R1',
        workItemId: 'US-PROMO-002',
        requirementIds: ['REQ-SFR-003'],
        polarity: 'forbid',
        given: '쓰기 권한이 없는 일반 사용자이거나 중지 사유가 비어 있을 때',
        when: '일괄 노출 중지 API 를 호출하면',
        then: '403 Forbidden 또는 400 Bad Request 로 거부되고 어떤 행도 변경되지 않는다(H3/H5)',
        verificationMethod: 'integration-test',
      },
      {
        id: 'AC-SEC-001-R1',
        workItemId: 'CFG-SEC-001',
        requirementIds: ['REQ-SFR-002'],
        polarity: 'forbid',
        given: '활성 시스템 관리자가 1명뿐일 때',
        when: '그 관리자를 잠그는 로그인 정책을 저장하려 하면',
        then: '마지막 관리자 잠금 보호 가드가 저장을 거부한다(H3/H5)',
        verificationMethod: 'integration-test',
      },
      {
        id: 'AC-PERF-001-G1',
        workItemId: 'VRF-PERF-001',
        requirementIds: ['REQ-PER-001'],
        polarity: 'allow',
        given: '팝업 10,000건 시드 환경에서 동시 50 VU 가 조회할 때',
        when: '5분간 부하 시험을 실행하면',
        then: '오류율 0% 이고 p95 응답 시간이 800ms 이하이다',
        verificationMethod: 'load-test',
      },
    ],
    traceLinks: [
      {
        id: 'TRL-001',
        requirementId: 'REQ-SFR-001',
        workItemId: 'US-PROMO-001',
        acId: 'AC-PROMO-001-G1',
        targetKind: 'capability',
        targetId: sampleCap.id,
        linkIntent: 'existing',
        notes: '기존 promotion 모듈 역량 재사용(원장 상태·증거 수준은 스냅숏 대조로 확인)',
      },
      {
        id: 'TRL-002',
        requirementId: 'REQ-SFR-002',
        workItemId: 'CFG-SEC-001',
        acId: 'AC-SEC-001-R1',
        targetKind: 'screen',
        targetId: sampleScreen.route,
        linkIntent: 'existing',
        notes: '기존 로그인 정책 화면 설정으로 충족',
      },
      {
        id: 'TRL-003',
        requirementId: 'REQ-SFR-003',
        workItemId: 'US-PROMO-002',
        acId: 'AC-PROMO-002-G1',
        targetKind: 'capability',
        targetId: '/admin/content/banners-popups#popup.bulk-suspend',
        linkIntent: 'planned',
        notes: '신규 수직 슬라이스 구현 예정 역량 ID(구현 전에는 저장소 원장 미존재가 정상)',
      },
      {
        id: 'TRL-004',
        requirementId: 'REQ-SFR-003',
        workItemId: 'US-PROMO-002',
        acId: 'AC-PROMO-002-R1',
        targetKind: 'interface',
        targetId: 'POST /api/v1/admin/system/popups/bulk-suspend',
        linkIntent: 'planned',
        notes: '신규 일괄 노출 중지 API 예정 식별자',
      },
      {
        id: 'TRL-005',
        requirementId: 'REQ-PER-001',
        workItemId: 'VRF-PERF-001',
        acId: 'AC-PERF-001-G1',
        targetKind: 'interface',
        targetId: 'GET /api/v1/admin/system/popups',
        linkIntent: 'existing',
        notes: '기존 목록 조회 API 대상 부하 시험',
      },
    ],
  };
}

function checkEntityKeys(entityLabel, entityId, obj, allowedKeys, errors) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(obj ?? {})) {
    if (FORBIDDEN_STATUS_FIELDS.includes(key)) {
      errors.push(`${entityLabel} ${entityId}: manual status field "${key}" is forbidden (use 4-layer separation instead)`);
    } else if (!allowed.has(key)) {
      errors.push(`${entityLabel} ${entityId}: unknown field "${key}" is not allowed in schema`);
    }
  }
}

/**
 * 백로그 패키지의 스키마·참조 무결성·4층 상태 분리 규칙을 검증한다.
 */
export function validateBacklogPack(pack, contextSnapshot = null) {
  const errors = [];
  const warnings = [];
  const infos = [];

  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return { valid: false, errors: ['backlog must be a JSON object'], warnings, infos, stats: null };
  }
  checkEntityKeys('backlog', 'root', pack, ALLOWED_PACK_KEYS, errors);
  if (pack.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    errors.push(`unsupported schemaVersion: ${pack.schemaVersion} (expected ${WORKSPACE_SCHEMA_VERSION})`);
  }
  if (pack.kind !== 'egov-enterprise-requirements-backlog') {
    errors.push(`unexpected kind: ${pack.kind}`);
  }
  if (!pack.project || typeof pack.project !== 'object' || !pack.project.code || !pack.project.name) {
    errors.push('project.code and project.name are required');
  }
  if (pack.isSample === true || String(pack.project?.code ?? '').startsWith('SAMPLE-')) {
    warnings.push('sample backlog data is loaded (isSample=true); replace with institutional requirements before exporting deliverables');
  }

  const sources = Array.isArray(pack.sources) ? pack.sources : null;
  const requirements = Array.isArray(pack.businessRequirements) ? pack.businessRequirements : null;
  const workItems = Array.isArray(pack.workItems) ? pack.workItems : null;
  const acceptanceCriteria = Array.isArray(pack.acceptanceCriteria) ? pack.acceptanceCriteria : null;
  const traceLinks = Array.isArray(pack.traceLinks) ? pack.traceLinks : null;

  if (!sources || !requirements || !workItems || !acceptanceCriteria || !traceLinks) {
    errors.push('sources, businessRequirements, workItems, acceptanceCriteria, and traceLinks must all be arrays');
    return { valid: false, errors, warnings, infos, stats: null };
  }

  const sourceMap = new Map();
  for (const src of sources) {
    if (!src?.id || typeof src.id !== 'string') {
      errors.push('every source requires a string id');
      continue;
    }
    checkEntityKeys('source', src.id, src, ALLOWED_SOURCE_KEYS, errors);
    if (sourceMap.has(src.id)) errors.push(`duplicate source id: ${src.id}`);
    sourceMap.set(src.id, src);
    if (!SOURCE_TYPES.includes(src.sourceType)) {
      errors.push(`source ${src.id}: invalid sourceType "${src.sourceType}"`);
    }
    if (!src.title || typeof src.title !== 'string') {
      errors.push(`source ${src.id}: title is required`);
    }
  }

  const reqMap = new Map();
  for (const req of requirements) {
    if (!req?.id || typeof req.id !== 'string') {
      errors.push('every businessRequirement requires a string id');
      continue;
    }
    checkEntityKeys('businessRequirement', req.id, req, ALLOWED_REQUIREMENT_KEYS, errors);
    if (reqMap.has(req.id)) errors.push(`duplicate businessRequirement id: ${req.id}`);
    reqMap.set(req.id, req);

    if (!req.title || typeof req.title !== 'string') {
      errors.push(`businessRequirement ${req.id}: title is required`);
    }
    if (!Array.isArray(req.sourceIds) || req.sourceIds.length === 0) {
      errors.push(`businessRequirement ${req.id}: must reference at least one sourceId`);
    } else {
      for (const sid of req.sourceIds) {
        if (!sourceMap.has(sid)) errors.push(`businessRequirement ${req.id}: unknown sourceId "${sid}"`);
      }
    }
    if (!REQUIREMENT_TYPES.includes(req.requirementType)) {
      errors.push(`businessRequirement ${req.id}: invalid requirementType "${req.requirementType}"`);
    }
    if (!SOLUTION_DISPOSITIONS.includes(req.solutionDisposition)) {
      errors.push(`businessRequirement ${req.id}: invalid solutionDisposition "${req.solutionDisposition}"`);
    }
    if (!SCOPE_DISPOSITIONS.includes(req.scopeDisposition)) {
      errors.push(`businessRequirement ${req.id}: invalid scopeDisposition "${req.scopeDisposition}"`);
    }
    const accDisp = req.acceptanceDisposition ?? 'pending';
    if (!ACCEPTANCE_DISPOSITIONS.includes(accDisp)) {
      errors.push(`businessRequirement ${req.id}: invalid acceptanceDisposition "${accDisp}"`);
    }
    if ((req.scopeDisposition === 'excluded' || req.scopeDisposition === 'deferred')
      && (!req.rationale || typeof req.rationale !== 'string' || !req.rationale.trim())) {
      errors.push(`businessRequirement ${req.id}: ${req.scopeDisposition} requirement requires a non-empty rationale`);
    }
    if (req.scopeDisposition === 'included' && req.solutionDisposition === 'undecided') {
      warnings.push(`businessRequirement ${req.id}: scopeDisposition is "included" while solutionDisposition is still "undecided"`);
    }
    if (req.scopeDisposition === 'included'
      && (req.requirementType === 'non-functional' || req.requirementType === 'data' || req.requirementType === 'constraint')) {
      const nfr = req.nfrCriteria;
      if (!nfr || typeof nfr.metric !== 'string' || !nfr.metric.trim() || typeof nfr.threshold !== 'string' || !nfr.threshold.trim()) {
        errors.push(`businessRequirement ${req.id}: included ${req.requirementType} requirement requires nfrCriteria.metric and nfrCriteria.threshold`);
      }
    }
  }

  const workItemMap = new Map();
  for (const item of workItems) {
    if (!item?.id || typeof item.id !== 'string') {
      errors.push('every workItem requires a string id');
      continue;
    }
    checkEntityKeys('workItem', item.id, item, ALLOWED_WORK_ITEM_KEYS, errors);
    if (workItemMap.has(item.id)) errors.push(`duplicate workItem id: ${item.id}`);
    workItemMap.set(item.id, item);

    if (!WORK_ITEM_TYPES.includes(item.workItemType)) {
      errors.push(`workItem ${item.id}: invalid workItemType "${item.workItemType}"`);
    }
    if (!item.title || typeof item.title !== 'string') {
      errors.push(`workItem ${item.id}: title is required`);
    }
    if (item.priority && !PRIORITIES.includes(item.priority)) {
      errors.push(`workItem ${item.id}: invalid priority "${item.priority}"`);
    }
    if (!Array.isArray(item.requirementIds) || item.requirementIds.length === 0) {
      errors.push(`workItem ${item.id}: must reference at least one requirementId`);
    } else {
      for (const reqId of item.requirementIds) {
        if (!reqMap.has(reqId)) errors.push(`workItem ${item.id}: unknown requirementId "${reqId}"`);
      }
    }
    if (item.workItemType === 'story') {
      if (!item.asA || !item.iWant || !item.soThat) {
        errors.push(`workItem ${item.id}: story workItem requires asA, iWant, and soThat fields`);
      }
    }
  }

  for (const item of workItems) {
    if (!item?.id) continue;
    if (item.workItemType !== 'epic') {
      if (!item.parentEpicId) {
        errors.push(`workItem ${item.id}: non-epic workItem requires parentEpicId`);
      } else {
        const parent = workItemMap.get(item.parentEpicId);
        if (!parent || parent.workItemType !== 'epic') {
          errors.push(`workItem ${item.id}: parentEpicId "${item.parentEpicId}" must reference an epic workItem`);
        }
      }
    }
  }

  const acMap = new Map();
  const workItemAcCount = new Map();
  for (const ac of acceptanceCriteria) {
    if (!ac?.id || typeof ac.id !== 'string') {
      errors.push('every acceptanceCriterion requires a string id');
      continue;
    }
    checkEntityKeys('acceptanceCriterion', ac.id, ac, ALLOWED_AC_KEYS, errors);
    if (acMap.has(ac.id)) errors.push(`duplicate acceptanceCriterion id: ${ac.id}`);
    acMap.set(ac.id, ac);

    if (!workItemMap.has(ac.workItemId)) {
      errors.push(`acceptanceCriterion ${ac.id}: unknown workItemId "${ac.workItemId}"`);
    } else {
      workItemAcCount.set(ac.workItemId, (workItemAcCount.get(ac.workItemId) ?? 0) + 1);
    }
    if (!AC_POLARITIES.includes(ac.polarity)) {
      errors.push(`acceptanceCriterion ${ac.id}: invalid polarity "${ac.polarity}"`);
    }
    if (!VERIFICATION_METHODS.includes(ac.verificationMethod)) {
      errors.push(`acceptanceCriterion ${ac.id}: invalid verificationMethod "${ac.verificationMethod}"`);
    }
    if (!ac.given || !ac.when || !ac.then) {
      errors.push(`acceptanceCriterion ${ac.id}: given, when, and then are required`);
    }
    if (!Array.isArray(ac.requirementIds) || ac.requirementIds.length === 0) {
      errors.push(`acceptanceCriterion ${ac.id}: must reference at least one requirementId`);
    } else {
      for (const reqId of ac.requirementIds) {
        if (!reqMap.has(reqId)) errors.push(`acceptanceCriterion ${ac.id}: unknown requirementId "${reqId}"`);
      }
    }
  }

  for (const item of workItems) {
    if (item?.workItemType === 'story' && (workItemAcCount.get(item.id) ?? 0) === 0) {
      warnings.push(`workItem ${item.id}: story has no acceptanceCriteria yet`);
    }
  }

  const capLookup = new Map((contextSnapshot?.capabilities ?? []).map((c) => [c.id, c]));
  const screenLookup = new Map((contextSnapshot?.screens ?? []).map((s) => [s.route, s]));
  const ifaceLookup = new Map((contextSnapshot?.interfaces ?? []).map((i) => [i.id, i]));

  if (contextSnapshot && pack.contextSnapshotDigest && pack.contextSnapshotDigest !== contextSnapshot.snapshotDigest) {
    warnings.push(`backlog contextSnapshotDigest (${pack.contextSnapshotDigest.slice(0, 12)}) differs from current repository snapshot (${contextSnapshot.snapshotDigest.slice(0, 12)}); run with --refresh-context to accept current snapshot`);
  }

  const linkIds = new Set();
  const reqLinkCount = new Map();
  let partialFitCapabilityCount = 0;

  for (const link of traceLinks) {
    if (!link?.id || typeof link.id !== 'string') {
      errors.push('every traceLink requires a string id');
      continue;
    }
    checkEntityKeys('traceLink', link.id, link, ALLOWED_TRACE_LINK_KEYS, errors);
    if (linkIds.has(link.id)) errors.push(`duplicate traceLink id: ${link.id}`);
    linkIds.add(link.id);

    const req = reqMap.get(link.requirementId);
    if (!req) {
      errors.push(`traceLink ${link.id}: unknown requirementId "${link.requirementId}"`);
    }
    if (link.workItemId) {
      const wi = workItemMap.get(link.workItemId);
      if (!wi) {
        errors.push(`traceLink ${link.id}: unknown workItemId "${link.workItemId}"`);
      } else if (req && Array.isArray(wi.requirementIds) && !wi.requirementIds.includes(link.requirementId)) {
        errors.push(`traceLink ${link.id}: workItem "${link.workItemId}" does not reference requirementId "${link.requirementId}"`);
      }
    }
    if (link.acId) {
      const ac = acMap.get(link.acId);
      if (!ac) {
        errors.push(`traceLink ${link.id}: unknown acId "${link.acId}"`);
      } else {
        if (req && Array.isArray(ac.requirementIds) && !ac.requirementIds.includes(link.requirementId)) {
          errors.push(`traceLink ${link.id}: ac "${link.acId}" does not reference requirementId "${link.requirementId}"`);
        }
        if (link.workItemId && ac.workItemId && ac.workItemId !== link.workItemId) {
          errors.push(`traceLink ${link.id}: ac "${link.acId}" belongs to workItem "${ac.workItemId}", not "${link.workItemId}"`);
        }
      }
    }
    if (!TARGET_KINDS.includes(link.targetKind)) {
      errors.push(`traceLink ${link.id}: invalid targetKind "${link.targetKind}"`);
    }
    if (!LINK_INTENTS.includes(link.linkIntent)) {
      errors.push(`traceLink ${link.id}: invalid linkIntent "${link.linkIntent}"`);
    }
    if (!link.targetId || typeof link.targetId !== 'string' || !link.targetId.trim()) {
      errors.push(`traceLink ${link.id}: targetId is required`);
      continue;
    }

    reqLinkCount.set(link.requirementId, (reqLinkCount.get(link.requirementId) ?? 0) + 1);

    if (contextSnapshot) {
      const existsInRepo = link.targetKind === 'capability'
        ? capLookup.has(link.targetId)
        : link.targetKind === 'screen'
          ? screenLookup.has(link.targetId)
          : ifaceLookup.has(link.targetId);

      if (link.linkIntent === 'existing' && !existsInRepo) {
        warnings.push(`traceLink ${link.id} (${link.requirementId}): linkIntent is "existing" but target "${link.targetId}" was not found in repository ledgers`);
      }
      if (req?.solutionDisposition === 'fit' && !existsInRepo) {
        warnings.push(`traceLink ${link.id} (${link.requirementId}): requirement is marked "fit" but target "${link.targetId}" does not exist in repository ledgers`);
      }
      if (link.linkIntent === 'planned' && existsInRepo) {
        warnings.push(`traceLink ${link.id} (${link.requirementId}): linkIntent is "planned" (new gap target) but "${link.targetId}" already exists in repository ledgers`);
      }
      if (link.targetKind === 'capability' && existsInRepo) {
        const cap = capLookup.get(link.targetId);
        if (req?.solutionDisposition === 'fit') {
          if (cap.status === 'unavailable' || cap.status === 'demo' || cap.status === 'unverified' || cap.evidenceLevel === 'E0') {
            warnings.push(`traceLink ${link.id} (${link.requirementId}): fit target "${link.targetId}" has ledger status=${cap.status}, evidenceLevel=${cap.evidenceLevel}`);
          } else if (cap.status === 'partial') {
            partialFitCapabilityCount += 1;
            infos.push(`traceLink ${link.id} (${link.requirementId}): fit target "${link.targetId}" has ledger status=partial, evidenceLevel=${cap.evidenceLevel}`);
          }
        }
      }
      if (link.targetKind === 'screen' && existsInRepo) {
        const scr = screenLookup.get(link.targetId);
        if (req?.solutionDisposition === 'fit' || req?.solutionDisposition === 'config') {
          if (scr.demo || scr.status === 'demo' || scr.status === 'unavailable' || scr.status === 'unverified') {
            warnings.push(`traceLink ${link.id} (${link.requirementId}): target screen "${link.targetId}" has ledger status=${scr.status ?? 'demo'} (demo=${scr.demo})`);
          }
        }
      }
    }
  }

  if (partialFitCapabilityCount > 0) {
    infos.push(`fit capability links with ledger status="partial": ${partialFitCapabilityCount} (verify whether remaining gap work is needed)`);
  }

  for (const req of requirements) {
    if (req?.scopeDisposition === 'included' && req.solutionDisposition !== 'undecided' && (reqLinkCount.get(req.id) ?? 0) === 0) {
      warnings.push(`businessRequirement ${req.id}: included in scope (${req.solutionDisposition}) but has no traceLinks yet`);
    }
  }

  const stats = {
    sources: sources.length,
    requirements: requirements.length,
    includedRequirements: requirements.filter((r) => r?.scopeDisposition === 'included').length,
    excludedRequirements: requirements.filter((r) => r?.scopeDisposition === 'excluded').length,
    deferredRequirements: requirements.filter((r) => r?.scopeDisposition === 'deferred').length,
    proposedRequirements: requirements.filter((r) => r?.scopeDisposition === 'proposed').length,
    epics: workItems.filter((w) => w?.workItemType === 'epic').length,
    workItems: workItems.filter((w) => w?.workItemType !== 'epic').length,
    acceptanceCriteria: acceptanceCriteria.length,
    traceLinks: traceLinks.length,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    stats,
  };
}

/**
 * 백로그 패키지를 export-deliverables.mjs --rtm 이 읽는 10열 호환 행 배열로 변환한다.
 * 연결(traceLinks)이 없는 요구사항(included/proposed/deferred/excluded 모두)도 대상 ID 를 비운 채 한 줄로 남겨
 * 산출물 조인표에서 범위 제외·보류 항목이 사라지지 않게 한다.
 */
export function backlogToRtmRows(pack) {
  const reqMap = new Map((pack.businessRequirements ?? []).map((r) => [r.id, r]));
  const linkedReqIds = new Set();
  const rows = [];

  for (const link of pack.traceLinks ?? []) {
    const req = reqMap.get(link.requirementId);
    linkedReqIds.add(link.requirementId);
    rows.push({
      id: link.requirementId,
      target: link.targetId ?? '',
      name: req?.title ?? null,
      requirementType: req?.requirementType ?? null,
      solutionDisposition: req?.solutionDisposition ?? null,
      scopeDisposition: req?.scopeDisposition ?? null,
      workItemId: link.workItemId ?? null,
      acId: link.acId ?? null,
      linkIntent: link.linkIntent ?? null,
      acceptanceDisposition: req?.acceptanceDisposition ?? 'pending',
    });
  }

  for (const req of pack.businessRequirements ?? []) {
    if (!req?.id || linkedReqIds.has(req.id)) continue;
    rows.push({
      id: req.id,
      target: '',
      name: req.title ?? null,
      requirementType: req.requirementType ?? null,
      solutionDisposition: req.solutionDisposition ?? null,
      scopeDisposition: req.scopeDisposition ?? null,
      workItemId: null,
      acId: null,
      linkIntent: req.scopeDisposition === 'included' ? 'planned' : null,
      acceptanceDisposition: req.acceptanceDisposition ?? 'pending',
    });
  }

  return rows;
}

export function backlogToRtmCsv(pack) {
  const sheet = {
    columns: [
      ['id', '요구사항 ID'],
      ['target', '대상 ID'],
      ['name', '요구사항 이름'],
      ['requirementType', '요구사항 유형'],
      ['solutionDisposition', '해법 구분'],
      ['scopeDisposition', '범위 결정'],
      ['workItemId', '작업 ID'],
      ['acId', '인수조건 ID'],
      ['linkIntent', '연결 의도'],
      ['acceptanceDisposition', '기관 인수 판정'],
    ],
    rows: backlogToRtmRows(pack),
  };
  return toCsv(sheet);
}

/**
 * 사업 단계 P0~P5 가시성을 한눈에 보여 주는 5개 표준 보기를 생성한다.
 * View 5(4층 상태 추적 보드)는 export-deliverables-trace.mjs 의 requirementSheet 를 재사용해
 * 산출물 조인표와 100% 동일한 관측·원장 판정을 보장한다.
 */
export function buildWorkspaceViews(pack, contextSnapshot) {
  const sources = Array.isArray(pack?.sources) ? pack.sources : [];
  const requirements = Array.isArray(pack?.businessRequirements) ? pack.businessRequirements : [];
  const workItems = Array.isArray(pack?.workItems) ? pack.workItems : [];
  const acceptanceCriteria = Array.isArray(pack?.acceptanceCriteria) ? pack.acceptanceCriteria : [];

  const view0 = {
    id: 'view-0-sources',
    title: '보기 1 (P0): 원시 요구사항 수집 원천 목록 (Raw Discovery Sources)',
    notices: [
      'RFP·인터뷰 회의록·현행 화면/장표·법령/보안 지침 등 원시 입력물의 출처와 발췌 문장을 기록한다.',
    ],
    columns: [
      ['id', '원천 ID'],
      ['sourceType', '원천 유형'],
      ['title', '문서·회의명'],
      ['reference', '조항·참조 번호'],
      ['collectedOn', '수집일'],
      ['stakeholder', '이해관계자'],
      ['excerptsCount', '발췌 문장 수'],
      ['summary', '요약'],
    ],
    rows: sources.map((s) => ({
      id: s?.id ?? '',
      sourceType: s?.sourceType ?? null,
      title: s?.title ?? null,
      reference: s?.reference ?? null,
      collectedOn: s?.collectedOn ?? null,
      stakeholder: s?.stakeholder ?? null,
      excerptsCount: Array.isArray(s?.excerpts) ? s.excerpts.length : 0,
      summary: s?.summary ?? null,
    })),
  };

  const view1 = {
    id: 'view-1-requirements',
    title: '보기 2 (P1): 정규화 요구사항·정량 기준·미결 질의 목록',
    notices: [
      '원시 문장을 원자 요구사항으로 분해한 결과다. 비기능·데이터·제약 요구사항은 정량 기준(nfrCriteria)을 함께 적는다.',
    ],
    columns: [
      ['id', '요구사항 ID'],
      ['sourceIds', '원천 ID'],
      ['requirementType', '요구사항 유형'],
      ['title', '요구사항 이름'],
      ['nfrSummary', '정량·비기능 기준'],
      ['openQuestions', '미결 질의'],
    ],
    rows: requirements.map((r) => ({
      id: r?.id ?? '',
      sourceIds: Array.isArray(r?.sourceIds) ? r.sourceIds : [],
      requirementType: r?.requirementType ?? null,
      title: r?.title ?? null,
      nfrSummary: r?.nfrCriteria ? `${r.nfrCriteria.metric ?? ''}: ${r.nfrCriteria.threshold ?? ''} (${r.nfrCriteria.verificationMethod ?? '미정'})` : null,
      openQuestions: Array.isArray(r?.openQuestions) && r.openQuestions.length ? r.openQuestions : null,
    })),
  };

  const view2 = {
    id: 'view-2-fit-gap',
    title: '보기 3 (P1): 3축 Fit-Gap 판정 및 범위 처분 표 (Scope & Solution Disposition)',
    notices: [
      '해법 구분(fit / config / gap-dev / hybrid / undecided)과 범위 결정(proposed / included / deferred / excluded)을 분리해 기록한다.',
      '범위 제외(excluded)·보류(deferred) 요구사항도 삭제하지 않고 사유(rationale)와 함께 보존한다.',
    ],
    columns: [
      ['id', '요구사항 ID'],
      ['title', '요구사항 이름'],
      ['requirementType', '유형'],
      ['solutionDisposition', '해법 구분 (Fit-Gap)'],
      ['scopeDisposition', '범위 결정'],
      ['moduleCandidates', '후보 모듈'],
      ['rationale', '판정·제외 사유'],
    ],
    rows: requirements.map((r) => ({
      id: r?.id ?? '',
      title: r?.title ?? null,
      requirementType: r?.requirementType ?? null,
      solutionDisposition: r?.solutionDisposition ?? null,
      scopeDisposition: r?.scopeDisposition ?? null,
      moduleCandidates: Array.isArray(r?.moduleCandidates) ? r.moduleCandidates : [],
      rationale: r?.rationale ?? null,
    })),
  };

  const acByWorkItem = new Map();
  for (const ac of acceptanceCriteria) {
    if (!ac?.workItemId) continue;
    const list = acByWorkItem.get(ac.workItemId) ?? [];
    list.push(ac);
    acByWorkItem.set(ac.workItemId, list);
  }

  const view3 = {
    id: 'view-3-agile-backlog',
    title: '보기 4 (P2~P3): 애자일 에픽·작업 항목·인수조건(Green/Red AC) 백로그',
    notices: [
      '순수 사용자 스토리(story) 외에 설정(configuration), 검증(verification), 기반 작업(enabler)을 구분한다.',
      '인수조건(AC)은 허용 결과(allow, Green)와 금지 결과(forbid, Red — H3/H5 부정 시험 후보)를 함께 적는다.',
    ],
    columns: [
      ['id', '작업 ID'],
      ['workItemType', '작업 유형'],
      ['parentEpicId', '상위 에픽'],
      ['priority', '우선순위'],
      ['batch', '배치'],
      ['requirementIds', '연결 요구사항'],
      ['title', '제목'],
      ['archetype', '화면 유형'],
      ['decisionCards', '결정 카드(D-n)'],
      ['acSummary', '인수조건 (Green/Red)'],
    ],
    rows: workItems.map((w) => {
      const acs = acByWorkItem.get(w?.id) ?? [];
      const green = acs.filter((a) => a?.polarity === 'allow').map((a) => a.id);
      const red = acs.filter((a) => a?.polarity === 'forbid').map((a) => `${a.id}(Red)`);
      return {
        id: w?.id ?? '',
        workItemType: w?.workItemType ?? null,
        parentEpicId: w?.parentEpicId ?? null,
        priority: w?.priority ?? null,
        batch: w?.batch ?? null,
        requirementIds: Array.isArray(w?.requirementIds) ? w.requirementIds : [],
        title: w?.title ?? null,
        archetype: w?.archetype ?? null,
        decisionCards: Array.isArray(w?.decisionCards) ? w.decisionCards : [],
        acSummary: [...green, ...red],
      };
    }),
  };

  const screens = new Set((contextSnapshot?.screens ?? []).map((s) => s.route));
  const capabilities = new Set((contextSnapshot?.capabilities ?? []).map((c) => c.id));
  const interfaces = new Set((contextSnapshot?.interfaces ?? []).map((i) => i.id));
  const capabilityMap = new Map((contextSnapshot?.capabilities ?? []).map((c) => [c.id, c]));
  const screenMap = new Map((contextSnapshot?.screens ?? []).map((s) => [s.route, s]));

  const joined = requirementSheet(backlogToRtmRows(pack ?? {}), {
    screens,
    capabilities,
    interfaces,
    capabilityMap,
    screenMap,
  });

  const view4 = {
    id: 'view-4-four-layer-trace',
    title: '보기 5 (P3~P5): 4층 상태 분리 요구사항↔IE 원장 추적 보드',
    notices: [
      '① 계획·범위(해법·범위·연결 의도) / ② 도구 관측(저장소 찾음 여부) / ③ 원장 검토 값(원장 상태·증거 수준) / ④ 기관 인수 판정을 분리해 표시한다.',
      '찾음(예)은 대상 식별자가 저장소에 존재한다는 뜻일 뿐 구현 완료나 인수 합격 판정이 아니다.',
    ],
    columns: joined.columns,
    rows: joined.rows,
  };

  return [view0, view1, view2, view3, view4];
}

function renderSheetBlock(sheet) {
  for (const notice of sheet.notices ?? []) {
    for (const claim of BANNED_CLAIMS) {
      if (notice.includes(claim)) {
        throw new Error(`banned claim in ${sheet.id} notice: ${claim}`);
      }
    }
  }
  const head = `## ${sheet.title}\n\n${(sheet.notices ?? []).map((n) => `> ${n}`).join('\n')}\n\n행 ${sheet.rows.length}개.\n`;
  if (!sheet.rows.length) {
    return `${head}\n${sheet.emptyMessage ?? '해당 행이 없다.'}\n`;
  }
  const header = `| ${sheet.columns.map(([, label]) => mdCell(label)).join(' | ')} |`;
  const divider = `| ${sheet.columns.map(() => '---').join(' | ')} |`;
  const body = sheet.rows.map((row) => `| ${sheet.columns.map(([key]) => mdCell(row[key])).join(' | ')} |`).join('\n');
  return `${head}\n${header}\n${divider}\n${body}\n`;
}

export function renderWorkspaceReport(pack, contextSnapshot, validation) {
  const fixedHeaderLines = [
    '# 앞단 요구사항·Fit-Gap·애자일 백로그 작업공간 보고서 (비규범 외부 작업공간)',
    '',
    '> **비규범 작업공간 파생물** — 이 보고서는 저장소 밖(`--workspace`)의 `backlog.json` 과 저장소 원장 스냅숏(`context.snapshot.json`)을 대조해 생성한 검토 자료다.',
    '> 감리·검수·최종 인수 합격 판정을 대신하지 않는다.',
  ];
  for (const line of fixedHeaderLines) {
    for (const claim of BANNED_CLAIMS) {
      if (line.includes(claim)) throw new Error(`banned claim in workspace report header: ${claim}`);
    }
  }

  const views = buildWorkspaceViews(pack, contextSnapshot);
  const project = pack?.project ?? {};
  const lines = [
    ...fixedHeaderLines,
    '',
    `- 프로젝트: \`${cellText(project.code)}\` — ${cellText(project.name)} (${cellText(project.institution)})`,
    `- 기준 프로필: \`${cellText(project.baselineProfile)}\` / 표본 여부: \`${pack?.isSample ? '예(합성 표본)' : '아니오'}\``,
    `- 스냅숏 다이제스트: \`${contextSnapshot?.snapshotDigest ?? BLANK}\` (커밋 \`${contextSnapshot?.commit ?? 'unknown'}\`)`,
    `- 검증 상태: **${validation.valid ? '유효 (VALID)' : '오류 있음 (INVALID)'}** (오류 ${validation.errors.length}건, 경고 ${validation.warnings.length}건, 참고 ${validation.infos?.length ?? 0}건)`,
    ...(validation.stats ? [
      `- 집계: 원천 ${validation.stats.sources}개 · 요구사항 ${validation.stats.requirements}개(포함 ${validation.stats.includedRequirements}, 제외 ${validation.stats.excludedRequirements}, 보류 ${validation.stats.deferredRequirements}, 제안 ${validation.stats.proposedRequirements}) · 에픽 ${validation.stats.epics}개 · 작업 항목 ${validation.stats.workItems}개 · 인수조건 ${validation.stats.acceptanceCriteria}개 · 추적 연결 ${validation.stats.traceLinks}개`,
    ] : []),
    '',
  ];

  if (validation.errors.length) {
    lines.push('## 스키마·무결성 오류 (Errors)', '', ...validation.errors.map((e) => `- ❌ ${e}`), '');
  }
  if (validation.warnings.length) {
    lines.push('## 검토 경고 (Warnings)', '', ...validation.warnings.map((w) => `- ⚠ ${w}`), '');
  }
  if (validation.infos?.length) {
    lines.push('## 원장 상태 참고 (Info)', '', ...validation.infos.map((info) => `- ℹ ${info}`), '');
  }

  for (const view of views) {
    lines.push(renderSheetBlock(view));
  }

  return `${lines.join('\n')}\n`;
}

export async function loadRepositoryContextSnapshot(root = ROOT) {
  const { inputs } = await loadInputs(root);
  const commit = readRepoCommit(root);
  return buildContextSnapshot(inputs, { commit });
}

/**
 * 새 외부 요구사항 작업공간을 초기화한다.
 * - 기본은 빈 골격(createEmptyBacklogPack)을 생성하며, --sample 일 때만 합성 표본을 넣는다.
 * - C2(js/file-system-race) 방지: existsSync 후 writeFileSync 패턴을 쓰지 않고,
 *   --force 가 아니면 `{ flag: 'wx' }` 로 원자적으로 생성하며 EEXIST 면 기존 파일을 읽는다.
 */
export async function initRequirementsWorkspace(root, workspaceDir, options = {}) {
  const wsPath = assertWorkspaceOutsideCheckout(root, workspaceDir, options);
  mkdirSync(wsPath, { recursive: true });

  const snapshot = options.contextSnapshot ?? await loadRepositoryContextSnapshot(root);
  const snapshotPath = join(wsPath, 'context.snapshot.json');
  const backlogPath = join(wsPath, 'backlog.json');
  const rtmPath = join(wsPath, 'rtm.csv');
  const reportPath = join(wsPath, 'WORKSPACE-REPORT.md');

  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  const initialPack = options.sample ? createSampleBacklogPack(snapshot) : createEmptyBacklogPack(snapshot);
  let pack;
  if (options.force) {
    pack = initialPack;
    writeFileSync(backlogPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  } else {
    try {
      writeFileSync(backlogPath, `${JSON.stringify(initialPack, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
      pack = initialPack;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      pack = JSON.parse(readFileSync(backlogPath, 'utf8'));
    }
  }

  const validation = validateBacklogPack(pack, snapshot);
  if (!validation.valid) {
    throw new Error(`initialized backlog is invalid:\n${validation.errors.join('\n')}`);
  }

  const rtmCsv = backlogToRtmCsv(pack);
  const reportMd = renderWorkspaceReport(pack, snapshot, validation);
  writeFileSync(rtmPath, rtmCsv, 'utf8');
  writeFileSync(reportPath, reportMd, 'utf8');

  return {
    workspaceDir: wsPath,
    snapshotPath,
    backlogPath,
    rtmPath,
    reportPath,
    validation,
  };
}

/**
 * 기존 외부 요구사항 작업공간의 backlog.json 을 검증하고 rtm.csv 와 WORKSPACE-REPORT.md 를 갱신한다.
 * - 항상 현재 저장소 스냅숏을 기준으로 드리프트와 원장 상태를 판정하며,
 *   `--refresh-context` 옵션을 주면 작업공간의 `context.snapshot.json` 과 `backlog.json` 의 `contextSnapshotDigest` 를 함께 갱신한다.
 * - 유효성 판정을 보고서 렌더보다 먼저 수행하고, 오류가 있어도 WORKSPACE-REPORT.md 에 오류 목록을 남긴 뒤 실패한다.
 */
export async function verifyRequirementsWorkspace(root, workspaceDir, options = {}) {
  const wsPath = assertWorkspaceOutsideCheckout(root, workspaceDir, options);
  const snapshotPath = join(wsPath, 'context.snapshot.json');
  const backlogPath = join(wsPath, 'backlog.json');
  const rtmPath = join(wsPath, 'rtm.csv');
  const reportPath = join(wsPath, 'WORKSPACE-REPORT.md');

  let packText;
  try {
    packText = readFileSync(backlogPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`backlog.json not found in workspace: ${backlogPath}`);
    }
    throw error;
  }
  const pack = JSON.parse(packText);

  const liveSnapshot = options.contextSnapshot ?? await loadRepositoryContextSnapshot(root);
  if (options.refreshContext) {
    pack.contextSnapshotDigest = liveSnapshot.snapshotDigest;
    writeFileSync(backlogPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    writeFileSync(snapshotPath, `${JSON.stringify(liveSnapshot, null, 2)}\n`, 'utf8');
  } else {
    try {
      const saved = JSON.parse(readFileSync(snapshotPath, 'utf8'));
      if (saved?.snapshotDigest && !pack.contextSnapshotDigest) {
        pack.contextSnapshotDigest = saved.snapshotDigest;
      }
    } catch (error) {
      if (error?.code === 'ENOENT') {
        writeFileSync(snapshotPath, `${JSON.stringify(liveSnapshot, null, 2)}\n`, 'utf8');
      } else {
        throw error;
      }
    }
  }

  const validation = validateBacklogPack(pack, liveSnapshot);
  const reportMd = renderWorkspaceReport(pack, liveSnapshot, validation);
  writeFileSync(reportPath, reportMd, 'utf8');

  if (!validation.valid) {
    throw new Error(`backlog validation failed (${validation.errors.length} error(s)):\n${validation.errors.join('\n')}`);
  }

  const rtmCsv = backlogToRtmCsv(pack);
  writeFileSync(rtmPath, rtmCsv, 'utf8');

  return {
    workspaceDir: wsPath,
    snapshotPath,
    backlogPath,
    rtmPath,
    reportPath,
    validation,
  };
}

function parseCliArgs(argv) {
  const command = argv[0] ?? 'help';
  let workspace = null;
  let out = null;
  let force = false;
  let sample = false;
  let refreshContext = false;
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--workspace') {
      workspace = argv[++i];
      if (!workspace) throw new Error('--workspace requires a directory path');
    } else if (arg === '--out') {
      out = argv[++i];
      if (!out) throw new Error('--out requires a file path');
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--sample') {
      sample = true;
    } else if (arg === '--refresh-context') {
      refreshContext = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { command, workspace, out, force, sample, refreshContext };
}

async function main() {
  const { command, workspace, out, force, sample, refreshContext } = parseCliArgs(process.argv.slice(2));
  if (command === 'init') {
    const res = await initRequirementsWorkspace(ROOT, workspace, { force, sample });
    process.stdout.write(`initialized requirements workspace at ${res.workspaceDir} (warnings: ${res.validation.warnings.length})\n`);
    return;
  }
  if (command === 'verify') {
    const res = await verifyRequirementsWorkspace(ROOT, workspace, { refreshContext });
    process.stdout.write(`verified requirements workspace at ${res.workspaceDir} (warnings: ${res.validation.warnings.length})\n`);
    return;
  }
  if (command === 'export-context') {
    if (!workspace && !out) throw new Error('export-context requires --workspace <dir outside checkout> or --out <file path outside checkout>');
    const targetFile = workspace
      ? join(assertWorkspaceOutsideCheckout(ROOT, workspace), 'context.snapshot.json')
      : join(assertWorkspaceOutsideCheckout(ROOT, dirname(resolve(ROOT, out))), resolve(ROOT, out).slice(dirname(resolve(ROOT, out)).length + 1));
    mkdirSync(dirname(targetFile), { recursive: true });
    const snapshot = await loadRepositoryContextSnapshot(ROOT);
    writeFileSync(targetFile, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    process.stdout.write(`exported context snapshot (${snapshot.snapshotDigest.slice(0, 12)}) to ${targetFile}\n`);
    return;
  }
  throw new Error('usage: node scripts/export-deliverables-workspace.mjs <init|verify|export-context> --workspace <dir outside checkout> [--sample] [--force] [--refresh-context]');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

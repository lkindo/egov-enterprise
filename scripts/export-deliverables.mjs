#!/usr/bin/env node
/**
 * 감리·검수에 넣는 입력 자료의 초안을 저장소 원장에서 계산한다 — 비규범 파생물(DEC-OPS-382).
 *
 * 산출물은 감리(감리법인의 제3자 점검)와 검수(발주기관의 시험·검사)를 대신하지 않는다. 표의 값은 템플릿 원장의 현재 값이고
 * 기관 DB 의 실제 배정·운영 실측이 아니다. 빈칸은 '(값 없음)' 으로, 검토 전 값은 원장 표기(UNVERIFIED·E0~E3) 그대로 싣는다.
 * 도구는 초안만 내고 사람이 확정한다 — 어느 원장에도 쓰지 않는다.
 *
 * 경계(DEC-OPS-382 ②)
 *   · 커밋하지 않는 build/deliverables/ 아래에만 쓴다. regen 사슬·required CI·frontend/public 에 넣지 않는다.
 *   · 실행은 수동 또는 workflow_dispatch(.github/workflows/deliverables.yml — 실행 요약에 다이제스트만 남기고 묶음은 올리지 않는다).
 *   · 금지 입력: 공용 메모리, 보관 기록, ADR 색인, 공유 OCI(.env·DB 접속), 생성물의 메뉴 스냅숏. 생성물(재사용 투영본)에서는
 *     돌지 않는다 — 생성물 모드는 투영 원장의 범위를 따로 정한 뒤에 둔다.
 *   · 작업 트리가 깨끗해야 한다. --allow-dirty 는 미리 보기다 — 폴더 이름에 -dirty 를 붙이고 manifest·README 에 표시한다.
 *
 * 형식: 표마다 Markdown 과 CSV(UTF-8 BOM·CRLF, 수식 주입 방지). manifest.json 은 입력 sha256·lockfile·도구 버전과
 * 커밋·시각을 넣지 않은 내용 다이제스트(표 파일만)를 싣는다 — 원장 값이 같으면 커밋이 달라도 다이제스트가 같다.
 * Atlas(atlas-catalog.mjs)는 OpenAPI 만으로 연산을 그리고 인가 원장과 잇지 않는다 — 여기서 하는 조인은 Atlas 에 없으므로
 * 계산부를 나누지 않고 api-docs.json 을 직접 읽는다.
 *
 * 추적 표(하류 추적 보기·입력 항목 후보·시험 목록·요구사항 추적 조인)는 export-deliverables-trace.mjs, DB 표는
 * export-deliverables-db.mjs 가 계산한다.
 *
 * 사용: node scripts/export-deliverables.mjs [--db] [--rtm <기관 요구사항 추적 CSV>] [--allow-dirty] [--out <build/deliverables 아래 디렉터리>]
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readScreenRegistryArtifact } from './screen-registry-model.mjs';
import { inputFieldSheet, loadTraceInputs, readRequirementFile, readRequirements, requirementSheet, testListSheet, traceSheet } from './export-deliverables-trace.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const OUTPUT_ROOT = 'build/deliverables';
export const BLANK = '(값 없음)';
export const NO_SEMANTIC_ROW = '의미 행 없음(조회)';

/** 읽지 않는 입력 — 경로 접두로 판정한다(DEC-OPS-382 ②). */
export const FORBIDDEN_INPUTS = Object.freeze([
  { prefix: '.agent/memory/', reason: '공용 메모리는 비규범 파생 인덱스다' },
  // known-gaps 에서 옮긴 경로 전용 gap 행(DEC-OPS-389) — 공용 메모리 밖으로 옮겼다고 산출물 원천이 되지 않는다.
  { prefix: 'docs/04-operations/known-gaps-detail.md', reason: 'gap 영역 상세는 공용 메모리에서 옮긴 비규범 파생 인덱스다' },
  { prefix: 'docs/archived/', reason: '보관 기록은 현행 원장이 아니다' },
  { prefix: 'docs/02-architecture/decisions/README.md', reason: 'ADR 색인은 결정의 목록이지 산출물 원천이 아니다' },
  { prefix: '.env', reason: '공유 OCI 접속 정보를 읽지 않는다' },
  { prefix: 'config/governance/upstream-review/', reason: '생성물의 검토 전 원장·메뉴 스냅숏은 아직 산출물 원천이 아니다' },
]);

/** 고정 문장에 쓰지 않는 과장 표현(ADR-0018·H2). */
export const BANNED_CLAIMS = Object.freeze(['100%', '수기 0%', '현행화 0시간']);

const LOCKFILES = Object.freeze(['package-lock.json', 'frontend/pnpm-lock.yaml', 'gradle/libs.versions.toml']);
const GENERATED_PRODUCT_MARKER = 'config/governance/upstream-review';

/** 저장소 기준 경로를 판정한다. 두 구분자와 대소문자를 가리지 않는다 — Windows 파일 시스템은 `.ENV`·`.agent\memory` 도 같은 파일로 연다. */
export function assertAllowedInput(path) {
  const normalized = path.replace(/\\/gu, '/').replace(/^\.\//u, '');
  const folded = normalized.toLowerCase();
  const hit = FORBIDDEN_INPUTS.find((rule) => folded === rule.prefix.toLowerCase() || folded.startsWith(rule.prefix.toLowerCase()));
  if (hit) throw new Error(`forbidden deliverable input: ${normalized} (${hit.reason})`);
}

export function assertNoBannedClaims(text, where) {
  const found = BANNED_CLAIMS.filter((claim) => text.includes(claim));
  if (found.length) throw new Error(`banned claim in ${where}: ${found.join(', ')}`);
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
/** 입력 해시는 줄 끝을 LF 로 맞춰 계산한다 — Windows 체크아웃(autocrlf)과 CI 의 manifest 를 대조할 수 있게. */
const textSha256 = (text) => sha256(text.replace(/\r\n?/gu, '\n'));

/** 칸 값 → 글자. 빈 값은 숨기지 않고 BLANK 로 쓴다. */
export function cellText(value) {
  if (value === null || value === undefined) return BLANK;
  if (Array.isArray(value)) return value.length ? value.map(cellText).join(', ') : BLANK;
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  const text = String(value);
  return text.trim() === '' ? BLANK : text;
}

/** CSV 칸 — 수식으로 읽힐 첫 글자(= + - @ 탭 CR)에는 ' 를 앞에 붙이고, 구분자·따옴표·줄바꿈이 있으면 따옴표로 감싼다. */
export function csvCell(value) {
  let text = cellText(value);
  if (/^[=+\-@\t\r]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

export function toCsv(sheet) {
  const lines = [sheet.columns.map(([, header]) => csvCell(header)).join(',')];
  for (const row of sheet.rows) lines.push(sheet.columns.map(([key]) => csvCell(row[key])).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function mdCell(value) {
  return cellText(value).replace(/\\/gu, '\\\\').replace(/\|/gu, '\\|').replace(/\r?\n/gu, '<br>');
}

/** 표 파일에는 커밋을 쓰지 않는다 — 원장 값이 같으면 커밋이 달라도 내용 다이제스트가 같게(커밋은 README·manifest 에 있다). */
export function toMarkdown(sheet) {
  const lines = [`# ${sheet.title}`, '', `> 비규범 파생물 — 감리·검수를 대신하지 않는 초안이다. 원천: ${sheet.sources.map((source) => `\`${source}\``).join(', ')}.`, ''];
  for (const notice of sheet.notices) lines.push(`- ${notice}`);
  lines.push('', `행 ${sheet.rows.length}개.`, '');
  if (sheet.rows.length === 0) {
    lines.push(sheet.emptyMessage ?? '행이 없다.');
  } else {
    lines.push(`| ${sheet.columns.map(([, header]) => mdCell(header)).join(' | ')} |`);
    lines.push(`|${sheet.columns.map(() => '---').join('|')}|`);
    for (const row of sheet.rows) lines.push(`| ${sheet.columns.map(([key]) => mdCell(row[key])).join(' | ')} |`);
  }
  return `${lines.join('\n')}\n`;
}

const byText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const codesOf = (permissions, source) => permissions.filter((row) => row.source === source).map((row) => row.code);

export function permissionSheet({ catalog, bundles }) {
  const owners = new Map();
  for (const bundle of bundles.bundles ?? []) for (const code of bundle.permissions) owners.set(code, [...(owners.get(code) ?? []), bundle.name]);
  const excluded = new Map((bundles.excluded ?? []).map((row) => [row.code, row.reason]));
  return {
    id: 'permissions', title: '권한 목록', sources: ['config/governance/permission-catalog.json', 'config/governance/permission-bundles.json'],
    notices: [
      '기본 그룹은 Flyway 시드의 템플릿 기본값이다 — 기관 DB 의 실제 배정이 아니다.',
      '묶음은 그룹이 아니다. 묶음 적용은 그룹 권한 초안에 더할 뿐이고 저장·인가는 권한 변경 저장이 한다.',
      '서버가 인가를 집행한다. 이 목록을 인가로 쓰지 않는다.',
    ],
    columns: [['code', '권한 코드'], ['domain', '도메인'], ['action', '행위'], ['name', '이름'], ['defaultGroups', '기본 그룹(템플릿)'],
      ['bundles', '권한 묶음'], ['excludedReason', '묶음 제외 사유']],
    rows: (catalog.permissions ?? []).map((row) => ({ code: row.code, domain: row.domain, action: row.action, name: row.name,
      defaultGroups: row.defaultGroups ?? [], bundles: owners.get(row.code) ?? [], excludedReason: excluded.get(row.code) })),
  };
}

export function screenSheet({ registry, routes }) {
  const ledger = new Map(routes.routes.map((route) => [route.route, route]));
  return {
    id: 'screens', title: '화면 목록', sources: ['frontend/src/types/generated-screen-registry.ts', 'config/ui-route-capabilities.json'],
    notices: [
      '화면 ID 는 라우트 경로다. 화면 ID 체계는 따로 없다.',
      '쓰기 권한은 화면이 부르는 GET 이 아닌 연산의 권한이고, 호출·import 를 이름으로 맞춘 계산이다(같은 이름은 겹칠 수 있다).',
      '표시 권한은 리터럴 canPermission 코드와 슬롯 기여의 노출 술어다. 이 목록을 인가로 쓰지 않는다(서버가 집행한다).',
      '시연 화면은 메뉴 연결·화면 관리·권한 묶음에서 빠진다(DEC-OPS-382 ④). 표에는 시연 열로 남긴다.',
    ],
    columns: [['route', '화면 ID(경로)'], ['label', '화면 이름'], ['labelSource', '이름 출처'], ['shellAccess', '셸 진입'], ['dynamic', '동적 경로'],
      ['demo', '시연'], ['entry', '진입 권한'], ['entryMode', '진입 판정'], ['write', '쓰기 권한'], ['display', '표시 권한'],
      ['status', '라우트 상태'], ['menuExposure', '메뉴 노출'], ['capabilities', '역량 수']],
    rows: registry.screens.map((screen) => {
      const route = ledger.get(screen.route);
      return { route: screen.route, label: screen.label, labelSource: screen.labelSource, shellAccess: screen.shellAccess, dynamic: screen.dynamic,
        demo: screen.demo, entry: screen.entry.permissions, entryMode: screen.entry.permissions.length > 1 ? screen.entry.mode : null,
        write: codesOf(screen.permissions, 'write'), display: codesOf(screen.permissions, 'display'),
        status: route?.status, menuExposure: route?.menuExposure, capabilities: route?.capabilities?.length ?? 0 };
    }),
  };
}

export function capabilitySheet({ routes }) {
  return {
    id: 'capabilities', title: '화면 역량 목록', sources: ['config/ui-route-capabilities.json'],
    notices: [
      '역량 ID 는 "라우트#역량" 이다.',
      '상태·증거 수준·대상은 라우트 원장의 검토 값 그대로다 — 검토 전(UNVERIFIED)을 채워 넣지 않는다.',
    ],
    columns: [['id', '역량 ID'], ['route', '라우트'], ['status', '상태'], ['dataSource', '데이터 출처'], ['actions', '지원 동작'],
      ['actorScope', '대상'], ['visibleLabel', '보이는 이름'], ['evidenceLevel', '증거 수준'], ['lastVerifiedAt', '마지막 확인'], ['evidence', '증거 경로']],
    rows: routes.routes.flatMap((route) => (route.capabilities ?? []).map((capability) => ({
      id: `${route.route}#${capability.id}`, route: route.route, status: capability.status, dataSource: capability.dataSource,
      actions: capability.actions ?? [], actorScope: capability.actorScope, visibleLabel: capability.visibleLabel,
      evidenceLevel: capability.evidenceLevel, lastVerifiedAt: capability.lastVerifiedAt, evidence: capability.evidence ?? [] }))),
  };
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

export function interfaceSheet({ policies, openapi }) {
  const documented = new Map();
  for (const [path, methods] of Object.entries(openapi.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) if (HTTP_METHODS.has(method)) documented.set(`${method.toUpperCase()} ${path}`, operation);
  }
  const semantics = new Map((policies.endpointPolicies ?? []).map((row) => [`${row.method} ${row.path}`, row]));
  const rows = (policies.operationBindings ?? []).map((binding) => {
    const id = `${binding.method} ${binding.path}`;
    const operation = documented.get(id);
    const semantic = semantics.get(id);
    return { id, operationId: operation?.operationId, summary: operation?.summary, tags: operation?.tags ?? [], handler: binding.handler,
      access: binding.access, permission: binding.permission, excludedGroups: binding.excludedGroups ?? [],
      policy: binding.method === 'GET' ? NO_SEMANTIC_ROW : semantic?.policy, routeGate: binding.method === 'GET' ? NO_SEMANTIC_ROW : semantic?.routeGate };
  }).sort((left, right) => byText(left.id, right.id));
  return {
    id: 'interfaces', title: '인터페이스(API) 목록', sources: ['config/governance/authorization-policies.json', 'api-docs.json'],
    notices: [
      '인터페이스 ID 는 "METHOD 경로" 다.',
      '접근·권한은 연산 바인딩 원장에서, 쓰기 연산의 의미(정책·경로 게이트)는 엔드포인트 정책 원장에서 온다.',
      `조회(GET)는 의미 행이 없다 — "${NO_SEMANTIC_ROW}" 로 쓴다. 자원 단위 판정(소유자·참여자)은 서비스 가드 표에 따로 있다.`,
      'OpenAPI 문서에 없는 연산(actuator·SockJS 등)은 operationId·요약 칸이 비어 있다.',
    ],
    columns: [['id', '인터페이스 ID'], ['operationId', 'operationId'], ['summary', '요약'], ['tags', '태그'], ['handler', '핸들러'],
      ['access', '접근'], ['permission', '권한'], ['excludedGroups', '제외 그룹'], ['policy', '쓰기 의미'], ['routeGate', '경로 게이트']],
    rows,
  };
}

export function serviceGuardSheet({ policies }) {
  const mechanism = (row) => (row.mechanisms ?? []).map((item) => [item.helper, item.identityAxis, item.permission].filter(Boolean).join(' · '));
  const rows = [
    ...(policies.serviceGuardPolicies ?? []).map((row) => ({ target: row.target, policy: row.policy, kind: '기계 판정', mechanisms: mechanism(row), source: null })),
    ...(policies.manualGuardPolicies ?? []).map((row) => ({ target: row.target, policy: row.policy, kind: '토큰 대조(손 고정)', mechanisms: row.requiredTokens ?? [], source: row.source })),
  ].sort((left, right) => byText(left.target, right.target) || byText(left.kind, right.kind));
  return {
    id: 'service-guards', title: '서비스 자원 판정 목록', sources: ['config/governance/authorization-policies.json'],
    notices: [
      '서비스 메서드가 자원 단위로 판정하는 정책이다. 기계 판정은 도우미 호출을 센 원장, 토큰 대조는 사람이 고정한 소스 토큰이다.',
      '정책 이름의 뜻은 접근 정책 정의 표에 있다.',
    ],
    columns: [['target', '대상 메서드'], ['policy', '정책'], ['kind', '판정 방식'], ['mechanisms', '근거'], ['source', '소스']],
    rows,
  };
}

export function accessPolicySheet({ policies }) {
  return {
    id: 'access-policies', title: '접근 정책 정의', sources: ['config/governance/authorization-policies.json'],
    notices: ['정의는 원장 원문(영어)이다. 번역하지 않는다 — 번역이 뜻을 바꾸면 인가 의미가 흐려진다(H3).'],
    columns: [['policy', '정책'], ['definition', '정의(원문)']],
    rows: Object.entries(policies.policyDefinitions ?? {}).map(([policy, definition]) => ({ policy, definition })),
  };
}

export function layerOf(path) {
  if (path.includes('/controller/')) return '컨트롤러';
  if (path.includes('/dto/')) return 'DTO';
  if (path.includes('/repository/')) return '저장소';
  if (path.includes('/service/')) return '서비스';
  if (path.includes('/domain/')) return '도메인·엔티티';
  if (path.includes('/config/')) return '설정';
  if (path.includes('/security/')) return '보안';
  return '공통·기타';
}

/** files: [{ path, code }] — 생산 Java. ownerOf(path, code) 는 생성기의 소유 판정이다. */
export function programSheet({ files, ownerOf }) {
  return {
    id: 'programs', title: '프로그램 목록', sources: ['foundation/', 'business-core/', 'business-app/', 'api-server/', 'config/modules/'],
    notices: [
      '네 온라인 모듈의 생산 Java 다. 독립 이관 도구(migration-tool)는 싣지 않는다.',
      '프로그램 ID 체계는 따로 없다 — 경로로 쓴다. 계층은 경로 기준 분류다.',
      '소유 기능은 생성기의 소유 판정(지원 파일 선언 → 업무 앱 디렉터리 → foundation·business-core 는 core → 참조 패키지)이다.',
    ],
    columns: [['path', '프로그램 경로'], ['module', '모듈'], ['package', '패키지'], ['name', '클래스'], ['layer', '계층'], ['owner', '소유 기능']],
    rows: [...files].sort((left, right) => byText(left.path, right.path)).map((file) => ({
      path: file.path, module: file.path.split('/')[0], package: file.code.match(/^\s*package\s+([\w.]+)\s*;/mu)?.[1],
      name: file.path.split('/').at(-1).replace(/\.java$/u, ''), layer: layerOf(file.path), owner: ownerOf(file.path, file.code) })),
  };
}

export function menuSheet({ menus }) {
  const groups = new Map();
  for (const row of menus.navigation ?? []) groups.set(row.menu_sn, [...(groups.get(row.menu_sn) ?? []), row.authrt_cd]);
  return {
    id: 'menus', title: '메뉴 목록', sources: ['config/project-composer-menus.json'],
    notices: [
      'Flyway 메뉴 스냅숏의 메뉴 행과 시드 그룹(ROLE_ADMIN·ROLE_USER)의 기본 표시만 싣는다 — 기관 DB 의 실제 메뉴·배정이 아니다.',
    ],
    columns: [['menuSn', '메뉴 번호'], ['parentSn', '상위 메뉴 번호'], ['order', '순서'], ['name', '메뉴 이름'], ['route', '경로'],
      ['use', '사용'], ['deleted', '삭제'], ['groups', '기본 표시 그룹']],
    rows: (menus.menus ?? []).map((row) => ({ menuSn: row.menu_sn, parentSn: row.up_menu_sn, order: row.menu_ordr, name: row.menu_nm,
      route: row.modern_route, use: row.use_yn, deleted: row.del_yn, groups: [...(groups.get(row.menu_sn) ?? [])].sort(byText) })),
  };
}

export function weaknessSheet({ weaknesses }) {
  const automation = weaknesses.legend?.automation ?? {};
  const review = weaknesses.legend?.review ?? {};
  return {
    id: 'security-weaknesses', title: '구현단계 보안약점 점검표', sources: ['config/security/secure-coding-weaknesses.json'],
    notices: [
      `${weaknesses.purpose ?? ''}`.trim() || '구현단계 보안약점 사전 점검 원장이다.',
      ...Object.entries(automation).map(([code, meaning]) => `자동 탐지 ${code}: ${meaning}`),
      ...Object.entries(review).map(([code, meaning]) => `검토 ${code}: ${meaning}`),
    ],
    columns: [['id', 'ID'], ['category', '분류'], ['name', '보안약점'], ['cwe', 'CWE'], ['owasp', 'OWASP Top 10'], ['applicable', '적용'],
      ['java', '자동 탐지(Java)'], ['javascript', '자동 탐지(JavaScript)'], ['controls', '통제 경로'], ['review', '검토'], ['note', '메모'], ['next', '다음 행동']],
    rows: (weaknesses.items ?? []).map((item) => ({ id: item.id, category: item.category, name: item.name, cwe: (item.cwe ?? []).map((cwe) => `CWE-${cwe}`),
      owasp: item.owaspTop10 ?? [], applicable: item.applicable, java: item.automation?.java, javascript: item.automation?.javascript,
      controls: item.controls ?? [], review: item.review, note: item.note, next: item.next })),
  };
}

export function falsePositiveSheet({ review }) {
  return {
    id: 'false-positives', title: '보안 오탐 승인 목록', sources: ['config/security/false-positive-review.json'],
    notices: [`원장 상태 ${cellText(review.status)}, CodeQL ${cellText(review.codeqlVersion)}, 승인일 ${cellText(review.approvedOn)}.`],
    emptyMessage: '승인된 오탐이 없다.',
    columns: [['id', 'ID'], ['language', '언어'], ['ruleId', '규칙'], ['file', '파일'], ['line', '줄'], ['reason', '사유'], ['expiresOn', '만료일'], ['status', '상태']],
    rows: (review.findings ?? []).map((row) => ({ id: row.id, language: row.language, ruleId: row.ruleId, file: row.file, line: row.line,
      reason: row.reason, expiresOn: row.expiresOn, status: row.status })),
  };
}

export function buildSheets(inputs) {
  const sheets = [
    permissionSheet(inputs), screenSheet(inputs), capabilitySheet(inputs), interfaceSheet(inputs), serviceGuardSheet(inputs),
    accessPolicySheet(inputs), programSheet(inputs), menuSheet(inputs), weaknessSheet(inputs), falsePositiveSheet(inputs),
    traceSheet(inputs), inputFieldSheet(inputs), testListSheet(inputs.tests),
  ];
  if (inputs.requirements !== undefined) {
    const capabilities = new Set(inputs.routes.routes.flatMap((route) => (route.capabilities ?? []).map((capability) => `${route.route}#${capability.id}`)));
    sheets.push(requirementSheet(inputs.requirements, { capabilities, screens: new Set(inputs.registry.screens.map((screen) => screen.route)),
      interfaces: new Set((inputs.policies.operationBindings ?? []).map((binding) => `${binding.method} ${binding.path}`)) }));
  }
  return sheets;
}

const PACKAGE_NOTICES = Object.freeze([
  '저장소 원장에서 계산한 비규범 파생물이다. 감리(감리법인의 제3자 점검)와 검수(발주기관의 시험·검사)를 대신하지 않는다.',
  '도구가 낸 초안이다. 제출 전에 사람이 확인해 확정한다. 확정은 이 묶음이 아니라 기관 절차의 몫이다.',
  '값은 템플릿 원장의 현재 값이다 — 기관 DB 의 실제 배정이나 운영 실측이 아니다.',
  `빈칸은 "${BLANK}" 으로, 검토 전 값은 원장 표기(UNVERIFIED·E0~E3) 그대로 싣는다.`,
]);

/** 내용 다이제스트 — 표 파일(README·manifest 제외)의 경로와 sha256. 커밋·시각을 넣지 않으므로 원장 값이 같으면 같다. */
export function contentDigest(files) {
  return sha256([...files.entries()].filter(([path]) => !['manifest.json', 'README.md'].includes(path)).sort(([left], [right]) => byText(left, right))
    .map(([path, text]) => `${path}\t${sha256(text)}\n`).join(''));
}

/** 이 묶음을 다시 만드는 명령 — 표 집합이 옵션마다 다르므로 옵션까지 적는다. */
export function reproduceCommand(meta) {
  return ['node scripts/export-deliverables.mjs', meta.database ? '--db' : null, meta.requirements ? '--rtm <같은 CSV>' : null].filter(Boolean).join(' ');
}

/** extras: 표가 아닌 문서(예: db-erd.md) — { path, title, text }. 표처럼 내용 다이제스트에 들어간다. */
export function renderPackage(sheets, meta, extras = []) {
  const files = new Map();
  for (const sheet of sheets) {
    for (const notice of sheet.notices) assertNoBannedClaims(notice, `${sheet.id} notice`);
    files.set(`${sheet.id}.md`, toMarkdown(sheet));
    files.set(`${sheet.id}.csv`, toCsv(sheet));
  }
  for (const extra of extras) {
    assertNoBannedClaims(extra.text, extra.path);
    files.set(extra.path, extra.text);
  }
  const digest = contentDigest(files);
  const readme = [
    '# 감리·검수 입력 자료 초안', '',
    `커밋 \`${meta.commit}\` · ${meta.cleanTree ? '작업 트리 깨끗함' : '작업 트리 변경 포함 — 미리 보기이며 제출용이 아니다'}`, '',
    '## 이 묶음의 성격', '', ...PACKAGE_NOTICES.map((notice) => `- ${notice}`), '',
    '## 표', '', '| 표 | Markdown | CSV | 행 수 |', '|---|---|---|---|',
    ...sheets.map((sheet) => `| ${sheet.title} | [${sheet.id}.md](${sheet.id}.md) | [${sheet.id}.csv](${sheet.id}.csv) | ${sheet.rows.length} |`), '',
    ...(extras.length ? ['## 그림', '', ...extras.map((extra) => `- [${extra.title}](${extra.path})`), ''] : []),
    ...(meta.database ? [`DB 표는 참조 스키마(일회용 PostgreSQL ${meta.database.postgres} 에 Flyway ${meta.database.migrations}개를 단계 적용)에서 읽었다 — 운영 DB 실측이 아니다.`, '']
      : ['DB 표(테이블·컬럼 정의서, 외래 키, ERD, 표준 사전)는 --db 로 만든다 — 이 묶음에는 없다.', '']),
    '## 재현', '',
    `내용 다이제스트 \`${digest}\` — 표 파일로 계산한다. 커밋·시각을 넣지 않으므로 원장 값이 같으면 다른 커밋에서 \`${reproduceCommand(meta)}\` 로 다시 만들어도 같다.`,
    ...(meta.requirements ? ['이 묶음은 기관 요구사항 추적 CSV 를 실행 인자로 받았다 — 다이제스트에 그 내용이 들어가므로 같은 CSV 를 다시 넘겨야 같다.'] : []), '',
    '입력 파일의 sha256, lockfile, 도구 버전은 manifest.json 에 있다. 공공 규범과의 대응과 이 묶음의 경계는 docs/03-guides/design-to-deliverables-guide.md 에 있다.', '',
  ].join('\n');
  assertNoBannedClaims(readme, 'README.md');
  files.set('README.md', readme);
  const manifest = {
    schemaVersion: 1, kind: 'non-normative-derived-deliverables', decision: 'DEC-OPS-382', commit: meta.commit, cleanTree: meta.cleanTree,
    toolchain: meta.toolchain, inputs: meta.inputs, lockfiles: meta.lockfiles, database: meta.database ?? null,
    files: [
      ...sheets.flatMap((sheet) => [`${sheet.id}.md`, `${sheet.id}.csv`].map((path) => ({ path, rows: sheet.rows.length, sha256: sha256(files.get(path)) }))),
      ...extras.map((extra) => ({ path: extra.path, rows: null, sha256: sha256(extra.text) })),
    ],
    contentDigest: digest,
  };
  files.set('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return { files, digest };
}

/**
 * 원장을 읽고 경로·sha256 을 남긴다(금지 입력 판정 포함). 생산 Java·E2E·시험 소스와 --rtm 도 같은 판정을 지난다.
 * 생성기 카탈로그·기능 선언(project-composer-catalog·composer-modules)은 그 모듈의 읽기를 쓰며 config/modules 와 생산 소스만 읽는다.
 */
function inputReader(root) {
  const inputs = new Map();
  const read = (path) => {
    assertAllowedInput(path);
    const text = readFileSync(join(root, path), 'utf8');
    inputs.set(path, textSha256(text));
    return text;
  };
  return { read, json: (path) => JSON.parse(read(path)), record: (path, digest) => inputs.set(path, digest),
    list: () => [...inputs].sort(([left], [right]) => byText(left, right)).map(([path, digest]) => ({ path, sha256: digest })) };
}

export async function loadInputs(root = ROOT, { rtm } = {}) {
  if (existsSync(join(root, GENERATED_PRODUCT_MARKER))) {
    throw new Error('export-deliverables runs on the source repository only; generated products need a projected-ledger mode first');
  }
  const io = inputReader(root);
  const [{ loadProjectComposerCatalog }, { requiresClosure, sourceOwner, javaSourceFiles }, { loadComposerModules }] = await Promise.all([
    import('./project-composer-catalog.mjs'), import('./project-composer-integrations.mjs'), import('./composer-modules.mjs')]);
  const catalog = loadProjectComposerCatalog(root);
  const modules = loadComposerModules(root);
  const supportOwners = new Map([...modules.declarations.supportFiles()].flatMap(([domain, files]) => files.map((file) => [file, domain])));
  const ownerOf = sourceOwner(supportOwners, catalog.capabilities.map((capability) => capability.id), requiresClosure(catalog.capabilities));
  const files = javaSourceFiles(root);
  for (const file of files) assertAllowedInput(file.path);
  // 묶음 입력 두 개는 파일 하나가 아니라 집합의 다이제스트다 — 생산 Java(경로·내용)와 생성기 카탈로그의 기능 선언·소스 목록 해시.
  io.record(`(생산 Java ${files.length}개)`, sha256(files.map((file) => `${file.path}\t${textSha256(readFileSync(join(root, file.path), 'utf8'))}\n`).join('')));
  io.record('(생성기 카탈로그 기능 선언·소스 목록)', sha256(`${catalog.provenance.modulesHash}\n${catalog.provenance.sourceInventoryHash}\n`));
  const { e2e, tests } = await loadTraceInputs(root, { digest: textSha256, record: io.record, assertAllowed: assertAllowedInput });
  let requirements;
  if (rtm !== undefined) {
    // 기관 요구사항 추적 CSV 는 커밋하지 않는 실행 인자다. 내용의 해시만 남기고 경로는 manifest 에 싣지 않는다.
    // 추적 판정은 대소문자를 가리지 않는다(:(icase)) — Windows 에서는 대소문자만 다른 경로도 같은 파일을 연다.
    const text = readRequirementFile(root, resolve(rtm), { assertAllowed: assertAllowedInput, tracked: (path) => {
      try { execFileSync('git', ['ls-files', '--error-unmatch', '--', `:(icase)${path}`], { cwd: root, stdio: 'ignore' }); return true; } catch { return false; }
    } });
    requirements = readRequirements(text);
    io.record('(실행 인자) 기관 요구사항 추적 CSV', textSha256(text));
  }
  return {
    inputs: {
      catalog: io.json('config/governance/permission-catalog.json'),
      bundles: io.json('config/governance/permission-bundles.json'),
      policies: io.json('config/governance/authorization-policies.json'),
      routes: io.json('config/ui-route-capabilities.json'),
      registry: readScreenRegistryArtifact(io.read('frontend/src/types/generated-screen-registry.ts')),
      openapi: io.json('api-docs.json'),
      menus: io.json('config/project-composer-menus.json'),
      weaknesses: io.json('config/security/secure-coding-weaknesses.json'),
      review: io.json('config/security/false-positive-review.json'),
      files, ownerOf, moduleFiles: modules.files, e2e, tests, requirements,
    },
    inputList: io.list(),
  };
}

function toolchain(root) {
  const lock = readFileSync(join(root, 'frontend/pnpm-lock.yaml'), 'utf8').replace(/\r\n?/gu, '\n');
  const typescript = lock.match(/^ {6}typescript:\n {8}specifier: [^\n]+\n {8}version: ([^\s(]+)/mu)?.[1] ?? null;
  return { node: process.version, typescript };
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

/** 쓰는 곳은 build/deliverables 아래뿐이다 — 공개 경로(frontend/public 등)와 저장소 원장에 쓰지 않는다. */
export function resolveOutput(root, out) {
  const base = resolve(root, OUTPUT_ROOT);
  const target = resolve(root, out);
  const inside = relative(base, target);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) throw new Error(`deliverables must be written under ${OUTPUT_ROOT}/: ${out}`);
  return target;
}

export async function exportDeliverables({ root = ROOT, allowDirty = false, out, db = false, rtm } = {}) {
  const commit = git(root, ['rev-parse', 'HEAD']);
  const cleanTree = git(root, ['status', '--porcelain']) === '';
  if (!cleanTree && !allowDirty) throw new Error('working tree is not clean — commit first, or pass --allow-dirty for a preview');
  const target = resolveOutput(root, out ?? `${OUTPUT_ROOT}/${commit.slice(0, 12)}${cleanTree ? '' : '-dirty'}`);
  const { inputs, inputList } = await loadInputs(root, { rtm });
  const sheets = buildSheets(inputs);
  const extras = [];
  let database;
  if (db) {
    // DB 모드는 Docker 로 일회용 컨테이너를 만든다(export-deliverables-db.mjs). 공유 DB 에 접속하지 않는다.
    const loaded = await (await import('./export-deliverables-db.mjs')).loadDatabaseDeliverables(root);
    sheets.push(...loaded.sheets);
    extras.push(loaded.erd);
    inputList.push(loaded.input);
    inputList.sort((left, right) => byText(left.path, right.path));
    database = loaded.database;
  }
  // 있는지 따로 확인하지 않고 바로 읽는다 — 확인과 읽기 사이 경합을 두지 않는다. 없는 lockfile 은 싣지 않는다.
  const lockfiles = LOCKFILES.flatMap((path) => {
    try {
      return [{ path, sha256: textSha256(readFileSync(join(root, path), 'utf8')) }];
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  });
  const { files, digest } = renderPackage(sheets, { commit, cleanTree, toolchain: toolchain(root), inputs: inputList, lockfiles, database,
    requirements: inputs.requirements !== undefined }, extras);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const [path, text] of files) writeFileSync(join(target, path), text);
  return { target, digest, files: files.size };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const valueOf = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const out = valueOf('--out');
  const rtm = valueOf('--rtm');
  const known = new Set(['--allow-dirty', '--db', ...(args.includes('--out') ? ['--out', out] : []), ...(args.includes('--rtm') ? ['--rtm', rtm] : [])]);
  if ((args.includes('--out') && !out) || (args.includes('--rtm') && !rtm) || args.some((arg) => !known.has(arg))) {
    console.error('사용: node scripts/export-deliverables.mjs [--db] [--rtm <기관 요구사항 추적 CSV>] [--allow-dirty] [--out <build/deliverables 아래 디렉터리>]');
    process.exit(2);
  }
  const result = await exportDeliverables({ allowDirty: args.includes('--allow-dirty'), out, db: args.includes('--db'), rtm });
  console.log(`산출물 초안 ${result.files}개 파일: ${relative(ROOT, result.target).split(sep).join('/')}`);
  console.log(`내용 다이제스트: ${result.digest}`);
}

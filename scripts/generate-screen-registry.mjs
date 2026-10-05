#!/usr/bin/env node
/**
 * generate-screen-registry — 화면 목록 생성기(관리 콘솔 2단계, D3·D4 의 원천).
 *
 * 메뉴가 가리키는 대상은 '프로그램'(레거시 URL 인가 서술자)이 아니라 앱 화면이다. 이 생성기는 코드 원장 두 개와
 * 화면의 쓰기 권한 사용처를 합쳐 화면 목록을 빌드 시점에 만든다. 같은 사실을 config JSON 에 따로 두지 않는다 —
 * 정본은 아래 입력이고 산출물은 frontend/src/types/generated-screen-registry.ts 하나다.
 *
 *   · 화면 모집단 — frontend/src/app 의 page 파일 중 라우팅이 page 인 것(ui-route-capabilities-contract.mjs 와 같은 판정).
 *     page-redirect·config-redirect 는 별칭으로 따로 내보내며 링크하지 않는다(역참조 가드). 화면 파일이 없는 앱 설정
 *     (next.config redirects()) 리다이렉트도 별칭이다(appRedirectAliases) — 앱 설정 리다이렉트는 화면 파일보다 먼저 적용되는데
 *     목록에 없으면 그 경로가 동적 형제(…/[id])로 풀려 엉뚱한 화면에 귀속된다(레거시 게시판 경로 selectBoardList 가
 *     게시글 작성 화면으로 넘기는 동적 별칭 /admin/community/boards/[id] 에 맞았다).
 *   · 진입 권한 — config/governance/permission-catalog.json pagePermissions(정확 경로 → 같은 세그먼트 수 동적 형제)·
 *     pagePermissionModes(기본 ANY).
 *   · 쓰기 권한 — operation-consumer census 축 3 의 계산(analyzeWritePermissionNeeds).
 *   · 표시 권한 — canPermission(…, 'CODE') 리터럴로 적힌 권한.
 *   · 귀속 — 파일은 가장 가까운 page 디렉터리의 화면에 귀속하고, 그 파일을 import 하는 다른 화면들에도 귀속한다
 *     (다른 라우트의 허브 클라이언트를 렌더하는 하위 화면 — /smart-toolkit/schedule 이 work-hub 클라이언트를 연다).
 *     다음은 공용 파일이라 그것을 import 하는 화면들에만 귀속한다: src/components 등 app 밖 파일, 별칭 라우트
 *     디렉터리의 파일, page 는 없고 하위에 page 를 품은 라우트 구간의 파일(app/admin/user 의 허브 클라이언트), 그리고
 *     app/ 루트의 page.tsx 밖 파일. 루트 페이지(/)가 모든 앱 파일의 가장 가까운 page 라서, 마지막 구분 없이는
 *     layout·헤더·전역 provider 의 쓰기가 업무 홈 화면의 권한으로 잡힌다(layout 을 import 하는 파일은 없으므로 거기서
 *     멈춘다). import 는 축 3 의 이름 기반 importersOf 에 `dynamic(() => import('…/Name'))` 형태를 더해 찾는다 —
 *     업무 홈은 자기 클라이언트를 동적 import 로 연다. 축 3 판정은 바꾸지 않는다.
 *   · 라벨 — 메뉴 snapshot(config/project-composer-menus.json)의 menu_nm → 라우트 원장 visibleLabel → 없음.
 *     탭을 가리키는 메뉴(경로에 ?tab= 등 쿼리가 있는 것)는 화면이 아니라 탭의 이름이라 라벨 원천에서 뺀다.
 *   · shellAccess — 라우트 원장(config/ui-route-capabilities.json) 값.
 *   · 권한 묶음 — config/governance/permission-bundles.json(관리 콘솔 3단계 D5). 묶음이 여는 화면은 원장에 적지 않고
 *     위 화면 목록에서 계산한다: 진입 권한이 빈 화면을 빼고, 진입 권한을 이 묶음이 충족하는(ANY 하나 이상, ALL 전부)
 *     화면이다(screens). 진입 권한이 빈 화면(로그인 사용자 누구나 들어가는 화면) 가운데 이 묶음의 권한을 쓰기('write')로
 *     쓰는 화면은 관련 화면(relatedScreens)이다 — 권한 작업대가 그 메뉴 표시도 더한다(2026-10-03, 선택지 ①). 표시 리터럴
 *     ('display')은 어느 버튼에 걸었는지 모르는 언급이라 보지 않는다(엉뚱한 메뉴가 붙는다 — 2026-10-02 검토). 카탈로그의
 *     모든 권한은 어느 묶음에 있거나 원장 excluded 에 사유와 함께 있어야 한다. 묶음은 그룹이 아니다 — 권한 작업대가 고른
 *     묶음의 기능권한을 그룹 초안에 더할 뿐이고, 저장은 같은 '권한 변경 저장'(버전 확인·보호 권한·마지막 관리자 보호·감사)이
 *     한다. 이 생성기가 원장을 검증한다(buildPermissionBundles).
 *     묶음의 이름·설명이 쓰면 안 되는 용어는 화면 용어 원장(config/frontend-visible-terms.json terms)에서 읽는다 — 사본을
 *     두지 않는다(replacedTermFinder).
 *
 * 거버넌스 총량(AGENTS.md): generate-permissions 를 넓히지 않은 이유 — 그 생성기는 의존성 없이 재사용 투영이
 * frontend 설치 없이 부르고, 이 생성기는 TypeScript AST(축 3)가 필요하다. 축 3 계산은 새 판정기가 아니라
 * operation-consumer-census.mjs 의 공용 함수를 그대로 쓴다.
 *
 * Usage:
 *   node scripts/generate-screen-registry.mjs           # 산출물을 다시 쓴다
 *   node scripts/generate-screen-registry.mjs --check   # 산출물이 낡았으면 실패한다
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { discoverConfigRedirects, discoverPageRoutes, expectedRouting } from './ui-route-capabilities-contract.mjs';
import {
  analyzeWritePermissionNeeds, isIntermediaryFile, isServiceFile, isTestFile, stripTsComments,
} from './operation-consumer-census.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SCREEN_REGISTRY_OUTPUT = 'frontend/src/types/generated-screen-registry.ts';
export const SCREEN_REGISTRY_INPUTS = Object.freeze({
  catalog: 'config/governance/permission-catalog.json',
  policies: 'config/governance/authorization-policies.json',
  boundaries: 'config/governance/generated-api-boundaries.json',
  routes: 'config/ui-route-capabilities.json',
  menus: 'config/project-composer-menus.json',
  bundles: 'config/governance/permission-bundles.json',
  visibleTerms: 'config/frontend-visible-terms.json',
});
/**
 * 보호 권한 — 서버 AuthorizationAdministrationService 의 SENSITIVE_ADMINISTRATION_PERMISSIONS 와 같은 집합이다(계약
 * 테스트가 대조한다). 이 권한을 그룹에 새로 더하거나 빼는 저장은 권한 설정(AUTHRT_GRANT)과 권한 배정(AUTHRT_ASSIGN)을
 * 모두 가진 관리자만 할 수 있으므로, 묶음의 protected 는 이 권한을 하나라도 품는지와 정확히 같아야 한다. 산출물이
 * 같은 집합을 PROTECTED_PERMISSIONS 로 내보낸다 — 화면은 사본을 두지 않고 그것을 읽는다.
 */
export const PROTECTED_PERMISSIONS = Object.freeze(['AUTHRT_ASSIGN', 'AUTHRT_GRANT', 'MFA_RECOVER', 'USER_PASSWORD']);
const BUNDLE_LEDGER_FIELDS = ['schemaVersion', 'description', 'bundles', 'excluded'];
const BUNDLE_FIELDS = ['id', 'name', 'description', 'protected', 'permissions'];
const EXCLUDED_FIELDS = ['code', 'reason'];
const BUNDLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
/**
 * 화면 용어 원장의 결정 중 묶음의 이름·설명이 쓰면 안 되는 것. 바꾸라는 결정(replace-*)과 금지(forbidden-*)에 더해,
 * 대상 독자·의미를 밝히는 예외 검토가 있어야만 쓰는 결정(audience-and-context-required)도 거부한다 — 묶음 문구에는
 * 그 예외 검토 경로가 없다. 측정 근거가 있어야 하는 상태어(evidence-required)와 조건부 약어(conditional)는 문맥 판단이라
 * 여기서 보지 않는다.
 */
const isReplacedTermDecision = decision => typeof decision === 'string'
  && (decision.startsWith('replace-') || decision.startsWith('forbidden-') || decision === 'audience-and-context-required');
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const HEADER = '// Generated by scripts/generate-screen-registry.mjs. Do not edit.';
const SOURCE_PRIORITY = ['entry', 'write', 'display'];
const DYNAMIC_SEGMENT = /^\[[^.[\]]+\]$/u;
// 그림 문자와 그 결합 문자(변형 선택자·ZWJ·키캡)를 지운다. 메뉴 이름의 장식이지 화면 이름이 아니다.
const PICTOGRAPHIC = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu;
const CAN_PERMISSION_LITERAL = /\bcanPermission\s*\([^,;]*,\s*(['"`])([A-Z][A-Z0-9_]*)\1\s*\)/gu;
const APP_PREFIX = 'frontend/src/app/';
const DISPLAY_SOURCE_ROOTS = ['frontend/src/app', 'frontend/src/components'];

const toPosix = value => value.split('\\').join('/');
const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function readJson(root, file) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) throw new Error(`Screen registry input is missing: ${file}`);
  return JSON.parse(fs.readFileSync(target, 'utf8').replace(/\r\n?/gu, '\n'));
}

/** 생성기는 frontend 의 TypeScript 로 AST 를 만든다. 대상 저장소에 없으면(임시 fixture·투영본) 이 저장소의 것을 쓴다. */
function loadTypeScript(root) {
  for (const base of [root, repoRoot]) {
    try {
      return createRequire(path.join(base, 'frontend', 'package.json'))('typescript');
    } catch {
      // 다음 후보를 본다.
    }
  }
  throw new Error('Screen registry generation requires frontend TypeScript (pnpm -C frontend install)');
}

function walkFiles(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(target, output);
    else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)) output.push(target);
  }
  return output;
}

/** 'frontend/src/app/admin/x/page.tsx' → 'admin/x', 'frontend/src/app/page.tsx' → '', 'frontend/src/app/admin' → ''. */
function appDirectoryOf(file) {
  const directory = path.posix.dirname(toPosix(file).slice(APP_PREFIX.length));
  return directory === '.' ? '' : directory;
}

/**
 * 쿼리·해시와 끝 슬래시를 뗀 경로. 경로부가 비면(라우트 없는 메뉴는 modern_route 를 '' 로 저장한다 —
 * MenuRouteQueryKeyTest) 화면이 아니므로 null 이다 — '/' 로 풀면 연결 없는 메뉴가 업무 홈 이름이 된다.
 */
function routePathOf(target) {
  const [withoutQuery] = target.split(/[?#]/u);
  if (withoutQuery.trim() === '') return null;
  return withoutQuery.replace(/\/+$/u, '') || '/';
}

/**
 * 화면 파일이 없는 앱 설정 리다이렉트의 별칭. 앱 설정(next.config)은 화면 파일보다 먼저 적용되므로 그 경로는 화면이 아니라
 * 넘어가는 경로다. 소스는 매개변수 없는 앱 절대 경로여야 한다 — `:id`·`*`·`(…)` 같은 경로 패턴은 이 목록의 경로 표기
 * (`[id]`)와 목적지 치환으로 옮기는 규칙이 아직 없으므로 조용히 빼지 않고 실패한다(fail-closed).
 */
const LITERAL_APP_PATH = /^\/(?:[^/\s:*?()+{}[\]#]+(?:\/[^/\s:*?()+{}[\]#]+)*)?$/u;
function appRedirectAliases(redirects, pageRoutes) {
  const aliases = [];
  for (const [source, redirect] of redirects) {
    if (pageRoutes.has(source)) continue; // 화면 파일이 있는 리다이렉트는 page 탐색이 별칭으로 낸다.
    if (!LITERAL_APP_PATH.test(source)) {
      throw new Error(`next.config redirect source must be a literal app path to be listed as a screen alias: ${source}`);
    }
    const target = typeof redirect?.target === 'string' && redirect.target !== '' ? redirect.target : null;
    aliases.push({ route: source, target, kind: 'config-redirect' });
  }
  return aliases;
}

/** 정확 경로가 먼저, 없으면 세그먼트 수가 같은 동적 형제(page-authorization.ts 와 같은 규칙). */
function pageEntryFor(route, pagePermissions) {
  if (Object.hasOwn(pagePermissions, route)) return [route, pagePermissions[route]];
  const segments = route.split('/');
  return Object.entries(pagePermissions).find(([candidate]) => {
    const parts = candidate.replace(/\/$/u, '').split('/');
    return parts.length === segments.length
      && parts.every((part, index) => (DYNAMIC_SEGMENT.test(part) ? segments[index].length > 0 : part === segments[index]));
  }) ?? null;
}

function cleanMenuName(name) {
  return typeof name === 'string' ? name.replace(PICTOGRAPHIC, '').replace(/\s+/gu, ' ').trim() : '';
}

/**
 * 메뉴 라벨: 경로부가 화면 경로와 같고 쿼리·해시가 없는 메뉴의 이름. 사용 중인 메뉴를 먼저 보고, 없으면 사용하지 않는
 * 메뉴를 본다(삭제된 메뉴는 보지 않는다). 그 단계의 이름이 하나로 모이지 않으면 메뉴 라벨이 없는 것으로 본다.
 */
function menuLabelFor(route, menus) {
  const candidates = menus.filter(menu => menu?.del_yn !== 'Y' && typeof menu?.modern_route === 'string'
    && !/[?#]/u.test(menu.modern_route) && routePathOf(menu.modern_route) === route);
  for (const active of [true, false]) {
    const names = [...new Set(candidates.filter(menu => (menu.use_yn === 'Y') === active)
      .map(menu => cleanMenuName(menu.menu_nm)).filter(Boolean))];
    if (names.length === 1) return names[0];
    if (names.length > 1) return null;
  }
  return null;
}

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** 권한 집합이 화면의 진입 권한을 충족하는가. 진입 권한이 빈 화면(누구나 들어가는 화면)은 묶음이 '여는' 화면이 아니다. */
function grantsScreenEntry(granted, entry) {
  const required = entry?.permissions ?? [];
  if (required.length === 0) return false;
  return entry.mode === 'ALL' ? required.every(code => granted.has(code)) : required.some(code => granted.has(code));
}

/**
 * 권한 집합이 누구나 들어가는 화면(진입 권한이 빈 화면)의 관련 권한인가 — 그 화면이 이 집합의 권한을 쓰기('write')로 쓴다.
 * 표시 리터럴('display')은 보지 않는다: canPermission 리터럴은 어느 버튼에 걸었는지 모르는 언급이라, 그것으로 고르면 묶음과
 * 무관한 메뉴가 붙는다(2026-10-02 검토). 진입 권한이 있는 화면은 grantsScreenEntry 가 다룬다(두 판정은 겹치지 않는다).
 */
function relatesToOpenScreen(granted, screen) {
  if ((screen.entry?.permissions ?? []).length > 0) return false;
  return (screen.permissions ?? []).some(row => row.source === 'write' && granted.has(row.code));
}

/**
 * 화면 용어 원장(config/frontend-visible-terms.json)에서 묶음 문구가 쓰면 안 되는 용어를 읽어 찾는 함수를 만든다.
 * 영문 용어는 대소문자를 가리지 않고 단어 경계로, 한글 용어는 부분 문자열로 찾는다(한글에는 \b 가 없다). 원장이
 * 깨졌거나 거를 용어가 하나도 없으면 실패한다 — 검사가 조용히 비면 사본을 두던 때보다 약해진다.
 */
export function replacedTermFinder(termsLedger) {
  if (!isPlainObject(termsLedger) || !Array.isArray(termsLedger.terms)) {
    throw new Error('Visible terms ledger must declare terms');
  }
  const patterns = [];
  for (const [index, term] of termsLedger.terms.entries()) {
    const where = typeof term?.id === 'string' && term.id !== '' ? term.id : `#${index + 1}`;
    if (!isPlainObject(term) || typeof term.decision !== 'string' || !Array.isArray(term.sourceTerms)
        || term.sourceTerms.length === 0 || term.sourceTerms.some(source => typeof source !== 'string' || source.trim() === '')) {
      throw new Error(`Visible terms ledger term ${where} must declare a decision and non-empty sourceTerms`);
    }
    if (!isReplacedTermDecision(term.decision)) continue;
    for (const source of term.sourceTerms) {
      const value = source.trim();
      const start = /^[A-Za-z0-9]/u.test(value) ? '\\b' : '';
      const end = /[A-Za-z0-9]$/u.test(value) ? '\\b' : '';
      patterns.push(`${start}${escapeRegExp(value)}${end}`);
    }
  }
  if (patterns.length === 0) throw new Error('Visible terms ledger declares no replaced or forbidden term');
  const pattern = new RegExp(patterns.join('|'), 'iu');
  return text => pattern.exec(text)?.[0] ?? null;
}

/**
 * 권한 묶음 원장을 검증하고 묶음마다 여는 화면을 계산한다. 원장이 틀리면 생성이 실패한다(fail-closed).
 *
 *   · id 는 kebab-case 이고 겹치지 않는다. 이름·설명은 비지 않고(앞뒤 공백 없음) 이름은 겹치지 않으며, 화면 용어
 *     원장이 바꾸거나 금지한 용어(findReplacedTerm — replacedTermFinder)를 쓰지 않는다. 원장·묶음에 모르는 필드가
 *     있으면 거부한다.
 *   · 권한은 카탈로그에 있고 한 묶음 안에서 겹치지 않는다. 두 묶음의 권한 집합이 같으면 거부한다.
 *   · protected 는 보호 권한(PROTECTED_PERMISSIONS)을 하나라도 품는지와 정확히 같다.
 *   · *_ALL(대행) 권한을 넣으면 카탈로그에 있는 같은 행위의 기본 권한도 넣는다 — 대행 권한은 기본 권한 위에 얹는
 *     판정이라(예: BOARD_UPDATE_ALL 은 BOARD_UPDATE 엔드포인트 안의 서비스 판정) 혼자서는 화면·API 에 들어가지 못한다.
 *   · 묶음마다 여는 화면이 하나 이상이다.
 *   · 전수 분류 — 카탈로그의 모든 권한은 어느 묶음에 있거나 excluded 에 있다. excluded 항목은 {code, reason} 이고(사유
 *     필수), 코드는 카탈로그에 있으며 한 번만 나오고 어느 묶음에도 없다. 새 권한이 카탈로그에 생기면 묶음에 넣을지 뺄지를
 *     정해야 생성이 통과한다 — 아무 묶음에도 없는 권한이 조용히 쌓이지 않게 한다.
 * 묶음마다 관련 화면(relatesToOpenScreen — 누구나 들어가는 화면 중 이 묶음의 권한을 쓰기로 쓰는 화면)도 계산한다.
 * 반환하는 permissions·screens·relatedScreens 는 코드 포인트 순이다(원장 순서와 무관한 결정적 산출물).
 * @param catalogCodes 카탈로그의 권한 코드 전부(전수 분류의 기준).
 */
export function buildPermissionBundles(ledger, { screens, catalogCodes, findReplacedTerm }) {
  if (typeof findReplacedTerm !== 'function') throw new Error('Permission bundle validation requires the visible terms ledger');
  if (!isPlainObject(ledger)) throw new Error('Permission bundle ledger must be an object');
  const extraLedgerFields = Object.keys(ledger).filter(field => !BUNDLE_LEDGER_FIELDS.includes(field));
  if (extraLedgerFields.length > 0) throw new Error(`Permission bundle ledger has unknown fields: ${extraLedgerFields.join(', ')}`);
  if (ledger.schemaVersion !== 1) throw new Error(`Permission bundle ledger schemaVersion must be 1: ${JSON.stringify(ledger.schemaVersion)}`);
  if (ledger.description !== undefined && (typeof ledger.description !== 'string' || ledger.description.trim() === '')) {
    throw new Error('Permission bundle ledger description must be a non-empty string when present');
  }
  if (!Array.isArray(ledger.bundles) || ledger.bundles.length === 0) throw new Error('Permission bundle ledger must declare bundles');
  const catalog = new Set(catalogCodes);
  if (catalog.size === 0) throw new Error('Permission bundle validation requires the catalog permission codes');
  const isKnown = code => catalog.has(code);

  if (!Array.isArray(ledger.excluded)) {
    throw new Error('Permission bundle ledger must declare excluded (catalog permissions in no bundle, each with a reason)');
  }
  const excluded = new Set();
  for (const [index, entry] of ledger.excluded.entries()) {
    if (!isPlainObject(entry)) throw new Error(`Excluded permission #${index + 1} must be an object`);
    const where = typeof entry.code === 'string' && entry.code !== '' ? entry.code : `#${index + 1}`;
    const extraFields = Object.keys(entry).filter(field => !EXCLUDED_FIELDS.includes(field));
    if (extraFields.length > 0) throw new Error(`Excluded permission ${where} has unknown fields: ${extraFields.join(', ')}`);
    if (typeof entry.code !== 'string' || !isKnown(entry.code)) {
      throw new Error(`Unknown permission code in excluded permissions: ${JSON.stringify(entry.code)}`);
    }
    if (excluded.has(entry.code)) throw new Error(`Excluded permissions list a permission twice: ${entry.code}`);
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '' || entry.reason !== entry.reason.trim()) {
      throw new Error(`Excluded permission ${entry.code} must declare a reason without surrounding spaces`);
    }
    excluded.add(entry.code);
  }

  const ids = new Set();
  const names = new Set();
  const signatures = new Map();
  const bundles = ledger.bundles.map((bundle, index) => {
    if (!isPlainObject(bundle)) throw new Error(`Permission bundle #${index + 1} must be an object`);
    const where = typeof bundle.id === 'string' && bundle.id !== '' ? bundle.id : `#${index + 1}`;
    const extraFields = Object.keys(bundle).filter(field => !BUNDLE_FIELDS.includes(field));
    if (extraFields.length > 0) throw new Error(`Permission bundle ${where} has unknown fields: ${extraFields.join(', ')}`);
    if (typeof bundle.id !== 'string' || !BUNDLE_ID.test(bundle.id)) {
      throw new Error(`Invalid permission bundle id (kebab-case): ${JSON.stringify(bundle.id)}`);
    }
    if (ids.has(bundle.id)) throw new Error(`Duplicate permission bundle id: ${bundle.id}`);
    ids.add(bundle.id);
    for (const field of ['name', 'description']) {
      const value = bundle[field];
      if (typeof value !== 'string' || value.trim() === '' || value !== value.trim()) {
        throw new Error(`Permission bundle ${bundle.id} must declare a ${field} without surrounding spaces`);
      }
      const replaced = findReplacedTerm(value);
      if (replaced !== null) throw new Error(`Permission bundle ${bundle.id} ${field} uses a term the visible-copy rules replace: ${replaced}`);
    }
    if (names.has(bundle.name)) throw new Error(`Duplicate permission bundle name: ${bundle.name}`);
    names.add(bundle.name);
    if (typeof bundle.protected !== 'boolean') throw new Error(`Permission bundle ${bundle.id} must declare protected as a boolean`);
    if (!Array.isArray(bundle.permissions) || bundle.permissions.length === 0) {
      throw new Error(`Permission bundle ${bundle.id} must declare permissions`);
    }
    const granted = new Set();
    for (const code of bundle.permissions) {
      if (typeof code !== 'string' || !isKnown(code)) throw new Error(`Unknown permission code in permission bundle ${bundle.id}: ${code}`);
      if (granted.has(code)) throw new Error(`Permission bundle ${bundle.id} lists a permission twice: ${code}`);
      if (excluded.has(code)) throw new Error(`Permission ${code} is excluded but listed in permission bundle ${bundle.id}`);
      granted.add(code);
    }
    const heldProtected = PROTECTED_PERMISSIONS.filter(code => granted.has(code));
    if (bundle.protected !== heldProtected.length > 0) {
      throw new Error(heldProtected.length > 0
        ? `Permission bundle ${bundle.id} holds protected permissions (${heldProtected.join(', ')}) but is not marked protected`
        : `Permission bundle ${bundle.id} is marked protected but holds no protected permission`);
    }
    for (const code of [...granted].sort(byCodePoint)) {
      if (!code.endsWith('_ALL')) continue;
      const base = code.slice(0, -'_ALL'.length);
      if (isKnown(base) && !granted.has(base)) {
        throw new Error(`Permission bundle ${bundle.id} grants ${code} without its base permission ${base}`);
      }
    }
    const permissions = [...granted].sort(byCodePoint);
    const signature = permissions.join(',');
    if (signatures.has(signature)) {
      throw new Error(`Permission bundles ${signatures.get(signature)} and ${bundle.id} grant the same permissions`);
    }
    signatures.set(signature, bundle.id);
    const opened = screens.filter(screen => grantsScreenEntry(granted, screen.entry)).map(screen => screen.route).sort(byCodePoint);
    if (opened.length === 0) throw new Error(`Permission bundle ${bundle.id} opens no screen (no screen's entry permissions are satisfied)`);
    const related = screens.filter(screen => relatesToOpenScreen(granted, screen)).map(screen => screen.route).sort(byCodePoint);
    return {
      id: bundle.id, name: bundle.name, description: bundle.description, protected: bundle.protected, permissions,
      screens: opened, relatedScreens: related,
    };
  });
  const bundled = new Set(bundles.flatMap(bundle => bundle.permissions));
  const unclassified = [...catalog].filter(code => !bundled.has(code) && !excluded.has(code)).sort(byCodePoint);
  if (unclassified.length > 0) {
    throw new Error(`Catalog permissions are in no permission bundle and not excluded: ${unclassified.join(', ')}`);
  }
  return bundles;
}

export function buildScreenRegistry(root = repoRoot) {
  const catalog = readJson(root, SCREEN_REGISTRY_INPUTS.catalog);
  const policies = readJson(root, SCREEN_REGISTRY_INPUTS.policies);
  const boundaries = readJson(root, SCREEN_REGISTRY_INPUTS.boundaries);
  const ledger = readJson(root, SCREEN_REGISTRY_INPUTS.routes);
  const menuSnapshot = readJson(root, SCREEN_REGISTRY_INPUTS.menus);
  const bundleLedger = readJson(root, SCREEN_REGISTRY_INPUTS.bundles);
  const findReplacedTerm = replacedTermFinder(readJson(root, SCREEN_REGISTRY_INPUTS.visibleTerms));
  if (!Array.isArray(catalog.permissions) || !catalog.pagePermissions || typeof catalog.pagePermissions !== 'object'
      || Array.isArray(catalog.pagePermissions)) {
    throw new Error('Permission catalog must declare permissions and pagePermissions');
  }
  if (!Array.isArray(ledger.routes)) throw new Error('Route ledger must declare routes');
  if (!Array.isArray(menuSnapshot.menus)) throw new Error('Menu snapshot must declare menus');

  const actions = new Map(catalog.permissions.map(row => [row.code, row.action]));
  const known = (code, where) => {
    if (typeof actions.get(code) !== 'string') throw new Error(`Unknown permission code in ${where}: ${code}`);
    return code;
  };
  const modes = catalog.pagePermissionModes ?? {};
  const ledgerRows = new Map(ledger.routes.map(row => [row.route, row]));

  const pages = discoverPageRoutes(root);
  const repository = { repoRoot: root, configRedirects: discoverConfigRedirects(root) };
  const screens = new Map();
  const aliases = [];
  const routeByDir = new Map(); // app/ 기준 디렉터리 → 그 page 의 라우트
  const hostsPages = new Set(); // page 를 품은(자기 또는 하위에) 디렉터리
  for (const { route, source } of pages) {
    let directory = appDirectoryOf(source);
    routeByDir.set(directory, route);
    for (;;) {
      hostsPages.add(directory);
      if (directory === '') break;
      directory = appDirectoryOf(`${APP_PREFIX}${directory}`);
    }
    const routing = expectedRouting(repository, route, source);
    if (routing.kind !== 'page') {
      aliases.push({ route, target: typeof routing.target === 'string' && routing.target !== '' ? routing.target : null, kind: routing.kind });
      continue;
    }
    const pageEntry = pageEntryFor(route, catalog.pagePermissions);
    if (!pageEntry) throw new Error(`Screen has no page permission entry in ${SCREEN_REGISTRY_INPUTS.catalog}: ${route}`);
    const [entryKey, required] = pageEntry;
    if (!Array.isArray(required) || new Set(required).size !== required.length) {
      throw new Error(`Invalid page permission entry: ${entryKey}`);
    }
    const mode = modes[entryKey] ?? 'ANY';
    if (!['ANY', 'ALL'].includes(mode)) throw new Error(`Invalid page permission mode: ${entryKey}`);
    const row = ledgerRows.get(route);
    if (!row || typeof row.shellAccess !== 'string' || row.shellAccess === '') {
      throw new Error(`Screen has no route ledger row in ${SCREEN_REGISTRY_INPUTS.routes}: ${route}`);
    }
    const menuLabel = menuLabelFor(route, menuSnapshot.menus);
    const ledgerLabel = typeof row.visibleLabel === 'string' && row.visibleLabel.trim() !== '' && row.visibleLabel !== 'unverified'
      ? row.visibleLabel.trim() : null;
    screens.set(route, {
      route,
      label: menuLabel ?? ledgerLabel,
      labelSource: menuLabel ? 'menu' : ledgerLabel ? 'route-ledger' : null,
      shellAccess: row.shellAccess,
      dynamic: route.split('/').some(segment => DYNAMIC_SEGMENT.test(segment)),
      entry: { permissions: required.map(code => known(code, `page permissions of ${entryKey}`)), mode },
      granted: new Map(SOURCE_PRIORITY.map(source => [source, new Set()])),
    });
  }
  aliases.push(...appRedirectAliases(repository.configRedirects.redirects, new Set(pages.map(page => page.route))));
  for (const screen of screens.values()) {
    for (const code of screen.entry.permissions) screen.granted.get('entry').add(code);
  }

  // 파일 → 화면 귀속(맨 위 주석의 '귀속').
  const analysis = analyzeWritePermissionNeeds({ boundaries, policies, repoRoot: root, ts: loadTypeScript(root) });
  // 축 3 의 importersOf 는 정적 `from '…/Name'` 만 본다. 같은 화면 파일 모집단(app·components 의 .tsx, 테스트·서비스·
  // 중간 모듈 제외)에서 `import('…/Name')` 동적 import 를 더한다 — 축 3 판정(gated)은 그대로 둔다.
  const uiSources = new Map();
  for (const sourceRoot of DISPLAY_SOURCE_ROOTS) {
    for (const absolute of walkFiles(path.join(root, sourceRoot))) {
      const file = toPosix(path.relative(root, absolute));
      if (!file.endsWith('.tsx') || isTestFile(file) || isIntermediaryFile(file) || isServiceFile(file)) continue;
      uiSources.set(file, stripTsComments(fs.readFileSync(absolute, 'utf8')));
    }
  }
  const dynamicImportersOf = file => {
    const name = path.posix.basename(toPosix(file)).replace(/\.(?:ts|tsx)$/u, '');
    const pattern = new RegExp(`\\bimport\\s*\\(\\s*['"][^'"]*/${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}['"]\\s*\\)`, 'u');
    return [...uiSources].filter(([other, source]) => other !== file && pattern.test(source)).map(([other]) => other);
  };
  const importers = new Map();
  const importersOf = file => {
    if (!importers.has(file)) importers.set(file, [...new Set([...analysis.importersOf(file), ...dynamicImportersOf(file)])].sort(byCodePoint));
    return importers.get(file);
  };
  const rootPage = pages.find(page => page.route === '/')?.source ?? null;
  const ownerOf = file => {
    if (!file.startsWith(APP_PREFIX)) return { kind: 'shared' };
    // 가장 가까운 page 디렉터리까지 올라가되, page 는 없고 하위에 page 를 품은 디렉터리(허브 클라이언트를 둔
    // app/admin/user 같은 라우트 구간)를 지나면 그 하위 화면들이 함께 쓰는 공용 파일이다.
    for (let directory = appDirectoryOf(file); ; directory = appDirectoryOf(`${APP_PREFIX}${directory}`)) {
      const route = routeByDir.get(directory);
      if (route !== undefined) {
        return screens.has(route) && (route !== '/' || file === rootPage) ? { kind: 'screen', route } : { kind: 'shared' };
      }
      if (hostsPages.has(directory) || directory === '') return { kind: 'shared' };
    }
  };
  const screensOf = file => {
    const found = new Set();
    const seen = new Set();
    const visit = current => {
      if (seen.has(current)) return; // import 순환
      seen.add(current);
      const owner = ownerOf(current);
      if (owner.kind === 'screen') found.add(owner.route);
      // 화면 파일도 다른 화면이 import 해 렌더할 수 있다(허브 클라이언트 재사용) — 거기서 멈추지 않는다.
      importersOf(current).forEach(visit);
    };
    visit(file);
    return found;
  };

  // 쓰기 — 축 3 의 화면별 쓰기 권한.
  for (const need of analysis.needs) {
    known(need.permission, `write operation called from ${need.file}`);
    for (const route of screensOf(need.file)) screens.get(route).granted.get('write').add(need.permission);
  }

  // 표시 — canPermission 리터럴(주석은 지운다). 귀속은 쓰기와 같다.
  for (const sourceRoot of DISPLAY_SOURCE_ROOTS) {
    for (const absolute of walkFiles(path.join(root, sourceRoot))) {
      const file = toPosix(path.relative(root, absolute));
      if (isTestFile(file)) continue;
      const source = stripTsComments(fs.readFileSync(absolute, 'utf8'));
      const codes = [...source.matchAll(CAN_PERMISSION_LITERAL)].map(match => known(match[2], `canPermission literal in ${file}`));
      if (codes.length === 0) continue;
      for (const route of screensOf(file)) codes.forEach(code => screens.get(route).granted.get('display').add(code));
    }
  }

  const registry = [...screens.values()].sort((left, right) => byCodePoint(left.route, right.route)).map(screen => {
    const permissions = new Map();
    for (const source of SOURCE_PRIORITY) {
      for (const code of screen.granted.get(source)) {
        if (!permissions.has(code)) permissions.set(code, { code, action: actions.get(code), source });
      }
    }
    return {
      route: screen.route,
      label: screen.label,
      labelSource: screen.labelSource,
      shellAccess: screen.shellAccess,
      dynamic: screen.dynamic,
      entry: screen.entry,
      permissions: [...permissions.values()].sort((left, right) => byCodePoint(left.code, right.code)),
    };
  });
  aliases.sort((left, right) => byCodePoint(left.route, right.route));
  const bundles = buildPermissionBundles(bundleLedger, {
    screens: registry, catalogCodes: [...actions.keys()].filter(code => typeof actions.get(code) === 'string'), findReplacedTerm,
  });
  return { screens: registry, aliases, bundles, text: renderScreenRegistry(registry, aliases, bundles) };
}

function renderArray(items) {
  return items.length === 0 ? '[\n]' : `[\n${items.join(',\n')}\n]`;
}

/** 안쪽 문자열 배열 — 한 줄에 하나씩 들여 쓴다(바깥 배열만 줄 첫 칸의 `]` 로 닫힌다). */
function renderStringList(items) {
  return items.length === 0 ? '[]' : `[\n${items.map(item => `      ${JSON.stringify(item)}`).join(',\n')}\n    ]`;
}

function renderBundle(bundle) {
  return [
    '  {',
    `    "id": ${JSON.stringify(bundle.id)},`,
    `    "name": ${JSON.stringify(bundle.name)},`,
    `    "description": ${JSON.stringify(bundle.description)},`,
    `    "protected": ${JSON.stringify(bundle.protected)},`,
    `    "permissions": ${renderStringList(bundle.permissions)},`,
    `    "screens": ${renderStringList(bundle.screens)},`,
    `    "relatedScreens": ${renderStringList(bundle.relatedScreens)}`,
    '  }',
  ].join('\n');
}

function renderScreen(screen) {
  const permissions = screen.permissions.length === 0
    ? '[]'
    : `[\n${screen.permissions.map(permission => `      ${JSON.stringify(permission)}`).join(',\n')}\n    ]`;
  return [
    '  {',
    `    "route": ${JSON.stringify(screen.route)},`,
    `    "label": ${JSON.stringify(screen.label)},`,
    `    "labelSource": ${JSON.stringify(screen.labelSource)},`,
    `    "shellAccess": ${JSON.stringify(screen.shellAccess)},`,
    `    "dynamic": ${JSON.stringify(screen.dynamic)},`,
    `    "entry": ${JSON.stringify(screen.entry)},`,
    `    "permissions": ${permissions}`,
    '  }',
  ].join('\n');
}

export function renderScreenRegistry(screens, aliases, bundles) {
  return `${HEADER}
//
// 화면 목록 — 메뉴 편집기의 연결 화면, 권한 편집기의 화면별 권한 표, 화면 관리의 화면 목록이 읽는다.
// 원천: 화면 파일(frontend/src/app/**/page.tsx 중 라우팅이 page 인 것), 진입 권한(permission-catalog.json
// pagePermissions·pagePermissionModes), 라우트 원장(ui-route-capabilities.json shellAccess·visibleLabel),
// 메뉴 snapshot(project-composer-menus.json menu_nm), 쓰기 권한(operation-consumer census 축 3 계산).
//
// 권한 묶음 — 권한 작업대의 '권한 묶음 적용'이 읽는다. 원천은 config/governance/permission-bundles.json 이고, 묶음이
// 여는 화면(screens)과 관련 화면(relatedScreens)은 위 화면 목록에서 계산한다. screens 는 진입 권한을 이 묶음의 권한이
// 충족하는(ANY 하나 이상, ALL 전부) 화면의 라우트다. relatedScreens 는 진입 권한이 빈 화면(누구나 들어가는 화면 — 내
// 결재함·업무 쪽지함·일정 등) 가운데 이 묶음의 권한을 쓰기('write')로 쓰는 화면이다. 표시('display')만 하는 화면과 쓰기가
// 없는 화면(통합 검색·설문 참여 목록 등)은 relatedScreens 에 없고, 그 메뉴 표시는 묶음이 아니라 따로 배정한다. 두 목록은
// 겹치지 않는다. 묶음은 그룹이 아니다 — 적용은 그룹 권한 초안에 더할 뿐이고 저장·인가는 기존 '권한 변경 저장'이 한다.
// 카탈로그에서 어느 묶음에도 넣지 않은 권한은 원장 excluded 에 사유와 함께 있다(생성기가 전수 분류를 검사한다). protected 는
// 보호 권한(PROTECTED_PERMISSIONS)을 품는다는 뜻이다. 서버는 보호 권한을 그룹에 새로 더하거나 빼는 저장에만 권한 설정과 권한
// 배정 권한을 모두 요구한다 — 묶음의 보호 권한을 그룹이 이미 모두 가졌으면 그 저장에는 요구하지 않는다.
//
// 한계 — 이 목록을 인가로 쓰지 않는다(서버가 집행한다).
//   · 'write' 는 화면이 부르는 쓰기(GET 이 아닌) operation 의 권한이다. 조회(GET) 권한은 화면 진입('entry')과
//     canPermission 리터럴('display')로만 드러난다.
//   · 호출·import 는 이름으로 맞춘다 — 같은 이름의 모듈은 겹치고(타입만 가져오는 import 도 import 로 본다),
//     조립한 권한 코드(템플릿 문자열)는 보지 못한다.
//   · 'display' 는 리터럴로 적힌 canPermission 코드다. 리터럴을 언급하면 판정에 쓴 것으로 본다(어느 버튼에
//     걸었는지는 보지 않는다).
//   · 화면의 라우트 디렉터리 파일은 그 화면과, 그 파일을 import 하는(정적·동적) 다른 화면들에 귀속한다. 공용
//     컴포넌트·허브 클라이언트는 그것을 import 하는 화면들에 귀속하고, app/ 루트의 layout·헤더·전역 provider 는
//     어느 화면에도 귀속하지 않는다.
//   · 별칭(page-redirect·config-redirect)은 화면이 아니다. 목적지를 함께 적지만 링크하지 않는다. 화면 파일이 없는 앱
//     설정(next.config) 리다이렉트도 별칭이다 — 앱 설정은 화면 파일보다 먼저 넘기므로, 목록에 없으면 그 경로가 동적
//     형제(…/[id])로 풀린다.
//   · 재사용 투영본은 권한 생성물(PAGE_PERMISSIONS)만 다시 만든다. 그 산출물에서 빠진 화면·별칭은 아래에서
//     PAGE_PERMISSIONS 로 다시 거른다(모든 page 파일은 PAGE_PERMISSIONS 에 정확한 키가 있다). 앱 설정 별칭은 투영본에서도
//     앱 설정이 그대로 넘기므로, 화면 파일이 없거나 빠졌어도 넘어가는 화면(목적지 경로)이 투영본에 있으면 남는다.
//     묶음의 화면·관련 화면도 같이 거르고, 여는 화면(screens)이 하나도 남지 않은 묶음(그 투영본에 없는 업무의 묶음)은
//     내지 않는다 — 관련 화면만 남아도 내지 않는다(생성기가 여는 화면 하나 이상을 요구하는 것과 같은 기준).
import { PAGE_PERMISSIONS, type PermissionCode } from '@/types/generated-permissions';

export type ScreenPermissionSource = 'entry' | 'write' | 'display';
export interface ScreenPermission { code: PermissionCode; action: string; source: ScreenPermissionSource }
export interface ScreenRegistryEntry {
  route: string;
  label: string | null;
  labelSource: 'menu' | 'route-ledger' | null;
  shellAccess: string;
  dynamic: boolean;
  entry: { permissions: PermissionCode[]; mode: 'ANY' | 'ALL' };
  permissions: ScreenPermission[];
}
export interface ScreenAlias { route: string; target: string | null; kind: 'page-redirect' | 'config-redirect' }
export interface PermissionBundle {
  id: string;
  name: string;
  description: string;
  protected: boolean;
  /** 이 묶음이 그룹 초안에 더하는 기능권한(OPERATION), 코드 순. */
  permissions: PermissionCode[];
  /** 진입 권한을 이 묶음이 충족하는 화면의 라우트(진입 권한이 빈 화면 제외), 코드 포인트 순. SCREEN_REGISTRY 의 route 다. */
  screens: string[];
  /**
   * 관련 화면 — 진입 권한이 빈 화면(누구나 들어가는 화면) 가운데 이 묶음의 권한을 쓰기('write')로 쓰는 화면의 라우트,
   * 코드 포인트 순. screens 와 겹치지 않는다. 표시 리터럴('display')은 보지 않는다.
   */
  relatedScreens: string[];
}

const GENERATED_SCREENS: readonly ScreenRegistryEntry[] = ${renderArray(screens.map(renderScreen))};

const GENERATED_ALIASES: readonly ScreenAlias[] = ${renderArray(aliases.map(alias => `  ${JSON.stringify(alias)}`))};

const GENERATED_BUNDLES: readonly PermissionBundle[] = ${renderArray(bundles.map(renderBundle))};

const isProjected = (route: string): boolean => Object.hasOwn(PAGE_PERMISSIONS, route);
/** 경로부 — 쿼리·해시와 끝 슬래시를 뗀다. */
const pathOf = (route: string): string => route.split(/[?#]/)[0].replace(/\\/+$/, '') || '/';
/**
 * 별칭의 투영 판정. 화면 파일이 넘기는 별칭은 그 파일이 투영본에 있을 때 남는다. 앱 설정(next.config)이 넘기는 별칭은
 * 투영본에서도 앱 설정이 그대로 넘기므로, 화면 파일이 없거나 빠졌어도 목적지 화면이 투영본에 있으면 남는다.
 */
const isProjectedAlias = (alias: ScreenAlias): boolean => isProjected(alias.route)
  || (alias.kind === 'config-redirect' && alias.target !== null && isProjected(pathOf(alias.target)));

export const SCREEN_REGISTRY: readonly ScreenRegistryEntry[] = GENERATED_SCREENS.filter(screen => isProjected(screen.route));
export const SCREEN_ALIASES: readonly ScreenAlias[] = GENERATED_ALIASES.filter(isProjectedAlias);
export const PERMISSION_BUNDLES: readonly PermissionBundle[] = GENERATED_BUNDLES
  .map(bundle => ({ ...bundle, screens: bundle.screens.filter(isProjected), relatedScreens: bundle.relatedScreens.filter(isProjected) }))
  .filter(bundle => bundle.screens.length > 0);

/**
 * 보호 권한 — 서버 SENSITIVE_ADMINISTRATION_PERMISSIONS 와 같은 집합이다(생성기 계약이 대조한다), 코드 순. 그룹에 새로
 * 더하거나 빼는 저장에는 권한 설정(AUTHRT_GRANT)과 권한 배정(AUTHRT_ASSIGN)이 모두 필요하다. 화면은 사본을 두지 않는다.
 */
export const PROTECTED_PERMISSIONS: readonly PermissionCode[] = [${[...PROTECTED_PERMISSIONS].sort(byCodePoint).map(code => JSON.stringify(code)).join(', ')}];

const DYNAMIC_SEGMENT = /^\\[[^.[\\]]+\\]$/;

/**
 * 경로가 여는 화면. 쿼리·해시를 떼고, 세그먼트 수가 같은 화면·별칭 경로 중 리터럴 세그먼트가 가장 많이 맞는 것을
 * 고른다 — 정확한 경로가 먼저, 없으면 동적 형제다(page-authorization.ts 와 같은 순서, 정적 경로가 동적 경로를
 * 이긴다). 고른 경로가 별칭이면 화면이 아니다.
 */
export function findScreen(route: string): ScreenRegistryEntry | null {
  const pathOnly = route.split(/[?#]/)[0];
  // 라우트 없는 메뉴는 '' 로 저장된다 — 빈 경로를 업무 홈('/')으로 풀지 않는다.
  if (pathOnly.trim() === '') return null;
  const normalized = pathOnly.replace(/\\/+$/, '') || '/';
  const segments = normalized.split('/');
  let best: { literals: number; screen: ScreenRegistryEntry | null } | null = null;
  const candidates: ReadonlyArray<{ route: string; screen: ScreenRegistryEntry | null }> = [
    ...SCREEN_REGISTRY.map(screen => ({ route: screen.route, screen })),
    ...SCREEN_ALIASES.map(alias => ({ route: alias.route, screen: null })),
  ];
  for (const candidate of candidates) {
    const parts = candidate.route.split('/');
    if (parts.length !== segments.length) continue;
    let literals = 0;
    const matches = parts.every((part, index) => {
      if (DYNAMIC_SEGMENT.test(part)) return segments[index].length > 0;
      literals += 1;
      return part === segments[index];
    });
    if (matches && (!best || literals > best.literals)) best = { literals, screen: candidate.screen };
  }
  return best?.screen ?? null;
}
`;
}

/** 산출물의 세 배열(화면·별칭·권한 묶음)을 읽는다(계약 테스트·검증용). 형식이 깨졌으면 실패한다. */
export function readScreenRegistryArtifact(text) {
  const normalized = text.replace(/\r\n?/gu, '\n');
  if (!normalized.startsWith(`${HEADER}\n`)) throw new Error('Screen registry artifact header is missing');
  const pick = name => {
    // 바깥 배열만 줄 첫 칸의 `]` 로 닫힌다(안쪽 배열은 들여쓴다).
    const match = new RegExp(`^const ${name}: readonly \\w+\\[\\] = (\\[\\n[\\s\\S]*?^\\]);$`, 'mu').exec(normalized);
    if (!match) throw new Error(`Screen registry artifact does not declare ${name}`);
    return JSON.parse(match[1]);
  };
  return { screens: pick('GENERATED_SCREENS'), aliases: pick('GENERATED_ALIASES'), bundles: pick('GENERATED_BUNDLES') };
}

/**
 * 산출물이 지켜야 하는 불변식. 생성기 자신을 믿지 않고 원천에서 다시 센다 — 화면 수는 page 파일 중 라우팅이 page 인
 * 수와 같고, 별칭은 넘기는 page 파일과 화면 파일이 없는 앱 설정 리다이렉트이며, 화면과 별칭은 겹치지 않고, 모든 권한
 * 코드가 카탈로그에 있다. 권한 묶음은 원장을 산출물의 화면으로 다시 계산한 결과와 같다(묶음의 화면·관련 화면은 산출물의
 * 화면이고, 권한·보호 표시는 원장과 같으며, 카탈로그 전수 분류가 성립한다).
 */
export function validateScreenRegistry({ screens, aliases, bundles }, root = repoRoot) {
  const errors = [];
  const catalog = readJson(root, SCREEN_REGISTRY_INPUTS.catalog);
  const codes = new Set((catalog.permissions ?? []).map(row => row.code));
  const repository = { repoRoot: root, configRedirects: discoverConfigRedirects(root) };
  const pages = discoverPageRoutes(root).map(page => ({ ...page, routing: expectedRouting(repository, page.route, page.source) }));
  const pageRoutes = new Set(pages.map(page => page.route));
  // 화면 파일이 없는 앱 설정 리다이렉트(next.config redirects())도 별칭이다. 원천에서 다시 센다.
  const appRedirects = [...repository.configRedirects.redirects.keys()].filter(source => !pageRoutes.has(source));
  const expectedScreens = pages.filter(page => page.routing.kind === 'page').map(page => page.route).sort(byCodePoint);
  const expectedAliases = [...pages.filter(page => page.routing.kind !== 'page').map(page => page.route), ...appRedirects]
    .sort(byCodePoint);
  const screenRoutes = screens.map(screen => screen.route);
  const aliasRoutes = new Set(aliases.map(alias => alias.route));
  if (screens.length !== expectedScreens.length) {
    errors.push(`screen count ${screens.length} differs from page-routed files ${expectedScreens.length}`);
  }
  if (JSON.stringify([...screenRoutes].sort(byCodePoint)) !== JSON.stringify(expectedScreens)) {
    errors.push('screen routes differ from page-routed files');
  }
  if (JSON.stringify([...aliasRoutes].sort(byCodePoint)) !== JSON.stringify(expectedAliases)) {
    errors.push('alias routes differ from redirecting page files and app redirects without a page file');
  }
  for (const alias of aliases) {
    if (appRedirects.includes(alias.route) && alias.kind !== 'config-redirect') {
      errors.push(`app redirect without a page file must be a config-redirect alias: ${alias.route}`);
    }
  }
  const overlap = screenRoutes.filter(route => aliasRoutes.has(route));
  if (overlap.length > 0) errors.push(`routes are both screen and alias: ${overlap.join(', ')}`);
  for (const screen of screens) {
    for (const code of [...(screen.entry?.permissions ?? []), ...(screen.permissions ?? []).map(row => row.code)]) {
      if (!codes.has(code)) errors.push(`${screen.route} uses a permission outside the catalog: ${code}`);
    }
  }
  if (!Array.isArray(bundles)) {
    errors.push('artifact does not declare permission bundles');
  } else {
    const screenSet = new Set(screenRoutes);
    for (const bundle of bundles) {
      for (const code of bundle.permissions ?? []) {
        if (!codes.has(code)) errors.push(`bundle ${bundle.id} uses a permission outside the catalog: ${code}`);
      }
      for (const route of bundle.screens ?? []) {
        if (!screenSet.has(route)) errors.push(`bundle ${bundle.id} opens a route that is not a screen: ${route}`);
      }
      for (const route of bundle.relatedScreens ?? []) {
        if (!screenSet.has(route)) errors.push(`bundle ${bundle.id} relates a route that is not a screen: ${route}`);
      }
    }
    try {
      const expected = buildPermissionBundles(readJson(root, SCREEN_REGISTRY_INPUTS.bundles), {
        screens, catalogCodes: codes,
        findReplacedTerm: replacedTermFinder(readJson(root, SCREEN_REGISTRY_INPUTS.visibleTerms)),
      });
      if (JSON.stringify(expected) !== JSON.stringify(bundles)) errors.push('permission bundles differ from the bundle ledger');
    } catch (error) {
      errors.push(`permission bundle ledger is invalid: ${error.message}`);
    }
  }
  return errors;
}

export function generateScreenRegistry(root = repoRoot, check = false) {
  const registry = buildScreenRegistry(root);
  const target = path.join(root, SCREEN_REGISTRY_OUTPUT);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n?/gu, '\n') !== registry.text) {
      throw new Error(`Generated screen registry is stale: ${SCREEN_REGISTRY_OUTPUT} (node scripts/generate-screen-registry.mjs)`);
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, registry.text);
  }
  return registry;
}

export function summarizeScreenRegistry({ screens, aliases, bundles = [] }) {
  const labelSources = { menu: 0, 'route-ledger': 0, none: 0 };
  for (const screen of screens) labelSources[screen.labelSource ?? 'none'] += 1;
  return {
    screens: screens.length,
    aliases: aliases.length,
    bundles: bundles.length,
    labelSources,
    screensWithWritePermissions: screens.filter(screen => screen.permissions.some(row => row.source === 'write')).length,
    unlabeled: screens.filter(screen => screen.label === null).map(screen => screen.route),
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const check = process.argv.includes('--check');
  try {
    const summary = summarizeScreenRegistry(generateScreenRegistry(repoRoot, check));
    console.log(`Screen registry: ${summary.screens} screens, ${summary.aliases} aliases `
      + `(labels menu=${summary.labelSources.menu} route-ledger=${summary.labelSources['route-ledger']} none=${summary.labelSources.none}; `
      + `write permissions on ${summary.screensWithWritePermissions} screens), ${summary.bundles} permission bundles `
      + `${check ? 'verified' : 'written'}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

/**
 * 재사용 생성물의 권한 투영(Phase 2 10단계 10b-2, 설계서 12.3·16.4, DEC-OPS-287).
 *
 * 생성물은 권한 정의를 원본 그대로 실었다 — core 생성물의 권한 작업대가 246개 권한을 보였지만 구성이 실제로 가진 권한은 85개였고,
 * 묶음은 없는 기능의 권한을 더하거나(협업 '기본 업무') 남는 결재 권한을 숨겼으며, 생성물에서 화면 목록을 다시 만들 수 없었다
 * ('opens no screen'). 권한은 카탈로그·코드 상수·시드 생성 블록·인가 원장 바인딩·묶음·화면 목록이 한 사실이므로 한 단계에서 함께 줄인다.
 * 하나만 줄이면 남은 쪽이 모르는 코드를 들고 권한 스냅숏을 fail-closed 로 만든다(설계서 12.3).
 *
 *   · 카탈로그 — permissions 를 구성의 권한 코드(composition.permissionCodes)로, pagePermissions·pagePermissionModes 를 생성물에 남는
 *     page 로 줄인다. 원본 행의 순서·값은 그대로다. 남는 page 의 진입 권한이 구성 밖 코드를 요구하면 실패한다.
 *   · 인가 원장 바인딩(operationBindings) — 핸들러 소스 파일이 투영으로 지워진 행만 뺀다. 외부(EXTERNAL#) 핸들러는 남긴다. 런타임 바인딩
 *     (operation-bindings.json)은 이 원장에서 그대로 나오므로 원장 = 런타임이다(SecurityAuthAnnotationLinterTest·SecurePathsDeclarationSync
 *     LinterTest·generate-permissions 의 동치 검사 논리는 그대로다). 남는 바인딩이 구성 밖 권한을 요구하면 실패한다.
 *   · 화면 목록 — 데이터로 투영한다. 화면·별칭·진입 권한·라벨·shellAccess 는 생성물 트리에서 화면 목록 생성기와 같은 뼈대
 *     (screen-registry-model.mjs 의 buildScreenFrame)로 정하고, 쓰기·표시 귀속은 원본 산출물의 행에서 구성 밖 코드를 뺀다. TypeScript 로
 *     다시 만든 결과와의 동치는 T2 의 `--check` 가 본다(U8).
 *   · 묶음 원장 — 권한을 구성 코드로 줄이고, 남는 권한이 있고 여는 화면 또는 관련 화면이 하나라도 남는 묶음만 둔다. 남는 권한인데
 *     남은 묶음 어디에도 없으면 생성 제외(excluded) 행으로 사유와 함께 적는다(원본 묶음 이름). 원본 규칙(여는 화면 하나 이상)은 그대로이고
 *     완화는 투영본에만 있다(H2). 보호 표시는 남은 권한으로 다시 정한다. 줄인 뒤 권한 집합이 앞 묶음과 같아진 묶음은 뺀다.
 *   · 하한 — 투영본은 원본 하한(권한 200·바인딩 350) 대신 도출값과 정확히 비교한다: 카탈로그 = 구성 코드, 바인딩 = 생성물의 하네스
 *     census(operationBindings — 원본 원장을 독립된 Java 제거 계획으로 거른 수)이며, 바인딩 핸들러 소스는 생성물에 있어야 한다.
 * 모든 기능을 고른 구성(demo)은 카탈로그·런타임 생성물·묶음·화면 목록이 원본과 바이트가 같다(계약 시험).
 * 이미 배포된 생성물 DB 에 남은 구성 밖 권한 배정은 정리하지 않는다 — 재생성 소스를 그 DB 에 배포하기 전에 정리해야 한다(업그레이드 키트,
 * 기관 채택 authorization 통제).
 *
 * 이 모듈은 Node 내장 모듈과 TypeScript 를 읽지 않는 모듈만 쓴다 — 생성기·정밀 점검·생성물 무결성 검사가 frontend 의존성 없이 적재한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  PROTECTED_PERMISSIONS, SCREEN_REGISTRY_INPUTS, SCREEN_REGISTRY_OUTPUT, buildPermissionBundles, buildScreenFrame, byCodePoint,
  grantsScreenEntry, readJson, readScreenRegistryArtifact, relatesToOpenScreen, renderScreenRegistry, replacedTermFinder,
} from './screen-registry-model.mjs';
import { readTextIfPresent } from './reusable-source-tree.mjs';
import { discoverPageRoutes } from './ui-route-capabilities-contract.mjs';

export const PERMISSION_CATALOG_PATH = 'config/governance/permission-catalog.json';
export const AUTHORIZATION_POLICY_PATH = 'config/governance/authorization-policies.json';
export const PERMISSION_BUNDLES_PATH = 'config/governance/permission-bundles.json';
export const HARNESS_PROFILE_PATH = 'config/governance/reusable-harness-profile.json';
const JAVA_SOURCE_ROOTS = Object.freeze(['api-server', 'business-app', 'business-core', 'foundation'].map(module => `${module}/src/main/java`));
const JAVA_TYPE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/u;
const jsonText = value => `${JSON.stringify(value, null, 2)}\n`;
/**
 * 투영이 내용을 바꾸지 않은 원장은 복사한 원본 그대로 둔다 — 모든 기능을 고른 구성이 원본과 바이트가 같다(묶음 원장은 원본이
 * 권한을 줄로 묶어 적은 손 정렬이라 다시 쓰면 내용이 같아도 바이트가 달라진다).
 */
function writeJsonIfChanged(root, file, value, original) {
  if (JSON.stringify(value) === JSON.stringify(original) && fs.existsSync(path.join(root, file))) return false;
  fs.writeFileSync(path.join(root, file), jsonText(value), 'utf8');
  return true;
}

/**
 * 바인딩 핸들러(`패키지.타입#메서드`, 중첩 타입은 `$`)의 소스 파일(저장소 기준). 외부 핸들러(EXTERNAL#)는 소스가 없어 null 이다.
 * 소스는 정확히 한 모듈에 있어야 한다 — 찾지 못하거나 둘 이상이면 판정할 수 없으므로 실패한다.
 * 같은 판정을 API 계약 투영(10c-2)이 api-docs 연산에 쓴다 — 두 투영이 같은 파일을 '지워진 핸들러'로 본다.
 */
export function bindingHandlerSource(handler, sourceExists) {
  if (typeof handler !== 'string' || handler === '') throw new Error('operation binding has no handler');
  if (handler.startsWith('EXTERNAL#')) return null;
  const type = handler.split('#')[0];
  if (!JAVA_TYPE.test(type)) throw new Error(`operation binding handler is not a Java type: ${handler}`);
  const relative = `${type.split('$')[0].replaceAll('.', '/')}.java`;
  const found = JAVA_SOURCE_ROOTS.map(root => `${root}/${relative}`).filter(sourceExists);
  if (found.length !== 1) {
    throw new Error(found.length ? `operation binding handler source is ambiguous: ${handler}` : `operation binding handler has no source: ${handler}`);
  }
  return found[0];
}

/**
 * 인가 원장 바인딩에서 핸들러 소스가 투영으로 지워진 행을 뺀다. `sourceExists(rel)` 는 원본 트리에 그 파일이 있는지,
 * `removed(rel)` 는 투영이 그 파일을 지우는지 답한다. 원본 순서를 지킨다.
 */
export function projectOperationBindings(bindings, { sourceExists, removed }) {
  if (!Array.isArray(bindings) || bindings.length === 0) throw new Error('permission projection requires the authorization operation bindings');
  const kept = [];
  const dropped = [];
  for (const binding of bindings) {
    const file = bindingHandlerSource(binding.handler, sourceExists);
    if (file !== null && removed(file)) dropped.push(binding);
    else kept.push(binding);
  }
  return { bindings: kept, removed: dropped };
}

/** 남는 바인딩이 요구하는 권한은 구성에 있어야 한다(없으면 생성물의 권한 생성기가 '알 수 없는 권한'으로 멈춘다). */
export function bindingPermissionErrors(bindings, codes) {
  const allowed = new Set(codes);
  return bindings.filter(row => row.access === 'PERMISSION' && !allowed.has(row.permission))
    .map(row => `retained operation binding ${row.method} ${row.path} needs ${row.permission} outside the composition`);
}

/**
 * 카탈로그를 구성 코드와 생성물에 남는 page 로 줄인다. `routes` 는 생성물의 page 라우트 집합이다 — 모든 page 는 정확한 키가 있어야 한다.
 * 남는 page 의 진입 권한은 구성 코드여야 한다. 원본 행 순서·값은 그대로다.
 */
export function projectPermissionCatalog(catalog, { permissionCodes, routes }) {
  if (!Array.isArray(catalog?.permissions) || !catalog.pagePermissions || typeof catalog.pagePermissions !== 'object') {
    throw new Error('Permission catalog must declare permissions and pagePermissions');
  }
  const codes = new Set(permissionCodes);
  if (codes.size !== permissionCodes.length) throw new Error('composition permission codes must be unique');
  const known = new Set(catalog.permissions.map(row => row.code));
  const unknown = permissionCodes.filter(code => !known.has(code));
  if (unknown.length) throw new Error(`composition permission codes are not in the catalog: ${unknown.join(', ')}`);
  if (routes.size === 0) throw new Error('Cannot project an empty online route population');
  for (const route of routes) {
    if (!Object.hasOwn(catalog.pagePermissions, route)) throw new Error(`Unregistered page permission in projected artifact: ${route}`);
  }
  const projected = structuredClone(catalog);
  projected.permissions = catalog.permissions.filter(row => codes.has(row.code));
  projected.pagePermissions = Object.fromEntries(Object.entries(catalog.pagePermissions).filter(([route]) => routes.has(route)));
  projected.pagePermissionModes = Object.fromEntries(Object.entries(catalog.pagePermissionModes ?? {}).filter(([route]) => routes.has(route)));
  const outside = Object.entries(projected.pagePermissions)
    .flatMap(([route, required]) => (required ?? []).filter(code => !codes.has(code)).map(code => `${route} needs ${code}`));
  if (outside.length) throw new Error(`retained page permissions need codes outside the composition: ${outside.join(', ')}`);
  return {
    catalog: projected,
    removedPagePermissions: Object.keys(catalog.pagePermissions).filter(route => !routes.has(route)).sort(),
    removedPermissions: catalog.permissions.filter(row => !codes.has(row.code)).map(row => row.code),
  };
}

/** 생성 제외 행의 사유. 생성물의 묶음 원장에서 원본 제외 행과 구분된다(원본 묶음 이름을 밝힌다). */
export const generatedExclusionReason = names => `생성 제외: 원본 묶음(${names.join(', ')})에 있던 권한이지만 이 구성에서 그 묶음이 여는 화면과 `
  + '관련 화면이 남지 않았다. 필요하면 권한 작업대의 기능별 권한 표에서 직접 준다.';

/*
 * 권한이 줄어든 묶음의 이름·설명(GAP-COMPOSE-001, DEC-OPS-330). 원본 이름·설명은 원본 묶음의 권한 전부를 두고 쓴 문장이라, 권한이
 * 하나라도 빠지면 빠진 기능을 맡긴다고 말할 수 있다(core 의 '기본 업무'는 권한 72개 중 11개만 남는데 설명은 결재·게시판·쪽지를 말했다).
 * 그래서 줄어든 묶음은 기능을 열거하지 않는 고정 문장을 쓴다 — 새 기능 설명을 지어내지 않는다. 이름은 원본 이름을 출처로만 남기고
 * 남은 권한이라는 표시를 붙인다. 묶음이 실제로 맡기는 일은 권한 작업대가 그 묶음의 권한 수와 여는 화면·관련 화면(화면 목록의 이름)으로
 * 보인다. 화면 이름을 설명에 옮겨 적지 않는 까닭: 화면 이름에는 묶음 문구가 쓰면 안 되는 용어가 있다(예: '통합 코드 관리 허브' —
 * buildPermissionBundles 의 화면 용어 검사가 막는다). 권한이 하나도 빠지지 않은 묶음은 이름·설명을 원본 그대로 둔다(모든 기능을 고른
 * 구성은 묶음 원장이 원본과 바이트가 같다).
 */
export const REDUCED_BUNDLE_NAME_SUFFIX = '(이 구성에 남은 권한)';
export const REDUCED_BUNDLE_DESCRIPTION = '원본 묶음에서 이 구성에 없는 기능의 권한을 뺐습니다. 맡기는 일은 묶음을 고르면 보이는 화면 목록으로 확인하세요.';
export const reducedBundleName = name => `${name}${REDUCED_BUNDLE_NAME_SUFFIX}`;

/**
 * 묶음 원장을 구성으로 줄인다(묶음 투영 규칙). `screens` 는 생성물의 화면 목록 행(진입 권한·쓰기 권한)이다.
 *   ① 묶음 권한을 구성 코드로 줄인다(원장 순서). 남는 권한이 없으면 뺀다.
 *   ② 여는 화면(진입 권한 충족)이나 관련 화면(누구나 들어가는 화면에서 그 권한으로 쓰기)이 하나도 없으면 뺀다.
 *   ③ 줄인 권한 집합이 앞에서 남긴 묶음과 같으면 뺀다(같은 권한을 두 이름으로 보이지 않는다 — 원본 생성기도 같은 집합을 거부한다).
 *   ④ 보호 표시를 남은 권한으로 다시 정한다.
 *   ⑤ 권한이 하나라도 빠진 묶음은 이름에 남은 권한 표시를 붙이고 설명을 고정 문장으로 바꾼다(reducedBundleName·REDUCED_BUNDLE_DESCRIPTION).
 *     빠진 것이 없는 묶음은 이름·설명이 원본과 같다.
 * 원본 제외 행은 구성 코드만 남기고, ②로 뺀 묶음에만 있던 남는 권한은 생성 제외 행으로 더한다. 결과는 원본처럼 카탈로그를 빠짐없이 나눈다.
 */
export function projectPermissionBundleLedger(ledger, { codes, screens }) {
  const allowed = new Set(codes);
  const kept = [];
  const reduced = [];
  const dropped = [];
  const signatures = new Map();
  const droppedOwners = new Map(); // code → 그 코드를 품었다가 ②로 빠진 원본 묶음 이름
  const live = screens.filter(screen => !screen.demo);
  for (const bundle of ledger.bundles ?? []) {
    const permissions = (bundle.permissions ?? []).filter(code => allowed.has(code));
    if (permissions.length === 0) { dropped.push({ id: bundle.id, reason: 'no-permission-in-composition' }); continue; }
    const granted = new Set(permissions);
    // 시연 화면은 묶음이 열지 않는다(buildPermissionBundles 와 같은 판정, DEC-OPS-382).
    const opens = live.some(screen => grantsScreenEntry(granted, screen.entry));
    const relates = live.some(screen => relatesToOpenScreen(granted, screen));
    if (!opens && !relates) {
      dropped.push({ id: bundle.id, reason: 'no-screen-in-composition' });
      for (const code of permissions) droppedOwners.set(code, [...(droppedOwners.get(code) ?? []), bundle.name]);
      continue;
    }
    const signature = [...permissions].sort(byCodePoint).join(',');
    if (signatures.has(signature)) { dropped.push({ id: bundle.id, reason: `same-permissions-as:${signatures.get(signature)}` }); continue; }
    signatures.set(signature, bundle.id);
    // 원본 원장의 묶음 권한은 겹치지 않으므로(buildPermissionBundles 가 검사한다) 수가 같으면 빠진 권한이 없다.
    const lost = permissions.length !== bundle.permissions.length;
    if (lost) reduced.push(bundle.id);
    kept.push({
      ...bundle,
      ...(lost ? { name: reducedBundleName(bundle.name), description: REDUCED_BUNDLE_DESCRIPTION } : {}),
      protected: PROTECTED_PERMISSIONS.some(code => granted.has(code)),
      permissions,
    });
  }
  const bundled = new Set(kept.flatMap(bundle => bundle.permissions));
  const sourceExcluded = (ledger.excluded ?? []).filter(row => allowed.has(row.code));
  const excludedCodes = new Set(sourceExcluded.map(row => row.code));
  const generated = codes.filter(code => !bundled.has(code) && !excludedCodes.has(code));
  const unexplained = generated.filter(code => !droppedOwners.has(code));
  // 원본 원장은 카탈로그를 빠짐없이 나눈다 — 남는 권한이 묶음에도 제외에도 없고 빠진 묶음에서 오지도 않았다면 원장이 틀렸다.
  if (unexplained.length) throw new Error(`permission bundle ledger does not classify composition permissions: ${unexplained.join(', ')}`);
  const generatedExclusions = generated.map(code => ({ code, reason: generatedExclusionReason(droppedOwners.get(code)) }));
  return {
    ledger: { ...structuredClone(ledger), bundles: kept, excluded: [...sourceExcluded, ...generatedExclusions] },
    kept: kept.map(bundle => bundle.id),
    reduced,
    dropped,
    generatedExclusions: generatedExclusions.map(row => row.code),
  };
}

/**
 * 생성물 트리의 화면 목록 행을 데이터로 투영한다. 화면·별칭·진입 권한·라벨·shellAccess 는 생성물 트리에서 화면 목록 생성기와 같은
 * 뼈대로 정하고(`ledger` — 투영이 쓸 라우트 원장), 쓰기·표시 귀속은 원본 산출물(`sourceArtifact`)의 같은 화면 행에서 구성 밖 코드만 뺀다.
 * 생성물의 화면·별칭은 원본 산출물에 있어야 하고 진입 권한도 같아야 한다(다르면 투영이 원본 귀속을 옮길 수 없다).
 */
export function projectScreenRegistryRows({ root, ledger, upstreamLedger, sourceArtifact }) {
  const frame = buildScreenFrame(root, { ledger, upstreamLedger });
  const codes = new Set(frame.actions.keys());
  const sourceScreens = new Map(sourceArtifact.screens.map(row => [row.route, row]));
  const sourceAliases = new Map(sourceArtifact.aliases.map(row => [row.route, row]));
  const screens = [...frame.screens.values()].sort((left, right) => byCodePoint(left.route, right.route)).map(screen => {
    const source = sourceScreens.get(screen.route);
    if (!source) throw new Error(`projected screen is not in the upstream screen registry: ${screen.route}`);
    if (JSON.stringify(source.entry) !== JSON.stringify(screen.entry)) {
      throw new Error(`projected screen entry differs from the upstream screen registry: ${screen.route}`);
    }
    return {
      route: screen.route, label: screen.label, labelSource: screen.labelSource, shellAccess: screen.shellAccess, dynamic: screen.dynamic,
      demo: screen.demo,
      entry: screen.entry, permissions: source.permissions.filter(row => codes.has(row.code)),
    };
  });
  const aliases = [...frame.aliases].sort((left, right) => byCodePoint(left.route, right.route));
  for (const alias of aliases) {
    if (JSON.stringify(sourceAliases.get(alias.route)) !== JSON.stringify(alias)) {
      throw new Error(`projected alias is not in the upstream screen registry: ${alias.route}`);
    }
  }
  return { screens, aliases, codes: [...codes] };
}

/** 원본 트리의 권한 투영 입력. `files` 로 미리 읽은 값을 넘기면 그것을 쓴다(정밀 점검 시험이 결함을 넣는 자리). */
export function readPermissionSources(sourceRoot, files = {}) {
  return {
    catalog: files.catalog ?? readJson(sourceRoot, PERMISSION_CATALOG_PATH),
    policies: files.policies ?? readJson(sourceRoot, AUTHORIZATION_POLICY_PATH),
    bundles: files.bundles ?? readJson(sourceRoot, PERMISSION_BUNDLES_PATH),
    visibleTerms: files.visibleTerms ?? readJson(sourceRoot, SCREEN_REGISTRY_INPUTS.visibleTerms),
    registry: files.registry ?? readScreenRegistryArtifact(fs.readFileSync(path.join(sourceRoot, SCREEN_REGISTRY_OUTPUT), 'utf8')),
  };
}

/**
 * 정밀 점검의 권한 투영 판정 — 디스크를 바꾸지 않고 생성기와 같은 판정을 미리 한다. `removed(rel)` 는 투영이 그 원본 파일을 지우는지,
 * `keptPageRoutes` 는 생성물에 남는 page 라우트 전부다(화면과 넘기는 page — 거버넌스 투영의 리다이렉트 정리까지 한 뒤). 실패하면 던진다
 * (정밀 점검이 PERMISSION_PROJECTION 차단 사유로 바꾼다).
 * 카탈로그는 생성기와 같은 함수(projectPermissionCatalog)로 줄인다 — 남는 page 마다 카탈로그 키가 있고 진입 권한이 구성 코드인지 본다.
 * 생성기는 화면 행을 생성물 트리의 뼈대로 정하지만 묶음 판정에 쓰는 진입·쓰기 권한은 원본 행과 같으므로(투영이 대조한다) 원본 행을 거른다.
 */
export function planPermissionProjection({ sourceRoot, composition, removed, keptPageRoutes, sources = readPermissionSources(sourceRoot) }) {
  const codes = composition.permissionCodes;
  const allowed = new Set(codes);
  const catalog = projectPermissionCatalog(sources.catalog, { permissionCodes: codes, routes: keptPageRoutes });
  const bindings = projectOperationBindings(sources.policies.operationBindings,
    { sourceExists: file => fs.existsSync(path.join(sourceRoot, file)), removed });
  const bindingErrors = bindingPermissionErrors(bindings.bindings, codes);
  if (bindingErrors.length) throw new Error(bindingErrors.join('; '));
  const screens = sources.registry.screens.filter(screen => keptPageRoutes.has(screen.route)).map(screen => {
    const outside = screen.entry.permissions.filter(code => !allowed.has(code));
    if (outside.length) throw new Error(`retained screen ${screen.route} needs entry permissions outside the composition: ${outside.join(', ')}`);
    return { ...screen, permissions: screen.permissions.filter(row => allowed.has(row.code)) };
  });
  const bundles = projectPermissionBundleLedger(sources.bundles, { codes, screens });
  buildPermissionBundles(bundles.ledger, { screens, catalogCodes: codes, findReplacedTerm: replacedTermFinder(sources.visibleTerms), projected: true });
  return {
    permissions: codes.length,
    removedPagePermissions: catalog.removedPagePermissions,
    operationBindings: bindings.bindings.length,
    removedOperationBindings: bindings.removed.length,
    screens: screens.length,
    bundles: bundles.kept,
    reducedBundles: bundles.reduced,
    droppedBundles: bundles.dropped,
    generatedExclusions: bundles.generatedExclusions,
  };
}

/**
 * 생성물 트리에서 카탈로그와 인가 원장 바인딩을 구성으로 줄여 쓴다(Java·프런트 투영과 리다이렉트 정리 뒤, 권한 생성물을 다시 만들기 전).
 * 바인딩은 원본 원장에서 읽고 생성물 트리에서 핸들러 소스가 사라졌는지 본다. 화면 목록·묶음은 라우트 원장이 정해진 뒤에 쓴다
 * (applyScreenAndBundleProjection).
 */
export function applyPermissionSourceProjection({ sourceRoot, outputRoot, composition }) {
  const sources = readPermissionSources(sourceRoot);
  // 카탈로그 page 권한의 모집단은 생성물의 page 파일 전부다(화면과 넘기는 page).
  const routes = new Set(discoverPageRoutes(outputRoot).map(row => row.route));
  const catalog = projectPermissionCatalog(sources.catalog, { permissionCodes: composition.permissionCodes, routes });
  const bindings = projectOperationBindings(sources.policies.operationBindings, {
    sourceExists: file => fs.existsSync(path.join(sourceRoot, file)), removed: file => !fs.existsSync(path.join(outputRoot, file)),
  });
  const errors = bindingPermissionErrors(bindings.bindings, composition.permissionCodes);
  if (errors.length) throw new Error(`Permission projection failed: ${errors.join('; ')}`);
  writeJsonIfChanged(outputRoot, PERMISSION_CATALOG_PATH, catalog.catalog, sources.catalog);
  writeJsonIfChanged(outputRoot, AUTHORIZATION_POLICY_PATH, { ...sources.policies, operationBindings: bindings.bindings }, sources.policies);
  return {
    removedPagePermissions: catalog.removedPagePermissions,
    summary: {
      permissions: catalog.catalog.permissions.length,
      removedPermissions: catalog.removedPermissions.length,
      operationBindings: bindings.bindings.length,
      removedOperationBindings: bindings.removed.length,
    },
  };
}


/**
 * 생성물 트리의 화면 목록과 묶음 원장을 구성으로 투영해 쓴다. `ledger` 는 투영이 쓸 라우트 원장이다. 원본 산출물·묶음 원장·화면 용어
 * 원장은 원본 트리에서 읽고, 카탈로그는 이미 투영한 생성물의 것을 쓴다.
 */
export function applyScreenAndBundleProjection({ sourceRoot, outputRoot, ledger }) {
  const sources = readPermissionSources(sourceRoot);
  const rows = projectScreenRegistryRows({ root: outputRoot, ledger, sourceArtifact: sources.registry });
  const bundleProjection = projectPermissionBundleLedger(sources.bundles, { codes: rows.codes, screens: rows.screens });
  const bundles = buildPermissionBundles(bundleProjection.ledger, {
    screens: rows.screens, catalogCodes: rows.codes, findReplacedTerm: replacedTermFinder(sources.visibleTerms), projected: true,
  });
  writeJsonIfChanged(outputRoot, PERMISSION_BUNDLES_PATH, bundleProjection.ledger, sources.bundles);
  const registry = renderScreenRegistry(rows.screens, rows.aliases, bundles);
  const registryFile = path.join(outputRoot, SCREEN_REGISTRY_OUTPUT);
  // 확인하고 읽지 않고 읽기를 시도한다(TOCTOU, CodeQL js/file-system-race).
  const current = readTextIfPresent(registryFile);
  if (current === undefined || current.replace(/\r\n?/gu, '\n') !== registry) {
    fs.writeFileSync(registryFile, registry, 'utf8');
  }
  return {
    screens: rows.screens.length,
    aliases: rows.aliases.length,
    bundles: bundleProjection.kept,
    reducedBundles: bundleProjection.reduced,
    droppedBundles: bundleProjection.dropped,
    generatedExclusions: bundleProjection.generatedExclusions,
  };
}

/**
 * 생성물(구성 스냅숏이 있는 트리)의 권한 범위 불변식. 권한 생성기와 생성물 무결성 검사가 같은 함수를 쓴다.
 *   · 카탈로그 권한 = 구성 코드(중복 없이, 빠짐없이).
 *   · 외부 핸들러가 아닌 바인딩의 핸들러 소스는 생성물에 있다(지워진 핸들러의 바인딩이 남지 않는다).
 *   · 생성물의 하네스 census 가 있으면 카탈로그 수·바인딩 수가 그 도출값(permissionCatalog·operationBindings)과 같다. census 는 원본 원장을
 *     독립된 Java 제거 계획으로 거른 수다. census 는 생성 끝(하네스 단계)에 쓰이므로 그 전의 권한 생성기 실행은 이 대조를 하지 않는다 —
 *     생성 끝의 무결성 검사와 생성물 하네스(SecurePathsDeclarationSyncLinterTest)가 census 와 정확히 대조한다.
 */
export function projectedPermissionCoverageErrors(root, { catalog, bindings, permissionCodes }) {
  const errors = [];
  const codes = catalog.permissions.map(row => row.code);
  const expected = [...permissionCodes].sort(byCodePoint);
  if (JSON.stringify([...codes].sort(byCodePoint)) !== JSON.stringify(expected)) {
    const extra = codes.filter(code => !permissionCodes.includes(code));
    const missing = permissionCodes.filter(code => !codes.includes(code));
    errors.push(`projected permission catalog differs from the composition codes: extra [${extra.join(', ')}] missing [${missing.join(', ')}]`);
  }
  for (const binding of bindings) {
    try {
      bindingHandlerSource(binding.handler, file => fs.existsSync(path.join(root, file)));
    } catch (error) {
      errors.push(`projected operation binding ${binding.method} ${binding.path}: ${error.message}`);
    }
  }
  const censusFile = path.join(root, HARNESS_PROFILE_PATH);
  const censusText = readTextIfPresent(censusFile);
  if (censusText !== undefined) {
    const census = JSON.parse(censusText).census ?? {};
    for (const [key, actual] of [['permissionCatalog', codes.length], ['operationBindings', bindings.length]]) {
      if (!Number.isInteger(census[key])) errors.push(`reusable harness census does not declare ${key}`);
      else if (census[key] !== actual) errors.push(`projected ${key} ${actual} differs from the reusable harness census ${census[key]}`);
    }
  }
  return errors;
}

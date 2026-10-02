import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  PROTECTED_PERMISSIONS,
  SCREEN_REGISTRY_INPUTS,
  SCREEN_REGISTRY_OUTPUT,
  buildScreenRegistry,
  generateScreenRegistry,
  readScreenRegistryArtifact,
  replacedTermFinder,
  validateScreenRegistry,
} from './generate-screen-registry.mjs';
import { discoverConfigRedirects, discoverPageRoutes, expectedRouting } from './ui-route-capabilities-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 화면 목록 생성기 계약(관리 콘솔 2단계 D3·D4).
 *
 * 산출물이 원천(page 파일·권한 카탈로그·라우트 원장·메뉴 snapshot·축 3 쓰기 권한)과 바이트 단위로 같아야 하고,
 * 별칭이 화면으로 새거나 카탈로그 밖 권한 코드가 들어오면 red 다. green 뿐 아니라 의도적 위반이 red 가 되는지도
 * 아래 임시 저장소(fixture)로 확인한다(AGENTS H5).
 */

// ---------------------------------------------------------------- 임시 저장소

const SERVICE = [
  'class ThingService {',
  '  async getThings() {',
  '    return this.executeGenerated(getThingsOperation, {});',
  '  }',
  '  async deleteThing(id) {',
  '    return this.executeGenerated(deleteThingOperation, { path: { id } });',
  '  }',
  '  async createThing(body) {',
  '    return this.executeGenerated(createThingOperation, { body });',
  '  }',
  '}',
  'export const thingService = new ThingService();',
].join('\n');

const FILES = {
  'frontend/src/services/ThingService.ts': SERVICE,
  // 업무 홈처럼 루트 page 가 자기 클라이언트를 동적 import 로 연다 — 정적 `from` 이 없어도 그 화면의 권한이다.
  'frontend/src/app/page.tsx': [
    "import dynamic from 'next/dynamic';",
    "const HomeClient = dynamic(() => import('./HomeClient').then(mod => mod.HomeClient));",
    'export default function Page() { return <HomeClient />; }',
  ].join('\n'),
  'frontend/src/app/HomeClient.tsx': "export function HomeClient({ user }) { return canPermission(user, 'THING_READ') ? <p>홈</p> : null; }\n",
  // 앱 전체를 감싸는 파일 — 여기서 부르는 쓰기는 어느 화면의 권한도 아니다.
  'frontend/src/app/layout.tsx': "import { GlobalHeader } from './components/GlobalHeader';\nexport default function Layout({ children }) { return <><GlobalHeader />{children}</>; }\n",
  'frontend/src/app/components/GlobalHeader.tsx': [
    "import { thingService } from '@/services/ThingService';",
    "export const GlobalHeader = ({ user }) => canPermission(user, 'THING_EXPORT')",
    '  ? <button onClick={() => thingService.deleteThing(0)}>전역 삭제</button> : null;',
  ].join('\n'),
  'frontend/src/app/admin/things/page.tsx': "import { ThingClient } from './ThingClient';\nexport default function Page() { return <ThingClient />; }\n",
  'frontend/src/app/admin/things/ThingClient.tsx': [
    "import { thingService } from '@/services/ThingService';",
    "import { ThingCreateDialog } from '@/components/things/ThingCreateDialog';",
    // 주석 속 코드는 판정이 아니다 — 카탈로그 밖 코드라 주석을 지우지 않으면 생성이 red 다.
    '// 종전에는 canPermission(user, \'THING_IGNORED\') 로 가렸다.',
    'export function ThingClient({ user }) {',
    "  return canPermission(user, 'THING_UPDATE')",
    '    ? <><button onClick={() => thingService.deleteThing(1)}>삭제</button><ThingCreateDialog /></> : null;',
    '}',
  ].join('\n'),
  // 공용 컴포넌트 — 그것을 여는 화면(/admin/things)에 귀속한다.
  'frontend/src/components/things/ThingCreateDialog.tsx': [
    "import { thingService } from '@/services/ThingService';",
    'export const ThingCreateDialog = () => <button onClick={() => thingService.createThing({})}>등록</button>;',
  ].join('\n'),
  // 테스트 파일은 화면이 아니다 — 여기 적힌 권한 코드(카탈로그 밖)를 세면 생성이 red 다.
  'frontend/src/app/admin/things/__tests__/ThingClient.test.tsx': "it('hides', () => expect(canPermission(user, 'THING_TEST_ONLY')).toBe(false));\n",
  'frontend/src/app/admin/things/[id]/page.tsx': 'export default function Page() { return null; }\n',
  'frontend/src/app/admin/page.tsx': 'export default function Page() { return null; }\n',
  // page 는 없고 하위에 page 를 품은 구간의 허브 클라이언트 — 가장 가까운 page(/admin)가 아니라 그것을 여는
  // 하위 화면들에 귀속한다.
  'frontend/src/app/admin/hub/HubClient.tsx': [
    "import { thingService } from '@/services/ThingService';",
    "export const HubClient = ({ user }) => canPermission(user, 'THING_EXPORT')",
    '  ? <button onClick={() => thingService.deleteThing(2)}>삭제</button> : null;',
  ].join('\n'),
  'frontend/src/app/admin/hub/alpha/page.tsx': "import { HubClient } from '../HubClient';\nexport default function Page() { return <HubClient />; }\n",
  'frontend/src/app/admin/hub/beta/page.tsx': "import { HubClient } from '../HubClient';\nexport default function Page() { return <HubClient />; }\n",
  'frontend/src/app/admin/old/page.tsx': "import { redirect } from 'next/navigation';\nexport default function Page() {\n  redirect('/admin/things');\n}\n",
  'frontend/src/app/admin/legacy/page.tsx': 'export default function Page() { return null; }\n',
  'frontend/next.config.ts': [
    'const nextConfig = {',
    '  async redirects() {',
    '    return [',
    "      { source: '/admin/legacy', destination: '/admin/things?tab=list', permanent: false },",
    '    ];',
    '  },',
    '};',
    'export default nextConfig;',
  ].join('\n'),
};

const CATALOG = {
  permissions: [
    // 보호 권한 하나와 대행(*_ALL) 권한 하나 — 권한 묶음의 protected·기본 권한 규칙을 시험한다.
    { code: 'AUTHRT_GRANT', action: 'GRANT' },
    { code: 'THING_CREATE', action: 'CREATE' },
    { code: 'THING_DELETE', action: 'DELETE' },
    { code: 'THING_EXPORT', action: 'EXPORT' },
    { code: 'THING_READ', action: 'READ' },
    { code: 'THING_UPDATE', action: 'UPDATE' },
    { code: 'THING_UPDATE_ALL', action: 'UPDATE_ALL' },
  ],
  pagePermissionModes: {},
  pagePermissions: {
    '/': [],
    '/admin': ['THING_READ'],
    '/admin/hub/alpha': ['THING_READ'],
    '/admin/hub/beta': ['THING_READ'],
    '/admin/legacy': ['THING_READ'],
    '/admin/old': ['THING_READ'],
    '/admin/things': ['THING_READ'],
    '/admin/things/[id]': [],
  },
};

const JSON_FILES = {
  [SCREEN_REGISTRY_INPUTS.catalog]: CATALOG,
  [SCREEN_REGISTRY_INPUTS.policies]: { operationBindings: [
    { method: 'GET', path: '/api/v1/things', access: 'PERMISSION', permission: 'THING_READ' },
    { method: 'DELETE', path: '/api/v1/things/{id}', access: 'PERMISSION', permission: 'THING_DELETE' },
    { method: 'POST', path: '/api/v1/things', access: 'PERMISSION', permission: 'THING_CREATE' },
  ] },
  [SCREEN_REGISTRY_INPUTS.boundaries]: { records: [
    { file: 'frontend/src/services/ThingService.ts', line: 3, method: 'get', target: '/api/v1/things', operationId: 'getThings' },
    { file: 'frontend/src/services/ThingService.ts', line: 6, method: 'delete', target: '/api/v1/things/{id}', operationId: 'deleteThing' },
    { file: 'frontend/src/services/ThingService.ts', line: 9, method: 'post', target: '/api/v1/things', operationId: 'createThing' },
  ] },
  [SCREEN_REGISTRY_INPUTS.routes]: { routes: [
    { route: '/', shellAccess: 'authenticated', visibleLabel: '업무 홈' },
    { route: '/admin', shellAccess: 'admin-system', visibleLabel: '관리 현황' },
    { route: '/admin/hub/alpha', shellAccess: 'admin-system', visibleLabel: '허브 가' },
    { route: '/admin/hub/beta', shellAccess: 'admin-system', visibleLabel: '허브 나' },
    { route: '/admin/legacy', shellAccess: 'admin-system', visibleLabel: 'unverified' },
    { route: '/admin/old', shellAccess: 'admin-system', visibleLabel: 'unverified' },
    { route: '/admin/things', shellAccess: 'admin-system', visibleLabel: '사물 원장' },
    { route: '/admin/things/[id]', shellAccess: 'authenticated', visibleLabel: 'unverified' },
  ] },
  [SCREEN_REGISTRY_INPUTS.menus]: { menus: [
    { menu_sn: 1, menu_nm: ' 📦 사물 관리 ', modern_route: '/admin/things', use_yn: 'Y', del_yn: 'N' },
    // 탭을 가리키는 메뉴는 화면 이름이 아니다.
    { menu_sn: 2, menu_nm: '사물 목록 탭', modern_route: '/admin/things/[id]?tab=list', use_yn: 'Y', del_yn: 'N' },
    // 삭제된 메뉴의 이름은 쓰지 않는다.
    { menu_sn: 3, menu_nm: '옛 홈', modern_route: '/', use_yn: 'Y', del_yn: 'Y' },
    // 사용 중인 메뉴가 사용하지 않는 메뉴보다 먼저다.
    { menu_sn: 4, menu_nm: '옛 사물 관리', modern_route: '/admin/things', use_yn: 'N', del_yn: 'N' },
    // 사용 중인 메뉴가 없으면 사용하지 않는 메뉴의 이름도 화면 이름이다.
    { menu_sn: 5, menu_nm: '관리 콘솔', modern_route: '/admin', use_yn: 'N', del_yn: 'N' },
    // 같은 화면을 가리키는 메뉴 이름이 하나로 모이지 않으면 메뉴 라벨을 고르지 않는다.
    { menu_sn: 6, menu_nm: '허브 첫째', modern_route: '/admin/hub/alpha', use_yn: 'Y', del_yn: 'N' },
    { menu_sn: 7, menu_nm: '허브 둘째', modern_route: '/admin/hub/alpha', use_yn: 'Y', del_yn: 'N' },
    // 라우트 없는 메뉴는 modern_route 를 '' 로 저장한다 — 업무 홈('/')의 이름이 아니다.
    { menu_sn: 8, menu_nm: '연결 없는 메뉴', modern_route: '', use_yn: 'Y', del_yn: 'N' },
  ] },
  // 원장 순서는 산출물 순서다. 권한은 순서와 무관하게 코드 순으로 낸다.
  [SCREEN_REGISTRY_INPUTS.bundles]: { schemaVersion: 1, description: '사물 묶음 원장(시험용)', bundles: [
    { id: 'thing-viewer', name: '사물 조회', description: '사물 담당자에게 사물 조회를 맡깁니다.', protected: false, permissions: ['THING_READ'] },
    { id: 'thing-editor', name: '사물 편집', description: '사물 담당자에게 다른 사람의 사물까지 고치는 일을 맡깁니다.', protected: false,
      permissions: ['THING_UPDATE_ALL', 'THING_READ', 'THING_UPDATE'] },
    { id: 'thing-security', name: '사물 보안', description: '보안 책임자에게 사물 권한 설정을 맡깁니다.', protected: true,
      permissions: ['THING_READ', 'AUTHRT_GRANT'] },
  ] },
  // 화면 용어 원장(config/frontend-visible-terms.json)의 terms 모양. 묶음 문구 검사는 이 원장을 읽는다(사본 없음).
  [SCREEN_REGISTRY_INPUTS.visibleTerms]: { terms: [
    { id: 'term-hub', sourceTerms: ['Hub', '허브'], decision: 'replace-by-task-context' },
    { id: 'term-matrix', sourceTerms: ['Matrix', '매트릭스'], decision: 'replace-by-domain-noun' },
    { id: 'term-intelligence', sourceTerms: ['지능형', 'AI 기반'], decision: 'forbidden-unless-source-proven' },
    { id: 'term-node', sourceTerms: ['Node', '노드'], decision: 'audience-and-context-required' },
    // 측정 근거가 있어야 하는 상태어는 문맥 판단이라 묶음 문구 검사 대상이 아니다.
    { id: 'term-status', sourceTerms: ['안전'], decision: 'evidence-required' },
  ] },
};

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-screen-registry-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('egov-screen-registry-'));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  };
  for (const [file, text] of Object.entries(FILES)) write(file, text);
  for (const [file, value] of Object.entries(JSON_FILES)) write(file, `${JSON.stringify(value, null, 2)}\n`);
  const mutate = (file, change) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    change(parsed);
    write(file, `${JSON.stringify(parsed, null, 2)}\n`);
  };
  return { dir, write, mutate };
}

const byRoute = (registry, route) => registry.screens.find(screen => screen.route === route);

// ---------------------------------------------------------------- 현재 저장소

test('the committed screen registry is exactly what the generator builds from current sources', () => {
  const registry = generateScreenRegistry(root, true);
  assert.ok(registry.screens.length > 50, '화면을 거의 못 찾았다면 모집단 판정이 비어 있는 것이다');
  assert.ok(registry.aliases.length > 10);
  const text = fs.readFileSync(path.join(root, SCREEN_REGISTRY_OUTPUT), 'utf8');
  assert.ok(text.startsWith('// Generated by scripts/generate-screen-registry.mjs. Do not edit.\n'));
  assert.match(text, /^import \{ PAGE_PERMISSIONS, type PermissionCode \} from '@\/types\/generated-permissions';$/mu);
  assert.deepEqual(readScreenRegistryArtifact(text), { screens: registry.screens, aliases: registry.aliases, bundles: registry.bundles });
  // 서버(applyGrants)는 보호 권한을 새로 더하거나 뺄 때만 권한 설정·권한 배정을 함께 요구한다 — 보호 묶음이면 늘
  // 필요하다고 적으면 권한 작업대가 그 말을 근거로 안내·차단한다.
  assert.match(text, /보호 권한을 그룹에 새로 더하거나 빼는 저장에만 권한 설정과 권한\n\/\/ 배정 권한을 모두 요구한다/u);
  assert.doesNotMatch(text, /그 저장에는 권한 설정과 권한 배정 권한이 모두 필요하다/u);
});

test('the committed permission bundles follow the ledger, open real screens, and keep the documented sets', () => {
  const artifact = readScreenRegistryArtifact(fs.readFileSync(path.join(root, SCREEN_REGISTRY_OUTPUT), 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(path.join(root, SCREEN_REGISTRY_INPUTS.bundles), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, SCREEN_REGISTRY_INPUTS.catalog), 'utf8'));
  assert.deepEqual(artifact.bundles.map(bundle => bundle.id), ledger.bundles.map(bundle => bundle.id), 'ledger order is output order');
  const screens = new Map(artifact.screens.map(screen => [screen.route, screen]));
  for (const bundle of artifact.bundles) {
    assert.ok(bundle.screens.length > 0, `${bundle.id} opens a screen`);
    for (const route of bundle.screens) {
      // 원천에서 다시 판정한다 — 진입 권한이 빈 화면은 열린 화면이 아니고, ALL 은 전부, ANY 는 하나 이상이다.
      const entry = screens.get(route)?.entry;
      assert.ok(entry && entry.permissions.length > 0, `${bundle.id}: ${route} is a gated screen`);
      const held = entry.permissions.filter(code => bundle.permissions.includes(code));
      assert.ok(entry.mode === 'ALL' ? held.length === entry.permissions.length : held.length > 0, `${bundle.id}: ${route}`);
    }
    assert.equal(bundle.protected, bundle.permissions.some(code => PROTECTED_PERMISSIONS.includes(code)), bundle.id);
  }
  // '기본 업무'는 일반 사용자 그룹의 기본 권한과 같은 집합이라고 말한다 — 카탈로그 기본 배정이 바뀌면 함께 바꾼다.
  const userDefaults = catalog.permissions.filter(row => row.defaultGroups.includes('ROLE_USER')).map(row => row.code).sort();
  assert.deepEqual(artifact.bundles.find(bundle => bundle.id === 'basic-work')?.permissions, userDefaults);
});

test('the protected permission set is the server\'s sensitive administration set', () => {
  // 권한 작업대의 보호 권한 안내와 서버 저장 규칙이 같은 집합을 본다 — 서버 집합이 바뀌면 묶음의 protected 판정도 바뀐다.
  const service = fs.readFileSync(path.join(root,
    'business-core/src/main/java/nuri/business/service/auth/AuthorizationAdministrationService.java'), 'utf8');
  const declared = /SENSITIVE_ADMINISTRATION_PERMISSIONS\s*=\s*Set\.of\(([^)]*)\)/u.exec(service);
  assert.ok(declared, 'the server declares SENSITIVE_ADMINISTRATION_PERMISSIONS as a Set.of literal');
  const server = [...declared[1].matchAll(/"([A-Z][A-Z0-9_]*)"/gu)].map(match => match[1]).sort();
  assert.deepEqual([...PROTECTED_PERMISSIONS].sort(), server);
});

/** 주석을 지운 코드와 그 안의 문자열 리터럴 본문. 주석 속 import·리터럴로 계약을 통과하거나 어기지 않게 한다. */
function codeWithoutComments(source) {
  let code = '';
  const strings = [];
  for (let index = 0; index < source.length;) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      index = end < 0 ? source.length : end;
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
      code += ' ';
    } else if (char === '\'' || char === '"' || char === '`') {
      let end = index + 1;
      while (end < source.length && source[end] !== char) end += source[end] === '\\' ? 2 : 1;
      strings.push(source.slice(index + 1, end));
      code += source.slice(index, end + 1);
      index = end + 1;
    } else {
      code += char;
      index += 1;
    }
  }
  return { code, strings };
}

/**
 * 화면의 보호 권한 집합이 생성물에 묶였는지 판정한다(위반 문장 목록 — 비면 통과). 정본은 생성물 PROTECTED_PERMISSIONS 다.
 *  ① '@/types/generated-screen-registry' 에서 PROTECTED_PERMISSIONS 를 값으로 import 한다(type import·주석 속 import 는 아니다).
 *  ② PROTECTED_PERMISSION_CODES 의 초기화식이 그 import 하나만 감싼 new Set(...) 이다 — 더하거나 빼거나 바꾸지 않는다.
 *  ③ 보호 코드가 든 문자열 리터럴이 없다 — 리터럴로 만든 Set·배열(문자열을 나눠 만든 것 포함)은 생성물과 묶이지 않는 사본이다.
 * 종전 계약은 ①만 보면 통과시켜, import 를 둔 채 사본 Set 으로 바꿔도 green 이었다.
 */
function protectedCopyViolations(source, protectedCodes) {
  const { code, strings } = codeWithoutComments(source);
  const violations = [];
  let local = null;
  for (const match of code.matchAll(/\bimport\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]@\/types\/generated-screen-registry['"]/gu)) {
    if (match[1]) continue;
    for (const specifier of match[2].split(',').map(part => part.trim())) {
      const named = /^PROTECTED_PERMISSIONS(?:\s+as\s+([A-Za-z_$][\w$]*))?$/u.exec(specifier);
      if (named) local = named[1] ?? 'PROTECTED_PERMISSIONS';
    }
  }
  if (!local) violations.push('PROTECTED_PERMISSIONS 를 생성물(@/types/generated-screen-registry)에서 값으로 import 하지 않는다');
  const declarations = [...code.matchAll(/\bconst\s+PROTECTED_PERMISSION_CODES\b\s*(?::[^=]*)?=\s*([^;]*);/gu)];
  if (declarations.length !== 1) {
    violations.push(`PROTECTED_PERMISSION_CODES 선언이 ${declarations.length}개다(정확히 1개여야 한다)`);
  } else if (local) {
    const initializer = declarations[0][1].trim();
    // 식별자로 정규식을 만들지 않는다 — 감싼 식별자를 잡아 문자열로 비교한다.
    const wrapped = /^new\s+Set\s*(?:<[^<>()]*>)?\s*\(\s*([A-Za-z_$][\w$]*)\s*\)$/u.exec(initializer);
    if (!wrapped || wrapped[1] !== local) {
      violations.push(`PROTECTED_PERMISSION_CODES 의 초기화식이 생성물 ${local} 만 감싸지 않는다: ${initializer}`);
    }
  }
  for (const literal of strings) {
    const hits = protectedCodes.filter(codeName => new RegExp(`(?<![A-Z0-9_])${codeName}(?![A-Z0-9_])`, 'u').test(literal));
    if (hits.length > 0) violations.push(`보호 코드 리터럴 사본: '${literal}' (${hits.join(', ')})`);
  }
  return violations;
}

test('the frontend permission table builds its protected set from the generated registry, with no literal copy', () => {
  // 보호 권한 집합의 정본은 생성기(서버와 대조)다. 화면 쪽 사본이 생성기에도 서버에도 묶이지 않으면 조용히 어긋난다.
  const file = 'frontend/src/app/admin/security/authority/components/operation-permission-matrix-model.ts';
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.deepEqual(protectedCopyViolations(source, PROTECTED_PERMISSIONS), [], file);
});

test('the protected set binding rejects literal copies even when the generated import is present', () => {
  const codes = [...PROTECTED_PERMISSIONS];
  const header = "import { PROTECTED_PERMISSIONS } from '@/types/generated-screen-registry';\n";
  const bound = 'export const PROTECTED_PERMISSION_CODES: ReadonlySet<string> = new Set<string>(PROTECTED_PERMISSIONS);\n';
  const check = source => protectedCopyViolations(source, codes);

  assert.deepEqual(check(header + bound), []);
  assert.deepEqual(check("import { other, PROTECTED_PERMISSIONS as GENERATED } from '@/types/generated-screen-registry';\n"
    + 'export const PROTECTED_PERMISSION_CODES = new Set(GENERATED);\n'), []);
  // 설명 주석 속 코드 이름은 리터럴이 아니다.
  assert.deepEqual(check(`${header}/* 'AUTHRT_GRANT' 같은 보호 권한 */\n// "USER_PASSWORD"\n${bound}`), []);

  // 종전 계약이 통과시키던 꼴 — import 는 남기고 집합은 리터럴 사본으로 만든다.
  const literalSet = check(`${header}export const PROTECTED_PERMISSION_CODES = new Set(['AUTHRT_ASSIGN', 'AUTHRT_GRANT', 'MFA_RECOVER', 'USER_PASSWORD']);\n`);
  assert.ok(literalSet.some(message => message.startsWith('PROTECTED_PERMISSION_CODES 의 초기화식')), literalSet.join('\n'));
  assert.equal(literalSet.filter(message => message.startsWith('보호 코드 리터럴 사본')).length, 4);
  // 바른 초기화식 옆에 따로 둔 사본 배열, 문자열을 나눠 만든 사본.
  assert.deepEqual(check(`${header}${bound}const EXTRA = ['MFA_RECOVER'];\n`), ["보호 코드 리터럴 사본: 'MFA_RECOVER' (MFA_RECOVER)"]);
  assert.equal(check(`${header}export const PROTECTED_PERMISSION_CODES = new Set('AUTHRT_GRANT,USER_PASSWORD'.split(','));\n`).length, 2);
  // 생성물에 더하거나 바꾼 집합.
  assert.equal(check(`${header}export const PROTECTED_PERMISSION_CODES = new Set([...PROTECTED_PERMISSIONS, 'USER_DELETE']);\n`).length, 1);
  // 생성물에 묶이지 않은 import·선언.
  assert.deepEqual(check(`import type { PROTECTED_PERMISSIONS } from '@/types/generated-screen-registry';\n${bound}`),
    ['PROTECTED_PERMISSIONS 를 생성물(@/types/generated-screen-registry)에서 값으로 import 하지 않는다']);
  assert.deepEqual(check(`// ${header}${bound}`),
    ['PROTECTED_PERMISSIONS 를 생성물(@/types/generated-screen-registry)에서 값으로 import 하지 않는다']);
  assert.deepEqual(check(header), ['PROTECTED_PERMISSION_CODES 선언이 0개다(정확히 1개여야 한다)']);
});

test('login policy writes are in no bundle while the server lets them change protected accounts', () => {
  // 로그인 정책 쓰기는 접속 제한(lmtYn)·IP·시간대로 계정의 로그인을 막거나 그 제한을 푼다. 같은 효과의 계정 상태
  // 변경(USER_STATUS)은 보호 계정(권한관리자)에 권한 설정·권한 배정을 함께 요구하지만(authorizeProtectedAccountChange),
  // 로그인 정책 쓰기에는 그 가드가 없다 — 묶음에 넣으면 보호 표시 없이 권한관리자의 접속을 막는 권한을 나눠 준다(H3).
  const service = fs.readFileSync(path.join(root,
    'business-core/src/main/java/nuri/business/service/login/LoginPolicyManageService.java'), 'utf8');
  const writes = { LOGIN_POL_CREATE: 'insertLoginPolicy', LOGIN_POL_UPDATE: 'updateLoginPolicy', LOGIN_POL_DELETE: 'deleteLoginPolicy' };
  const ledger = JSON.parse(fs.readFileSync(path.join(root, SCREEN_REGISTRY_INPUTS.bundles), 'utf8'));
  for (const [code, method] of Object.entries(writes)) {
    const start = service.search(new RegExp(`\\bpublic\\s+void\\s+${method}\\s*\\(`, 'u'));
    assert.ok(start >= 0, `LoginPolicyManageService.${method} not found — re-check the login policy write guard before changing this test`);
    const rest = service.slice(start + 1);
    // 다음 메서드 선언 줄에서 자른다(줄 단위 — 중첩 수량자 정규식을 쓰지 않는다). 그 앞 애노테이션 줄이 본문에 남아도
    // 가드 판정에는 영향이 없다.
    const lines = rest.split('\n');
    const next = lines.findIndex((line, index) => index > 0 && /^\s*(?:public|private|protected)\s[^;=]*\(/u.test(line));
    const body = (next < 0 ? lines : lines.slice(0, next)).join('\n');
    if (/\bauthorizeProtectedAccountChange\s*\(/u.test(body)) continue; // 서버가 보호 계정을 가리면 묶음에 넣어도 된다.
    const holders = ledger.bundles.filter(bundle => bundle.permissions.includes(code)).map(bundle => bundle.id);
    assert.deepEqual(holders, [], `${code} reaches protected accounts without the server guard (${method}); keep it out of bundles`);
  }
});

test('bundle copy is checked against every replaced, forbidden or audience-only term of the visible terms ledger', () => {
  // 묶음 문구 검사는 화면 용어 원장을 그대로 읽는다 — 원장에 용어를 더하면 사본을 고치지 않아도 검사가 따라온다.
  const terms = JSON.parse(fs.readFileSync(path.join(root, SCREEN_REGISTRY_INPUTS.visibleTerms), 'utf8')).terms;
  const find = replacedTermFinder({ terms });
  const checked = terms.filter(term => /^(?:replace-|forbidden-)/u.test(term.decision) || term.decision === 'audience-and-context-required');
  assert.ok(checked.length > 0);
  for (const term of checked) {
    for (const source of term.sourceTerms) assert.ok(find(`${source} 관리를 맡깁니다.`), `${term.id}: ${source}`);
  }
  // 검토가 재현한 통과 사례 — 사본은 허브·매트릭스·노드·인텔리전스만 보고 이것들을 통과시켰다.
  for (const copy of ['로그 스트림을 맡깁니다.', '지능형 감사를 맡깁니다.', 'AI 기반 추천을 맡깁니다.', '인텔리전트 엔진 설정을 맡깁니다.']) {
    assert.ok(find(copy), copy);
  }
  // 측정 근거가 있어야 하는 상태어·조건부 약어는 문맥 판단이라 묶음 문구에서 막지 않는다.
  assert.equal(find('사용자 ID 와 접속 IP 를 안전하게 관리합니다.'), null);
});

test('every screen permission is in the catalog, screens and aliases are disjoint, and screens are exactly the page-routed files', () => {
  const artifact = readScreenRegistryArtifact(fs.readFileSync(path.join(root, SCREEN_REGISTRY_OUTPUT), 'utf8'));
  assert.deepEqual(validateScreenRegistry(artifact, root), []);
  // 생성기를 믿지 않고 원천에서 다시 센다.
  const repository = { repoRoot: root, configRedirects: discoverConfigRedirects(root) };
  const pages = discoverPageRoutes(root);
  const pageRouted = pages.filter(page => expectedRouting(repository, page.route, page.source).kind === 'page');
  assert.equal(artifact.screens.length, pageRouted.length);
  // 별칭은 넘기는 page 파일과, 화면 파일이 없는 앱 설정(next.config) 리다이렉트다.
  const pageRoutes = new Set(pages.map(page => page.route));
  const appRedirects = [...repository.configRedirects.redirects.keys()].filter(source => !pageRoutes.has(source));
  assert.ok(appRedirects.includes('/admin/community/boards/selectBoardList'), 'the legacy board list redirect has no page file');
  assert.equal(artifact.screens.length + artifact.aliases.length, pages.length + appRedirects.length);
  for (const source of appRedirects) {
    assert.equal(artifact.aliases.find(alias => alias.route === source)?.kind, 'config-redirect', source);
  }
  const codes = new Set(JSON.parse(fs.readFileSync(path.join(root, SCREEN_REGISTRY_INPUTS.catalog), 'utf8')).permissions.map(row => row.code));
  const aliasRoutes = new Set(artifact.aliases.map(alias => alias.route));
  for (const screen of artifact.screens) {
    assert.equal(aliasRoutes.has(screen.route), false, screen.route);
    for (const code of [...screen.entry.permissions, ...screen.permissions.map(row => row.code)]) assert.ok(codes.has(code), `${screen.route}: ${code}`);
    assert.deepEqual(screen.permissions.map(row => row.code), [...screen.permissions.map(row => row.code)].sort(), `${screen.route} permissions are code-ordered`);
    assert.equal(new Set(screen.permissions.map(row => row.code)).size, screen.permissions.length, `${screen.route} permissions are deduplicated`);
  }
  // 투영 필터는 원본 저장소에서 아무것도 거르지 않아야 한다 — 모든 page 파일은 PAGE_PERMISSIONS 의 정확한 키이고,
  // 화면 파일이 없는 앱 설정 별칭은 목적지 화면이 PAGE_PERMISSIONS 의 키다.
  const pagePermissions = JSON.parse(fs.readFileSync(path.join(root, SCREEN_REGISTRY_INPUTS.catalog), 'utf8')).pagePermissions;
  for (const route of [...artifact.screens.map(screen => screen.route), ...aliasRoutes].filter(route => !appRedirects.includes(route))) {
    assert.ok(Object.hasOwn(pagePermissions, route), route);
  }
  for (const source of appRedirects) {
    const target = artifact.aliases.find(alias => alias.route === source)?.target ?? '';
    assert.ok(Object.hasOwn(pagePermissions, target.split(/[?#]/u)[0].replace(/\/+$/u, '') || '/'), `${source} → ${target}`);
  }
  // 키 이름은 route 다 — href·url·link 는 URL·관리 링크 census 가 링크로 센다.
  const text = fs.readFileSync(path.join(root, SCREEN_REGISTRY_OUTPUT), 'utf8');
  assert.doesNotMatch(text, /"(?:href|url|link)"\s*:/u);
});

// ---------------------------------------------------------------- 임시 저장소: 파생 규칙

test('screens, aliases, labels, entry modes, and write/display permissions are derived from the sources', t => {
  const { dir } = fixture(t);
  const registry = buildScreenRegistry(dir);
  assert.deepEqual(registry.screens.map(screen => screen.route),
    ['/', '/admin', '/admin/hub/alpha', '/admin/hub/beta', '/admin/things', '/admin/things/[id]']);
  assert.deepEqual(registry.aliases, [
    { route: '/admin/legacy', target: '/admin/things?tab=list', kind: 'config-redirect' },
    { route: '/admin/old', target: '/admin/things', kind: 'page-redirect' },
  ]);
  assert.deepEqual(byRoute(registry, '/admin/things'), {
    route: '/admin/things',
    label: '사물 관리',
    labelSource: 'menu',
    shellAccess: 'admin-system',
    dynamic: false,
    entry: { permissions: ['THING_READ'], mode: 'ANY' },
    permissions: [
      { code: 'THING_CREATE', action: 'CREATE', source: 'write' },
      { code: 'THING_DELETE', action: 'DELETE', source: 'write' },
      { code: 'THING_READ', action: 'READ', source: 'entry' },
      { code: 'THING_UPDATE', action: 'UPDATE', source: 'display' },
    ],
  });
  // 루트 화면은 원장 라벨을 쓰고(삭제된 메뉴·라우트 없는 메뉴는 보지 않는다), 동적 import 로 여는 자기 클라이언트의
  // 권한을 갖되 전역 헤더의 쓰기(THING_DELETE)·표시(THING_EXPORT) 권한은 갖지 않는다.
  assert.deepEqual(byRoute(registry, '/'), {
    route: '/', label: '업무 홈', labelSource: 'route-ledger', shellAccess: 'authenticated', dynamic: false,
    entry: { permissions: [], mode: 'ANY' }, permissions: [{ code: 'THING_READ', action: 'READ', source: 'display' }],
  });
  // 허브 클라이언트의 쓰기·표시 권한은 그것을 여는 두 하위 화면의 것이다 — 가장 가까운 page(/admin)의 것이 아니다.
  assert.deepEqual(byRoute(registry, '/admin').permissions, [{ code: 'THING_READ', action: 'READ', source: 'entry' }]);
  assert.deepEqual([byRoute(registry, '/admin').label, byRoute(registry, '/admin').labelSource], ['관리 콘솔', 'menu']);
  assert.deepEqual([byRoute(registry, '/admin/hub/alpha').label, byRoute(registry, '/admin/hub/alpha').labelSource], ['허브 가', 'route-ledger']);
  for (const route of ['/admin/hub/alpha', '/admin/hub/beta']) {
    assert.deepEqual(byRoute(registry, route).permissions.map(row => `${row.code}:${row.source}`),
      ['THING_DELETE:write', 'THING_EXPORT:display', 'THING_READ:entry'], route);
  }
  // 탭 메뉴 이름은 화면 라벨이 아니고 원장 라벨도 미확인이면 지어내지 않는다.
  assert.deepEqual(byRoute(registry, '/admin/things/[id]'), {
    route: '/admin/things/[id]', label: null, labelSource: null, shellAccess: 'authenticated', dynamic: true,
    entry: { permissions: [], mode: 'ANY' }, permissions: [],
  });
});

test('entry permissions resolve exact routes before dynamic siblings and keep ALL modes; priority is entry > write > display', t => {
  const { dir, mutate, write } = fixture(t);
  mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => {
    catalog.pagePermissions['/admin/things'] = ['THING_READ', 'THING_DELETE', 'THING_UPDATE'];
    catalog.pagePermissionModes['/admin/things'] = 'ALL';
    catalog.pagePermissions['/admin/things/[id]'] = ['THING_READ'];
    catalog.pagePermissions['/admin/things/export'] = ['THING_EXPORT'];
  });
  write('frontend/src/app/admin/things/export/page.tsx', 'export default function Page() { return null; }\n');
  write('frontend/src/app/admin/things/archive/page.tsx', 'export default function Page() { return null; }\n');
  mutate(SCREEN_REGISTRY_INPUTS.routes, ledger => {
    ledger.routes.push({ route: '/admin/things/archive', shellAccess: 'admin-system', visibleLabel: 'unverified' });
    ledger.routes.push({ route: '/admin/things/export', shellAccess: 'admin-system', visibleLabel: 'unverified' });
  });
  const registry = buildScreenRegistry(dir);
  const things = byRoute(registry, '/admin/things');
  assert.deepEqual(things.entry, { permissions: ['THING_READ', 'THING_DELETE', 'THING_UPDATE'], mode: 'ALL' });
  assert.deepEqual(things.permissions.map(row => `${row.code}:${row.source}`),
    ['THING_CREATE:write', 'THING_DELETE:entry', 'THING_READ:entry', 'THING_UPDATE:entry']);
  // 정적 경로의 자기 항목이 동적 형제보다 먼저다.
  assert.deepEqual(byRoute(registry, '/admin/things/export').entry, { permissions: ['THING_EXPORT'], mode: 'ANY' });
  // 자기 항목이 없으면 런타임 판정처럼 세그먼트 수가 같은 동적 형제의 항목을 쓴다.
  assert.deepEqual(byRoute(registry, '/admin/things/archive').entry, { permissions: ['THING_READ'], mode: 'ANY' });
});

test('a screen that renders another route\'s client gets that client\'s write and display permissions, and import cycles terminate', t => {
  const { dir, write, mutate } = fixture(t);
  // /smart-toolkit/schedule 이 work-hub 의 허브 클라이언트를 렌더하는 것과 같은 모양 — 클라이언트 파일은
  // /admin/things 화면의 디렉터리에 있지만 /admin/reports 도 그것을 연다.
  write('frontend/src/app/admin/reports/page.tsx',
    "import { ThingClient } from '@/app/admin/things/ThingClient';\nexport default function Page() { return <ThingClient />; }\n");
  // 서로 import 하는 두 공용 컴포넌트 — 순환을 따라가다 멈추지 않으면 생성이 끝나지 않는다.
  write('frontend/src/components/things/CycleA.tsx', [
    "import { thingService } from '@/services/ThingService';",
    "import { CycleB } from './CycleB';",
    'export const CycleA = () => <><button onClick={() => thingService.createThing({})}>등록</button><CycleB /></>;',
  ].join('\n'));
  write('frontend/src/components/things/CycleB.tsx',
    "import { CycleA } from './CycleA';\nexport const CycleB = ({ open }) => (open ? <CycleA /> : null);\n");
  write('frontend/src/app/admin/things/[id]/page.tsx',
    "import { CycleB } from '@/components/things/CycleB';\nexport default function Page() { return <CycleB />; }\n");
  mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => { catalog.pagePermissions['/admin/reports'] = ['THING_READ']; });
  mutate(SCREEN_REGISTRY_INPUTS.routes, ledger => {
    ledger.routes.push({ route: '/admin/reports', shellAccess: 'admin-system', visibleLabel: '사물 보고' });
  });
  const registry = buildScreenRegistry(dir);
  const rows = route => byRoute(registry, route).permissions.map(row => `${row.code}:${row.source}`);
  assert.deepEqual(rows('/admin/reports'), ['THING_CREATE:write', 'THING_DELETE:write', 'THING_READ:entry', 'THING_UPDATE:display']);
  assert.deepEqual(rows('/admin/things'), ['THING_CREATE:write', 'THING_DELETE:write', 'THING_READ:entry', 'THING_UPDATE:display']);
  assert.deepEqual(rows('/admin/things/[id]'), ['THING_CREATE:write'], 'the cycle is followed once to the screen that opens it');
});

test('screens and aliases are ordered by code point, not by the host locale order the page discovery uses', t => {
  const { dir, write, mutate } = fixture(t);
  // 탐색은 localeCompare(대소문자를 섞는다) 순서다 — 그대로 내보내면 산출물이 실행 환경의 로캘에 따라 달라진다.
  write('frontend/src/app/admin/Zone/page.tsx', 'export default function Page() { return null; }\n');
  write('frontend/src/app/admin/Zulu/page.tsx',
    "import { redirect } from 'next/navigation';\nexport default function Page() {\n  redirect('/admin/things');\n}\n");
  mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => {
    catalog.pagePermissions['/admin/Zone'] = ['THING_READ'];
    catalog.pagePermissions['/admin/Zulu'] = ['THING_READ'];
  });
  mutate(SCREEN_REGISTRY_INPUTS.routes, ledger => { ledger.routes.push({ route: '/admin/Zone', shellAccess: 'admin-system', visibleLabel: '구역' }); });
  const registry = buildScreenRegistry(dir);
  const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
  const screens = registry.screens.map(screen => screen.route);
  const aliases = registry.aliases.map(alias => alias.route);
  assert.deepEqual(screens, [...screens].sort(byCodePoint));
  assert.deepEqual(aliases, [...aliases].sort(byCodePoint));
  assert.deepEqual(screens.slice(0, 3), ['/', '/admin', '/admin/Zone']);
  assert.deepEqual(aliases, ['/admin/Zulu', '/admin/legacy', '/admin/old']);
});

// ---------------------------------------------------------------- 임시 저장소: 권한 묶음

const GATED = ['/admin', '/admin/hub/alpha', '/admin/hub/beta', '/admin/things'];

test('permission bundles keep ledger order, sort their permissions, and open the gated screens their permissions satisfy', t => {
  const { dir } = fixture(t);
  const registry = buildScreenRegistry(dir);
  // 진입 권한이 빈 화면('/', '/admin/things/[id]')은 누구나 들어가므로 묶음이 여는 화면이 아니다.
  assert.deepEqual(registry.bundles, [
    { id: 'thing-viewer', name: '사물 조회', description: '사물 담당자에게 사물 조회를 맡깁니다.', protected: false,
      permissions: ['THING_READ'], screens: GATED },
    { id: 'thing-editor', name: '사물 편집', description: '사물 담당자에게 다른 사람의 사물까지 고치는 일을 맡깁니다.', protected: false,
      permissions: ['THING_READ', 'THING_UPDATE', 'THING_UPDATE_ALL'], screens: GATED },
    { id: 'thing-security', name: '사물 보안', description: '보안 책임자에게 사물 권한 설정을 맡깁니다.', protected: true,
      permissions: ['AUTHRT_GRANT', 'THING_READ'], screens: GATED },
  ]);
  assert.deepEqual(readScreenRegistryArtifact(registry.text).bundles, registry.bundles);
  assert.deepEqual(validateScreenRegistry(readScreenRegistryArtifact(registry.text), dir), []);
});

test('a bundle opens an ANY screen with one entry permission and an ALL screen only with every entry permission', t => {
  const { dir, mutate } = fixture(t);
  mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => {
    catalog.pagePermissions['/admin/things'] = ['THING_READ', 'THING_UPDATE'];
    catalog.pagePermissionModes['/admin/things'] = 'ALL';
    catalog.pagePermissions['/admin/hub/alpha'] = ['THING_EXPORT', 'THING_UPDATE'];
  });
  const screens = Object.fromEntries(buildScreenRegistry(dir).bundles.map(bundle => [bundle.id, bundle.screens]));
  assert.deepEqual(screens, {
    'thing-viewer': ['/admin', '/admin/hub/beta'],
    'thing-editor': ['/admin', '/admin/hub/alpha', '/admin/hub/beta', '/admin/things'],
    'thing-security': ['/admin', '/admin/hub/beta'],
  });
});

test('invalid permission bundle ledgers are red', t => {
  const bundle = (ledger, id) => ledger.bundles.find(row => row.id === id);
  const missing = fixture(t);
  fs.unlinkSync(path.join(missing.dir, SCREEN_REGISTRY_INPUTS.bundles));
  assert.throws(() => buildScreenRegistry(missing.dir), /input is missing: config\/governance\/permission-bundles\.json/u);

  const cases = [
    ['schema version', /schemaVersion must be 1/u, ledger => { ledger.schemaVersion = 2; }],
    ['unknown ledger field', /ledger has unknown fields: bundle/u, ledger => { ledger.bundle = []; }],
    ['no bundles', /must declare bundles/u, ledger => { ledger.bundles = []; }],
    ['unknown bundle field', /thing-viewer has unknown fields: protect/u, ledger => { bundle(ledger, 'thing-viewer').protect = false; }],
    ['id not kebab-case', /Invalid permission bundle id \(kebab-case\): "Thing_Viewer"/u, ledger => { bundle(ledger, 'thing-viewer').id = 'Thing_Viewer'; }],
    ['duplicate id', /Duplicate permission bundle id: thing-viewer/u, ledger => { bundle(ledger, 'thing-editor').id = 'thing-viewer'; }],
    ['missing name', /thing-viewer must declare a name/u, ledger => { delete bundle(ledger, 'thing-viewer').name; }],
    ['padded name', /thing-viewer must declare a name/u, ledger => { bundle(ledger, 'thing-viewer').name = ' 사물 조회'; }],
    ['blank description', /thing-viewer must declare a description/u, ledger => { bundle(ledger, 'thing-viewer').description = '  '; }],
    ['duplicate name', /Duplicate permission bundle name: 사물 조회/u, ledger => { bundle(ledger, 'thing-editor').name = '사물 조회'; }],
    ['replaced term in name', /thing-viewer name uses a term the visible-copy rules replace: 허브/u,
      ledger => { bundle(ledger, 'thing-viewer').name = '사물 허브'; }],
    ['replaced term in description', /thing-viewer description uses a term the visible-copy rules replace: Matrix/u,
      ledger => { bundle(ledger, 'thing-viewer').description = '사물 Matrix 를 맡깁니다.'; }],
    ['forbidden term in description', /thing-viewer description uses a term the visible-copy rules replace: 지능형/u,
      ledger => { bundle(ledger, 'thing-viewer').description = '지능형 사물 조회를 맡깁니다.'; }],
    ['forbidden phrase mixing scripts', /thing-viewer description uses a term the visible-copy rules replace: ai 기반/u,
      ledger => { bundle(ledger, 'thing-viewer').description = 'ai 기반 사물 조회를 맡깁니다.'; }],
    ['audience-only term without an exception path', /thing-viewer name uses a term the visible-copy rules replace: node/u,
      ledger => { bundle(ledger, 'thing-viewer').name = '사물 node 조회'; }],
    ['protected not boolean', /thing-viewer must declare protected as a boolean/u, ledger => { bundle(ledger, 'thing-viewer').protected = 'no'; }],
    ['no permissions', /thing-viewer must declare permissions/u, ledger => { bundle(ledger, 'thing-viewer').permissions = []; }],
    ['permission outside the catalog', /Unknown permission code in permission bundle thing-viewer: THING_ARCHIVE/u,
      ledger => { bundle(ledger, 'thing-viewer').permissions.push('THING_ARCHIVE'); }],
    ['permission listed twice', /thing-viewer lists a permission twice: THING_READ/u,
      ledger => { bundle(ledger, 'thing-viewer').permissions.push('THING_READ'); }],
    ['protected permission without the flag', /thing-security holds protected permissions \(AUTHRT_GRANT\) but is not marked protected/u,
      ledger => { bundle(ledger, 'thing-security').protected = false; }],
    ['flag without a protected permission', /thing-viewer is marked protected but holds no protected permission/u,
      ledger => { bundle(ledger, 'thing-viewer').protected = true; }],
    ['delegated permission without its base', /thing-editor grants THING_UPDATE_ALL without its base permission THING_UPDATE/u,
      ledger => { bundle(ledger, 'thing-editor').permissions = ['THING_READ', 'THING_UPDATE_ALL']; }],
    ['bundle that opens no screen', /thing-viewer opens no screen/u, ledger => { bundle(ledger, 'thing-viewer').permissions = ['THING_EXPORT']; }],
    ['same permission set in another order', /thing-security and thing-security-copy grant the same permissions/u,
      ledger => { ledger.bundles.push({ ...bundle(ledger, 'thing-security'), id: 'thing-security-copy', name: '사물 보안 사본',
        permissions: [...bundle(ledger, 'thing-security').permissions].reverse() }); }],
  ];
  for (const [label, expected, change] of cases) {
    const current = fixture(t);
    assert.doesNotThrow(() => buildScreenRegistry(current.dir), label);
    current.mutate(SCREEN_REGISTRY_INPUTS.bundles, change);
    assert.throws(() => buildScreenRegistry(current.dir), expected, label);
  }
});

test('bundle copy follows the visible terms ledger: a new term there is refused here, context-only decisions are not', t => {
  // 사본이 아니라 원장을 읽는다는 증명 — 원장에 용어를 더하기만 해도 이미 있던 묶음 이름이 red 가 된다.
  const added = fixture(t);
  assert.doesNotThrow(() => buildScreenRegistry(added.dir));
  added.mutate(SCREEN_REGISTRY_INPUTS.visibleTerms, ledger => {
    ledger.terms.push({ id: 'term-thing-edit', sourceTerms: ['사물 편집'], decision: 'replace-by-domain-noun' });
  });
  assert.throws(() => buildScreenRegistry(added.dir), /thing-editor name uses a term the visible-copy rules replace: 사물 편집/u);
  // 결정이 문맥 판단(evidence-required)인 용어는 묶음 문구에서 막지 않는다.
  const contextual = fixture(t);
  contextual.mutate(SCREEN_REGISTRY_INPUTS.bundles, ledger => {
    ledger.bundles[0].description = '사물 담당자에게 사물 조회를 안전하게 맡깁니다.';
  });
  assert.doesNotThrow(() => buildScreenRegistry(contextual.dir));
  // 영문 용어는 단어로만 찾는다 — 다른 단어의 일부(Hubble)는 용어가 아니다.
  const partial = fixture(t);
  partial.mutate(SCREEN_REGISTRY_INPUTS.bundles, ledger => { ledger.bundles[0].description = '사물 담당자에게 Hubble 사물 조회를 맡깁니다.'; });
  assert.doesNotThrow(() => buildScreenRegistry(partial.dir));
});

test('a missing or malformed visible terms ledger is red, including one that leaves nothing to check', t => {
  const missing = fixture(t);
  fs.unlinkSync(path.join(missing.dir, SCREEN_REGISTRY_INPUTS.visibleTerms));
  assert.throws(() => buildScreenRegistry(missing.dir), /input is missing: config\/frontend-visible-terms\.json/u);
  const cases = [
    ['no terms list', /Visible terms ledger must declare terms/u, ledger => { delete ledger.terms; }],
    ['term without a decision', /term term-hub must declare a decision and non-empty sourceTerms/u, ledger => { delete ledger.terms[0].decision; }],
    ['term with a blank source term', /term term-matrix must declare a decision and non-empty sourceTerms/u,
      ledger => { ledger.terms[1].sourceTerms.push(' '); }],
    ['nothing left to check', /declares no replaced or forbidden term/u,
      ledger => { ledger.terms = ledger.terms.map(term => ({ ...term, decision: 'evidence-required' })); }],
  ];
  for (const [label, expected, change] of cases) {
    const current = fixture(t);
    assert.doesNotThrow(() => buildScreenRegistry(current.dir), label);
    current.mutate(SCREEN_REGISTRY_INPUTS.visibleTerms, change);
    assert.throws(() => buildScreenRegistry(current.dir), expected, label);
  }
});

test('a changed bundle ledger makes the artifact stale, and a hand-edited bundle is caught by the artifact invariants', t => {
  const { dir, mutate } = fixture(t);
  generateScreenRegistry(dir);
  assert.doesNotThrow(() => generateScreenRegistry(dir, true));
  mutate(SCREEN_REGISTRY_INPUTS.bundles, ledger => { ledger.bundles[0].description = '사물 담당자에게 사물 목록 조회를 맡깁니다.'; });
  assert.throws(() => generateScreenRegistry(dir, true), /stale/);
  generateScreenRegistry(dir);
  assert.doesNotThrow(() => generateScreenRegistry(dir, true));

  const artifact = readScreenRegistryArtifact(fs.readFileSync(path.join(dir, SCREEN_REGISTRY_OUTPUT), 'utf8'));
  assert.deepEqual(validateScreenRegistry(artifact, dir), []);
  const edit = change => ({ ...artifact, bundles: artifact.bundles.map((bundle, index) => (index === 0 ? change(bundle) : bundle)) });
  const errors = changed => validateScreenRegistry(changed, dir).join('\n');
  assert.match(errors(edit(bundle => ({ ...bundle, screens: [...bundle.screens, '/admin/old'] }))),
    /thing-viewer opens a route that is not a screen: \/admin\/old[\s\S]*differ from the bundle ledger/u);
  assert.match(errors(edit(bundle => ({ ...bundle, permissions: ['THING_GHOST'] }))), /thing-viewer uses a permission outside the catalog: THING_GHOST/u);
  assert.match(errors(edit(bundle => ({ ...bundle, protected: true }))), /differ from the bundle ledger/u);
  assert.match(errors({ screens: artifact.screens, aliases: artifact.aliases }), /does not declare permission bundles/u);
  // 원장이 깨지면 산출물 검증도 그 이유를 말한다.
  mutate(SCREEN_REGISTRY_INPUTS.bundles, ledger => { ledger.bundles[0].permissions = ['THING_EXPORT']; });
  assert.match(errors(artifact), /bundle ledger is invalid: Permission bundle thing-viewer opens no screen/u);
});

test('the same inputs produce byte-identical output on every run and in LF or CRLF checkouts', t => {
  const { dir, write } = fixture(t);
  const first = buildScreenRegistry(dir).text;
  generateScreenRegistry(dir);
  assert.equal(buildScreenRegistry(dir).text, first, '생성 산출물이 다음 생성의 입력을 바꾸면 안 된다');
  assert.equal(fs.readFileSync(path.join(dir, SCREEN_REGISTRY_OUTPUT), 'utf8'), first);
  assert.doesNotMatch(first, /\r|\d{4}-\d{2}-\d{2}T/u, 'LF only and no timestamps');
  for (const file of [...Object.keys(FILES), ...Object.keys(JSON_FILES)]) {
    write(file, fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r?\n/gu, '\r\n'));
  }
  assert.equal(buildScreenRegistry(dir).text, first);
  assert.doesNotThrow(() => generateScreenRegistry(dir, true));
  // Windows checkout(core.autocrlf)에서는 산출물 자체도 CRLF 다 — 줄 끝만 다른 산출물은 낡은 것이 아니다.
  const target = path.join(dir, SCREEN_REGISTRY_OUTPUT);
  fs.writeFileSync(target, first.replace(/\n/gu, '\r\n'));
  assert.doesNotThrow(() => generateScreenRegistry(dir, true));
});

// ---------------------------------------------------------------- 임시 저장소: red 증명

test('stale or missing artifacts fail closed', t => {
  const { dir, mutate } = fixture(t);
  generateScreenRegistry(dir);
  assert.doesNotThrow(() => generateScreenRegistry(dir, true));
  mutate(SCREEN_REGISTRY_INPUTS.menus, snapshot => { snapshot.menus[0].menu_nm = '사물 정리'; });
  assert.throws(() => generateScreenRegistry(dir, true), /stale/);
  generateScreenRegistry(dir);
  assert.doesNotThrow(() => generateScreenRegistry(dir, true));
  fs.unlinkSync(path.join(dir, SCREEN_REGISTRY_OUTPUT));
  assert.throws(() => generateScreenRegistry(dir, true), /stale/);
});

test('a new page without a page permission entry or route ledger row is red', t => {
  const unregistered = fixture(t);
  unregistered.write('frontend/src/app/admin/brand-new/page.tsx', 'export default function Page() { return null; }\n');
  assert.throws(() => buildScreenRegistry(unregistered.dir), /page permission entry.*\/admin\/brand-new/u);

  const unledgered = fixture(t);
  unledgered.write('frontend/src/app/admin/brand-new/page.tsx', 'export default function Page() { return null; }\n');
  unledgered.mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => { catalog.pagePermissions['/admin/brand-new'] = ['THING_READ']; });
  assert.throws(() => buildScreenRegistry(unledgered.dir), /route ledger row.*\/admin\/brand-new/u);
});

test('malformed entry permissions, entry modes and ledger rows are red', t => {
  const cases = [
    ['unknown entry mode', /Invalid page permission mode: \/admin\/things/u,
      f => f.mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => { catalog.pagePermissionModes['/admin/things'] = 'SOME'; })],
    ['duplicate entry code', /Invalid page permission entry: \/admin\/things/u,
      f => f.mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => { catalog.pagePermissions['/admin/things'] = ['THING_READ', 'THING_READ']; })],
    ['entry that is not a list', /Invalid page permission entry: \/admin\/things/u,
      f => f.mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => { catalog.pagePermissions['/admin/things'] = 'THING_READ'; })],
    ['empty shellAccess', /route ledger row.*\/admin\/things/u,
      f => f.mutate(SCREEN_REGISTRY_INPUTS.routes, ledger => { ledger.routes.find(row => row.route === '/admin/things').shellAccess = ''; })],
  ];
  for (const [label, expected, change] of cases) {
    const current = fixture(t);
    assert.doesNotThrow(() => buildScreenRegistry(current.dir), label);
    change(current);
    assert.throws(() => buildScreenRegistry(current.dir), expected, label);
  }
});

test('a redirect without a destination is an alias with no target, not an empty route', t => {
  const { dir, write, mutate } = fixture(t);
  write('frontend/src/app/admin/blank/page.tsx',
    "import { redirect } from 'next/navigation';\nexport default function Page() {\n  redirect('');\n}\n");
  mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => { catalog.pagePermissions['/admin/blank'] = ['THING_READ']; });
  const registry = buildScreenRegistry(dir);
  assert.deepEqual(registry.aliases.find(alias => alias.route === '/admin/blank'), { route: '/admin/blank', target: null, kind: 'page-redirect' });
  assert.equal(byRoute(registry, '/admin/blank'), undefined);
});

/** 임시 저장소의 앱 설정(next.config) — redirects() 의 리터럴 배열만 바꾼다. */
function nextConfigWith(redirects) {
  return [
    'const nextConfig = {',
    '  async redirects() {',
    '    return [',
    ...redirects.map(([source, destination]) => `      { source: '${source}', destination: '${destination}', permanent: false },`),
    '    ];',
    '  },',
    '};',
    'export default nextConfig;',
  ].join('\n');
}

test('an app redirect without a page file is a config-redirect alias, and an artifact that drops it is red', t => {
  const { dir, write } = fixture(t);
  // 레거시 게시판 경로(selectBoardList)와 같은 모양 — 화면 파일은 없고 앱 설정만 넘긴다. 같은 세그먼트 수의 동적 화면
  // (/admin/things/[id])이 있어 목록에 없으면 그 경로가 동적 화면으로 풀린다.
  write('frontend/next.config.ts', nextConfigWith([
    ['/admin/legacy', '/admin/things?tab=list'],
    ['/admin/things/selectThingList', '/admin/things'],
  ]));
  const registry = buildScreenRegistry(dir);
  assert.deepEqual(registry.aliases, [
    { route: '/admin/legacy', target: '/admin/things?tab=list', kind: 'config-redirect' },
    { route: '/admin/old', target: '/admin/things', kind: 'page-redirect' },
    { route: '/admin/things/selectThingList', target: '/admin/things', kind: 'config-redirect' },
  ]);
  assert.equal(byRoute(registry, '/admin/things/selectThingList'), undefined, 'an app redirect is not a screen');
  assert.deepEqual(validateScreenRegistry(registry, dir), []);
  // 앱 설정 별칭을 빠뜨리거나 화면 파일 별칭으로 적은 산출물은 원천과 다르다.
  const dropped = validateScreenRegistry({ ...registry, aliases: registry.aliases.filter(alias => alias.route !== '/admin/things/selectThingList') }, dir);
  assert.ok(dropped.some(error => /alias routes differ/u.test(error)), dropped.join('\n'));
  const mislabeled = validateScreenRegistry({ ...registry, aliases: registry.aliases.map(alias => (alias.route === '/admin/things/selectThingList'
    ? { ...alias, kind: 'page-redirect' } : alias)) }, dir);
  assert.ok(mislabeled.some(error => /must be a config-redirect alias: \/admin\/things\/selectThingList/u.test(error)), mislabeled.join('\n'));
});

test('an app redirect source with path parameters fails closed instead of being dropped from the aliases', t => {
  for (const source of ['/admin/things/old/:id', '/admin/things/old/:path*', '/admin/things/(old|older)']) {
    const { dir, write } = fixture(t);
    write('frontend/next.config.ts', nextConfigWith([['/admin/legacy', '/admin/things?tab=list'], [source, '/admin/things']]));
    assert.throws(() => buildScreenRegistry(dir), /must be a literal app path to be listed as a screen alias/u, source);
  }
});

test('permission codes outside the catalog are red wherever they enter', t => {
  const cases = [
    ['page permission', f => f.mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => { catalog.pagePermissions['/admin/things'] = ['THING_UNKNOWN']; })],
    ['canPermission literal', f => f.write('frontend/src/app/admin/things/Typo.tsx',
      "export const Typo = ({ user }) => canPermission(user, 'THING_UPDTAE') ? <b /> : null;\n")],
    ['write binding', f => f.mutate(SCREEN_REGISTRY_INPUTS.policies, policies => {
      policies.operationBindings.find(row => row.method === 'DELETE').permission = 'THING_PURGE';
    })],
  ];
  for (const [label, change] of cases) {
    const current = fixture(t);
    assert.doesNotThrow(() => buildScreenRegistry(current.dir), label);
    change(current);
    assert.throws(() => buildScreenRegistry(current.dir), /Unknown permission code/u, label);
  }
});

test('a page that becomes a redirect leaves the screens, and a registry that leaks an alias as a screen is red', t => {
  const { dir, write } = fixture(t);
  const before = generateScreenRegistry(dir);
  write('frontend/src/app/admin/things/[id]/page.tsx',
    "import { redirect } from 'next/navigation';\nexport default function Page() {\n  redirect('/admin/things');\n}\n");
  const after = buildScreenRegistry(dir);
  assert.deepEqual(after.screens.map(screen => screen.route), ['/', '/admin', '/admin/hub/alpha', '/admin/hub/beta', '/admin/things']);
  assert.ok(after.aliases.some(alias => alias.route === '/admin/things/[id]' && alias.kind === 'page-redirect'));
  assert.throws(() => generateScreenRegistry(dir, true), /stale/, '이전 산출물은 그 별칭을 화면으로 두고 있다');
  // 이전 산출물(별칭을 화면으로 둔 것)을 현재 원천에 대면 불변식이 red 다.
  const leaked = validateScreenRegistry({ screens: before.screens, aliases: after.aliases }, dir);
  assert.ok(leaked.some(error => /both screen and alias: \/admin\/things\/\[id\]/u.test(error)), leaked.join('\n'));
  assert.ok(leaked.some(error => /screen count 6 differs from page-routed files 5/u.test(error)), leaked.join('\n'));
  // 화면을 지어내거나 빠뜨리는 것도 red 다.
  const fabricated = validateScreenRegistry({ screens: [...after.screens, { ...after.screens[0], route: '/ghost' }], aliases: after.aliases }, dir);
  assert.ok(fabricated.some(error => /screen routes differ/u.test(error)));
  const badCode = validateScreenRegistry({ screens: after.screens.map((screen, index) => (index === 0
    ? { ...screen, permissions: [{ code: 'THING_GHOST', action: 'READ', source: 'display' }] } : screen)), aliases: after.aliases }, dir);
  assert.ok(badCode.some(error => /outside the catalog: THING_GHOST/u.test(error)));
});

test('a hand-edited artifact is stale and a malformed artifact is not silently parsed', t => {
  const { dir } = fixture(t);
  generateScreenRegistry(dir);
  const target = path.join(dir, SCREEN_REGISTRY_OUTPUT);
  const text = fs.readFileSync(target, 'utf8');
  fs.writeFileSync(target, text.replace('"label": "사물 관리"', '"label": "손으로 고친 이름"'));
  assert.throws(() => generateScreenRegistry(dir, true), /stale/);
  assert.throws(() => readScreenRegistryArtifact(text.replace('const GENERATED_ALIASES', 'const RENAMED_ALIASES')), /GENERATED_ALIASES/);
  assert.throws(() => readScreenRegistryArtifact(text.replace(/^\/\/ Generated by[^\n]*\n/u, '')), /header/);
});

// ---------------------------------------------------------------- 산출물의 런타임 조회

const ts = createRequire(path.join(root, 'frontend', 'package.json'))('typescript');

/** 생성 TS 를 그대로 트랜스파일해 불러온다. PAGE_PERMISSIONS 만 주어진 값(투영본 흉내)으로 바꾼다. */
async function loadRuntime(t, registry, pagePermissions) {
  const source = registry.text.replace(
    /^import \{ PAGE_PERMISSIONS, type PermissionCode \} from '@\/types\/generated-permissions';$/mu,
    `type PermissionCode = string;\nconst PAGE_PERMISSIONS: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(pagePermissions)};`,
  );
  assert.notEqual(source, registry.text, 'the generated module must import PAGE_PERMISSIONS');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-screen-registry-runtime-'));
  t.after(() => {
    assert.ok(path.basename(dir).startsWith('egov-screen-registry-runtime-'));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const file = path.join(dir, 'generated-screen-registry.mjs');
  fs.writeFileSync(file, output.outputText);
  return import(pathToFileURL(file).href);
}

test('findScreen strips query and hash, prefers exact routes, never resolves an alias to a dynamic sibling, and projection filters absent pages', async t => {
  const { dir, write, mutate } = fixture(t);
  // 정적 별칭 페이지가 동적 화면 형제(/admin/things/[id])와 세그먼트 수가 같다 — Next 는 정적 경로를 먼저 연다.
  write('frontend/src/app/admin/things/old-list/page.tsx',
    "import { redirect } from 'next/navigation';\nexport default function Page() {\n  redirect('/admin/things');\n}\n");
  // 동적 구간 아래 정적 화면(edit)과 동적 별칭([tab])이 나란히 있으면 리터럴이 더 많은 쪽이 이긴다.
  write('frontend/src/app/admin/things/[id]/edit/page.tsx', 'export default function Page() { return null; }\n');
  write('frontend/src/app/admin/things/[id]/[tab]/page.tsx',
    "import { redirect } from 'next/navigation';\nexport default function Page() {\n  redirect('/admin/things');\n}\n");
  mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => {
    catalog.pagePermissions['/admin/things/old-list'] = ['THING_READ'];
    catalog.pagePermissions['/admin/things/[id]/edit'] = ['THING_UPDATE'];
    catalog.pagePermissions['/admin/things/[id]/[tab]'] = ['THING_READ'];
  });
  mutate(SCREEN_REGISTRY_INPUTS.routes, ledger => {
    ledger.routes.push({ route: '/admin/things/[id]/edit', shellAccess: 'admin-system', visibleLabel: '사물 수정' });
  });
  const registry = buildScreenRegistry(dir);
  const pagePermissions = JSON.parse(fs.readFileSync(path.join(dir, SCREEN_REGISTRY_INPUTS.catalog), 'utf8')).pagePermissions;

  const full = await loadRuntime(t, registry, pagePermissions);
  assert.deepEqual(full.SCREEN_REGISTRY, registry.screens);
  assert.deepEqual(full.SCREEN_ALIASES, registry.aliases);
  assert.equal(full.findScreen('/admin/things?tab=list#top')?.route, '/admin/things');
  assert.equal(full.findScreen('/admin/things#top')?.route, '/admin/things', 'a hash without a query is stripped too');
  assert.equal(full.findScreen('/admin/things/')?.route, '/admin/things');
  // 라우트 없는 메뉴('')와 경로 없는 쿼리·해시는 화면이 아니다 — 업무 홈('/')으로 풀지 않는다.
  for (const empty of ['', '?tab=A', '#x', ' ']) assert.equal(full.findScreen(empty), null, JSON.stringify(empty));
  assert.equal(full.findScreen('/admin/things/42')?.route, '/admin/things/[id]');
  assert.equal(full.findScreen('/')?.route, '/');
  assert.equal(full.findScreen('/admin/things/old-list'), null, 'a static alias owns its path before the dynamic screen sibling');
  assert.equal(full.findScreen('/admin/old'), null);
  assert.equal(full.findScreen('/admin/things/7/edit')?.route, '/admin/things/[id]/edit', 'the more literal screen beats the dynamic alias');
  assert.equal(full.findScreen('/admin/things/7/history'), null, 'only the dynamic alias matches');
  assert.equal(full.findScreen('/admin/unknown'), null);

  // 재사용 투영본은 PAGE_PERMISSIONS 만 다시 만든다 — 거기서 빠진 화면·별칭은 런타임 목록에서도 빠진다.
  const projected = Object.fromEntries(Object.entries(pagePermissions)
    .filter(([route]) => !['/admin/things/[id]', '/admin/old'].includes(route)));
  const reduced = await loadRuntime(t, registry, projected);
  assert.deepEqual(reduced.SCREEN_REGISTRY.map(screen => screen.route), registry.screens.map(screen => screen.route).filter(route => route !== '/admin/things/[id]'));
  assert.deepEqual(reduced.SCREEN_ALIASES.map(alias => alias.route), registry.aliases.map(alias => alias.route).filter(route => route !== '/admin/old'));
  assert.equal(reduced.findScreen('/admin/things/42'), null);
});

test('an app redirect alias owns its path before a dynamic screen sibling and stays while its destination screen is projected', async t => {
  const { dir, write } = fixture(t);
  write('frontend/next.config.ts', nextConfigWith([
    ['/admin/legacy', '/admin/things?tab=list'],
    ['/admin/things/selectThingList', '/admin/things'],
  ]));
  const registry = buildScreenRegistry(dir);
  const pagePermissions = JSON.parse(fs.readFileSync(path.join(dir, SCREEN_REGISTRY_INPUTS.catalog), 'utf8')).pagePermissions;
  assert.equal(Object.hasOwn(pagePermissions, '/admin/things/selectThingList'), false, 'no page file means no page permission key');

  const full = await loadRuntime(t, registry, pagePermissions);
  assert.deepEqual(full.SCREEN_ALIASES, registry.aliases);
  // 앱 설정이 넘기는 경로는 화면이 아니다 — 목록에 없으면 같은 세그먼트 수의 동적 화면(/admin/things/[id])으로 풀린다.
  assert.equal(full.findScreen('/admin/things/selectThingList?tab=list'), null);
  assert.equal(full.findScreen('/admin/things/42')?.route, '/admin/things/[id]');

  // 투영본에서도 앱 설정은 그대로 넘긴다 — 화면 파일이 없거나 빠졌어도 목적지 화면이 남으면 별칭이 남는다.
  const withoutLegacyPage = Object.fromEntries(Object.entries(pagePermissions).filter(([route]) => route !== '/admin/legacy'));
  const legacyPageGone = await loadRuntime(t, registry, withoutLegacyPage);
  assert.deepEqual(legacyPageGone.SCREEN_ALIASES.map(alias => alias.route), ['/admin/legacy', '/admin/old', '/admin/things/selectThingList']);
  // 목적지 화면이 빠지면 넘어갈 화면이 없다 — 앱 설정 별칭도 빠진다(화면 파일이 넘기는 별칭은 자기 파일을 따른다).
  const withoutThings = Object.fromEntries(Object.entries(pagePermissions).filter(([route]) => !['/admin/things', '/admin/legacy'].includes(route)));
  const thingsGone = await loadRuntime(t, registry, withoutThings);
  assert.deepEqual(thingsGone.SCREEN_ALIASES.map(alias => alias.route), ['/admin/old']);
});

test('PERMISSION_BUNDLES keeps every bundle in the full repository and drops projected-away screens and empty bundles', async t => {
  const { dir, mutate } = fixture(t);
  // 사물 조회 묶음은 /admin/things 하나만 열고, 내보내기 묶음은 다른 세 화면을 연다.
  mutate(SCREEN_REGISTRY_INPUTS.catalog, catalog => {
    for (const route of ['/admin', '/admin/hub/alpha', '/admin/hub/beta']) catalog.pagePermissions[route] = ['THING_EXPORT'];
  });
  mutate(SCREEN_REGISTRY_INPUTS.bundles, ledger => {
    ledger.bundles.push({ id: 'thing-exporter', name: '사물 내보내기', description: '사물 담당자에게 사물 내보내기를 맡깁니다.',
      protected: false, permissions: ['THING_EXPORT'] });
  });
  const registry = buildScreenRegistry(dir);
  const pagePermissions = JSON.parse(fs.readFileSync(path.join(dir, SCREEN_REGISTRY_INPUTS.catalog), 'utf8')).pagePermissions;
  const full = await loadRuntime(t, registry, pagePermissions);
  assert.deepEqual(full.PERMISSION_BUNDLES, registry.bundles);
  assert.deepEqual(full.PERMISSION_BUNDLES.find(bundle => bundle.id === 'thing-viewer').screens, ['/admin/things']);
  // 화면이 보호 권한 사본을 두지 않도록 산출물이 생성기의 집합(서버와 대조됨)을 그대로 내보낸다.
  assert.deepEqual(full.PROTECTED_PERMISSIONS, [...PROTECTED_PERMISSIONS].sort());

  // 투영본에서 /admin/things 와 /admin 이 빠지면 묶음의 화면에서도 빠지고, 여는 화면이 남지 않은 묶음은 내지 않는다.
  const projected = Object.fromEntries(Object.entries(pagePermissions).filter(([route]) => !['/admin/things', '/admin'].includes(route)));
  const reduced = await loadRuntime(t, registry, projected);
  assert.deepEqual(reduced.PERMISSION_BUNDLES.map(bundle => [bundle.id, bundle.screens]),
    [['thing-exporter', ['/admin/hub/alpha', '/admin/hub/beta']]]);
  assert.equal(registry.bundles.length, 4, 'the generated list itself is not projected');
});

// ---------------------------------------------------------------- 실행 경로(H5)

test('screen registry freshness and red contracts run through local verify, pre-push and required CI operational tests', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['test:operational-contracts'].includes('"scripts/*.test.mjs"'));
  for (const file of ['scripts/verify.mjs', '.githooks/pre-push', '.github/workflows/ci.yml']) {
    assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes('npm run test:operational-contracts'), file);
  }
  // runner-catalog 가 scripts/*.test.mjs 를 자동 발견하고 skip 을 금지한다 — 이 파일을 따로 등록하지 않는다.
  const gates = JSON.parse(fs.readFileSync(path.join(root, 'config/governance/gates.json'), 'utf8'));
  const gate = gates.gateSets.find(row => row.id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  assert.ok(gate, 'operational contract runner catalog must exist');
  assert.equal(gate.selector.type, 'runner-catalog');
  assert.equal(gate.selector.forbidSkips, true);
  assert.ok(gate.selector.catalogs.some(row => row.root === 'scripts' && row.recursive === false && row.suffixes.includes('.test.mjs')));
  assert.equal(path.relative(root, fileURLToPath(import.meta.url)).split(path.sep).join('/'), 'scripts/generate-screen-registry.test.mjs');
  assert.ok(gate.selector.commandBindings.some(row => row.source === '.github/workflows/ci.yml' && row.job === 'secret-scan'));
  assert.equal(gate.requiredCiContext, 'secret-scan');
});

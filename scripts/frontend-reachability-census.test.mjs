import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildFrontendReachabilityCensus,
  CURRENT_REPOSITORY_ASSERTIONS,
  validateReachabilityAssertions,
} from './frontend-reachability-census.mjs';
import {
  frontendImportSpecifiers,
  projectFrontendPackMarkers,
  resolveFrontendImport,
} from './generate-reusable-base-source.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoots = [];

test.afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createFixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'frontend-reachability-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, 'frontend', 'src'), { recursive: true });
  for (const [relativePath, source] of Object.entries(files)) {
    const target = join(root, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source, 'utf8');
  }
  return root;
}

function censusFixture(root, overrides = {}) {
  return buildFrontendReachabilityCensus({
    repoRoot: root,
    documentationRoots: [],
    configRoots: [],
    profileManifestPath: null,
    routeManifestPath: null,
    ...overrides,
  });
}

function byFile(census, file) {
  const entry = census.files.find((candidate) => candidate.file === file);
  assert.ok(entry, `census entry missing: ${file}`);
  return entry;
}

test('current repository keeps the known live chain and user hub split explicit', () => {
  const census = buildFrontendReachabilityCensus({ repoRoot });
  assert.deepEqual(validateReachabilityAssertions(census, CURRENT_REPOSITORY_ASSERTIONS), []);
  assert.ok(census.summary.population > 0);
  assert.equal(census.summary.issueCount, 0);

  // [2026-09-07] 쪽지 작성이 UserPicker → RecipientPicker 로 옮겨가면서 이 체인의 **진입점**이
  // 바뀌었다. UserPicker 자체는 죽지 않았다 — 메모보고와 결재 기안 다이얼로그가 계속 렌더한다.
  // 이 단언이 지키는 것은 "가상 리스트가 실제 라우트에서 도달 가능하다" 이지 특정 진입점이 아니므로,
  // 진입점 변경은 체인을 갱신해 기록하고 도달 불가로의 회귀만 red 로 남긴다.
  const virtualList = byFile(census, 'frontend/src/app/components/ui/virtual-scroll-list.tsx');
  assert.equal(virtualList.deletionClass, 'runtime-reachable');
  assert.deepEqual(
    virtualList.evidencePaths.runtime.nodes,
    [
      'frontend/src/app/admin/operation/memo-reports/page.tsx',
      'frontend/src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx',
      'frontend/src/app/components/ui/user-picker.tsx',
      'frontend/src/app/components/ui/virtual-scroll-list.tsx',
    ],
  );
  // UserPicker 가 소비자를 모두 잃으면 위 체인이 통째로 사라지므로, 그 자체의 도달성도 못 박는다.
  assert.equal(byFile(census, 'frontend/src/app/components/ui/user-picker.tsx').deletionClass, 'runtime-reachable');

  // [2026-08-23 m-2] test-only 로 분류돼 있던 manage/UserManageClient.tsx 는 전용 테스트와 함께
  // 삭제됐다 — 실제 라우트가 렌더하는 것은 아래 UserOrgHubClient 다. 재유입은 census 에 다시 잡힌다.
  assert.equal(
    census.files.some((file) => file.file.includes('UserManageClient')),
    false,
  );

  const liveHub = byFile(census, 'frontend/src/app/admin/user/UserOrgHubClient.tsx');
  assert.equal(liveHub.deletionClass, 'runtime-reachable');
  assert.equal(liveHub.reachability.runtime, true);
  assert.equal(liveHub.reachability.effectiveProduct, true);

  const shadowedLoginPolicy = byFile(census, 'frontend/src/app/admin/user/login-policy/page.tsx');
  assert.equal(shadowedLoginPolicy.routing.shadowedBy.kind, 'config-redirect');
  assert.equal(shadowedLoginPolicy.reachability.runtime, true);
  assert.equal(shadowedLoginPolicy.reachability.effectiveProduct, false);
});

// [2026-09-13 GAP-PACK-001 ②] 공용 수신자 피커가 demo 소유 주소록을 정적 import 해, collaboration 프로필에서
//   피커와 쪽지·메일·문자·알림 발송 화면이 import 그래프로 함께 사라지고 있었다. 피커는 이제 주소록 출처를 주입받고,
//   조합 지점(메일·문자)만 demo 마커 블록 안에서 어댑터를 넘긴다. 아래 두 단언이 그 경계를 main CI 에서 지킨다.
const COLLABORATION_SURVIVORS = [
  'frontend/src/app/components/ui/recipient-picker.tsx',
  'frontend/src/types/recipient-address-book.ts',
  'frontend/src/app/note/page.tsx',
  'frontend/src/app/admin/collaboration/mail-send/page.tsx',
  'frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx',
  'frontend/src/app/admin/uss/ion/sms/page.tsx',
  'frontend/src/app/admin/uss/ion/sms/SmsAdminClient.tsx',
  'frontend/src/app/admin/notifications/page.tsx',
  'frontend/src/app/admin/notifications/NotificationsClient.tsx',
  'frontend/src/app/admin/notifications/NotificationDispatchDialog.tsx',
  // [2026-09-15 GAP-PACK-001] pack 별로 가른 사용자 서비스 회귀 테스트 — 아래 CORE_SURVIVORS 주석 참조.
  'frontend/src/services/business/user/__tests__/CoreUserServices.test.ts',
  'frontend/src/services/business/user/__tests__/CollaborationUserServices.test.ts',
];

/*
  [2026-09-15 GAP-PACK-001] 공용 회귀 테스트가 여러 pack 의 서비스를 한 파일에 섞고 있었다.
  투영은 import 그래프로 cascade 를 판정하므로, 가장 먼저 빠지는 pack 때문에 파일 전체가 사라지고
  **살아남은 서비스의 검증까지 함께 없어진다**. 실측 세 건:

    ComprehensiveUserServices  demo(addressbook) + core(community·deptJob)
      → core·collaboration 에서 community·deptJob 검증 소실
    FinalDomainServices        collaboration(note·scrap·mail) + demo(report) + core(menu)
      → collaboration 에서 note·scrap·mail·menu 검증 소실
    UserDomainServices         collaboration(board) + demo(approval)
      → collaboration 에서 board 검증 소실

  pack 별로 가르면 cascade 제거가 오히려 정확한 동작이 된다 — 검증 대상이 없으면 검증도 없다.
  아래 가드는 다시 섞이는 회귀를 main CI 에서 잡는다. core 파일은 어떤 프로필에서도 빠지지 않아야
  하므로 가장 좁은 프로필(core)로 따로 본다.
*/
const CORE_SURVIVORS = [
  'frontend/src/services/business/user/__tests__/CoreUserServices.test.ts',
];

test('pack 별로 가른 사용자 서비스 테스트는 core 프로필에서도 제외 pack 을 참조하지 않는다', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/reusable-base-profiles.json'), 'utf8'));
  const exclusion = profileExclusion(manifest, 'core');
  const frontendRoot = join(repoRoot, 'frontend');
  assert.ok(exclusion.excludedRemovePaths.length > 0, 'core must exclude at least one frontend pack path');

  const census = buildFrontendReachabilityCensus({ repoRoot });
  for (const survivor of CORE_SURVIVORS) {
    const file = join(repoRoot, survivor);
    assert.deepEqual(
      excludedOwnedImports({ frontendRoot, file, source: readFileSync(file, 'utf8'), ...exclusion }),
      [],
      `${survivor} references a pack excluded from core`,
    );
    const coreRemoval = byFile(census, survivor).profileRemovalConstraints
      .find((constraint) => constraint.profile === 'core');
    assert.equal(
      coreRemoval,
      undefined,
      `${survivor} is removed from the core profile via ${JSON.stringify(coreRemoval?.evidencePath)}`,
    );
  }
});

test('recipient picker and its collaboration consumers survive the collaboration projection', () => {
  const census = buildFrontendReachabilityCensus({ repoRoot });
  for (const file of COLLABORATION_SURVIVORS) {
    const collaborationRemoval = byFile(census, file).profileRemovalConstraints
      .find((constraint) => constraint.profile === 'collaboration');
    assert.equal(
      collaborationRemoval,
      undefined,
      `${file} is removed from the collaboration profile via ${JSON.stringify(collaborationRemoval?.evidencePath)}`,
    );
  }
  const adapter = byFile(census, 'frontend/src/services/business/user/addressbook/recipient-address-book-source.ts');
  assert.equal(
    adapter.profileRemovalConstraints.find((constraint) => constraint.profile === 'collaboration')?.removal,
    'direct',
  );
});

/**
 * 생성기(generate-reusable-base-source.mjs)는 제외 pack 마커 블록을 먼저 지운 뒤, 주석을 지우지 않은 **원문 전체**에
 * import 정규식을 적용하고 `@/`·상대 경로를 풀어 cascade 를 판정한다. census 토크나이저는 주석을 건너뛰므로, 생존 파일
 * 주석에 옛 import 를 인용하는 회귀는 위 단언을 통과하면서 실제 생성기에서만 cascade 를 일으킨다. 그래서 **생성기의
 * 투영·판정 함수 자체**로 생존 파일을 한 번 더 본다 — 흉내 낸 정규식이 아니라 같은 코드다.
 */
function excludedOwnedImports({ frontendRoot, file, source, knownPacks, excludedPacks, excludedRemovePaths }) {
  const projected = projectFrontendPackMarkers(source, { knownPacks, excludedPacks, label: file }).source;
  return frontendImportSpecifiers(projected)
    .map((specifier) => resolveFrontendImport(frontendRoot, file, specifier, new Set()))
    .filter(Boolean)
    .map((resolved) => relative(frontendRoot, resolved).split(sep).join('/'))
    .filter((target) => excludedRemovePaths.some((removePath) => target === removePath
      || target.startsWith(`${removePath}/`)));
}

function profileExclusion(manifest, profileName) {
  const included = new Set(manifest.profiles[profileName].packs);
  const excludedPacks = new Set(Object.keys(manifest.packs).filter((packName) => !included.has(packName)));
  return {
    knownPacks: new Set(Object.keys(manifest.packs)),
    excludedPacks,
    excludedRemovePaths: [...excludedPacks].flatMap((packName) => manifest.packs[packName].frontend?.removePaths ?? []),
  };
}

test('files that must survive the collaboration projection never reference an excluded pack, comments included', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'config/reusable-base-profiles.json'), 'utf8'));
  const exclusion = profileExclusion(manifest, 'collaboration');
  const frontendRoot = join(repoRoot, 'frontend');
  assert.ok(exclusion.excludedRemovePaths.length > 0, 'collaboration must exclude at least one frontend pack path');

  for (const survivor of COLLABORATION_SURVIVORS) {
    const file = join(repoRoot, survivor);
    assert.deepEqual(
      excludedOwnedImports({ frontendRoot, file, source: readFileSync(file, 'utf8'), ...exclusion }),
      [],
      `${survivor} references a pack excluded from collaboration`,
    );
  }
});

test('the survivor guard catches alias, relative and comment-only quotes, but not imports inside an excluded pack block', () => {
  const pickerSource = [
    "/** import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService'; */",
    "// import { addressbookUserService } from '../../../services/business/user/addressbook/AddressbookUserService';",
    "import type { NameCard } from '@/types/business/addressbook';",
    '/* reusable-base:demo:start */',
    "import { recipientAddressBookSource } from '@/services/business/user/addressbook/recipient-address-book-source';",
    '/* reusable-base:demo:end */',
    'export const Picker = () => null;',
  ].join('\n');
  const root = createFixture({
    'frontend/src/services/business/user/addressbook/AddressbookUserService.ts': 'export const addressbookUserService = {};',
    'frontend/src/services/business/user/addressbook/recipient-address-book-source.ts': 'export const recipientAddressBookSource = {};',
    'frontend/src/types/business/addressbook.ts': 'export interface NameCard { nm: string }',
    'frontend/src/app/components/ui/picker.tsx': pickerSource,
  });
  const frontendRoot = join(root, 'frontend');
  const exclusion = {
    knownPacks: new Set(['core', 'collaboration', 'survey', 'demo']),
    excludedPacks: new Set(['survey', 'demo']),
    excludedRemovePaths: ['src/services/business/user/addressbook', 'src/types/business/addressbook.ts'],
  };

  // 마커 블록 안의 어댑터 import 는 생성기가 블록째 지우므로 간선이 아니다 — 블록 밖의 인용 셋만 잡혀야 한다.
  assert.deepEqual(
    excludedOwnedImports({ frontendRoot, file: join(frontendRoot, 'src/app/components/ui/picker.tsx'), source: pickerSource, ...exclusion }),
    [
      'src/services/business/user/addressbook/AddressbookUserService.ts',
      'src/services/business/user/addressbook/AddressbookUserService.ts',
      'src/types/business/addressbook.ts',
    ],
  );
});

test('census distinguishes every evidence axis without promoting non-runtime references', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': [
      "import type { CompileOnly } from '../runtime/compile-only';",
      "import { type InlineOnly } from '../runtime/inline-only';",
      "import { type MixedType, mixedValue } from '../runtime/mixed';",
      "import { Feature } from '../runtime/barrel';",
      "export const lazy = () => import('../runtime/lazy');",
      "export const resolved = require.resolve('../runtime/resolved');",
      "type ImportedShape = typeof import('../runtime/import-type');",
      'export default function Page(): CompileOnly & InlineOnly & MixedType & ImportedShape { return Feature ?? mixedValue; }',
    ].join('\n'),
    'frontend/src/runtime/barrel.ts': "export { Feature } from './feature';\n",
    'frontend/src/runtime/feature.ts': "export const Feature = 'feature';\n",
    'frontend/src/runtime/compile-only.ts': 'export interface CompileOnly { value: string }\n',
    'frontend/src/runtime/inline-only.ts': 'export interface InlineOnly { inline: string }\n',
    'frontend/src/runtime/mixed.ts': 'export interface MixedType { mixed: string }\nexport const mixedValue = true;\n',
    'frontend/src/runtime/import-type.ts': 'export interface ImportedShape { imported: string }\n',
    'frontend/src/runtime/resolved.ts': 'export const resolved = true;\n',
    'frontend/src/runtime/lazy.ts': "export const lazy = 'lazy';\n",
    'frontend/src/lib/test-target.test.ts': "import './test-target';\n",
    'frontend/src/lib/test-target.ts': 'export const tested = true;\n',
    'frontend/src/stories/guide.stories.tsx': "import '../lib/story-target';\nexport default {};\n",
    'frontend/src/lib/story-target.ts': 'export const story = true;\n',
    'frontend/src/lib/docs-target.ts': 'export const documented = true;\n',
    'frontend/src/lib/config-target.ts': 'export const configured = true;\n',
    'frontend/src/lib/config-graph-target.ts': 'export const configuredGraph = true;\n',
    'frontend/vitest.config.mts': "export default { test: { setupFiles: ['./vitest.setup.ts'] } };\n",
    'frontend/vitest.setup.ts': "import './src/lib/config-graph-target';\n",
    'frontend/playwright.config.ts': "export default { globalTeardown: './e2e/scripts/cleanup-db.ts' };\n",
    'frontend/e2e/scripts/cleanup-db.ts': "import '../../src/lib/cleanup-target';\n",
    'frontend/src/lib/cleanup-target.ts': 'export const cleanupTarget = true;\n',
    'frontend/e2e/create-require.ts': [
      "import { createRequire } from 'node:module';",
      'const localRequire = createRequire(import.meta.url);',
      "localRequire('../src/lib/create-require-target');",
    ].join('\n'),
    'frontend/src/lib/create-require-target.ts': 'export const createRequireTarget = true;\n',
    'frontend/src/profile/direct.ts': 'export const direct = true;\n',
    'frontend/src/profile/importer.ts': "import './direct';\nexport const importer = true;\n",
    'frontend/src/lib/safe.ts': 'export const candidate = true;\n',
    'frontend/src/lib/cycle-a.ts': "import './cycle-b';\n",
    'frontend/src/lib/cycle-b.ts': "import './cycle-a';\n",
    'docs/reference.md': '`frontend/src/lib/docs-target.ts` is documentation-only.\n',
    'config/reference.json': '{"source":"frontend/src/lib/config-target.ts"}\n',
    'config/reusable-base-profiles.json': JSON.stringify({
      schemaVersion: 1,
      profiles: {
        stripped: { packs: ['core'] },
        full: { packs: ['core', 'optional'] },
      },
      packs: {
        core: {},
        optional: { frontend: { removePaths: ['src/profile/direct.ts'] } },
      },
    }),
  });
  const census = censusFixture(root, {
    documentationRoots: [join(root, 'docs')],
    configRoots: [join(root, 'config')],
    profileManifestPath: join(root, 'config', 'reusable-base-profiles.json'),
  });

  assert.equal(byFile(census, 'frontend/src/app/page.tsx').entryKinds.nextRoute, true);
  assert.equal(byFile(census, 'frontend/src/runtime/feature.ts').deletionClass, 'runtime-reachable');
  assert.equal(byFile(census, 'frontend/src/runtime/lazy.ts').evidencePaths.runtime.edges.at(-1).kind, 'dynamic-import');

  const compileOnly = byFile(census, 'frontend/src/runtime/compile-only.ts');
  assert.equal(compileOnly.reachability.runtime, false);
  assert.equal(compileOnly.reachability.productionCompile, true);
  assert.equal(compileOnly.deletionClass, 'runtime-reachable');

  const inlineOnly = byFile(census, 'frontend/src/runtime/inline-only.ts');
  assert.equal(inlineOnly.reachability.runtime, false);
  assert.equal(inlineOnly.reachability.productionCompile, true);
  const mixed = byFile(census, 'frontend/src/runtime/mixed.ts');
  assert.equal(mixed.reachability.runtime, true);
  const importType = byFile(census, 'frontend/src/runtime/import-type.ts');
  assert.equal(importType.reachability.runtime, false);
  assert.equal(importType.reachability.productionCompile, true);
  assert.equal(importType.evidencePaths.productionCompile.edges.at(-1).kind, 'import-type');
  assert.equal(byFile(census, 'frontend/src/runtime/resolved.ts').evidencePaths.runtime.edges.at(-1).kind, 'require-resolve');

  assert.equal(byFile(census, 'frontend/src/lib/test-target.ts').deletionClass, 'test-only');
  assert.equal(byFile(census, 'frontend/src/lib/story-target.ts').reachability.story, true);
  assert.equal(byFile(census, 'frontend/src/lib/story-target.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(census, 'frontend/src/lib/docs-target.ts').references.docs.length, 1);
  assert.equal(byFile(census, 'frontend/src/lib/docs-target.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(census, 'frontend/src/lib/config-target.ts').references.config.length, 1);
  assert.equal(byFile(census, 'frontend/src/lib/config-target.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(census, 'frontend/src/lib/config-graph-target.ts').reachability.config, true);
  assert.equal(byFile(census, 'frontend/src/lib/config-graph-target.ts').deletionClass, 'test-only');
  assert.equal(byFile(census, 'frontend/src/lib/cleanup-target.ts').deletionClass, 'test-only');
  assert.equal(byFile(census, 'frontend/src/lib/create-require-target.ts').deletionClass, 'test-only');
  assert.equal(
    byFile(census, 'frontend/src/lib/create-require-target.ts').evidencePaths.test.edges.at(-1).kind,
    'create-require',
  );

  const direct = byFile(census, 'frontend/src/profile/direct.ts');
  assert.deepEqual(
    direct.profileRemovalConstraints.map(({ profile, removal }) => [profile, removal]),
    [['stripped', 'direct']],
  );
  assert.equal(direct.deletionClass, 'ambiguous');
  const transitive = byFile(census, 'frontend/src/profile/importer.ts');
  assert.deepEqual(
    transitive.profileRemovalConstraints.map(({ profile, removal }) => [profile, removal]),
    [['stripped', 'transitive']],
  );
  assert.deepEqual(
    transitive.profileRemovalConstraints[0].evidencePath,
    ['frontend/src/profile/importer.ts', 'frontend/src/profile/direct.ts'],
  );
  assert.equal(byFile(census, 'frontend/src/lib/safe.ts').deletionClass, 'safe-candidate');
  assert.equal(byFile(census, 'frontend/src/lib/cycle-a.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(census, 'frontend/src/lib/cycle-b.ts').deletionClass, 'ambiguous');
});

test('empty source population is a reproducible red', () => {
  const root = createFixture();
  assert.throws(
    () => censusFixture(root),
    /\[EMPTY_POPULATION\]/,
  );
});

test('missing local dependency is a reproducible red', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': "import './missing';\nexport default function Page() { return null; }\n",
  });
  assert.throws(
    () => censusFixture(root),
    /\[MISSING_IMPORT_TARGET\].*frontend\/src\/app\/page\.tsx:1.*\.\/missing/,
  );
});

test('computed dynamic import is ambiguous in inspection mode and red in gate mode', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/lib/computed.ts': [
      "const target = './lazy';",
      'export const load = () => import(target);',
    ].join('\n'),
    'frontend/src/lib/computed.test.ts': [
      "const target = './lazy';",
      'export const load = () => import(target);',
    ].join('\n'),
    'frontend/src/lib/lazy.ts': 'export const lazy = true;\n',
  });

  const inspection = censusFixture(root, { failOnErrors: false });
  assert.equal(byFile(inspection, 'frontend/src/lib/computed.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(inspection, 'frontend/src/lib/computed.test.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(inspection, 'frontend/src/lib/computed.test.ts').deletionDecision, 'blocked');
  assert.ok(inspection.issues.some(({ code }) => code === 'UNPARSEABLE_DYNAMIC_IMPORT'));
  assert.throws(
    () => censusFixture(root),
    /\[UNPARSEABLE_DYNAMIC_IMPORT\].*frontend\/src\/lib\/computed\.ts:2/,
  );
});

test('local import suffixes and dynamic import options cannot be silently simplified', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/lib/suffix.ts': "export const load = () => import('./lazy?raw');\n",
    'frontend/src/lib/options.ts': "export const load = () => import('./data.json', { with: { type: 'json' } });\n",
    'frontend/src/lib/lazy.ts': 'export const lazy = true;\n',
    'frontend/src/lib/data.json': '{}\n',
  });
  const inspection = censusFixture(root, { failOnErrors: false });
  assert.ok(inspection.issues.some(({ code }) => code === 'UNSUPPORTED_LOCAL_IMPORT_SUFFIX'));
  assert.ok(inspection.issues.some(({ code }) => code === 'UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS'));
  assert.equal(byFile(inspection, 'frontend/src/lib/suffix.ts').deletionClass, 'ambiguous');
  assert.equal(byFile(inspection, 'frontend/src/lib/options.ts').deletionClass, 'ambiguous');
  assert.throws(
    () => censusFixture(root),
    /\[(?:UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS|UNSUPPORTED_LOCAL_IMPORT_SUFFIX)\]/,
  );
});

test('comment, string, and regular-expression import decoys do not create graph edges', () => {
  const root = createFixture({
    'frontend/src/app/page.tsx': 'export default function Page() { return null; }\n',
    'frontend/src/lib/decoys.ts': [
      "const text = \"import('./missing-string')\";",
      "const expression = /import\\(['\"]\\.\\/missing-regex/;",
      "// import './missing-comment';",
      'export { text, expression };',
    ].join('\n'),
  });
  const census = censusFixture(root);
  const decoys = byFile(census, 'frontend/src/lib/decoys.ts');
  assert.equal(decoys.dependencies.length, 0);
  assert.equal(decoys.deletionClass, 'safe-candidate');
});

test('config redirects separate Next build reachability from effective product reachability', () => {
  const root = createFixture({
    'frontend/src/app/shadowed/page.tsx': "import ShadowOnly from './ShadowOnly';\nexport default ShadowOnly;\n",
    'frontend/src/app/shadowed/ShadowOnly.tsx': 'export default function ShadowOnly() { return null; }\n',
    'frontend/src/app/live/page.tsx': "import Live from './Live';\nexport default Live;\n",
    'frontend/src/app/live/Live.tsx': 'export default function Live() { return null; }\n',
    'config/ui-route-capabilities.json': JSON.stringify({
      routes: [
        {
          route: '/shadowed',
          source: 'frontend/src/app/shadowed/page.tsx',
          routing: { kind: 'config-redirect', target: '/live' },
        },
        {
          route: '/live',
          source: 'frontend/src/app/live/page.tsx',
          routing: { kind: 'page' },
        },
      ],
    }),
  });
  const census = censusFixture(root, {
    routeManifestPath: join(root, 'config', 'ui-route-capabilities.json'),
  });
  const shadowedPage = byFile(census, 'frontend/src/app/shadowed/page.tsx');
  assert.equal(shadowedPage.routing.buildEntry, true);
  assert.equal(shadowedPage.routing.effectiveProductEntry, false);
  assert.equal(shadowedPage.routing.shadowedBy.kind, 'config-redirect');
  const shadowOnly = byFile(census, 'frontend/src/app/shadowed/ShadowOnly.tsx');
  assert.equal(shadowOnly.reachability.runtime, true);
  assert.equal(shadowOnly.reachability.effectiveProduct, false);
  assert.equal(shadowOnly.deletionClass, 'runtime-reachable');
  assert.equal(byFile(census, 'frontend/src/app/live/Live.tsx').reachability.effectiveProduct, true);
});

test('known live-chain misclassification is a reproducible red in a temp fixture', () => {
  const root = createFixture({
    'frontend/src/app/note/page.tsx': "import { UserPicker } from '../components/ui/user-picker';\nexport default UserPicker;\n",
    'frontend/src/app/components/ui/user-picker.tsx': "import { VirtualScrollList } from './virtual-scroll-list';\nexport const UserPicker = VirtualScrollList;\n",
    'frontend/src/app/components/ui/virtual-scroll-list.tsx': 'export const VirtualScrollList = () => null;\n',
  });
  const census = censusFixture(root);
  const assertions = {
    runtimeChains: [[
      'frontend/src/app/note/page.tsx',
      'frontend/src/app/components/ui/user-picker.tsx',
      'frontend/src/app/components/ui/virtual-scroll-list.tsx',
    ]],
  };
  assert.deepEqual(validateReachabilityAssertions(census, assertions), []);

  const faulty = structuredClone(census);
  byFile(faulty, 'frontend/src/app/components/ui/virtual-scroll-list.tsx').deletionClass = 'safe-candidate';
  assert.match(
    validateReachabilityAssertions(faulty, assertions).join('\n'),
    /runtime chain terminal misclassified/,
  );
});

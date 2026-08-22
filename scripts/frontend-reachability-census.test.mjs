import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildFrontendReachabilityCensus,
  CURRENT_REPOSITORY_ASSERTIONS,
  validateReachabilityAssertions,
} from './frontend-reachability-census.mjs';

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

  const virtualList = byFile(census, 'frontend/src/app/components/ui/virtual-scroll-list.tsx');
  assert.equal(virtualList.deletionClass, 'runtime-reachable');
  assert.deepEqual(
    virtualList.evidencePaths.runtime.nodes,
    [
      'frontend/src/app/note/page.tsx',
      'frontend/src/app/components/ui/user-picker.tsx',
      'frontend/src/app/components/ui/virtual-scroll-list.tsx',
    ],
  );

  const unusedClient = byFile(census, 'frontend/src/app/admin/user/manage/UserManageClient.tsx');
  assert.equal(unusedClient.reachability.productionCompile, false);
  assert.equal(unusedClient.reachability.test, true);
  assert.equal(unusedClient.deletionClass, 'test-only');
  assert.equal(unusedClient.deletionDecision, 'review-required');
  assert.equal(
    unusedClient.evidencePaths.test.nodes[0],
    'frontend/src/app/admin/user/manage/__tests__/UserManageClient.test.tsx',
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

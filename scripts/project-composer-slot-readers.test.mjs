import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import {
  deriveSlotContributionReaders, frontendFileOwners, slotConsumerKindProblems, staleSlotValueSelectors,
} from './project-composer-slot-readers.mjs';
import { SLOT_CONSUMER_KINDS, SLOT_REGISTRY_CONSUMERS } from './slot-registry.mjs';

/*
 * 슬롯 기여를 값으로 읽는 다른 기능 계산(GAP-COMPOSE-001, DEC-OPS-353). 합성 트리로 판정 규칙을, 실제 저장소로 결과를 고정한다.
 * 소비자의 종류(shell·value)와 값 소비자가 읽는 기여는 SLOT_CONSUMER_KINDS 에 선언하고, 여기서는 그 선언을 소스와 대조하는 규칙을 본다.
 * 분류 대조(registrationOnly 금지·덮는 연동 요구)는 project-composer-catalog.test.mjs 가 본다.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rules = [
  { path: 'src/app/alpha', domains: ['alpha'] },
  { path: 'src/app/beta', domains: ['beta'] },
  { path: 'src/app/beta/shell', domains: ['gamma'] },
  { path: 'src/extensions/alpha', domains: ['alpha'] },
  { path: 'src/extensions/delta', domains: ['delta'] },
];
const FLAGS = 'frontend/src/extensions/alpha/flags.ts';
const contributions = [{ path: FLAGS, owner: 'alpha', slot: 'flags' }];
const LIB = 'frontend/src/lib/flags.ts';
const valueAt = (file, exports = ['has'], reads = [{ all: true }]) => ({
  consumers: { flags: [file] }, kinds: { flags: { [file]: { kind: 'value', exports, reads } } },
});
const helper = "import { flags } from '@/extensions/generated-flags';\nexport const has = () => flags.length > 0;\nexport const count = () => flags.length;\n";
const screen = "import { has } from '@/lib/flags';\nexport default function Screen() { return has() ? <b /> : null; }\n";

function tree(t, files) {
  const root = mkdtempSync(join(resolve(tmpdir()), 'egov-slot-readers-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, 'frontend', path)), { recursive: true });
    writeFileSync(join(root, 'frontend', path), text);
  }
  return root;
}
const registry = { 'src/extensions/generated-flags.ts': "import alpha from './alpha/flags';\nexport const flags = [alpha];\n", 'src/extensions/alpha/flags.ts': "export default [{ id: 'one', placement: 'top' }];\n" };
const derive = (root, declaration = valueAt(LIB), rows = contributions) => deriveSlotContributionReaders({ root, rules, contributions: rows, ...declaration });
const betaReads = (consumer = LIB, file = 'src/app/beta/Screen.tsx') => [{ feature: 'beta', consumers: [consumer], files: [file] }];

test('the longest ownership path decides a frontend file, and an unowned file is core', () => {
  assert.deepEqual(frontendFileOwners('src/app/beta/page.tsx', rules), ['beta']);
  assert.deepEqual(frontendFileOwners('src/app/beta/shell/x.ts', rules), ['gamma']);
  assert.deepEqual(frontendFileOwners('src/lib/x.ts', rules), []);
});

test('a feature screen that uses a declared value export, even through core files, reads the contribution', t => {
  const root = tree(t, { ...registry, 'src/lib/flags.ts': helper,
    'src/lib/flags-facade.ts': "import { has } from './flags';\nexport const shown = () => has();\n",
    'src/app/beta/Screen.tsx': "import { shown } from '@/lib/flags-facade';\nexport default function Screen() { return shown() ? <b /> : null; }\n" });
  assert.deepEqual(derive(root).get(FLAGS), betaReads());
});

test('the consumer kind is declared, not guessed from the extension: a tsx value consumer reads and a ts shell does not', t => {
  const hook = 'frontend/src/components/flag-hooks.tsx';
  const root = tree(t, { ...registry,
    'src/components/flag-hooks.tsx': "import { flags } from '@/extensions/generated-flags';\nexport function useFlags() { return flags; }\n",
    'src/app/beta/Screen.tsx': "import { useFlags } from '@/components/flag-hooks';\nexport default function Screen() { return useFlags().length ? <b /> : null; }\n" });
  assert.deepEqual(derive(root, valueAt(hook, ['useFlags'])).get(FLAGS), betaReads(hook));
  assert.deepEqual(derive(root, { consumers: { flags: [hook] }, kinds: { flags: { [hook]: { kind: 'shell' } } } }).get(FLAGS), []);
  const root2 = tree(t, { ...registry, 'src/lib/flags.ts': helper, 'src/app/beta/Screen.tsx': screen });
  assert.deepEqual(derive(root2, { consumers: { flags: [LIB] }, kinds: { flags: { [LIB]: { kind: 'shell' } } } }).get(FLAGS), []);
});

test('only importers that use a declared export are readers, and type-only references carry no value', t => {
  const root = tree(t, { ...registry, 'src/lib/flags.ts': helper,
    'src/app/beta/Counter.tsx': "import { count } from '@/lib/flags';\nexport default function Counter() { return <i>{count()}</i>; }\n",
    'src/app/beta/Typed.tsx': "import type { has } from '@/lib/flags';\nexport type Has = typeof has;\n" });
  assert.deepEqual(derive(root).get(FLAGS), []);
  assert.deepEqual(derive(root, valueAt(LIB, ['count'])).get(FLAGS), betaReads(LIB, 'src/app/beta/Counter.tsx'));
});

test('a type-only import of a core file in between does not carry the value on', t => {
  const root = tree(t, { ...registry, 'src/lib/flags.ts': helper,
    'src/lib/flags-types.ts': "import { has } from './flags';\nexport type Shown = ReturnType<typeof has>;\nexport const shown = () => has();\n",
    'src/app/alpha/Own.tsx': "import { shown } from '@/lib/flags-types';\nexport default function Own() { return shown() ? <b /> : null; }\n",
    'src/app/beta/TypedScreen.tsx': "import type { Shown } from '@/lib/flags-types';\nexport type S = Shown;\n" });
  assert.deepEqual(derive(root).get(FLAGS), []);
});

test('the contributing feature and the feature that owns the value consumer are not readers of their own slot', t => {
  const host = 'frontend/src/app/beta/flags.ts';
  const root = tree(t, { ...registry, 'src/app/beta/flags.ts': helper,
    'src/app/beta/Screen.tsx': "import { has } from './flags';\nexport default function Screen() { return has() ? <b /> : null; }\n",
    'src/app/alpha/Own.tsx': "import { has } from '@/app/beta/flags';\nexport default function Own() { return has() ? <b /> : null; }\n" });
  assert.deepEqual(derive(root, valueAt(host)).get(FLAGS), []);
});

test('a core file that nothing imports is a core reader', t => {
  const root = tree(t, { ...registry, 'src/lib/flags.ts': helper,
    'src/app/layout.tsx': "import { has } from '@/lib/flags';\nexport default function Layout() { return has() ? <b /> : null; }\n" });
  assert.deepEqual(derive(root).get(FLAGS), [{ feature: 'core', consumers: [LIB], files: ['src/app/layout.tsx'] }]);
});

test('test files and comments or strings that mention a module are not reads', t => {
  const root = tree(t, { ...registry, 'src/lib/flags.ts': helper,
    'src/app/beta/__tests__/Screen.test.tsx': "import { has } from '@/lib/flags';\nexport const x = has;\n",
    'src/app/beta/Quiet.tsx': "// import { has } from '@/lib/flags';\nexport const text = \"import { has } from '@/lib/flags'\";\n" });
  assert.deepEqual(derive(root).get(FLAGS), []);
});

test('readers attach only to the contributions the value consumer declares it reads', t => {
  const DELTA = 'frontend/src/extensions/delta/flags.ts';
  const rows = [...contributions, { path: DELTA, owner: 'delta', slot: 'flags' }];
  const root = tree(t, { ...registry,
    'src/extensions/generated-flags.ts': "import alpha from './alpha/flags';\nimport delta from './delta/flags';\nexport const flags = [alpha, delta];\n",
    'src/extensions/delta/flags.ts': "export default [{ id: 'two', placement: 'side' }];\n",
    'src/lib/flags.ts': helper, 'src/app/beta/Screen.tsx': screen });
  for (const [selector, alpha, delta] of [[{ placement: 'top' }, betaReads(), []], [{ id: 'two' }, [], betaReads()], [{ feature: 'delta' }, [], betaReads()],
    [{ feature: 'alpha', id: 'two' }, [], []], [{ all: true }, betaReads(), betaReads()]]) {
    const found = derive(root, valueAt(LIB, ['has'], [selector]), rows);
    assert.deepEqual([found.get(FLAGS), found.get(DELTA)], [alpha, delta], JSON.stringify(selector));
  }
  assert.deepEqual(staleSlotValueSelectors({ root, contributions: rows, kinds: valueAt(LIB, ['has'], [{ placement: 'none' }]).kinds }),
    ['value slot consumer selector matches no contribution: frontend/src/lib/flags.ts (flags) {"placement":"none"}']);
});

test('a registry importer that is not declared, or a declared consumer that does not import the registry, fails', t => {
  const root = tree(t, { ...registry, 'src/lib/flags.ts': helper,
    'src/app/beta/Peek.tsx': "import { flags } from '@/extensions/generated-flags';\nexport default function Peek() { return flags.length ? <b /> : null; }\n" });
  assert.throws(() => derive(root), /slot registry is imported by an undeclared consumer: frontend\/src\/app\/beta\/Peek\.tsx \(flags\)/);
  const quiet = tree(t, { ...registry, 'src/lib/flags.ts': 'export const has = () => true;\n' });
  assert.throws(() => derive(quiet), /declared slot consumer does not import its registry: frontend\/src\/lib\/flags\.ts \(flags\)/);
});

test('the kind table covers exactly the consumer table and each value consumer names its exports and selectors', () => {
  const consumers = { flags: [LIB] };
  const check = kinds => slotConsumerKindProblems({ consumers, kinds });
  assert.deepEqual(check({ flags: { [LIB]: { kind: 'shell' } } }), []);
  assert.deepEqual(check({}), [`slot consumer has no declared kind: ${LIB} (flags)`]);
  assert.deepEqual(check({ flags: { [LIB]: { kind: 'shell' }, 'frontend/src/x.ts': { kind: 'shell' } } }),
    ['slot consumer kind names a file that is not a consumer: frontend/src/x.ts (flags)']);
  assert.deepEqual(check({ flags: { [LIB]: { kind: 'render' } } }), [`slot consumer kind must be shell or value: ${LIB} (flags)`]);
  assert.deepEqual(check({ flags: { [LIB]: { kind: 'value', exports: [], reads: [{ all: true }] } } }),
    [`value slot consumer must name the exports it hands out: ${LIB} (flags)`]);
  assert.deepEqual(check({ flags: { [LIB]: { kind: 'value', exports: ['has'], reads: [] } } }),
    [`value slot consumer must declare the contributions it reads: ${LIB} (flags)`]);
  for (const selector of [{}, { all: true, id: 'x' }, { all: false }, { label: 'x' }, { id: '' }]) {
    assert.deepEqual(check({ flags: { [LIB]: { kind: 'value', exports: ['has'], reads: [selector] } } }),
      [`value slot consumer has an invalid selector: ${LIB} (flags) ${JSON.stringify(selector)}`]);
  }
  assert.throws(() => deriveSlotContributionReaders({ root: ROOT, rules, contributions, consumers, kinds: {} }), /slot consumer has no declared kind/);
});

test('a slot that cannot be judged in this tree is unknown on its own; the other slots are still judged', t => {
  const NOTES = 'frontend/src/extensions/alpha/notes.ts';
  const root = tree(t, { ...registry, 'src/lib/flags.ts': helper, 'src/app/beta/Screen.tsx': screen,
    'src/extensions/generated-notes.ts': "import alpha from './alpha/notes';\nexport const notes = [alpha];\n", 'src/extensions/alpha/notes.ts': 'export default [];\n' });
  const declaration = { consumers: { flags: [LIB], notes: ['frontend/src/lib/notes.ts'] },
    kinds: { ...valueAt(LIB).kinds, notes: { 'frontend/src/lib/notes.ts': { kind: 'value', exports: ['note'], reads: [{ all: true }] } } } };
  const found = derive(root, declaration, [...contributions, { path: NOTES, owner: 'alpha', slot: 'notes' }]);
  assert.equal(found.get(NOTES), null);
  assert.deepEqual(found.get(FLAGS), betaReads());
  // 레지스트리가 없는 슬롯도 그 슬롯만 판정할 수 없다. 프런트 소스가 아예 없으면 계산 자체가 없다.
  assert.equal(derive(tree(t, { 'src/extensions/alpha/flags.ts': 'export default [];\n' })).get(FLAGS), null);
  assert.equal(derive(tree(t, {})), null);
});

test('in this repository three contributions are read as values by another feature screen, through the declared value consumers', () => {
  assert.deepEqual(slotConsumerKindProblems({ consumers: SLOT_REGISTRY_CONSUMERS, kinds: SLOT_CONSUMER_KINDS }), []);
  const catalog = loadProjectComposerCatalog(ROOT);
  const rows = catalogContributions(catalog);
  assert.deepEqual(staleSlotValueSelectors({ root: ROOT, contributions: rows }), []);
  const found = deriveSlotContributionReaders({ root: ROOT, rules: catalog.frontendRules, contributions: rows });
  assert.ok([...found.values()].every(list => Array.isArray(list)), 'every slot is judged in the source tree');
  const readers = Object.fromEntries([...found].filter(([, list]) => list.length)
    .map(([path, list]) => [path, list.map(row => `${row.feature} <- ${row.consumers.join(', ')}`)]));
  assert.deepEqual(readers, {
    'frontend/src/extensions/addressbook/recipient-picker-sources.ts': [
      'mail <- frontend/src/app/components/ui/recipient-picker-sources.ts', 'sms <- frontend/src/app/components/ui/recipient-picker-sources.ts'],
    'frontend/src/extensions/memoreport/shell-links.ts': ['report <- frontend/src/components/business/work-hub/work-hub-tabs.tsx'],
    'frontend/src/extensions/notification/delivery-channels.ts': [
      'informalsanction <- frontend/src/lib/delivery-channels.ts', 'memoreport <- frontend/src/lib/delivery-channels.ts'],
  });
});

// 저장소의 슬롯 기여 목록은 레지스트리 이름(슬롯)과 기능 디렉터리에서 얻는다 — 카탈로그와 같은 규칙이다.
function catalogContributions(catalog) {
  const slots = readdirSync(join(ROOT, 'frontend/src/extensions')).filter(name => name.startsWith('generated-'))
    .map(name => name.slice('generated-'.length, -'.ts'.length));
  return catalog.capabilities.flatMap(({ id: owner }) => slots
    .filter(slot => existsSync(join(ROOT, 'frontend/src/extensions', owner, `${slot}.ts`)))
    .map(slot => ({ path: `frontend/src/extensions/${owner}/${slot}.ts`, owner, slot })));
}

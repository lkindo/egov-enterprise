import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
const read = path => readFileSync(new URL(`../frontend/src/${path}`, import.meta.url), 'utf8');
const contractSource = read('lib/navigation/search-url-state.ts');

function load(source, imports = {}) {
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  assert.deepEqual(result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  runInNewContext(result.outputText, { module, exports: module.exports, require: name => {
    if (!Object.hasOwn(imports, name)) throw new Error(`Undeclared source dependency: ${name}`);
    return imports[name];
  } });
  return module.exports;
}

const contract = load(contractSource);
const slotSource = read('app/search/SearchResultsSlot.tsx');
const plain = value => JSON.parse(JSON.stringify(value));

async function slotBoundaryErrors(source) {
  const jsx = (_type, props) => props;
  const slot = load(source, {
    '@/lib/navigation/search-url-state': contract,
    './SearchClient': { SearchResultsContent: () => undefined },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  }).default;
  const errors = [];
  for (const input of [{ q: ['first', 'second'] }, { q: 'x'.repeat(201) }]) {
    const rendered = await slot({ searchParams: Promise.resolve(input) });
    if (rendered.query !== '' || !rendered.queryError) errors.push('invalid query reached search API-driving content');
  }
  const rendered = await slot({ searchParams: Promise.resolve({ q: '한글 + %', unknown: 'discard' }) });
  if (rendered.query !== '한글 + %' || rendered.queryError !== undefined) errors.push('valid bookmark query changed');
  return errors;
}

test('the /search typed contract preserves encoded bookmarks and excludes undeclared state', () => {
  assert.deepEqual(plain(contract.SEARCH_URL_STATE), { route: '/search', key: 'q', maxLength: 200, duplicatePolicy: 'reject', unknownKeyPolicy: 'discard' });
  for (const q of ['', '한글 검색', ' + & ? # 100% ', '%2F', '📋', 'x'.repeat(200)]) {
    assert.deepEqual(plain(contract.parseSearchUrlState({ q, token: 'synthetic' })), { ok: true, state: { q } });
    assert.equal(contract.serializeSearchQuery({ q }), encodeURIComponent(q));
  }
  for (const q of [['one', 'two'], ['one'], 5, 'x'.repeat(201), '\uD800']) {
    assert.equal(contract.parseSearchUrlState({ q }).ok, false);
  }
  assert.throws(() => contract.serializeSearchQuery({ q: 'one', next: '/other' }), /undeclared-search-url-key/);
});

test('the actual asynchronous server slot executes parsing before forwarding a query', async () => {
  assert.deepEqual(await slotBoundaryErrors(slotSource), []);
  const bypassed = slotSource.replace('parseSearchUrlState({ q })', '({ ok: true, state: { q } })');
  assert.notEqual(bypassed, slotSource, 'negative fixture must alter the actual binding');
  assert.match((await slotBoundaryErrors(bypassed)).join('\n'), /invalid query reached/);
});

test('native GET and command serialization keep observable approved route/key bindings', () => {
  const client = read('app/search/SearchClient.tsx');
  const command = read('app/components/ui/global-command-center.tsx');
  assert.match(client, /<form action="\/search" method="get"/);
  assert.match(client, /name="q"\s+maxLength=\{SEARCH_URL_STATE.maxLength\}/);
  assert.match(command, /url:\s*`\/search\?q=\$\{serializeSearchQuery\(\{ q: search \}\)\}`/);
  assert.match(command, /maxLength=\{SEARCH_URL_STATE.maxLength\}/);
  assert.match(command, /import \{[^}]*serializeSearchQuery[^}]*\} from '@\/lib\/navigation\/search-url-state'/);
  const approval = JSON.parse(readFileSync(new URL('../config/ui-url-state-approval.json', import.meta.url), 'utf8'));
  const census = JSON.parse(readFileSync(new URL('../config/ui-url-state-census.json', import.meta.url), 'utf8'));
  const search = approval.classes.find(row => row.classId === 'search-input');
  assert.deepEqual(search.selector.recordIds, [
    'URL-204665E3AB9C4A', 'URL-3E36A25946033C', 'URL-A13AC14823B70F', 'URL-E28F88902ADC75', 'URL-E910532B42785F',
  ]);
  assert.deepEqual(search.selector.stateItemNames, ['q', 'searchCnd', 'searchWrd']);
  assert.equal(search.reviewState, 'approved');
  assert.equal(search.privacyReview, 'accepted-risk');
  assert.equal(search.authorizationReview, 'not-applicable');
  assert.equal(census.records.filter(row => search.selector.recordIds.includes(row.id)).length, 5);
});

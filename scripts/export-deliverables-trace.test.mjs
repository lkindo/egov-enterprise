import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  e2eCandidates, gotoPaths, inputFieldSheet, javaTests, parseCsv, readRequirementFile, readRequirements, requirementSheet, routeMatches,
  routeOwnerResolver, scriptTests, traceSheet,
} from './export-deliverables-trace.mjs';

/* 산출물 추적 표(DEC-OPS-382)의 고정 입력 시험 — 실제 저장소의 원장·시험 파일을 읽지 않는다. */

test('route ownership is a path prefix unless the route is declared exact', () => {
  const ownersOf = routeOwnerResolver({
    'board.json': { id: 'board', owns: { routes: ['/admin/community/boards', '/admin/help'], exactRoutes: ['/admin/help'] } },
    'faq.json': { id: 'faq', owns: { routes: ['/admin/help/faq'] } },
  });
  assert.deepEqual(ownersOf('/admin/community/boards/detail'), ['board']);
  assert.deepEqual(ownersOf('/admin/help'), ['board']);
  assert.deepEqual(ownersOf('/admin/help/faq'), ['faq']);
  assert.deepEqual(ownersOf('/admin/community/boardsX'), []);
});

test('goto literals drop the query and keep template segments as wildcards', () => {
  const text = "await page.goto('/admin/users?x=1');\nawait page.goto(`/survey/${survey.id}`);\nawait other.goto('relative');";
  const paths = gotoPaths(text);
  assert.equal(paths.length, 2);
  assert.equal(paths[0], '/admin/users');
  assert.ok(routeMatches('/survey/[id]', paths[1]));
  assert.ok(routeMatches('/survey/results', paths[1]));
  assert.ok(!routeMatches('/admin/users/[id]', '/admin/users'));
  assert.ok(routeMatches('/admin/users/[id]', '/admin/users/42'));
});

test('e2e candidates join goto files and the PR selection rules for the screen source', () => {
  const candidates = e2eCandidates('/admin/patterns', 'frontend/src/app/admin/patterns/page.tsx', {
    gotoIndex: new Map([['frontend/e2e/pages/Patterns.ts', ['/admin/patterns']], ['frontend/e2e/journeys/other.spec.ts', ['/admin/other']]]),
    impactRules: [{ prefixes: ['frontend/src/app/admin/patterns/'], specs: ['quality/route-accessibility.spec.ts'] }],
  });
  assert.deepEqual(candidates, ['frontend/e2e/pages/Patterns.ts', 'frontend/e2e/quality/route-accessibility.spec.ts']);
});

const TRACE_INPUTS = {
  moduleFiles: { 'thing.json': { id: 'thing', owns: { routes: ['/things'] } } },
  routes: { routes: [
    { route: '/things', source: 'frontend/src/app/things/page.tsx', status: 'live', routing: { kind: 'page' },
      capabilities: [{ id: 'thing.list', status: 'live', evidenceLevel: 'E3', evidence: ['frontend/src/app/things/page.tsx'] }] },
    { route: '/things/new', source: 'frontend/src/app/things/new/page.tsx', status: 'unverified', routing: { kind: 'page' } },
    { route: '/old', source: 'frontend/src/app/old/page.tsx', routing: { kind: 'page-redirect' } },
  ] },
  registry: { screens: [
    { route: '/things', permissions: [{ code: 'THING_READ', source: 'entry' }] },
    { route: '/things/new', permissions: [{ code: 'THING_CREATE', source: 'write' }] },
  ] },
  policies: { operationBindings: [
    { method: 'POST', path: '/api/things', permission: 'THING_CREATE' },
    { method: 'GET', path: '/api/things', permission: 'THING_CREATE' },
    { method: 'DELETE', path: '/api/things/{id}', permission: 'THING_DELETE' },
  ] },
  e2e: { gotoIndex: new Map(), impactRules: [] },
};

test('the trace view links what it can and leaves unlinked cells empty', () => {
  const sheet = traceSheet({ ...TRACE_INPUTS, requirements: [{ id: 'REQ-1', target: '/things' }, { id: 'REQ-2', target: '/things#thing.list' }] });
  assert.deepEqual(sheet.rows.map((row) => [row.route, row.capability]), [['/things', '/things#thing.list'], ['/things/new', null]]);
  const [list, create] = sheet.rows;
  assert.deepEqual(list.feature, ['thing']);
  assert.deepEqual(list.requirements, ['REQ-1', 'REQ-2']);
  assert.deepEqual(list.operations, []);
  assert.deepEqual(create.operations, ['POST /api/things']);
  assert.equal(create.evidenceLevel, null);
  assert.deepEqual(create.e2e, []);
  assert.match(sheet.notices.join('\n'), /그 시험이 그 역량을 단언한다는 뜻이 아니다/u);
});

test('csv parsing keeps quoted commas, quotes and line breaks and refuses an open quote', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n"multi\nline",z\n\n'), [['a', 'b'], ['x, y', 'say "hi"'], ['multi\nline', 'z']]);
  assert.throws(() => parseCsv('a\n"open'), /unterminated/u);
});

test('requirements need the id and target columns and unmatched targets stay visible', () => {
  assert.throws(() => readRequirements('ID,target\nREQ-1,/x'), /'요구사항 ID' and '대상 ID'/u);
  const requirements = readRequirements('요구사항 ID,대상 ID,요구사항 이름\nREQ-1,/things,목록\nREQ-2,/nowhere,\nREQ-3,POST /api/things,등록');
  const sheet = requirementSheet(requirements, { screens: new Set(['/things']), capabilities: new Set(), interfaces: new Set(['POST /api/things']) });
  assert.deepEqual(sheet.rows.map((row) => [row.id, row.kind, row.found]), [['REQ-1', '화면', true], ['REQ-2', null, false], ['REQ-3', '인터페이스', true]]);
  assert.match(sheet.notices.join('\n'), /충족 판정이 아니다/u);
});

test('a requirement trace CSV tracked by the repository is refused', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliverables-rtm-'));
  try {
    const file = join(root, 'rtm.csv');
    writeFileSync(file, '요구사항 ID,대상 ID\n');
    assert.throws(() => readRequirementFile(root, file, { tracked: () => true }), /must not be a tracked repository file: rtm\.csv/u);
    assert.equal(readRequirementFile(root, file, { tracked: () => false }), '요구사항 ID,대상 ID\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('input field candidates resolve references and inheritance and skip reads', () => {
  const sheet = inputFieldSheet({
    policies: { operationBindings: [{ method: 'POST', path: '/api/things' }, { method: 'GET', path: '/api/things' }] },
    openapi: {
      paths: { '/api/things': {
        post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ThingRequest' } } } } },
        get: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ThingRequest' } } } } },
      } },
      components: { schemas: {
        Base: { type: 'object', properties: { version: { type: 'integer', format: 'int64' } }, required: ['version'] },
        ThingRequest: { allOf: [{ $ref: '#/components/schemas/Base' }, { type: 'object', required: ['name'],
          properties: { name: { type: 'string', maxLength: 100, description: '이름' }, tags: { type: 'array', items: { type: 'string' } },
            kind: { type: 'string', enum: ['A', 'B'] }, owner: { $ref: '#/components/schemas/Base' } } }] },
      } },
    },
  });
  const field = new Map(sheet.rows.map((row) => [row.field, row]));
  assert.deepEqual([...field.keys()].sort(), ['kind', 'name', 'owner', 'tags', 'version']);
  assert.ok(sheet.rows.every((row) => row.id === 'POST /api/things' && row.schema === 'ThingRequest'));
  assert.equal(field.get('version').required, true);
  assert.equal(field.get('version').type, 'integer:int64');
  assert.equal(field.get('name').maxLength, 100);
  assert.equal(field.get('tags').type, 'array(string)');
  assert.deepEqual(field.get('kind').allowed, ['A', 'B']);
  assert.equal(field.get('owner').type, 'object(Base)');
});

test('java tests are the methods after a test annotation, with their display name', () => {
  const rows = javaTests('x/ThingTest.java', [
    'class ThingTest {',
    '  @Autowired',
    '  private Thing thing;',
    '',
    '  @Test',
    '  @DisplayName("이름이 있으면 저장한다")',
    '  void savesWhenNamed() {',
    '    assertThat(thing.save()).isTrue();',
    '  }',
    '',
    '  @ParameterizedTest',
    '  @CsvSource({',
    '      "a, 1",',
    '      "b, 2"',
    '  })',
    '  void parses(String value, int number) {}',
    '',
    '  @BeforeEach',
    '  void setUp() {}',
    '',
    '  @Nested',
    '  class WhenEmpty {',
    '    @Test void rejects() {}',
    '  }',
    '}',
  ].join('\n'));
  assert.deepEqual(rows.map((row) => [row.suite, row.name, row.display]), [
    ['ThingTest', 'savesWhenNamed', '이름이 있으면 저장한다'], ['ThingTest', 'parses', null], ['WhenEmpty', 'rejects', null]]);
  assert.deepEqual(rows.map((row) => row.line), [7, 16, 23]);
});

test('script tests take the nearest enclosing describe as their suite', () => {
  const rows = scriptTests('a.test.ts', [
    "describe('목록', () => {",
    "  it('빈 목록을 말한다', () => {});",
    "  it.each([1, 2])('값 %s', () => {});",
    "});",
    "test('밖의 시험', () => {});",
  ].join('\n'), '프런트 단위');
  assert.deepEqual(rows.map((row) => [row.suite, row.name, row.line]), [['목록', '빈 목록을 말한다', 2], ['목록', '값 %s', 3], [null, '밖의 시험', 5]]);
});

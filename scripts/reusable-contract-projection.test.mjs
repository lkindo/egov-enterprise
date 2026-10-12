import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { apiDocsText, handlerSourceFile, projectApiDocs, projectSourceApiDocs } from './reusable-contract-projection.mjs';

const root = resolve(import.meta.dirname, '..');
const sourceText = readFileSync(join(root, 'api-docs.json'), 'utf8').replace(/\r\n/g, '\n');
const HTTP = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const operationsOf = doc => Object.entries(doc.paths).flatMap(([path, item]) => HTTP.filter(method => item[method])
  .map(method => ({ method: method.toUpperCase(), path, operationId: item[method].operationId, tags: item[method].tags ?? [] })));

/*
 * 생성물 api-docs 정적 투영(Phase 2 10c-2). 모든 기능을 고른 구성(아무 핸들러도 지우지 않는다)은 원본과 바이트가 같아야 한다 —
 * 원본에 남는 연산에서 닿지 않는 스키마나 쓰이지 않는 태그가 있거나, 폐포가 참조를 놓치면 여기서 붉다(원본 parity).
 */
test('projecting the source api-docs with nothing removed reproduces it byte for byte', () => {
  const projection = projectSourceApiDocs(root, () => false);
  assert.equal(apiDocsText(projection.doc), sourceText, 'the full composition must keep api-docs.json unchanged');
  assert.deepEqual([projection.summary.removedOperations, projection.summary.removedSchemas, projection.summary.removedTags], [0, 0, 0]);
  assert.ok(projection.summary.operations > 400 && projection.summary.schemas > 400, `population ${JSON.stringify(projection.summary)}`);
});

test('removing one controller removes exactly its operations, their unreachable schemas and unused tags', () => {
  const controller = 'api-server/src/main/java/nuri/api/controller/business/addressbook/AddressBookApiController.java';
  const source = JSON.parse(sourceText);
  const policies = JSON.parse(readFileSync(join(root, 'config/governance/authorization-policies.json'), 'utf8'));
  const expected = policies.operationBindings.filter(binding => binding.handler.startsWith('nuri.api.controller.business.addressbook.AddressBookApiController#'))
    .map(binding => `${binding.method} ${binding.path}`).sort();
  assert.ok(expected.length >= 3, 'the address book controller has documented operations');
  const projection = projectSourceApiDocs(root, file => file === controller);
  assert.deepEqual(projection.removedOperations.map(op => `${op.method} ${op.path}`).sort(), expected);
  const kept = operationsOf(projection.doc);
  assert.equal(kept.length + expected.length, operationsOf(source).length);
  // 남는 문서는 닫혀 있다: 정의되지 않은 참조가 없고(아래 함수가 던진다), 지운 스키마는 남는 문서 어디에서도 참조되지 않는다.
  const text = JSON.stringify(projection.doc);
  for (const name of projection.removedSchemas) assert.ok(!text.includes(`"#/components/schemas/${name}"`), `${name} is still referenced`);
  assert.ok(projection.removedSchemas.length > 0, 'address book DTO schemas leave with the controller');
  // 공통 오류 봉투(OpenApiConfig 가 남는 연산 모두에 붙이는 응답)는 폐포로 남는다.
  assert.ok(Object.hasOwn(projection.doc.components.schemas, 'ApiResponseVoid'));
  const usedTags = new Set(kept.flatMap(op => op.tags));
  assert.deepEqual(projection.doc.tags.map(tag => tag.name).filter(name => !usedTags.has(name)), [], 'no unused tag remains');
  assert.deepEqual(projection.removedTags.filter(name => usedTags.has(name)), [], 'no used tag is removed');
});

// 합성 문서 — 규칙 하나씩.
const fixture = () => ({
  openapi: '3.1.0',
  tags: [{ name: 'A' }, { name: 'B' }],
  paths: {
    '/api/v1/a': { get: { tags: ['A'], operationId: 'getA', responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Outer' } } } } } } },
    '/api/v1/b': {
      get: { tags: ['B'], operationId: 'getB', responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Shared' } } } } } },
      post: { tags: ['B'], operationId: 'postB', responses: {} },
    },
  },
  components: {
    schemas: {
      Outer: { type: 'object', properties: { inner: { $ref: '#/components/schemas/Inner' }, shared: { $ref: '#/components/schemas/Shared' } } },
      Inner: { type: 'object', properties: { value: { type: 'string' } } },
      Shared: { type: 'object' },
    },
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
  },
});
const bindings = [
  { method: 'GET', path: '/api/v1/a', handler: 'nuri.api.controller.AController#getA' },
  { method: 'GET', path: '/api/v1/b', handler: 'nuri.api.controller.BController$Inner#getB' },
  { method: 'POST', path: '/api/v1/b', handler: 'nuri.api.controller.BController#postB' },
  { method: 'GET', path: '/actuator/health', handler: 'EXTERNAL#/actuator/health' },
];
const sources = new Set(['api-server/src/main/java/nuri/api/controller/AController.java', 'api-server/src/main/java/nuri/api/controller/BController.java']);
const project = (doc, { removed = () => false, list = bindings, exists = file => sources.has(file) } = {}) =>
  projectApiDocs(doc, { bindings: list, sourceExists: exists, removed });

test('a removed handler takes its operation, the emptied path, the schemas only it reached and its tag', () => {
  const doc = fixture();
  const result = project(doc, { removed: file => file.endsWith('/AController.java') });
  assert.deepEqual(Object.keys(result.doc.paths), ['/api/v1/b']);
  assert.deepEqual(Object.keys(result.doc.components.schemas), ['Shared'], 'Outer and the Inner it alone reached leave; Shared stays');
  assert.deepEqual(result.doc.tags, [{ name: 'B' }]);
  assert.deepEqual(result.removedOperations, [{ method: 'GET', path: '/api/v1/a', operationId: 'getA' }]);
  assert.deepEqual(result.summary, { operations: 2, paths: 1, schemas: 1, tags: 1, removedOperations: 1, removedSchemas: 2, removedTags: 1 });
  assert.ok(doc.paths['/api/v1/a'], 'the input document is not mutated');
  // 중첩 타입($)의 핸들러는 바깥 타입의 소스 파일로 판정한다. 같은 경로의 다른 메서드는 따로 남는다.
  const nested = project(fixture(), { removed: file => file.endsWith('/BController.java') });
  assert.deepEqual(Object.keys(nested.doc.paths), ['/api/v1/a']);
  assert.deepEqual(Object.keys(nested.doc.components.schemas), ['Outer', 'Inner', 'Shared'], 'Shared is still reached through Outer');
});

test('an operation the projection cannot judge fails instead of being kept or dropped silently', () => {
  assert.throws(() => project(fixture(), { list: bindings.filter(binding => binding.method !== 'POST') }),
    /api-docs operation has no authorization binding: POST \/api\/v1\/b/);
  assert.throws(() => project(fixture(), { list: bindings.map(binding => (binding.path === '/api/v1/a' ? { ...binding, handler: 'EXTERNAL#/api/v1/a' } : binding)) }),
    /bound to a handler outside the Java source: EXTERNAL#\/api\/v1\/a/);
  assert.throws(() => project(fixture(), { exists: file => file.endsWith('/BController.java') }),
    /binding handler has no source: nuri\.api\.controller\.AController#getA/);
  assert.throws(() => project(fixture(), { exists: file => sources.has(file) || file.endsWith('/BController.java') }),
    /binding handler source is ambiguous: nuri\.api\.controller\.BController\$Inner#getB/);
  assert.throws(() => project(fixture(), { list: [...bindings, bindings[0]] }), /authorization binding is declared twice: GET \/api\/v1\/a/);
});

test('references the closure cannot count fail closed', () => {
  const external = fixture();
  external.components.schemas.Inner.properties.value = { $ref: 'https://example.org/schema.json' };
  assert.throws(() => project(external), /unsupported api-docs reference: https:\/\/example\.org\/schema\.json/);
  const parameter = fixture();
  parameter.paths['/api/v1/a'].get.parameters = [{ $ref: '#/components/parameters/Page' }];
  assert.throws(() => project(parameter), /unsupported api-docs reference: #\/components\/parameters\/Page/);
  const mapping = fixture();
  mapping.components.schemas.Shared.discriminator = { propertyName: 'kind', mapping: { outer: '#/components/schemas/Outer' } };
  assert.throws(() => project(mapping), /discriminator mapping is not supported/);
  const dangling = fixture();
  delete dangling.components.schemas.Inner;
  assert.throws(() => project(dangling), /references a schema that is not defined: Inner/);
  const extra = fixture();
  extra.paths['/api/v1/a'].parameters = [];
  assert.throws(() => project(extra), /path item has fields the projection does not understand: \/api\/v1\/a parameters/);
});

test('handler source files resolve only to one Java main source root', () => {
  const exists = file => file === 'business-core/src/main/java/nuri/x/Y.java';
  assert.equal(handlerSourceFile('nuri.x.Y#m', exists), 'business-core/src/main/java/nuri/x/Y.java');
  assert.equal(handlerSourceFile('nuri.x.Y$Z#m', exists), 'business-core/src/main/java/nuri/x/Y.java');
  assert.throws(() => handlerSourceFile('not a type#m', exists), /binding handler is not a Java type/);
});

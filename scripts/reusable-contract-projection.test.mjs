import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ComposerError } from './project-composer-errors.mjs';
import { FRONTEND_TOOLCHAIN, GENERATED_CONTRACT_TYPES, apiDocsText, assertFrontendToolchain, handlerSourceFile, missingFrontendToolchain, projectApiDocs,
  projectSourceApiDocs, regenerateContractTypes } from './reusable-contract-projection.mjs';
import { generatedContractFiles, generatedContractText } from './verify-generated-contracts.mjs';

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

/*
 * springdoc 별칭(`_N`)의 기본 연산이 다른 기능에 있으면 그 기능이 빠진 구성에서 별칭만 남는다. 정적 투영은 id 를 그대로 두고(프런트가
 * 그 이름의 서술자를 부른다) 사실을 기록한다 — 생성물에서 springdoc 으로 다시 추출하면 접미사 없이 나온다(트랙 K 검토 #5).
 */
test('an alias whose base operation leaves with another feature is kept verbatim and recorded', () => {
  const survey = 'api-server/src/main/java/nuri/api/controller/foundation/controller/system/service/survey/SurveySubmissionApiController.java';
  const projection = projectSourceApiDocs(root, file => file === survey);
  assert.ok(projection.removedOperations.some(operation => operation.operationId === 'getStats'), 'the survey controller owns getStats');
  assert.deepEqual(projection.keptAliasesWithoutBase, ['getStats_1']);
  assert.ok(operationsOf(projection.doc).some(operation => operation.operationId === 'getStats_1'), 'the board alias keeps its id');
  assert.deepEqual(projectSourceApiDocs(root, () => false).keptAliasesWithoutBase, []);
  assert.ok(projection.removedPaths.includes('/api/v1/surveys/{srvySn}/stats'), 'an emptied path is reported');
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

/*
 * 생성 타입 3종은 원본 생성기와 원본 frontend 의 openapi-typescript 로 다시 만든다(U5-A). 모든 기능을 고른 구성의 api-docs 로
 * 다시 만들면 원본 커밋본과 같아야 한다 — 다르면 생성물의 타입이 원본과 다른 도구·설정으로 만들어진 것이다.
 */
const generatedText = (base, file) => readFileSync(join(base, file), 'utf8').replace(/\r\n/g, '\n');
const contractOutput = (t, docText) => {
  const output = mkdtempSync(join(tmpdir(), 'contract-types-'));
  t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
  mkdirSync(join(output, 'frontend/src/types'), { recursive: true });
  writeFileSync(join(output, 'api-docs.json'), docText);
  return output;
};

test('regenerating the three generated contract types from the full api-docs reproduces the committed files', { timeout: 120_000 }, t => {
  const output = contractOutput(t, apiDocsText(projectSourceApiDocs(root, () => false).doc));
  assert.deepEqual(regenerateContractTypes({ sourceRoot: root, output }), Object.values(GENERATED_CONTRACT_TYPES));
  // zod·operations 는 진입 파일과 태그 묶음 모듈이다 — 모듈 목록과 본문이 모두 커밋본과 같아야 한다.
  for (const key of Object.keys(GENERATED_CONTRACT_TYPES)) {
    const files = generatedContractFiles(root, key);
    assert.deepEqual(generatedContractFiles(output, key), files, `${key} must produce the committed module set`);
    for (const file of files) {
      assert.equal(generatedText(output, file), generatedText(root, file), `${file} must match the committed generator output`);
    }
  }
});

test('a reduced api-docs yields operation descriptors for exactly the operations it keeps', { timeout: 120_000 }, t => {
  const controller = 'api-server/src/main/java/nuri/api/controller/business/addressbook/AddressBookApiController.java';
  const projection = projectSourceApiDocs(root, file => file === controller);
  const output = contractOutput(t, apiDocsText(projection.doc));
  regenerateContractTypes({ sourceRoot: root, output });
  const descriptors = [...generatedContractText(output, 'operations').matchAll(/export const (\w+)Operation\b/gu)].map(match => match[1]).sort();
  assert.deepEqual(descriptors, operationsOf(projection.doc).map(operation => operation.operationId).sort());
  for (const { operationId } of projection.removedOperations) {
    assert.doesNotMatch(generatedText(output, GENERATED_CONTRACT_TYPES.api), new RegExp(`\\b${operationId}:`), `${operationId} left generated-api.d.ts`);
  }
});

test('without the source frontend tools the generator stops with the frontend tool code before running anything', () => {
  const bare = mkdtempSync(join(tmpdir(), 'contract-bare-'));
  try {
    assert.deepEqual(missingFrontendToolchain(bare), Object.values(FRONTEND_TOOLCHAIN));
    assert.deepEqual(missingFrontendToolchain(root), [], 'this checkout has the source frontend installed');
    let spawned = 0;
    const attempt = () => regenerateContractTypes({ sourceRoot: bare, output: bare, spawn: () => { spawned += 1; return { status: 0 }; } });
    assert.throws(attempt, error => error instanceof ComposerError && error.code === 'TOOL_UNAVAILABLE'
      && JSON.stringify(error.details) === JSON.stringify({ tool: 'frontend' }) && /pnpm -C frontend install --frozen-lockfile/.test(error.message));
    assert.equal(spawned, 0);
    assert.throws(() => assertFrontendToolchain(bare), /원본 frontend 의존성이 없어/);
  } finally { rmSync(bare, { recursive: true, force: true }); }
  // 생성기가 실패하면 그 단계 이름과 종료 코드로 멈춘다.
  assert.throws(() => regenerateContractTypes({ sourceRoot: root, output: root, spawn: () => ({ status: 3, stderr: 'boom' }) }), /codegen-zod failed \(3\): boom/);
});

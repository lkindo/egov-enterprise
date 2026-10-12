/**
 * 생성물의 API 계약 투영 — TypeScript 가 필요 없는 부분(Phase 2 10단계 10c-2, 설계서 12.5·C11).
 *
 * 생성물은 원본 api-docs.json 을 그대로 실어, 핸들러가 지워진 연산까지 계약에 남았다(core 생성물은 431개 중 242개가 없는 API).
 * 생성 타입·경계 census·소비 census 도 그 문서에서 나오므로 함께 낡았다. 생성기는 이 모듈로 api-docs 를 구성 기준으로 다시 쓰고,
 * 같은 단계에서 생성 타입 3종을 원본 생성기로 다시 만든다. 경계·소비 census 는 TypeScript 가 필요해 따로 둔다
 * (reusable-contract-census.mjs — 생성기는 그 모듈을 동적 import 로만 부른다).
 *
 * api-docs 정적 투영 규칙:
 *   ① 인가 원장의 연산 바인딩(메서드·경로 → 핸들러)으로 연산마다 핸들러 소스 파일을 찾는다. 투영이 그 파일을 지웠으면 연산을 뺀다.
 *   ② 바인딩이 없는 연산, 외부 핸들러에 묶인 연산, 소스를 찾지 못한(또는 둘 이상인) 핸들러는 판정할 수 없으므로 실패한다.
 *   ③ 연산이 하나도 남지 않은 경로를 지우고, 남는 문서에서 닿는 스키마 폐포만 남기고, 남는 연산이 쓰지 않는 태그를 지운다.
 *      `#/components/schemas/` 밖의 참조나 discriminator mapping 은 폐포를 셀 수 없으므로 실패한다.
 * 모든 기능을 고른 구성은 원본과 바이트가 같다(계약 시험이 본다). springdoc 이 남는 컨트롤러로 다시 만든 문서와의 대조는 T2 다.
 *
 * 이 모듈은 Node 내장 모듈만 쓴다 — 생성기·정밀 점검이 frontend 의존성 설치 없이 부른다.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const API_DOCS_PATH = 'api-docs.json';
export const AUTHORIZATION_POLICIES_PATH = 'config/governance/authorization-policies.json';
/** 생성 타입 3종. 원본 커밋본과 같은 생성기로 다시 만든다. */
export const GENERATED_CONTRACT_TYPES = Object.freeze({
  zod: 'frontend/src/types/generated-zod.ts',
  operations: 'frontend/src/types/generated-operations.ts',
  api: 'frontend/src/types/generated-api.d.ts',
});
const JAVA_SOURCE_ROOTS = Object.freeze(['api-server', 'business-app', 'business-core', 'foundation'].map(module => `${module}/src/main/java`));
const HTTP_METHODS = Object.freeze(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const SCHEMA_REF = '#/components/schemas/';
const JAVA_TYPE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/u;

/** 바인딩 핸들러(`패키지.타입#메서드`, 중첩 타입은 `$`)의 소스 파일. 정확히 한 모듈에 있어야 한다. */
export function handlerSourceFile(handler, sourceExists) {
  if (typeof handler !== 'string' || handler.startsWith('EXTERNAL#')) {
    throw new Error(`api-docs operation is bound to a handler outside the Java source: ${handler}`);
  }
  const type = handler.split('#')[0];
  if (!JAVA_TYPE.test(type)) throw new Error(`binding handler is not a Java type: ${handler}`);
  const relative = `${type.split('$')[0].replaceAll('.', '/')}.java`;
  const found = JAVA_SOURCE_ROOTS.map(root => `${root}/${relative}`).filter(sourceExists);
  if (found.length !== 1) {
    throw new Error(found.length ? `binding handler source is ambiguous: ${handler}` : `binding handler has no source: ${handler}`);
  }
  return found[0];
}

/** 노드 안의 스키마 참조 이름. 다른 종류의 참조와 discriminator mapping 은 폐포를 셀 수 없어 실패한다. */
function schemaReferences(node, found = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) schemaReferences(item, found);
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref') {
        if (typeof value !== 'string' || !value.startsWith(SCHEMA_REF) || /[/~]/u.test(value.slice(SCHEMA_REF.length))) {
          throw new Error(`unsupported api-docs reference: ${String(value)}`);
        }
        found.add(value.slice(SCHEMA_REF.length));
      } else if (key === 'discriminator' && value && typeof value === 'object' && Object.hasOwn(value, 'mapping')) {
        throw new Error('api-docs discriminator mapping is not supported by the schema closure');
      } else schemaReferences(value, found);
    }
  }
  return found;
}

/**
 * 인가 원장의 바인딩으로 핸들러가 지워진 연산을 빼고, 스키마 폐포와 태그를 정리한다.
 * `sourceExists(rel)` 는 원본 트리에 그 파일이 있는지, `removed(rel)` 는 투영이 그 파일을 지우는지 답한다.
 * 문서는 바꾸지 않고 사본을 돌려준다. 키 순서는 원본 그대로다(삭제만 한다).
 */
export function projectApiDocs(doc, { bindings, sourceExists, removed }) {
  if (!Array.isArray(bindings) || bindings.length === 0) throw new Error('api-docs projection requires the authorization operation bindings');
  const byOperation = new Map();
  for (const binding of bindings) {
    const key = `${binding.method} ${binding.path}`;
    if (byOperation.has(key)) throw new Error(`authorization binding is declared twice: ${key}`);
    byOperation.set(key, binding);
  }
  const projected = structuredClone(doc);
  if (!projected.paths || typeof projected.paths !== 'object') throw new Error('api-docs has no paths');
  const removedOperations = [];
  let keptOperations = 0;
  for (const [path, item] of Object.entries(projected.paths)) {
    const extra = Object.keys(item).filter(key => !HTTP_METHODS.includes(key));
    if (extra.length) throw new Error(`api-docs path item has fields the projection does not understand: ${path} ${extra.join(', ')}`);
    for (const method of HTTP_METHODS) {
      if (!Object.hasOwn(item, method)) continue;
      const label = `${method.toUpperCase()} ${path}`;
      const binding = byOperation.get(label);
      if (!binding) throw new Error(`api-docs operation has no authorization binding: ${label}`);
      const file = handlerSourceFile(binding.handler, sourceExists);
      if (removed(file)) {
        removedOperations.push({ method: method.toUpperCase(), path, operationId: item[method].operationId });
        delete item[method];
      } else keptOperations += 1;
    }
    if (Object.keys(item).length === 0) delete projected.paths[path];
  }

  const schemas = projected.components?.schemas ?? {};
  // 폐포의 뿌리는 스키마 정의 밖의 문서 전체다(연산과 다른 구성 요소가 거는 참조).
  const roots = { ...projected, components: { ...(projected.components ?? {}), schemas: undefined } };
  const reachable = new Set();
  const queue = [...schemaReferences(roots)];
  while (queue.length) {
    const name = queue.pop();
    if (reachable.has(name)) continue;
    if (!Object.hasOwn(schemas, name)) throw new Error(`api-docs references a schema that is not defined: ${name}`);
    reachable.add(name);
    queue.push(...schemaReferences(schemas[name]));
  }
  const removedSchemas = Object.keys(schemas).filter(name => !reachable.has(name));
  for (const name of removedSchemas) delete schemas[name];

  const usedTags = new Set(Object.values(projected.paths)
    .flatMap(item => HTTP_METHODS.flatMap(method => item[method]?.tags ?? [])));
  const removedTags = Array.isArray(projected.tags) ? projected.tags.filter(tag => !usedTags.has(tag.name)).map(tag => tag.name) : [];
  if (Array.isArray(projected.tags)) projected.tags = projected.tags.filter(tag => usedTags.has(tag.name));

  return {
    doc: projected,
    summary: {
      operations: keptOperations,
      paths: Object.keys(projected.paths).length,
      schemas: Object.keys(schemas).length,
      tags: Array.isArray(projected.tags) ? projected.tags.length : 0,
      removedOperations: removedOperations.length,
      removedSchemas: removedSchemas.length,
      removedTags: removedTags.length,
    },
    removedOperations,
    removedSchemas,
    removedTags,
  };
}

/** api-docs 는 OpenApiDocumentationTest 가 이 모양으로 쓴다(2칸 들여쓰기 + 끝 줄바꿈). */
export const apiDocsText = doc => `${JSON.stringify(doc, null, 2)}\n`;

/** 원본 트리의 api-docs 와 인가 원장의 연산 바인딩. */
export function readSourceApiContract(sourceRoot) {
  return {
    doc: JSON.parse(readFileSync(join(sourceRoot, API_DOCS_PATH), 'utf8')),
    bindings: JSON.parse(readFileSync(join(sourceRoot, AUTHORIZATION_POLICIES_PATH), 'utf8')).operationBindings,
  };
}

/**
 * 원본 트리의 api-docs 와 인가 원장으로 투영한다. `removed(rel)` 는 투영이 그 원본 파일을 지우는지 답한다.
 * `contract` 는 미리 읽은 문서·바인딩이다(정밀 점검 시험이 결함을 넣는 자리). 없으면 원본 트리에서 읽는다.
 */
export function projectSourceApiDocs(sourceRoot, removed, contract = readSourceApiContract(sourceRoot)) {
  return projectApiDocs(contract.doc, { bindings: contract.bindings, sourceExists: file => existsSync(join(sourceRoot, file)), removed });
}

/**
 * 생성물의 api-docs 를 구성 기준으로 다시 쓴다. 지워진 핸들러는 생성물 트리에서 판정한다(Java 투영이 끝난 뒤 부른다).
 * 바인딩은 원본 인가 원장에서 읽는다 — 생성물 원장은 뒤 단계가 구성으로 줄일 수 있다.
 */
export function writeProjectedApiDocs(sourceRoot, output) {
  const projection = projectSourceApiDocs(sourceRoot, file => !existsSync(join(output, file)));
  writeFileSync(join(output, API_DOCS_PATH), apiDocsText(projection.doc), 'utf8');
  return projection;
}

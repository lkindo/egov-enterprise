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
 * 생성 타입 3종은 원본의 codegen-zod.js 와 원본 frontend 의 openapi-typescript 를 자식 프로세스로 돌려 다시 만든다(U5-A).
 * 생성기 실행 정의(경로·환경 변수·격리 cwd)는 드리프트 검증과 같은 하나다(verify-generated-contracts.mjs 의 runContractGenerator).
 * 도구가 없으면 TOOL_UNAVAILABLE 이다. 이 모듈 자신은 Node 내장 모듈만 쓴다 — 생성기·정밀 점검이 frontend 의존성 설치 없이 적재한다.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComposerError } from './project-composer-errors.mjs';
import { API_DOCS_PATH, GENERATED_CONTRACT_TYPES, OPENAPI_TYPESCRIPT_CLI, runContractGenerator } from './verify-generated-contracts.mjs';

/** api-docs.json 과 생성 타입 3종의 경로는 드리프트 검증이 정의한다. 이 모듈의 소비자를 위해 다시 내보낸다. */
export { API_DOCS_PATH, GENERATED_CONTRACT_TYPES };
export const AUTHORIZATION_POLICIES_PATH = 'config/governance/authorization-policies.json';
/**
 * 생성 때 쓰는 원본 frontend 도구(U5-A). 원본 frontend 에 의존성을 설치해야 생성할 수 있다 — CI 재사용 잡은 생성 전에 설치하고,
 * 생성기 화면은 사전 점검으로 알린다. TypeScript 는 경계·소비 census(reusable-contract-census.mjs)가, openapi-typescript 는
 * generated-api.d.ts 가 쓴다.
 */
export const FRONTEND_TOOLCHAIN = Object.freeze({
  typescript: 'frontend/node_modules/typescript/package.json',
  openapiTypescript: OPENAPI_TYPESCRIPT_CLI,
});
export const FRONTEND_INSTALL_COMMAND = 'pnpm -C frontend install --frozen-lockfile';
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
  const removedPaths = [];
  const keptOperationIds = [];
  const sourceOperationIds = new Set();
  let keptOperations = 0;
  for (const [path, item] of Object.entries(projected.paths)) {
    const extra = Object.keys(item).filter(key => !HTTP_METHODS.includes(key));
    if (extra.length) throw new Error(`api-docs path item has fields the projection does not understand: ${path} ${extra.join(', ')}`);
    for (const method of HTTP_METHODS) {
      if (!Object.hasOwn(item, method)) continue;
      sourceOperationIds.add(item[method].operationId);
      const label = `${method.toUpperCase()} ${path}`;
      const binding = byOperation.get(label);
      if (!binding) throw new Error(`api-docs operation has no authorization binding: ${label}`);
      const file = handlerSourceFile(binding.handler, sourceExists);
      if (removed(file)) {
        removedOperations.push({ method: method.toUpperCase(), path, operationId: item[method].operationId });
        delete item[method];
      } else {
        keptOperations += 1;
        keptOperationIds.push(item[method].operationId);
      }
    }
    if (Object.keys(item).length === 0) {
      delete projected.paths[path];
      removedPaths.push(path);
    }
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

  // springdoc 별칭(`_N`) 가운데 기본 연산이 빠지고 별칭만 남는 것. 정적 투영은 연산 id 를 원본 그대로 두지만, 생성물에서 springdoc 으로
  // 다시 추출하면 충돌이 없어 접미사 없이 나온다(예: 게시판의 getStats_1 — 기본 getStats 는 설문 소유). lock 에 적고, T2 의 springdoc
  // 재추출 대조(U9)는 이 목록의 접미사 차이를 정규화한다.
  const kept = new Set(keptOperationIds);
  const keptAliasesWithoutBase = keptOperationIds.filter(id => {
    const base = id.replace(/_\d+$/u, '');
    return base !== id && sourceOperationIds.has(base) && !kept.has(base);
  }).sort();

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
    removedPaths,
    keptAliasesWithoutBase,
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

/** 원본 frontend 에 설치되지 않은 생성 도구(저장소 기준 경로). 빈 배열이면 모두 있다. */
export function missingFrontendToolchain(sourceRoot) {
  return Object.values(FRONTEND_TOOLCHAIN).filter(file => !existsSync(join(sourceRoot, file)));
}

/** 생성 도구가 없으면 생성기 화면이 설치 안내로 바꿔 말하는 코드(TOOL_UNAVAILABLE, 도구 frontend)로 멈춘다. */
export function assertFrontendToolchain(sourceRoot) {
  const missing = missingFrontendToolchain(sourceRoot);
  if (missing.length) {
    throw new ComposerError('TOOL_UNAVAILABLE', { tool: 'frontend' },
      `원본 frontend 의존성이 없어 API 계약 생성물을 다시 만들 수 없다(${missing.join(', ')}). 먼저 ${FRONTEND_INSTALL_COMMAND} 를 실행한다.`);
  }
}

/**
 * 생성물 api-docs 로 생성 타입 3종을 다시 만든다. 원본의 생성기(codegen-zod.js)와 원본 frontend 의 openapi-typescript 를 쓴다 —
 * 원본 커밋본을 만든 것과 같은 도구이고, 실행 정의(격리 cwd 포함)는 드리프트 검증과 같다. 모든 기능을 고른 구성은 원본
 * 커밋본과 같은 내용이 나온다(계약 시험).
 */
export function regenerateContractTypes({ sourceRoot, output, spawn = spawnSync }) {
  assertFrontendToolchain(sourceRoot);
  const specPath = join(output, API_DOCS_PATH);
  const outputPaths = Object.fromEntries(Object.entries(GENERATED_CONTRACT_TYPES).map(([key, file]) => [key, join(output, file)]));
  runContractGenerator({ kind: 'zod', toolRoot: sourceRoot, specPath, outputPaths, spawn });
  runContractGenerator({ kind: 'api', toolRoot: sourceRoot, specPath, outputPaths, spawn });
  return Object.values(GENERATED_CONTRACT_TYPES);
}

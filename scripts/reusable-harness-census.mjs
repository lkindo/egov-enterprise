/** Producer and adopter census use the same scanners and predicates. */
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { stripJavaComments } from './reusable-source-java.mjs';
import { fail, walk } from './reusable-source-tree.mjs';
import { HISTORICAL_SCHEMA_TEST_DIR } from './reusable-source-gates.mjs';

export function projectedWriteHandlerCounts(source) {
  const code = stripJavaComments(source);
  const skipLiteral = (open) => {
    if (code.startsWith('"""', open)) {
      const end = code.indexOf('"""', open + 3);
      if (end < 0) fail('Unclosed Java text block in handler census');
      return end + 2;
    }
    for (let i = open + 1; i < code.length; i++) {
      if (code[i] === '\\') i++;
      else if (code[i] === code[open]) return i;
    }
    fail('Unclosed Java literal in handler census');
  };
  const bodyAt = (from) => {
    let parentheses = 0;
    let open = -1;
    for (let i = from; i < code.length; i++) {
      if (code[i] === '"' || code[i] === "'") i = skipLiteral(i);
      else if (code[i] === '(') parentheses++;
      else if (code[i] === ')') parentheses--;
      else if (code[i] === '{' && parentheses === 0) { open = i; break; }
      else if (code[i] === ';' && parentheses === 0) break;
    }
    if (open < 0) fail('Cannot locate projected write handler body');
    let braces = 0;
    for (let i = open; i < code.length; i++) {
      if (code[i] === '"' || code[i] === "'") i = skipLiteral(i);
      else if (code[i] === '{') braces++;
      else if (code[i] === '}' && --braces === 0) return code.slice(open, i + 1);
    }
    fail('Unclosed projected write handler body');
  };
  let handlers = 0;
  let successful = 0;
  for (const match of code.matchAll(/@(?:Post|Put|Delete|Patch)Mapping(?![A-Za-z0-9_$])/g)) {
    handlers++;
    const body = bodyAt(match.index + match[0].length);
    let analyzed = body;
    const names = new Set([...body.replace(/"(?:\\.|[^"\\])*"/g, '""').matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(row => row[1]));
    for (const name of names) {
      const declaration = new RegExp(`\\bprivate\\s+[^;{}()]*\\b${name.replaceAll('$', '\\$')}\\s*\\(`).exec(code);
      if (declaration) analyzed += `\n${bodyAt(declaration.index)}`;
    }
    if (/ResponseEntity\s*\.\s*(?:ok|created)\s*\(|ApiResponse\s*\.\s*success\s*\(|HttpStatus\s*\.\s*(?:OK|CREATED)\b/.test(analyzed)) successful++;
  }
  return { handlers, successful };
}

/**
 * 공용 PostgreSQL support 를 써야 하는 migration 검증 수 — 하네스의 census 와 같은 디렉터리(schema 시험 루트, 하위 포함)·
 * 같은 술어(파일 이름이 `MigrationIntegrationTest.java` 로 끝난다)다. 투영본에서는 역사적 migration 검증을 걷은 뒤에 세므로 0 이다.
 */
export function projectedMigrationTestCount(output) {
  return walk(join(output, ...HISTORICAL_SCHEMA_TEST_DIR.split('/')),
    path => basename(path).endsWith('MigrationIntegrationTest.java')).length;
}

export function computeReusableHarnessCensus(output, { sources, authorization, activeType, schemaTables, productionSources, permissionCatalog }) {
  const bindings = authorization.operationBindings.filter(row => activeType(row.handler));
  const endpoints = authorization.endpointPolicies.filter(row => activeType(row.handler));
  const entries = [...sources.entries()];
  const entities = entries.filter(([, source]) => /@Entity\b/.test(source));
  const restControllers = entries.filter(([, source]) => /@RestController(?![A-Za-z0-9_$])/.test(source));
  const countMatches = (rows, pattern) => rows.reduce((total, [, source]) => total + [...source.matchAll(pattern)].length, 0);
  const writes = restControllers.map(([, source]) => projectedWriteHandlerCounts(source));
  const writeHandlers = writes.reduce((sum, row) => sum + row.handlers, 0);
  const census = {
    requestControllers: entries.filter(([path, source]) => path.startsWith('api-server/') && /@(?:RestController|Controller)(?![A-Za-z0-9_$])/.test(source)).length,
    restControllers: restControllers.length,
    writeHandlers,
    successfulWriteHandlers: writes.reduce((sum, row) => sum + row.successful, 0),
    entities: entities.length,
    entityTables: new Set(entities.map(([, source]) => source.match(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/)?.[1]
      ?? fail('Entity @Table(name) cannot be determined'))).size,
    schemaTables,
    migrations: walk(join(output, 'api-server/src/main/resources/db/migration'), path => path.endsWith('.sql')).length,
    booleanFlagColumns: [...readFileSync(join(output, 'api-server/src/main/resources/db/migration/V1_0__baseline.sql'), 'utf8')
      .matchAll(/^\s+[a-z][a-z0-9_]*_yn\s+[a-z]/gm)].length,
    responseHandlers: countMatches(entries.filter(([path]) => path.startsWith('api-server/src/main/java/nuri/api/controller/')),
      /@(?:Get|Post|Put|Patch|Delete|Request)Mapping\b[^\n]*\n(?:\s*@[^\n]*\n)*\s*public\s+([^\n{]+?)\s+(\w+)\s*\(/g),
    baseSearchBindings: countMatches(entries.filter(([path]) => path.startsWith('api-server/')),
      /@ModelAttribute(?:\s*\([^)]*\))?\s+(?:nuri\.business\.domain\.common\.)?BaseSearchDto\b/g),
    writeEndpoints: endpoints.length,
    readEndpoints: bindings.filter(row => !row.handler.startsWith('EXTERNAL#') && row.method === 'GET').length,
    operationBindings: bindings.length,
    operationEndpoints: bindings.filter(row => !row.handler.startsWith('EXTERNAL#')).length,
    serviceGuards: authorization.serviceGuardPolicies.filter(row => activeType(row.target)).length,
    manualGuards: authorization.manualGuardPolicies.filter(row => sources.has(row.source)).length,
    productionSources,
    // 공용 PostgreSQL migration 검증 수 — 원본 동결값 대신 투영본이 읽는다. 역사적 migration 검증을 걷은 뒤에 센다.
    migrationTests: projectedMigrationTestCount(output),
    // [10단계 10b] 투영본의 권한 카탈로그 수는 구성의 권한 코드 수다(원본 하한 200 대신 정확히 비교 — SecurePathsDeclarationSyncLinterTest,
    // generate-permissions). 바인딩 수는 위 operationBindings(원본 원장을 독립된 Java 제거 계획으로 거른 수)를 쓴다.
    permissionCatalog,
  };
  for (const module of ['business-core', 'business-app']) census[`entities:${module}`] = entities.filter(([path]) => path.startsWith(`${module}/`)).length;
  return census;
}

/**
 * 생성물에 남는 프런트 코드가 구성에서 빠진 API 계약 이름을 쓰는지 판정한다(Phase 2 10c-2, 트랙 K 검토 #2).
 *
 * 생성기는 생성물의 api-docs 를 구성 기준으로 줄이고(reusable-contract-projection.mjs) 생성 타입 3종을 다시 만든다. 그러면 지워진
 * 연산·스키마에서만 나오던 이름(`XxxSchema`·`xxxOperation`·`components['schemas']['Xxx']`·`operations['xxx']`)이 사라진다. 어느 기능에도
 * 속하지 않아 투영 뒤에도 남는 파일이 그 이름을 쓰면 생성물의 tsc(T1 typecheck)가 약 10분 뒤에야 깨진다. 경계 census 는 생성 실행기 호출
 * 자리만 보고 시험 파일을 세지 않으므로 이 자리를 보지 못한다. 그래서 생성기와 정밀 점검이 같은 판정을 한다:
 *   - 범위는 frontend/tsconfig.json 이 보는 파일이다(시험 포함, node_modules·scripts·e2e·vitest 설정 제외, 생성 타입 자신 제외).
 *   - 읽는 자리: 생성 모듈 셋의 이름 import·re-export 와 이름공간 import 의 멤버, generated-api 의 `components['schemas']['X']`·
 *     `operations['id']`·`paths['/p']` 리터럴 색인. 그 밖의 모양(동적 import, `export *`, 리터럴이 아닌 색인, 색인 없는 사용)은 판정할 수
 *     없으므로 건너뛰지 않고 issue 로 돌려준다 — 생성기는 실패하고 정밀 점검은 차단한다.
 *   - 사라지는 이름: 생성기는 다시 만든 파일과 원본 파일의 export 차이를 쓰고, 정밀 점검은 원본 파일과 투영 결과(지워진 스키마·연산·경로)로
 *     예측한다. 생성기는 두 값이 같은지도 본다 — 다르면 정밀 점검의 예측이 생성 결과와 어긋난 것이므로 실패한다.
 * 이 모듈은 Node 내장 모듈과 토크나이저만 쓴다 — 생성기·정밀 점검이 frontend 의존성 설치 없이 적재한다.
 * 한계: JSX 본문의 따옴표가 문자열로 읽혀 뒤 코드를 삼키면 그 안의 참조를 놓친다(놓치는 방향이다 — 최종 판정은 생성물의 tsc 다).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { tokenizeDependencies } from './frontend-module-graph.mjs';
import { GENERATED_CONTRACT_TYPES } from './reusable-contract-projection.mjs';

/** 생성 계약 모듈(확장자 없는 저장소 기준 경로). */
export const CONTRACT_MODULES = Object.freeze({
  zod: 'frontend/src/types/generated-zod',
  operations: 'frontend/src/types/generated-operations',
  api: 'frontend/src/types/generated-api',
});
const CONTRACT_FILES = new Set(['frontend/src/types/generated-zod.ts', 'frontend/src/types/generated-operations.ts', 'frontend/src/types/generated-api.d.ts']);
// zod·operations 의 태그 묶음 모듈(진입 파일 옆 같은 이름 폴더, codegen-zod.js). 생성 계약 자신이라 범위에서 빼고, 거기로 가는 import 도
// 그 계약 모듈의 이름 참조로 읽는다.
const CONTRACT_MODULE_DIRECTORIES = Object.freeze({ zod: `${CONTRACT_MODULES.zod}/`, operations: `${CONTRACT_MODULES.operations}/` });
// frontend/tsconfig.json 의 include(**/*.ts·**/*.tsx·**/*.mts)와 exclude(node_modules·scripts·vitest.config.mts·vitest.setup.ts·e2e).
const SCOPE_EXTENSIONS = Object.freeze(['.ts', '.tsx', '.mts']);
const SCOPE_EXCLUDED_DIRECTORIES = Object.freeze(['frontend/node_modules/', 'frontend/scripts/', 'frontend/e2e/', 'frontend/.next/']);
const SCOPE_EXCLUDED_FILES = new Set(['frontend/vitest.config.mts', 'frontend/vitest.setup.ts']);
const API_MEMBERS = Object.freeze(['components', 'operations', 'paths']);

/** frontend/tsconfig.json 이 타입 검사하는 파일인가(생성 계약 모듈 자신은 뺀다). `file` 은 저장소 기준 경로다. */
export function isContractScopeFile(file) {
  const path = file.replaceAll('\\', '/');
  return path.startsWith('frontend/') && SCOPE_EXTENSIONS.some(extension => path.endsWith(extension))
    && !SCOPE_EXCLUDED_DIRECTORIES.some(directory => path.startsWith(directory)) && !SCOPE_EXCLUDED_FILES.has(path) && !CONTRACT_FILES.has(path)
    && !Object.values(CONTRACT_MODULE_DIRECTORIES).some(directory => path.startsWith(directory));
}

/** import 지정자가 가리키는 생성 계약 모듈의 키(zod·operations·api). 다른 모듈이면 undefined. */
export function contractModuleOf(specifier, file) {
  let target;
  if (specifier.startsWith('@/')) target = `frontend/src/${specifier.slice(2)}`;
  else if (specifier.startsWith('./') || specifier.startsWith('../')) target = posix.normalize(posix.join(posix.dirname(file.replaceAll('\\', '/')), specifier));
  else return undefined;
  target = target.replace(/\.(?:d\.ts|ts|tsx|js|mjs)$/u, '').replace(/\.d$/u, '');
  return Object.keys(CONTRACT_MODULES).find(key => CONTRACT_MODULES[key] === target)
    ?? Object.keys(CONTRACT_MODULE_DIRECTORIES).find(key => target.startsWith(CONTRACT_MODULE_DIRECTORIES[key]));
}

const literal = token => (token?.type === 'string' || (token?.type === 'template' && !token.interpolated) ? token.value : undefined);

/** `[ '리터럴' ]` 색인이면 그 값과 다음 위치. */
function literalIndex(tokens, index) {
  if (tokens[index]?.value !== '[' || tokens[index + 2]?.value !== ']') return undefined;
  const value = literal(tokens[index + 1]);
  return value === undefined ? undefined : { value, next: index + 3 };
}

/** `{ a, type b, c as d }` 의 원래 이름과 지역 이름. */
function namedClause(tokens, open, close) {
  const names = [];
  let clause = [];
  const flush = () => {
    const parts = clause[0]?.value === 'type' && clause.length > 1 ? clause.slice(1) : clause;
    if (parts.length) names.push({ imported: parts[0].value, local: parts[2]?.value ?? parts[0].value, line: parts[0].line });
    clause = [];
  };
  for (let index = open + 1; index < close; index += 1) {
    if (tokens[index].value === ',') flush();
    else clause.push(tokens[index]);
  }
  flush();
  return names;
}

function findClose(tokens, open) {
  for (let index = open; index < tokens.length; index += 1) if (tokens[index].value === '}') return index;
  return -1;
}

/**
 * 한 파일에서 생성 계약 이름을 쓰는 자리를 읽는다. 돌려주는 references 의 항목은
 * `{ module: 'zod'|'operations', name, line }` 또는 `{ module: 'api', kind: 'schema'|'operation'|'path', name, line }` 이다.
 * 판정할 수 없는 자리는 issues 에 `{ file, line, detail }` 로 쌓는다.
 */
export function parseContractReferences(source, file) {
  const { tokens, issues: lexical } = tokenizeDependencies(source, file);
  const references = [];
  const issues = lexical.map(issue => ({ file, line: issue.line, detail: issue.code }));
  const locals = new Map(); // 지역 이름 → { module, member?: 'components'|'operations'|'paths', namespace: boolean }
  const clauseTokens = new Set();
  const named = (module, entries) => {
    for (const entry of entries) {
      if (module === 'api') {
        if (!API_MEMBERS.includes(entry.imported)) issues.push({ file, line: entry.line, detail: `generated-api has no member ${entry.imported}` });
        else locals.set(entry.local, { module, member: entry.imported, namespace: false });
      } else references.push({ module, name: entry.imported, line: entry.line });
    }
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'identifier' || tokens[index - 1]?.value === '.') continue;
    if (token.value === 'import' && tokens[index + 1]?.value === '(') {
      const specifier = literal(tokens[index + 2]);
      if (specifier === undefined || contractModuleOf(specifier, file)) {
        if (specifier !== undefined) issues.push({ file, line: token.line, detail: `dynamic import of a generated contract module: ${specifier}` });
      }
      continue;
    }
    if (token.value !== 'import' && token.value !== 'export') continue;
    // 절 끝(from 다음의 지정자)까지 읽는다. 지정자가 계약 모듈이 아니면 아무것도 기록하지 않는다.
    let cursor = index + 1;
    if (tokens[cursor]?.value === 'type') cursor += 1;
    let defaultBinding;
    if (token.value === 'import' && tokens[cursor]?.type === 'identifier' && tokens[cursor].value !== 'from') {
      defaultBinding = tokens[cursor];
      cursor += 1;
      if (tokens[cursor]?.value === ',') cursor += 1;
    }
    let names = [];
    let namespace;
    let star = false;
    const clauseStart = cursor;
    if (tokens[cursor]?.value === '{') {
      const close = findClose(tokens, cursor);
      if (close < 0) continue;
      names = namedClause(tokens, cursor, close);
      cursor = close + 1;
    } else if (tokens[cursor]?.value === '*') {
      star = true;
      if (tokens[cursor + 1]?.value === 'as' && tokens[cursor + 2]?.type === 'identifier') {
        namespace = tokens[cursor + 2];
        cursor += 3;
      } else cursor += 1;
    } else if (!defaultBinding) continue;
    if (tokens[cursor]?.value !== 'from') continue;
    const specifier = literal(tokens[cursor + 1]);
    if (specifier === undefined) continue;
    const module = contractModuleOf(specifier, file);
    if (!module) continue;
    for (let marked = index; marked <= cursor + 1; marked += 1) clauseTokens.add(marked);
    if (defaultBinding) issues.push({ file, line: token.line, detail: `default import of a generated contract module: ${specifier}` });
    if (token.value === 'export' && star) {
      issues.push({ file, line: token.line, detail: `re-export of every name of a generated contract module: ${specifier}` });
      continue;
    }
    if (namespace) locals.set(namespace.value, { module, namespace: true });
    named(module, names);
    index = Math.max(index, clauseStart);
  }

  // 지역 이름의 사용 자리. 생성 계약 모듈의 이름공간과 generated-api 의 멤버만 본다(zod·operations 의 이름 import 는 이름 자체가 참조다).
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'identifier' || clauseTokens.has(index) || !locals.has(token.value)) continue;
    const previous = tokens[index - 1]?.value;
    if (previous === '.') continue;
    // 객체 리터럴의 키(`{ operations: … }`)는 그 이름의 사용이 아니다.
    if (tokens[index + 1]?.value === ':' && (previous === '{' || previous === ',')) continue;
    let binding = locals.get(token.value);
    let cursor = index + 1;
    if (binding.namespace) {
      const member = tokens[cursor]?.value === '.' ? tokens[cursor + 1] : undefined;
      if (member?.type !== 'identifier') {
        issues.push({ file, line: token.line, detail: `generated contract namespace ${token.value} is used without a member` });
        continue;
      }
      if (binding.module !== 'api') {
        references.push({ module: binding.module, name: member.value, line: member.line });
        continue;
      }
      if (!API_MEMBERS.includes(member.value)) {
        issues.push({ file, line: token.line, detail: `generated-api has no member ${member.value}` });
        continue;
      }
      binding = { module: 'api', member: member.value };
      cursor += 2;
    }
    const first = literalIndex(tokens, cursor);
    if (binding.member === 'components') {
      const second = first?.value === 'schemas' ? literalIndex(tokens, first.next) : undefined;
      if (second) references.push({ module: 'api', kind: 'schema', name: second.value, line: token.line });
      else issues.push({ file, line: token.line, detail: `${token.value} is not indexed as ['schemas']['<literal>']` });
    } else if (first) {
      references.push({ module: 'api', kind: binding.member === 'operations' ? 'operation' : 'path', name: first.value, line: token.line });
    } else issues.push({ file, line: token.line, detail: `${token.value} is not indexed with a literal` });
  }
  return { references, issues };
}

const EXPORT_DECLARATION = /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|abstract\s+class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gmu;
// 진입 파일이 태그 묶음 모듈의 이름 하나를 다시 내보내는 줄(codegen-zod.js 가 줄마다 하나씩 쓴다). 이름을 바꾸는 `as` 는 읽지 않는다.
const SINGLE_REEXPORT = /^export\s+(?:type\s+)?\{\s*([A-Za-z_$][\w$]*)\s*\}\s+from\s+'\.\/[\w-]+\/[\w$-]+';$/gmu;

/**
 * 생성 계약 진입 파일(zod·operations)이 내보내는 이름. 선언과, 묶음 모듈 이름 하나씩의 다시 내보내기를 읽는다.
 * 그 밖의 export 모양(여러 이름·`as`·`export *`)이 있으면 판정하지 못하므로 실패한다.
 */
export function exportedNames(text, label) {
  const lf = text.replace(/\r\n/g, '\n');
  const readable = line => new RegExp(EXPORT_DECLARATION.source, 'u').test(line) || new RegExp(SINGLE_REEXPORT.source, 'u').test(line);
  const unread = lf.split('\n').filter(line => /^export\b/u.test(line) && !readable(line));
  if (unread.length) throw new Error(`${label} exports in a form the contract name check does not read: ${unread[0].slice(0, 120)}`);
  return new Set([...lf.matchAll(EXPORT_DECLARATION), ...lf.matchAll(SINGLE_REEXPORT)].map(match => match[1]));
}

/**
 * 투영 결과로 사라질 이름을 예측한다(정밀 점검). codegen-zod 는 스키마 S 마다 `S`(타입)·`SSchema`·`SRequestSchema`·`SResponseSchema` 를,
 * 연산 O 마다 `OOperation` 을 내보낸다. 원본 파일에 실제로 있는 이름만 센다. generated-api 의 이름은 api-docs 의 키 그대로다.
 */
export function predictVanishedContractNames({ sourceZod, sourceOperations, removedSchemas, removedOperationIds, removedPaths }) {
  const zodExports = exportedNames(sourceZod, 'generated-zod');
  const operationExports = exportedNames(sourceOperations, 'generated-operations');
  return {
    zod: new Set(removedSchemas.flatMap(name => [name, `${name}Schema`, `${name}RequestSchema`, `${name}ResponseSchema`]).filter(name => zodExports.has(name))),
    operations: new Set(removedOperationIds.map(id => `${id}Operation`).filter(name => operationExports.has(name))),
    schemas: new Set(removedSchemas),
    operationIds: new Set(removedOperationIds),
    paths: new Set(removedPaths),
  };
}

/**
 * 다시 만든 생성 파일과 원본의 export 차이가 예측과 같은지 본다(생성기). 같으면 예측을 돌려준다.
 * 다르면 정밀 점검이 이 구성에서 다른 판정을 했을 것이므로 실패한다.
 */
export function assertVanishedContractNames(predicted, { sourceZod, sourceOperations, outputZod, outputOperations }) {
  for (const [key, source, output] of [['zod', sourceZod, outputZod], ['operations', sourceOperations, outputOperations]]) {
    const before = exportedNames(source, `generated-${key}`);
    const after = exportedNames(output, `generated-${key} (regenerated)`);
    const vanished = [...before].filter(name => !after.has(name));
    const appeared = [...after].filter(name => !before.has(name)).sort();
    const unpredicted = vanished.filter(name => !predicted[key].has(name)).sort();
    const kept = [...predicted[key]].filter(name => after.has(name)).sort();
    if (appeared.length || unpredicted.length || kept.length) {
      throw new Error(`regenerated generated-${key} differs from the predicted contract names (the deep check would judge differently): `
        + `appeared [${appeared.join(', ')}] vanished-unpredicted [${unpredicted.join(', ')}] predicted-but-kept [${kept.join(', ')}]`);
    }
  }
  return predicted;
}

/**
 * 남는 파일(`[{ file, source }]`, 투영 뒤 내용)에서 사라지는 이름을 쓰는 자리와 판정할 수 없는 자리를 모은다.
 * 결과는 파일 순서대로이고, 자리는 `{ file, line, module, kind?, name }` 이다.
 */
export function vanishedContractReferences(files, vanished) {
  const hits = [];
  const issues = [];
  for (const { file, source } of files) {
    if (!isContractScopeFile(file)) continue;
    const parsed = parseContractReferences(source, file);
    issues.push(...parsed.issues);
    for (const reference of parsed.references) {
      const gone = reference.module === 'api'
        ? vanished[{ schema: 'schemas', operation: 'operationIds', path: 'paths' }[reference.kind]].has(reference.name)
        : vanished[reference.module].has(reference.name);
      if (gone) hits.push({ file, ...reference });
    }
  }
  return { hits, issues };
}

/** 사람이 읽는 한 줄 목록(`파일:줄 이름`). */
export const describeContractReferences = ({ hits, issues }) => [
  ...hits.map(hit => `${hit.file}:${hit.line} ${hit.module === 'api' ? `generated-api ${hit.kind} ${hit.name}` : hit.name}`),
  ...issues.map(issue => `${issue.file}:${issue.line} cannot judge: ${issue.detail}`),
];

/**
 * 투영 결과(projectApiDocs)와 원본 생성 파일로 사라질 이름을 예측한다. 정밀 점검과 생성기가 같은 입력을 쓴다.
 * 아무 연산·스키마·경로도 빠지지 않으면 사라지는 이름이 없으므로 생성 파일을 읽지 않는다(생성 파일이 없는 합성 저장소의 정밀 점검).
 */
export function predictFromProjection(sourceRoot, projection) {
  if (!projection.removedSchemas.length && !projection.removedOperations.length && !projection.removedPaths.length) {
    return { zod: new Set(), operations: new Set(), schemas: new Set(), operationIds: new Set(), paths: new Set() };
  }
  return predictVanishedContractNames({
    sourceZod: readFileSync(join(sourceRoot, GENERATED_CONTRACT_TYPES.zod), 'utf8'),
    sourceOperations: readFileSync(join(sourceRoot, GENERATED_CONTRACT_TYPES.operations), 'utf8'),
    removedSchemas: projection.removedSchemas,
    removedOperationIds: projection.removedOperations.map(operation => operation.operationId),
    removedPaths: projection.removedPaths,
  });
}

/**
 * 생성기: 생성 타입을 다시 만든 뒤, 원본과의 export 차이가 예측과 같은지 보고, 남는 파일(`files`, 저장소 기준 경로 — 생성물에 없으면
 * 건너뛴다)이 사라진 이름을 쓰지 않는지 본다. 하나라도 있으면 파일과 줄을 밝히며 실패한다.
 */
export function assertContractReferencesSurvive({ sourceRoot, output, projection, files }) {
  const predicted = assertVanishedContractNames(predictFromProjection(sourceRoot, projection), {
    sourceZod: readFileSync(join(sourceRoot, GENERATED_CONTRACT_TYPES.zod), 'utf8'),
    sourceOperations: readFileSync(join(sourceRoot, GENERATED_CONTRACT_TYPES.operations), 'utf8'),
    outputZod: readFileSync(join(output, GENERATED_CONTRACT_TYPES.zod), 'utf8'),
    outputOperations: readFileSync(join(output, GENERATED_CONTRACT_TYPES.operations), 'utf8'),
  });
  const surviving = [...new Set(files.map(file => file.replaceAll('\\', '/')))].filter(file => isContractScopeFile(file) && existsSync(join(output, file))).sort();
  const result = vanishedContractReferences(surviving.map(file => ({ file, source: readFileSync(join(output, file), 'utf8') })), predicted);
  if (result.hits.length || result.issues.length) {
    throw new Error(`surviving frontend code uses API contract names this composition removes (the product typecheck would fail):\n${describeContractReferences(result).join('\n')}`);
  }
  return { checkedFiles: surviving.length, vanishedNames: predicted.zod.size + predicted.operations.size };
}

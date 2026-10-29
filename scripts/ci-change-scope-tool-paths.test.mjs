import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { classifyChangedFiles, GENERATOR_TOOL_PATHS, generatorToolEntry, PR_REUSABLE_LAYOUT } from './ci-change-scope.mjs';
import { presetIds } from './composition-profiles.mjs';
import { parseModuleReferences, tokenizeDependencies } from './frontend-module-graph.mjs';
import { trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

/*
 * 생성기·도구 전용 경로 표(GENERATOR_TOOL_PATHS, 11단계 C11 — CI 2차-b)의 축이 사실인지 소스에서 다시 계산한다.
 *
 * 표의 경로를 바꾼 변경은 표의 축만 켠다. 그래서 그 경로를 읽거나 실행하는 시험이 도는 축이 표에 빠지면, 그 시험은 그 변경에서
 * 돌지 않는다(거짓 녹색). 반대로 아무 시험도 읽지 않는 축이 표에 남으면 CI 를 헛돈다. 그래서 항목마다 축이 정확히 같아야 한다.
 *
 * 읽는 쪽(reader)과 그 축:
 *  - Java 시험(test·testFixtures): 업무 모듈은 backend·mutation(PIT 가 nuri.business.*·nuri.foundation.* 시험을 돈다),
 *    api-server 는 backend, schema-validation 태그는 schema, migration-tool 은 migration·mutationMigrationTool.
 *  - Java 제품 소스: 그 파일이 바뀌면 분류기가 고르는 축(제품 코드가 생성기 파일을 읽으면 그 축이 그 코드를 돌린다).
 *  - 프런트 vitest(*.test.ts·tsx): cross-stack 은 atlas(secret-scan 이 atlas·backend 일 때 돈다), 그 밖은 frontend.
 *    프런트 제품 소스는 frontend·e2e, frontend/e2e 의 Playwright 소스는 e2e.
 *  - 조건부 CI 잡·단계가 node 로 실행하는 저장소 파일(npm·pnpm run 은 package.json 의 명령을 한 단계 펼친다): 그 조건의 축.
 *    늘 도는 잡의 무조건 단계(운영 계약 등)는 축이 필요 없다.
 *
 * 읽기의 판정(정적 근사 — 놓치는 쪽이 아니라 넓히는 쪽으로 둔다):
 *  - 주석을 뺀 문자열 리터럴이 저장소 루트에서 시작하는 경로(scripts/…·config/…·tools/…)를 가리키면 그 경로와 그 아래·그 접두의
 *    파일을 읽는다. 쉼표·+·resolve( 로 이어진 리터럴은 / 로 잇는다(path.join(root, 'config', 'modules')). '*'·'${' 뒤는 접두다.
 *  - 다른 리터럴과 이어지지 않은 디렉터리 이름(scripts·config/modules·tools·tools/project-composer)은 그 디렉터리 전체를 읽는다.
 *    'config' 홀로는 패키지 이름·git config 인자로 흔해 디렉터리 읽기로 보지 않는다(설정 디렉터리 전체를 읽는 시험은 지금 없다).
 *  - 실행: JS 의 상대 import·require, node 를 띄우는 JS(execPath·'node …')와 Java(ProcessBuilder + "node")가 가리키는 JS 파일,
 *    계산된 동적 import 가 있는 JS 가 가리키는 JS 파일, CI 가 node 로 실행하는 파일. 실행한 표 안 모듈이 다시 실행·읽는 표 안
 *    파일도 그 시험이 읽는 것으로 본다(표 안 사슬). 표 밖 모듈(verify.mjs 같은 허브)의 사슬은 따라가지 않는다 — 그 모듈이 바뀌면
 *    미분류 경로라 전수이고, 표 안 모듈 자체의 동작은 늘 도는 운영 계약이 본다.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AXES = ['atlas', 'backend', 'e2e', 'frontend', 'migration', 'mutation', 'mutationMigrationTool', 'schema'];
const OUTPUT_AXIS = {
  atlas: 'atlas', backend: 'backend', e2e: 'e2e', frontend: 'frontend', migration: 'migration', mutation: 'mutation',
  'mutation-migration-tool': 'mutationMigrationTool', schema: 'schema',
};
const JS_SOURCE = /\.(?:mjs|cjs|js|ts|tsx|mts|cts)$/;
const DEPENDENCY_CACHE = new Map();
// 에이전트 하네스의 훅 어댑터(`.claude/`·`.codex/`·`.agents/`)도 표 경로다 — 그 문자열을 가리키는 시험도 읽기로 센다(DEC-OPS-387).
const ROOT_PATH = /(?:scripts|config|tools|\.(?:claude|codex|agents))\/[\w.\-*$/]*/g;
const DIRECTORIES = new Set(['scripts', 'config/modules', 'tools', 'tools/project-composer']);

/** Java 소스를 리터럴(문자열·텍스트 블록)과 그 사이 코드 조각으로 나눈다. 주석과 문자 리터럴은 버린다. */
function javaLiteralSpans(source) {
  const spans = [];
  let code = '';
  for (let index = 0; index < source.length;) {
    if (source.startsWith('"""', index)) {
      const close = source.indexOf('"""', index + 3);
      const end = close < 0 ? source.length : close + 3;
      spans.push({ value: source.slice(index + 3, Math.max(index + 3, end - 3)), before: code });
      code = '';
      index = end;
    } else if (source[index] === '"' || source[index] === "'") {
      const quote = source[index];
      let end = index + 1;
      while (end < source.length && source[end] !== quote && source[end] !== '\n') end += source[end] === '\\' ? 2 : 1;
      if (quote === '"') {
        spans.push({ value: source.slice(index + 1, end), before: code });
        code = '';
      } else {
        code += ' ';
      }
      index = end + 1;
    } else if (source.startsWith('//', index)) {
      const newline = source.indexOf('\n', index);
      index = newline < 0 ? source.length : newline;
    } else if (source.startsWith('/*', index)) {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
      code += ' ';
    } else {
      code += source[index];
      index += 1;
    }
  }
  return { spans, code: spans.map(span => span.before).join(' ') + code };
}

/** 리터럴마다, 이어지는 리터럴을 / 로 이은 값들. `continues` 는 그 값 뒤에 리터럴이 더 이어지는가(디렉터리 읽기 판정에 쓴다). */
function chainedValues(spans, glued) {
  const values = [];
  for (let start = 0; start < spans.length; start += 1) {
    let value = spans[start].value;
    let end = start;
    values.push({ value, continues: end + 1 < spans.length && glued(end) });
    while (end + 1 < spans.length && glued(end)) {
      end += 1;
      value = `${value}/${spans[end].value}`.replace(/\/{2,}/g, '/');
      values.push({ value, continues: end + 1 < spans.length && glued(end) });
    }
  }
  return values;
}

/** 리터럴 안에서 저장소 루트로 시작하는 경로. 다른 디렉터리 안(frontend/scripts/…)은 빼고 ../·${…}/ 뒤는 받는다. */
function pathTokens(text) {
  const tokens = [];
  for (const match of text.matchAll(ROOT_PATH)) {
    const before = text.slice(0, match.index);
    if (/[\w.-]$/.test(before)) continue;
    if (before.endsWith('/') && !/(?:^|[^\w.-])\.{1,2}\/$|[})]\/$/.test(before)) continue;
    tokens.push(match[0].replace(/[*$].*$/s, ''));
  }
  return tokens;
}

function sourceDependencies(file, source, fileSet) {
  const result = { paths: new Set(), directories: new Set(), executes: new Set() };
  const directory = path.posix.dirname(file);
  const resolveRelative = value => path.posix.normalize(path.posix.join(directory, value.replace(/[?#].*$/s, '')));
  const record = ({ value, continues }) => {
    const relative = /^\.\.?\//.test(value.trim());
    const target = relative ? resolveRelative(value.trim()) : value.trim();
    const bare = target.replace(/\/+$/, '');
    if (!continues && DIRECTORIES.has(bare)) result.directories.add(bare);
    for (const token of pathTokens(value)) result.paths.add(token);
    // 저장소 루트 자체(`'../..'` 가 '.' 로 풀린 것)는 경로 읽기가 아니다 — 접두 비교에서 '.' 은 점으로 시작하는 경로만 덮어
    // 훅 어댑터에 읽지도 않는 축을 붙였다(2026-10-27 독립 검토). 디렉터리째 읽기는 DIRECTORIES 가 따로 센다.
    if (relative && target !== '.' && !target.startsWith('..')) result.paths.add(target);
  };
  let spawnsNode = false;
  if (file.endsWith('.java')) {
    const { spans, code } = javaLiteralSpans(source);
    chainedValues(spans, index => /^\s*(?:,|\+|\)\s*\.resolve\(\s*)\s*$/.test(spans[index + 1].before)).forEach(record);
    spawnsNode = /\bProcessBuilder\b/.test(code) && spans.some(span => span.value === 'node');
  } else if (JS_SOURCE.test(file)) {
    const { tokens } = tokenizeDependencies(source, file);
    const literals = tokens.map((token, index) => ({ ...token, index }))
      .filter(token => token.type === 'string' || token.type === 'template')
      // A traversal rejection compares a prefix; it does not read the containing tools/ directory.
      // Keep actual readdir('../') and join('../', ...) reads in the conservative census.
      .filter(token => !(/^\.{1,2}\/$/.test(token.value)
        && tokens[token.index - 3]?.value === '.' && tokens[token.index - 2]?.value === 'startsWith'
        && tokens[token.index - 1]?.value === '('));
    chainedValues(literals, index => literals[index + 1].index === literals[index].index + 2
      && [',', '+'].includes(tokens[literals[index].index + 1]?.value)).forEach(record);
    const { references, issues } = parseModuleReferences(source, file);
    for (const reference of references) {
      if (!/^\.\.?\//.test(reference.specifier)) continue;
      const resolved = resolveRelative(reference.specifier);
      const target = ['', '.ts', '.tsx', '.mjs', '.js'].map(extension => `${resolved}${extension}`).find(candidate => fileSet.has(candidate));
      if (target) result.executes.add(target);
    }
    spawnsNode = issues.some(issue => issue.code === 'UNPARSEABLE_DYNAMIC_IMPORT')
      || tokens.some(token => (token.type === 'identifier' && token.value === 'execPath')
        || ((token.type === 'string' || token.type === 'template') && /^node(?:\s|$)/.test(token.value)));
  }
  if (spawnsNode) for (const candidate of result.paths) if (fileSet.has(candidate) && JS_SOURCE.test(candidate)) result.executes.add(candidate);
  return result;
}

/** ci.yml 의 조건부 잡·단계가 node 로 실행하는 파일과 그 축. */
function workflowEntrypoints(workflow, packages) {
  const entrypoints = [];
  for (const job of workflow.replace(/\r\n/g, '\n').split(/\n(?= {2}[a-z0-9-]+:\n)/)) {
    const name = job.match(/^ {2}([a-z0-9-]+):/)?.[1];
    if (!name) continue;
    const jobCondition = job.match(/\n {4}if: (.*)/)?.[1] ?? '';
    for (const step of job.split(/\n(?= {6}- )/).slice(1)) {
      const run = step.match(/\n {8}run: ([^\n]*(?:\n {10,}[^\n]*)*)/)?.[1];
      if (!run) continue;
      const condition = `${jobCondition} ${step.match(/\n {8}if: (.*)/)?.[1] ?? ''}`;
      const axes = [...new Set([...condition.matchAll(/outputs(?:\.|\[')([\w-]+)/g)].map(match => OUTPUT_AXIS[match[1]]).filter(Boolean))];
      if (/needs\.e2e-tests\.result/.test(condition)) axes.push('e2e');
      const workingDirectory = step.match(/\n {8}working-directory: (\S+)/)?.[1] ?? '';
      let text = run;
      for (const call of run.matchAll(/\b(?:npm run|pnpm run|pnpm)\s+([\w:.-]+)/g)) {
        const script = packages[workingDirectory === 'frontend' ? 'frontend' : '']?.scripts?.[call[1]];
        if (script) text += `\n${workingDirectory === 'frontend' ? script.replace(/(^|[\s"'])(scripts\/)/g, '$1frontend/$2') : script}`;
      }
      const paths = [...text.matchAll(/(?:\.\.?\/)*(?:frontend\/)?(?:scripts|tools\/project-composer)\/[\w.\-/*]+/g)]
        .map(match => path.posix.normalize(match[0].startsWith('.') && workingDirectory ? `${workingDirectory}/${match[0]}` : match[0]));
      entrypoints.push({ job: name, axes, paths: [...new Set(paths)] });
    }
  }
  return entrypoints;
}

/**
 * 표의 항목마다 그 경로를 읽거나 실행하는 소스와 축. `files`·`read` 를 바꿔 끼워 합성 저장소로도 판정한다.
 * 결과: { entries: Map<항목 경로, Map<축, Set<읽는 소스>>>, readers, entrypoints }.
 */
function toolPathEvidence({ files, read, table = GENERATOR_TOOL_PATHS }) {
  const fileSet = new Set(files);
  const entryOf = file => table.find(entry => entry.exact ? file === entry.path : file.startsWith(entry.path)) ?? null;
  // 같은 이름의 파일은 같은 원문이다(합성 시험은 새 이름만 더한다). 시험마다 저장소 전체를 다시 읽지 않는다.
  const dependencies = file => {
    if (!DEPENDENCY_CACHE.has(file)) DEPENDENCY_CACHE.set(file, sourceDependencies(file, read(file), fileSet));
    return DEPENDENCY_CACHE.get(file);
  };
  const axesOfChange = file => {
    const result = classifyChangedFiles([file]);
    return AXES.filter(axis => result[axis] === true);
  };

  const readers = new Map();
  const addReader = (file, axes, executed = false) => {
    const reader = readers.get(file) ?? { axes: new Set(), executed: false };
    axes.forEach(axis => reader.axes.add(axis));
    reader.executed ||= executed;
    readers.set(file, reader);
  };
  for (const file of files) {
    if (/^(?:foundation|business-core|business-app)\/src\/(?:test|testFixtures)\/.*\.java$/.test(file)) addReader(file, ['backend', 'mutation']);
    else if (/^api-server\/src\/(?:test|testFixtures)\/.*\.java$/.test(file)) {
      addReader(file, read(file).includes('@Tag("schema-validation")') ? ['schema'] : ['backend']);
    } else if (/^migration-tool\/src\/(?:test|testFixtures)\/.*\.java$/.test(file)) addReader(file, ['migration', 'mutationMigrationTool']);
    else if (/^(?:foundation|business-core|business-app|api-server|migration-tool)\/src\/main\/.*\.java$/.test(file)) addReader(file, axesOfChange(file));
    else if (/^frontend\/.*\.test\.tsx?$/.test(file)) addReader(file, file.startsWith('frontend/src/__tests__/cross-stack/') ? ['atlas'] : ['frontend']);
    else if (/^frontend\/src\/.*\.(?:ts|tsx|mts|mjs|js)$/.test(file)) addReader(file, ['frontend', 'e2e']);
    else if (/^frontend\/e2e\/.*\.(?:ts|tsx|mts|mjs|js)$/.test(file)) addReader(file, ['e2e']);
  }
  const entrypoints = workflowEntrypoints(read('.github/workflows/ci.yml'), {
    '': JSON.parse(read('package.json')), frontend: JSON.parse(read('frontend/package.json')),
  });
  // 'scripts/*.test.mjs' 같은 glob 은 그 모양의 파일만 실행한다(같은 디렉터리의 다른 파일은 실행하지 않는다).
  const runs = (pattern, file) => file === pattern || (pattern.includes('*')
    && new RegExp(`^${pattern.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`).test(file));
  for (const { axes, paths } of entrypoints) {
    if (axes.length === 0) continue;
    for (const pattern of paths) for (const file of files) if (runs(pattern, file)) addReader(file, axes, true);
  }

  const entries = new Map(table.map(entry => [entry.path, new Map()]));
  const covering = token => files.filter(file => file === token || file.startsWith(token));
  for (const [reader, { axes, executed }] of readers) {
    if (axes.size === 0) continue;
    const reached = new Set();
    const chain = [];
    if (entryOf(reader)) {
      reached.add(reader);
      if (executed) chain.push(reader);
    }
    const own = dependencies(reader);
    for (const token of own.paths) covering(token).forEach(file => reached.add(file));
    for (const directory of own.directories) covering(`${directory}/`).forEach(file => reached.add(file));
    for (const module of own.executes) {
      reached.add(module);
      if (entryOf(module)) chain.push(module);
    }
    // 실행한 표 안 모듈이 다시 실행·읽는 표 안 파일(표 안 사슬).
    const visited = new Set(chain);
    while (chain.length > 0) {
      const module = dependencies(chain.shift());
      const inTable = [...module.executes, ...[...module.paths].flatMap(covering),
        ...[...module.directories].flatMap(directory => covering(`${directory}/`))].filter(file => entryOf(file));
      for (const file of inTable) {
        reached.add(file);
        if (module.executes.has(file) && !visited.has(file)) {
          visited.add(file);
          chain.push(file);
        }
      }
    }
    for (const file of reached) {
      const entry = entryOf(file);
      if (!entry) continue;
      const evidence = entries.get(entry.path);
      for (const axis of axes) {
        if (!evidence.has(axis)) evidence.set(axis, new Set());
        evidence.get(axis).add(reader);
      }
    }
  }
  return { entries, readers, entrypoints };
}

/** 표와 계산이 다른 항목, 맞는 파일이 없는 항목. */
function toolPathMismatches({ files, read, table = GENERATOR_TOOL_PATHS }) {
  const { entries } = toolPathEvidence({ files, read, table });
  const problems = [];
  for (const entry of table) {
    if (!files.some(file => entry.exact ? file === entry.path : file.startsWith(entry.path))) problems.push(`${entry.path}: 맞는 파일이 없는 항목이다(낡은 항목).`);
    const evidence = entries.get(entry.path);
    const required = [...evidence.keys()].sort();
    const declared = [...entry.axes].sort();
    if (JSON.stringify(required) === JSON.stringify(declared)) continue;
    const missing = required.filter(axis => !declared.includes(axis))
      .map(axis => `${axis} 를 켜야 한다(읽는 소스: ${[...evidence.get(axis)].sort().slice(0, 5).join(', ')})`);
    const extra = declared.filter(axis => !required.includes(axis)).map(axis => `${axis} 를 읽는 소스가 없다`);
    problems.push(`${entry.path}: ${[...missing, ...extra].join('; ')}`);
  }
  return problems;
}

const repositoryFiles = trackedAndUntrackedFiles(repoRoot).map(file => file.replaceAll('\\', '/'));
const readRepository = file => readFileSync(path.join(repoRoot, file), 'utf8');

test('every generator-tool table entry selects exactly the axes of the sources that read or run it', () => {
  assert.deepEqual(toolPathMismatches({ files: repositoryFiles, read: readRepository }), []);
});

test('a parent traversal prefix check is not a directory read while an actual parent read still is', () => {
  const file = 'tools/migration-workspace/synthetic-path-reader.mjs';
  const guard = sourceDependencies(file, "if (candidate.startsWith('../')) throw new Error('outside');", new Set());
  assert.deepEqual([...guard.directories], []);
  assert.deepEqual([...guard.paths], []);
  const read = sourceDependencies(file, "const entries = readdirSync('../');", new Set());
  assert.deepEqual([...read.directories], ['tools']);
  assert.ok([...read.paths].some(value => value.replace(/\/+$/, '') === 'tools'));
  const joinedRead = sourceDependencies(file, "readFileSync(join('../', 'project-composer/public/app.js'));", new Set());
  assert.ok(joinedRead.paths.has('tools/project-composer/public/app.js'));
});

test('the reader census is not vacuous: tests, workflow entrypoints and the composer browser test are all read', () => {
  const { readers, entrypoints, entries } = toolPathEvidence({ files: repositoryFiles, read: readRepository });
  const count = pattern => [...readers.keys()].filter(file => pattern.test(file)).length;
  // 2026-10-13 실측: Java 시험 712·프런트 vitest 488 — 열거가 깨져 모집단이 사라지면 표가 모두 녹색이 된다.
  assert.ok(count(/^[a-z-]+\/src\/(?:test|testFixtures)\/.*\.java$/) >= 600, 'Java test sources are no longer enumerated');
  assert.ok(count(/^frontend\/.*\.test\.tsx?$/) >= 400, 'frontend vitest sources are no longer enumerated');
  const composer = entrypoints.find(entry => entry.job === 'e2e-tests' && entry.paths.includes('tools/project-composer/ui.test.mjs'));
  assert.deepEqual(composer?.axes, ['e2e'], 'the composer browser test must be read as an e2e entrypoint of ci.yml');
  assert.ok(entries.get('tools/project-composer/').get('e2e')?.has('tools/project-composer/ui.test.mjs'));
  assert.ok(entries.get('config/modules/').get('schema')
    ?.has('api-server/src/test/java/nuri/api/schema/BaseAdminBootstrapSeedIntegrationTest.java'));
});

// red 증명을 계약으로 남긴다: 표의 경로 문자열을 하네스 시험 소스에 넣으면 그 항목에 backend 가 빠졌다고 실패한다.
test('a harness test that starts reading a table path makes the table red until the entry turns that axis on', () => {
  const harness = 'api-server/src/test/java/nuri/api/harness/SyntheticToolReaderTest.java';
  const files = [...repositoryFiles, harness];
  const read = file => file === harness
    ? 'class SyntheticToolReaderTest { String ui = HarnessSourceIndex.read(root.resolve("tools/project-composer/public/app.js")); }'
    : readRepository(file);
  const problems = toolPathMismatches({ files, read });
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /^tools\/project-composer\/: backend 를 켜야 한다\(읽는 소스: .*SyntheticToolReaderTest\.java\)$/);
  // 축을 켜면 다시 녹색이다 — 계약은 축이 사실과 같기를 요구하지 표를 막지 않는다.
  const table = GENERATOR_TOOL_PATHS.map(entry => (entry.path === 'tools/project-composer/' ? { ...entry, axes: ['backend', 'e2e'] } : entry));
  assert.deepEqual(toolPathMismatches({ files, read, table }), []);
});

test('a test that starts reading an agent hook adapter makes the table red, while a bare repository-root reference does not', () => {
  // 의존성은 파일 이름으로 캐시되므로 두 사례는 서로 다른 합성 파일을 쓴다.
  const withReader = (reader, body) => ({
    files: [...repositoryFiles, reader],
    read: file => (file === reader ? body : readRepository(file)),
  });
  const problems = toolPathMismatches(withReader('frontend/src/__tests__/synthetic-hook-reader.test.ts',
    "const hooks = readFileSync(join(root, '.codex/hooks.json'), 'utf8');"));
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /^\.codex\/hooks\.json: frontend 를 켜야 한다\(읽는 소스: .*synthetic-hook-reader\.test\.ts\)$/);
  // 루트만 가리키는 상대 경로는 점으로 시작하는 표 경로를 읽은 것으로 세지 않는다.
  assert.deepEqual(toolPathMismatches(withReader('frontend/src/__tests__/synthetic-root-reference.test.ts',
    "const root = resolve(__dirname, '../../..');")), []);
});

test('directory reads, joined literals and execution chains inside the table count as reads', () => {
  const vitest = 'frontend/src/__tests__/synthetic-tool-directory.test.ts';
  const spawner = 'api-server/src/test/java/nuri/api/schema/SyntheticToolRunnerIntegrationTest.java';
  const sources = {
    [vitest]: "import { join } from 'node:path';\nconst menus = join(REPO_ROOT, 'config', 'project-composer-menus.json');\n"
      + "const directory = join(REPO_ROOT, 'tools', 'project-composer');\n",
    [spawner]: '@Tag("schema-validation") class SyntheticToolRunnerIntegrationTest { Process p = new ProcessBuilder("node", "tools/project-composer/ui.test.mjs").start(); }',
  };
  const files = [...repositoryFiles, ...Object.keys(sources)];
  const { entries } = toolPathEvidence({ files, read: file => sources[file] ?? readRepository(file) });
  // 'config' 와 'project-composer-menus.json' 은 따로는 아무것도 가리키지 않는다 — 이어야 파일 하나를 가리킨다.
  assert.ok(entries.get('config/project-composer-menus.json').get('frontend')?.has(vitest), 'joined literals name one file');
  assert.ok(entries.get('tools/project-composer/').get('frontend')?.has(vitest), 'a joined directory literal reads the directory');
  // ui.test.mjs 를 실행하면 그것이 import 하는 표 안 모듈(scripts/project-composer-*.mjs)도 실행한다.
  assert.ok(entries.get('tools/project-composer/').get('schema')?.has(spawner));
  assert.ok(entries.get('scripts/project-composer').get('schema')?.has(spawner), 'the table-internal execution chain is followed');
  // 주석 속 경로는 읽기가 아니다.
  const commented = 'frontend/src/__tests__/synthetic-tool-comment.test.ts';
  const quiet = toolPathEvidence({
    files: [...repositoryFiles, commented],
    read: file => (file === commented ? "// tools/project-composer/public/app.js 를 언급만 한다\nexport {};\n" : readRepository(file)),
  });
  assert.equal(quiet.entries.get('tools/project-composer/').get('frontend'), undefined);
});

const PRESET_IDS = presetIds();
const HEAVY_UNRELATED = ['migration', 'mutation', 'mutationMigrationTool', 'frontend'];
// PR 은 `ci.pr` 이 null 인 시작 구성(13b 의 인증 시작 구성)을 빼고 나머지를 한 레이아웃씩 돈다(DEC-OPS-296). 뺀 시작 구성은 main·T2 몫이다.
const PR_VERIFIED_PRESETS = PRESET_IDS.filter(id => PR_REUSABLE_LAYOUT[id] !== null);

test('a synthetic PR touching only generator-tool paths skips backend, migration and PIT where no test reads them', () => {
  const result = classifyChangedFiles(['tools/project-composer/public/app.js', 'tools/project-composer/ui.test.mjs'], { event: 'pull_request' });
  assert.deepEqual(result.unknownFiles, []);
  for (const field of ['backend', 'schema', ...HEAVY_UNRELATED, 'docsOnly', 'atlas']) assert.equal(result[field], false, field);
  for (const field of ['e2e', 'reusable', 'reusableCustom', 'sast', 'governance', 'secretScan']) assert.equal(result[field], true, field);
  assert.deepEqual(result.reusableProfiles, PRESET_IDS);
  assert.deepEqual(result.reusableMatrix.include.map(entry => entry.profile), PR_VERIFIED_PRESETS,
    'a pull request still verifies every preset it does not leave to main once');
});

// The packaged workspace test reads only the three engine inputs. UI/server/AI retain their independent contracts.
test('workspace UI and server changes keep contracts, SAST and reuse checks without migration or product lanes', () => {
  for (const files of [['tools/migration-workspace/server.mjs', 'tools/migration-workspace/public/styles.css'],
    ['tools/migration-workspace/ai.mjs'], ['tools/migration-workspace-prototype/serve.mjs']]) {
    const result = classifyChangedFiles(files, { event: 'pull_request' });
    assert.deepEqual(result.unknownFiles, [], files.join(','));
    for (const field of ['backend', 'schema', 'e2e', ...HEAVY_UNRELATED, 'docsOnly', 'atlas']) assert.equal(result[field], false, `${files}: ${field}`);
    for (const field of ['reusable', 'sast', 'secretScan']) assert.equal(result[field], true, `${files}: ${field}`);
    assert.deepEqual(result.reusableProfiles, PRESET_IDS);
  }
  const paired = classifyChangedFiles(['tools/migration-workspace/engine.mjs', 'migration-tool/src/main/java/nuri/migration/WorkflowCliOptions.java']);
  assert.equal(paired.migration, true);
  assert.equal(paired.mutationMigrationTool, true);
  for (const near of ['tools/migration-workspacex/a.js', 'tools/migration-workspace.mjs']) {
    assert.equal(generatorToolEntry(near), null, near);
    assert.deepEqual(classifyChangedFiles([near]).unknownFiles, [near], near);
  }
});

test('actual workspace engine inputs select their packaged-test reader axes and reject prefix lookalikes', () => {
  for (const input of ['engine.mjs', 'store.mjs', 'inputs.mjs']) {
    const file = `tools/migration-workspace/${input}`;
    assert.deepEqual(generatorToolEntry(file), { path: file, exact: true, axes: ['migration', 'mutationMigrationTool'] });
    const result = classifyChangedFiles([file]);
    assert.deepEqual(result.unknownFiles, []);
    for (const axis of AXES) assert.equal(result[axis], ['migration', 'mutationMigrationTool'].includes(axis), `${file}: ${axis}`);
    for (const field of ['reusable', 'sast', 'secretScan']) assert.equal(result[field], true, `${file}: ${field}`);
    for (const suffix of ['.bak', '/nested.mjs', '.test.mjs']) {
      assert.equal(generatorToolEntry(file + suffix).path, 'tools/migration-workspace/');
      assert.equal(classifyChangedFiles([file + suffix]).migration, false);
    }
  }
  // Removing either real reader axis must fail the existing source census; no new exception list.
  for (const axis of ['migration', 'mutationMigrationTool']) {
    const table = GENERATOR_TOOL_PATHS.map(entry => entry.path === 'tools/migration-workspace/engine.mjs'
      ? { ...entry, axes: entry.axes.filter(value => value !== axis) } : entry);
    const problems = toolPathMismatches({ files: repositoryFiles, read: readRepository, table });
    assert.ok(problems.some(problem => problem.startsWith('tools/migration-workspace/engine.mjs:')
      && problem.includes(`${axis} 를 켜야 한다`)), problems.join('\n'));
  }
});

test('generator scripts and feature declarations keep only the axes their readers run in and still skip migration, PIT and frontend', () => {
  for (const file of ['scripts/project-composer-diff.mjs', 'scripts/reusable-source-java.mjs', 'config/modules/board.json',
    'scripts/generate-reusable-base-db.mjs', 'scripts/verify-reusable-base.mjs', 'config/project-composer-menus.json']) {
    const entry = generatorToolEntry(file);
    assert.ok(entry, `${file} must be a generator-tool path`);
    const result = classifyChangedFiles([file]);
    assert.deepEqual(result.unknownFiles, [], file);
    for (const axis of AXES) assert.equal(result[axis], entry.axes.includes(axis), `${file}: ${axis}`);
    for (const field of HEAVY_UNRELATED) assert.equal(result[field], false, `${file}: ${field}`);
    assert.deepEqual(result.reusableProfiles, PRESET_IDS, file);
    assert.equal(result.reusableCustom, true, file);
  }
});

test('generator-tool paths do not open a fast path around unknown, policy or classifier inputs', () => {
  for (const extra of ['scripts/ci-change-scope.mjs', 'scripts/composition-profiles.mjs', 'scripts/verify.mjs', '.github/workflows/ci.yml', 'unheard-of/x.bin']) {
    const result = classifyChangedFiles(['scripts/project-composer-diff.mjs', extra]);
    assert.deepEqual(result.unknownFiles, [extra]);
    for (const field of ['backend', 'migration', 'frontend', 'schema', 'e2e', 'mutation', 'mutationMigrationTool']) {
      assert.equal(result[field], true, `${extra}: ${field}`);
    }
  }
  // 표의 경로와 접두만 같은 다른 이름은 표에 맞지 않는다.
  for (const near of ['config/modulesx.json', 'tools/project-composerx/a.js', 'scripts/reusable.mjs', 'frontend/scripts/project-composer.mjs']) {
    assert.equal(generatorToolEntry(near), null, near);
  }
  // 표는 닫힌 축 어휘만 쓰고, 축은 이름 순이다(표와 계약의 대조가 순서로 흔들리지 않게).
  for (const entry of GENERATOR_TOOL_PATHS) {
    assert.ok(entry.axes.every(axis => AXES.includes(axis)), entry.path);
    assert.deepEqual([...entry.axes], [...entry.axes].sort(), entry.path);
  }
});

test('Atlas and operation-census tooling retains its audited consumers without unrelated product lanes', () => {
  for (const file of ['scripts/atlas-catalog.mjs', 'scripts/atlas-catalog.test.mjs',
    'scripts/build-atlas.mjs', 'config/governance/operation-consumer-census.json']) {
    const result = classifyChangedFiles([file]);
    const entry = generatorToolEntry(file);
    assert.ok(entry, file);
    assert.deepEqual(result.unknownFiles, [], file);
    assert.equal(result.docsOnly, false, file);
    for (const axis of ['backend', 'schema', 'e2e', ...HEAVY_UNRELATED]) {
      assert.equal(result[axis], entry.axes.includes(axis), `${file}: ${axis}`);
    }
    assert.equal(result.atlas, file !== 'config/governance/operation-consumer-census.json', file);
    assert.equal(result.governance, true, file);
    assert.equal(result.sast, true, file);
    assert.equal(result.reusableCustom, true, file);
    const unknown = classifyChangedFiles([file, 'scripts/new-unmapped-tool.mjs']);
    for (const axis of AXES.filter(axis => axis !== 'atlas')) assert.equal(unknown[axis], true, `${file}: unknown input restores ${axis}`);
  }
});

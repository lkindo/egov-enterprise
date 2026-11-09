#!/usr/bin/env node
/**
 * push 전에 같이 돌릴 시험을 고른다 — 바꾼 파일을 실제로 읽는 시험(2026-11-10).
 *
 * 로컬 표적 시험이 통과한 변경이 post-push·CI 에서만 붉어지는 일이 반복됐다. 2026-11-09 next-env.d.ts 추적 해제(#1072)는 표적 시험
 * 4개가 녹색이었는데 두 곳이 붉었다 — 과거 릴리스 식별 시험은 바꾼 모듈을 두 단계 건너 import 했고(release-images.test.mjs →
 * historical-release-fixture.mjs → ui-quality-baseline-core.mjs), Java 하네스 시험은 바꾼 스크립트의 경로를 문자열로 적고 그 명령을
 * 고정했다(WorkflowManifestLinterTest). 이 도구는 그 두 연결을 찾는다.
 *
 * - node 시험(scripts·frontend/scripts·tools 의 *.test.mjs): 상대 경로 import 를 따라간 폐포에 바꾼 파일이 있으면 고른다.
 * - 모든 시험 소스(Java 시험, node 시험, 프런트 단위 시험, E2E): 바꾼 파일의 저장소 경로를 글자 그대로 적었으면 고른다.
 *   Java 소스를 바꿨으면 그 클래스 이름을 적은 Java 시험도 고른다.
 * - 프런트 소스는 vitest 의 related(바꾼 파일을 import 하는 단위 시험)로 넘긴다.
 *
 * 추천일 뿐 게이트가 아니다 — 경로를 조각으로 이어 붙이거나 디렉터리를 훑는 시험은 찾지 못한다. 범위별 최소 검증(AGENTS.md)과
 * post-push·required CI 를 대신하지 않는다. Java 시험은 태그별 Gradle 작업으로 돌려야 한다(태그 시험을 :test 로 돌리면 0건이다).
 *
 * 사용법: node scripts/impact-tests.mjs --diff <base> | --for <경로…> [--json]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseModuleReferences } from './frontend-module-graph.mjs';
import { candidatePaths } from './frontend-module-resolver.mjs';

const NODE_TEST = /^(?:scripts\/[^/]+|frontend\/scripts\/.+|tools\/.+)\.test\.mjs$/u;
const SCRIPT_MODULE = /\.(?:mjs|js|cjs)$/u;
const TEST_SOURCE = /(?:^[^/]+\/src\/test\/.+\.java$|\.test\.(?:mjs|ts|tsx|js)$|\/__tests__\/.+\.(?:ts|tsx)$|^frontend\/e2e\/.+\.ts$)/u;
const FRONTEND_SOURCE = /^frontend\/src\/.+\.(?:ts|tsx)$/u;
const JAVA_MAIN = /^([^/]+)\/src\/main\/java\/.+\/([A-Za-z_$][\w$]*)\.java$/u;
const JAVA_TAG_TASKS = Object.freeze({
  'governance-harness': 'harnessTest',
  'schema-validation': 'schemaValidationTest',
});
const VENDOR_TAG = 'vendor-conformance';

/** 상대 import 폐포를 계산하는 판독기 — 파일마다 한 번만 읽고 해석한다. */
export function importClosureReader(root, { read = (file) => fs.readFileSync(path.join(root, file), 'utf8'),
  isFile = (file) => { try { return fs.statSync(path.join(root, file)).isFile(); } catch { return false; } } } = {}) {
  const references = new Map();
  const directImports = (file) => {
    if (!references.has(file)) {
      let found = [];
      try {
        found = parseModuleReferences(read(file), file).references
          .filter(({ specifier, typeOnly }) => !typeOnly && (specifier.startsWith('./') || specifier.startsWith('../')))
          .map(({ specifier }) => candidatePaths(path.resolve(root, path.dirname(file), specifier))
            .map((candidate) => path.relative(root, candidate).split(path.sep).join('/'))
            .find((candidate) => !candidate.startsWith('..') && isFile(candidate)))
          .filter(Boolean);
      } catch {
        found = [];
      }
      references.set(file, found);
    }
    return references.get(file);
  };
  /** 시험 파일에서 바꾼 파일까지 가는 import 사슬 하나(없으면 null). */
  return function importChain(test, changed) {
    const previous = new Map([[test, null]]);
    const queue = [test];
    while (queue.length > 0) {
      const file = queue.shift();
      if (changed.has(file) && file !== test) {
        const chain = [];
        for (let at = file; at !== null; at = previous.get(at)) chain.unshift(at);
        return chain;
      }
      if (!SCRIPT_MODULE.test(file)) continue;
      for (const next of directImports(file)) {
        if (previous.has(next)) continue;
        previous.set(next, file);
        queue.push(next);
      }
    }
    return null;
  };
}

/**
 * 바꾼 파일을 읽는 시험을 고른다.
 * @param {string[]} changed 바꾼 파일(저장소 상대 경로)
 * @param {{ tracked: string[], importChain: (test: string, changed: Set<string>) => string[] | null,
 *   mentions: (needle: string) => string[], read: (file: string) => string, exists: (file: string) => boolean }} repository
 */
export function selectImpactTests(changed, repository) {
  const changedSet = new Set(changed);
  const reasons = new Map();
  // 지운 시험은 돌릴 수 없다 — 지운 경로는 그것을 읽는 다른 시험을 찾는 데만 쓴다.
  const add = (test, reason) => {
    if (!repository.exists(test)) return;
    if (!reasons.has(test)) reasons.set(test, []);
    reasons.get(test).push(reason);
  };
  // 바꾼 시험은 그 자체로 고른다(Java·node·프런트·E2E). 아직 추적하지 않은 새 시험도 바꾼 파일이다 — ls-files 만 보면 빠진다.
  for (const file of changed) if (TEST_SOURCE.test(file)) add(file, '바꾼 시험');
  for (const test of repository.tracked.filter((file) => NODE_TEST.test(file) && !changedSet.has(file))) {
    const chain = repository.importChain(test, changedSet);
    if (chain) add(test, `import: ${chain.join(' → ')}`);
  }
  for (const file of changed) {
    for (const test of repository.mentions(file).filter((candidate) => TEST_SOURCE.test(candidate) && candidate !== file)) {
      add(test, `경로를 적음: ${file}`);
    }
    const javaClass = JAVA_MAIN.exec(file)?.[2];
    if (javaClass) {
      for (const test of repository.mentions(javaClass).filter((candidate) => candidate.endsWith('.java') && TEST_SOURCE.test(candidate))) {
        add(test, `클래스를 적음: ${javaClass}`);
      }
    }
  }
  const tests = [...reasons.keys()].sort();
  const node = tests.filter((test) => NODE_TEST.test(test));
  const java = tests.filter((test) => test.endsWith('.java'));
  const e2e = tests.filter((test) => test.startsWith('frontend/e2e/') && !NODE_TEST.test(test));
  const frontendUnit = tests.filter((test) => test.startsWith('frontend/src/'));
  const javaTasks = new Map();
  const vendor = [];
  for (const test of java) {
    const module = test.split('/')[0];
    const tag = /@Tag\("([a-z-]+)"\)/u.exec(repository.read(test))?.[1];
    // 벤더 적합성 시험은 -PvendorIntegration 과 준비된 벤더 DB 가 있어야 등록·실행된다 — 원본 저장소의 Gradle 명령으로 추천하지 않는다.
    if (tag === VENDOR_TAG) {
      vendor.push(test);
      continue;
    }
    const task = `:${module}:${JAVA_TAG_TASKS[tag] ?? 'test'}`;
    const name = path.basename(test, '.java');
    if (!javaTasks.has(task)) javaTasks.set(task, []);
    javaTasks.get(task).push(name);
  }
  const frontendChanged = changed.filter((file) => FRONTEND_SOURCE.test(file) && repository.exists(file));
  const commands = [];
  if (node.length) commands.push(`node --test ${node.join(' ')}`);
  for (const [task, names] of javaTasks) commands.push(`./gradlew ${task} ${names.map((name) => `--tests '*${name}'`).join(' ')}`);
  if (frontendChanged.length || frontendUnit.length) {
    commands.push(`pnpm -C frontend exec vitest related --run ${[...new Set([...frontendChanged, ...frontendUnit])]
      .map((file) => file.slice('frontend/'.length)).join(' ')}`);
  }
  return {
    changed,
    tests: tests.map((test) => ({ test, reasons: reasons.get(test) })),
    e2e,
    vendor,
    commands,
  };
}

/** 명령줄의 경로(`.\a\b`, `./a/b`, 하위 폴더에서 준 상대 경로, 절대 경로)를 저장소 상대 경로로 맞춘다. */
export function toRepositoryPath(root, input, cwd = process.cwd()) {
  return path.relative(root, path.resolve(cwd, input)).split(path.sep).join('/');
}

function render(result) {
  const lines = [`바꾼 파일 ${result.changed.length}개를 읽는 시험 ${result.tests.length}개`];
  for (const { test, reasons } of result.tests) lines.push(`- ${test}`, ...reasons.map((reason) => `    ${reason}`));
  if (result.commands.length) lines.push('', 'push 전에 돌릴 명령:', ...result.commands.map((command) => `  ${command}`));
  if (result.e2e.length) lines.push('', `E2E 시험 ${result.e2e.length}개도 바꾼 파일을 적는다 — 격리 E2E 나 CI 에서 확인한다.`);
  if (result.vendor.length) {
    lines.push('', `벤더 적합성 시험 ${result.vendor.length}개도 고른다 — 원본 저장소에서 Gradle 로 돌리지 않는다. 생성한 벤더 프로젝트의 검증`
      + '(scripts/project-composer-vendor-integration.mjs)이나 CI 의 reusable-vendor 잡이 돌며, 인증 입력이면 증거를 다시 기록한다.');
  }
  lines.push('', '추천이다. 경로를 조각으로 잇거나 디렉터리를 훑는 시험은 못 찾는다 — post-push·required CI 를 대신하지 않는다.');
  return lines.join('\n');
}

async function main(argv) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split(/\r?\n/u).filter(Boolean);
  const json = argv.includes('--json');
  const args = argv.filter((arg) => arg !== '--json');
  let changed;
  if (args[0] === '--for' && args.length > 1) {
    changed = args.slice(1).map((file) => toRepositoryPath(root, file));
  } else if (args[0] === '--diff' && args.length === 2) {
    const base = git('merge-base', args[1], 'HEAD')[0];
    changed = [...new Set([...git('diff', '--name-only', base), ...git('ls-files', '--others', '--exclude-standard')])];
  } else {
    process.stderr.write('사용법: node scripts/impact-tests.mjs --diff <base> | --for <경로…> [--json]\n');
    process.exitCode = 2;
    return;
  }
  const mentions = (needle) => {
    try {
      return git('grep', '-l', '-F', '-e', needle, '--', '*.java', '*.mjs', '*.ts', '*.tsx', '*.js');
    } catch {
      return [];
    }
  };
  const result = selectImpactTests(changed, {
    tracked: git('ls-files'),
    importChain: importClosureReader(root),
    mentions,
    read: (file) => fs.readFileSync(path.join(root, file), 'utf8'),
    exists: (file) => fs.existsSync(path.join(root, file)),
  });
  process.stdout.write(`${json ? JSON.stringify(result, null, 2) : render(result)}\n`);
}

if (typeof process !== 'undefined' && /(?:^|[\\/])impact-tests\.mjs$/u.test(process.argv?.[1] ?? '')) {
  await main(process.argv.slice(2));
}

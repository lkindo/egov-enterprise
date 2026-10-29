// .gitignore 가 소스 폴더를 조용히 빼지 않는지, 실제 출력 위치와 비밀 파일은 계속 가리는지 양방향으로 본다.
//
// 앵커 없는 패턴(`**/upload/`·`logs/`·`**/coverage`·`dist` 처럼 앞·가운데 슬래시가 없는 줄)은 그 이름을 가진 모든 깊이의 폴더를 무시한다.
// 무시된 새 파일은 `git status` 의 `??` 에도 나오지 않아, 로컬에는 파일이 있으니 tsc·vitest·운영 계약이 green 이고
// CI 체크아웃에만 파일이 없어 Module not found 로 붉다. CI 는 무시된 파일을 받지 못하므로 원리적으로 이 실패를 미리 잡지 못한다 —
// 그래서 무시 규칙 자체를 여기서 본다. 실제 사례:
//   - 2026-03-26 관리자 로그 화면 frontend/src/app/admin/system/logs (`**/logs/`, 당시 `!**/src/**/logs/` 예외로만 막았다)
//   - 2026-09-27 frontend/src/lib/upload/server-upload-limits.ts (`**/upload/`, CI 만 Module not found)
//
// ⓐ 소스 루트 아래의 탐침 경로는 무시되지 않는다. 탐침 이름은 흔한 낱말(GENERIC_NAMES)과, 추적된 .gitignore 들의 모든 깊이
//    패턴(디렉터리 줄과 슬래시 없는 이름 줄)에서 뽑은 이름 가운데 허용 목록(TOOL_OUTPUT_NAMES·FILE_NAME_RULES)에 없는 것이다.
//    판정은 `git check-ignore --no-index` 라서 패턴 표기(`**/X`·`X/`·문자 집합 등)와 상관없이 실제 의미로 본다. 같은 판정을
//    고친 .gitignore 를 담은 임시 저장소에서도 돌려 재추가(`**/coverage`·`dist`)가 붉어지는지 시험한다. 추적하는 dotenv 견본
//    (.env.example)도 무시되지 않아야 한다.
// ⓑ 실제 출력 위치(빌드·IDE 출력·앱 로그·첨부 저장소·의존성 캐시·시험 보고서)는 계속 무시된다. Gradle 모듈은 settings.gradle 에서
//    읽으므로 새 모듈을 더하면 그 모듈의 출력 줄도 .gitignore 에 더해야 green 이다. dotenv 파일(.env·.env.<무엇>)은 루트·모듈·
//    frontend 어디서든 무시된다.
//
// 새 파일인 이유: .gitignore 의미를 보는 기존 시험은 agent-skill-adapters.test.mjs(스킬 안내 파일·훅 어댑터의 고정 경로)와
// shared-memory-contract.test.mjs(.agent/memory 추적)뿐이고, 둘 다 자기 생성물 몇 개의 추적 여부만 본다. 소스 루트와 출력 위치를
// settings.gradle·git ls-files 에서 도출하는 이 계약을 그쪽에 넣으면 무관한 생성기·메모리 시험에 .gitignore 전체 의미가 묶인다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

const repoRoot = join(import.meta.dirname, '..');

// 2026-10-30 모든 깊이 규칙에서 지운 출력 이름(2026-03 템플릿 유래 — 이 저장소에서 생기지 않는다).
const REMOVED_OUTPUT_NAMES = Object.freeze(['target', 'vendor', 'dist', 'export', 'tomcat', 'analysis', 'coverage', 'out']);

// 소스 폴더 이름으로 흔히 쓰는 낱말. 사고가 난 이름(upload·logs)과 출력 폴더로도 쓰이는 이름, 위에서 지운 출력 이름이다.
//   .gitignore 에 다시 들어오는 것을 어떤 표기(`**/X/`·`**/X`·`X`·`X*`·문자 집합)로든 잡도록 파싱과 별도로 늘 탐침한다.
const GENERIC_NAMES = Object.freeze([...new Set(['upload', 'uploads', 'files', 'bin', 'logs', ...REMOVED_OUTPUT_NAMES])]);

// 모든 깊이(`**/X/`)로 무시해도 되는 이름 — 도구가 자기 이름으로 만드는 폴더라 소스 폴더 이름과 겹치지 않는다.
//   흔한 낱말(bin·logs·upload·target·export·coverage·out·dist 등)은 여기에 두지 않고 실제 출력 위치에 앵커링한다.
//   새 이름을 더할 때는 어느 도구가 만드는지를 사유에 적는다. .gitignore 에서 빠진 이름이 남으면 붉다(아래 시험).
const TOOL_OUTPUT_NAMES = Object.freeze([
  { reason: 'OS·IDE 메타데이터 폴더', names: ['$RECYCLE.BIN', '.idea', '.vscode', '.history', '.settings', '.metadata'] },
  {
    reason: 'Gradle·Maven 산출·캐시 — Gradle 은 실행한 프로젝트 폴더마다 build 를 만들어 깊이를 고정할 수 없다'
      + '(루트·모듈·frontend 의 vitest junit·생성물 안의 중첩 빌드). 소스 폴더 이름으로 build 를 쓰지 않는다',
    names: ['build', '.gradle', '.mvn', 'generated-sources', 'apt-generated', 'jacoco', 'surefire-reports', 'test-output'],
  },
  { reason: 'Node·Next·pnpm 의존성과 캐시', names: ['node_modules', '.npm', '.pnpm-store', '.next', '.turbo', '.vercel', '.server', '.prisma', 'next-build-cache'] },
  {
    reason: '시험·품질 도구 보고서(Playwright outputDir·Gradle test-results·k6 워크플로, Storybook, Lighthouse, 번들 분석, graphify)',
    names: ['test-results', 'playwright-report', 'playwright-reports', 'blob-report', 'playwright-screenshots', '.playwright',
      'storybook-static', '.storybook-generated', 'coverage-report', 'lighthouse-reports', '.lighthouseci', 'lhci-reports',
      'bundle-analysis', 'graphify-out'],
  },
  {
    reason: '에이전트·로컬 도구 작업 폴더(도구 고유 이름, 임시 폴더 접두 관례, 로컬 Tomcat·도커 데이터, 일회성 변환 작업)',
    names: ['.jules', '.sisyphus', '.claude', '.codex', '.agents', '.gemini', '.worktrees', 'docker-data', 'apache-tomcat-*',
      'temp_*', 'tmp_*', 'encoding-logs', 'utf8-project-template'],
  },
  {
    reason: '2026-03 에 foundation·business-* 로 합친 옛 모듈 이름 — 재생성 방지',
    names: ['common-core', 'common-security', 'module-core-iam', 'module-system-admin', 'module-workspace', 'module-operation', 'module-knowledge'],
  },
]);

// 슬래시 없는 파일 이름 줄(`**/X`·`X`)은 같은 이름의 폴더도 모든 깊이에서 가린다. 아래는 확장자가 있거나 점으로 시작하는 파일
//   이름이라 소스 폴더 이름으로 쓰지 않는 것들이다 — 흔한 낱말은 여기에 둘 수 없다(아래 시험). 와일드카드가 든 파일 규칙
//   (`*.log`·`.env.*`·`boot_error*`)은 이름을 뽑지 않는다 — 흔한 낱말을 그런 표기로 다시 넣는 것은 GENERIC_NAMES 탐침이 의미로 잡는다.
const FILE_NAME_RULES = Object.freeze([
  { reason: 'OS·IDE 메타데이터 파일(Windows·macOS 탐색기, Eclipse 프로젝트 설정)', names: ['Thumbs.db', 'Desktop.ini', '.DS_Store', '.AppleDouble', '.project', '.classpath', '.factorypath'] },
  { reason: 'npm·yarn 잠금 파일(이중 잠금 파일 방지 — 루트 package-lock.json 은 강제 추적한다)', names: ['package-lock.json', 'yarn.lock'] },
  {
    reason: '로컬 비밀·환경별 설정(dotenv, Spring 로컬·개발·운영 프로필 파일)',
    names: ['.env', 'application-local.properties', 'application-local.yml', 'application-dev.properties', 'application-dev.yml',
      'application-prod.properties', 'application-prod.yml'],
  },
  { reason: '도구가 만드는 파일(JRebel rebel.xml, Snyk .snyk, Next.js next-env.d.ts — 마지막은 강제 추적한다)', names: ['rebel.xml', '.snyk', 'next-env.d.ts'] },
  {
    reason: '일회성 출력·점검 스크립트 이름 — 재생성 방지',
    names: ['auth_error.txt', 'tests_output.txt', 'tests_debug.txt', 'coverage_output.txt', 'check_db_menus.py', 'check_menus.py',
      'fix_menus.py', 'fix_networkidle.ps1', 'restore-non-session-files.ps1'],
  },
]);
const allowlisted = [...TOOL_OUTPUT_NAMES, ...FILE_NAME_RULES].flatMap(({ names }) => names);

// 루트 아래가 모두 소스인 고정 루트. 모듈 소스 집합(src/<set>/<kind>)과 tools/* 는 추적 파일에서 도출한다.
const FIXED_SOURCE_ROOTS = Object.freeze([
  'frontend/src', 'frontend/e2e', 'frontend/scripts', 'frontend/atlas', 'frontend/public',
  'scripts', 'config', 'docs', 'test', '.agent/scripts',
]);

// 사고가 난 실제 경로. 탐침이 같은 자리를 덮지만 실패 메시지에 사례를 그대로 보이려고 따로 둔다.
const INCIDENT_PATHS = Object.freeze([
  'frontend/src/lib/upload/server-upload-limits.ts',
  'frontend/src/app/admin/system/logs/page.tsx',
]);

// dotenv 파일 이름과 추적하는 견본. 견본은 부트스트랩(scripts/bootstrap.*)이 .env·frontend/.env.local 로 복제하는 원본이다.
const DOTENV_NAMES = Object.freeze(['.env', '.env.local', '.env.production', '.env.development', '.env.test']);
const DOTENV_TEMPLATES = Object.freeze(['.env.example', 'frontend/.env.example']);

function git(args, input, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
}

// 경로 → 그것을 무시하게 만든 규칙(`출처:줄: 패턴`). 무시되지 않는 경로는 빠진다.
//   --verbose 는 부정 패턴(`!`)에 걸린 경로도 내므로, 그 경로는 무시되지 않은 것으로 본다(마지막에 걸린 패턴이 판정이다).
//   git 은 .git/info/exclude 와 사용자 전역 excludesFile 도 읽는다 — 거기서 붉으면 출처가 메시지에 나오며, 그 기계에서도 같은 함정이다.
function ignoringRules(paths, cwd = repoRoot) {
  let output;
  try {
    output = git(['check-ignore', '--no-index', '--verbose', '-z', '--stdin'], `${paths.join('\0')}\0`, cwd);
  } catch (error) {
    if (error.status === 1) return new Map();
    throw error;
  }
  const fields = output.split('\0');
  const rules = new Map();
  for (let index = 0; index + 3 < fields.length; index += 4) {
    const [source, line, pattern, path] = fields.slice(index, index + 4);
    if (!pattern.startsWith('!')) rules.set(path, `${source}:${line}: ${pattern}`);
  }
  return rules;
}

// 한 이름으로 모든 깊이를 무시하는 줄에서 그 이름을 뽑는다.
//   디렉터리 줄 `**/X/`·`**/X/*`·`**/X/**`·`X/` 와, 슬래시 없는 줄 `**/X`·`X`(같은 이름의 파일과 폴더를 모든 깊이에서 가린다).
//   앞이나 가운데에 슬래시가 있으면(`/bin/`·`/out`·`test/load-tests/results/`·`X/*`) 그 .gitignore 위치에 앵커되므로 뽑지 않는다.
//   슬래시 없는 줄 가운데 와일드카드가 든 것(`*.log`·`.env.*`·`boot_error*`)은 파일 이름 규칙이라 뽑지 않는다 — 흔한 낱말은
//   GENERIC_NAMES 가 표기와 상관없이 본다. 디렉터리 줄의 와일드카드는 probeName 이 표본으로 바꾼다.
function anyDepthDirectoryNames(text) {
  const names = [];
  for (const raw of text.replace(/\r\n?/gu, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (line === '' || line.startsWith('#') || line.startsWith('!')) continue;
    const anyDepth = line.startsWith('**/');
    const rest = anyDepth ? line.slice(3) : line;
    const directory = (anyDepth ? /^([^/]+)\/(?:\*\*?)?$/u : /^([^/]+)\/$/u).exec(rest);
    let name;
    if (directory) name = directory[1];
    else if (rest !== '' && !rest.includes('/') && !/[[*?]/u.test(rest)) name = rest;
    if (name !== undefined && !names.includes(name)) names.push(name);
  }
  return names;
}

// 패턴 이름을 실제 폴더 이름 하나로 바꾼다. 문자 집합처럼 표본을 정할 수 없는 모양은 조용히 건너뛰지 않고 멈춘다.
function probeName(name) {
  if (name.includes('[') || name.includes('\\')) throw new Error(`탐침 이름을 정할 수 없는 패턴: ${name}`);
  return name.replaceAll('*', 'probe').replaceAll('?', 'p');
}

function gradleModules() {
  const modules = [];
  for (const line of readFileSync(join(repoRoot, 'settings.gradle'), 'utf8').replace(/\r\n?/gu, '\n').split('\n')) {
    if (!/^\s*include\b/u.test(line)) continue;
    for (const match of line.matchAll(/['"]:?([^'"]+)['"]/gu)) modules.push(match[1].replaceAll(':', '/'));
  }
  return modules;
}

const trackedFiles = git(['ls-files', '-z']).split('\0').filter(Boolean);
const modules = gradleModules();
const trackedGitignores = trackedFiles.filter((file) => file === '.gitignore' || file.endsWith('/.gitignore'));
const gitignoreTexts = new Map(trackedGitignores.map((file) => [file, readFileSync(join(repoRoot, file), 'utf8')]));
const namesOf = (texts) => [...texts.values()].flatMap(anyDepthDirectoryNames);
const parsedNames = namesOf(gitignoreTexts);

function sourceRoots() {
  const roots = new Set(FIXED_SOURCE_ROOTS);
  for (const file of trackedFiles) {
    const parts = file.split('/');
    if (parts[0] === 'tools' && parts.length > 2) roots.add(`tools/${parts[1]}`);
    for (const module of modules) {
      if (!file.startsWith(`${module}/src/`)) continue;
      const rest = file.slice(module.length + 5).split('/');
      if (rest.length > 2) roots.add(`${module}/src/${rest[0]}/${rest[1]}`);
    }
  }
  return [...roots].sort();
}

// 소스 루트 탐침 가운데 무시되는 것을 사례와 규칙별로 묶는다. names·cwd 를 바꾸면 고친 .gitignore 를 담은 임시 저장소에서 같은 판정을 한다.
function sourceProbeViolations(names, cwd = repoRoot) {
  const probeNames = [...new Set([...GENERIC_NAMES, ...names.filter((name) => !allowlisted.includes(name))])].map(probeName);
  const probes = sourceRoots().flatMap((root) => probeNames.flatMap((name) => [`${root}/${name}/probe.ts`, `${root}/probe/${name}/probe.ts`]));
  const ignored = ignoringRules([...INCIDENT_PATHS, ...probes], cwd);
  const incidents = INCIDENT_PATHS.filter((path) => ignored.has(path)).map((path) => `사례 ${path} ← ${ignored.get(path)}`);
  const byRule = new Map();
  for (const path of probes.filter((probe) => ignored.has(probe))) {
    const rule = ignored.get(path);
    byRule.set(rule, [...(byRule.get(rule) ?? []), path]);
  }
  const grouped = [...byRule].map(([rule, paths]) => `${rule} → 소스 탐침 ${paths.length}개 (예: ${paths[0]})`);
  return [...incidents, ...grouped];
}

// 추적된 .gitignore 들을 임시 저장소에 옮기되 루트 파일만 edit 로 바꿔 ⓐ 판정을 돌린다 — 저장소의 .gitignore 를 건드리지 않고
//   규칙 재추가를 재현한다. 사용자 전역 excludesFile 은 실제 저장소와 똑같이 읽힌다.
function scratchSourceProbeViolations(edit) {
  const texts = new Map([...gitignoreTexts].map(([file, text]) => [file, file === '.gitignore' ? edit(text) : text]));
  const root = mkdtempSync(join(tmpdir(), 'gitignore-source-roots-'));
  try {
    git(['init', '-q'], undefined, root);
    for (const [file, text] of texts) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), text);
    }
    return sourceProbeViolations(namesOf(texts), root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// 루트 .gitignore 끝에 rules 를 더한 복제본의 ⓐ 판정을 [잡지 못한 규칙, 더한 규칙과 무관한 위반] 으로 나눈다.
//   무관한 위반이 없어야 복제본이 실제 저장소와 같은 판정을 한다는 뜻이다(따로 기준선 복제본을 돌리지 않는다 — 복제본의
//   check-ignore 는 없는 디렉터리를 단계마다 훑어 느리다).
function appendedRuleOutcome(rules) {
  const violations = scratchSourceProbeViolations((text) => `${text.trimEnd()}\n${rules.join('\n')}\n`);
  const byRule = (rule, violation) => violation.includes(`: ${rule} → 소스 탐침`);
  return {
    unflagged: rules.filter((rule) => !violations.some((violation) => byRule(rule, violation))),
    unrelated: violations.filter((violation) => !rules.some((rule) => byRule(rule, violation))),
    report: violations.join('\n'),
  };
}

// 작업 디렉터리 기준으로 생기는 출력 — 루트와 각 Gradle 모듈에서 실행한다(bootRun·시험·IDE).
function realOutputs() {
  const projects = ['', ...modules.map((module) => `${module}/`)];
  return [
    ...projects.flatMap((project) => [
      `${project}build/libs/probe.txt`,
      `${project}bin/main/application.yml`, // JDT 출력은 리소스도 복사한다(*.class 규칙만으로는 가려지지 않는다)
      `${project}logs/backend.log.2026-10-22.0.gz`, // logback 회전 파일은 *.log 규칙에 걸리지 않는다
      `${project}storage/uploads/general/1/probe.png`, // file.upload.path 기본값 ./storage/uploads
    ]),
    'foundation/src/main/generated/nuri/foundation/QProbe.java',
    'node_modules/probe/index.js',
    'frontend/node_modules/probe/index.js',
    'frontend/.pnpm-store/v3/files/00/probe-index.json',
    'frontend/.next/cache/probe.json',
    'frontend/build/test-results/vitest-junit.xml',
    'frontend/coverage/index.html',
    'frontend/out/index.html',
    'frontend/test-results/probe/trace.zip',
    'frontend/playwright-report/index.html',
    'frontend/playwright/.auth/admin.json',
    'test-results/k6/results.json',
    'test/load-tests/results/report.html',
    'tools/k6/k6.zip',
    '.gradle/probe.bin',
  ];
}

test('모든 깊이 패턴의 이름만 뽑고, 앵커된 줄·와일드카드 파일 규칙·부정은 뽑지 않는다', () => {
  assert.deepEqual(anyDepthDirectoryNames([
    '# **/comment/', '**/upload/', 'uploads/', '**/.claude/*', '**/x/**', '**/temp_*/  ', '!**/src/**/logs/',
    '/bin/', '/api-server/bin/', 'test/load-tests/results/', '**/playwright/.auth/', 'files/*', '*.log', '\r',
    // 슬래시 없는 줄도 같은 이름의 파일과 폴더를 모든 깊이에서 가린다(독립 검토 사례 `**/coverage`·`dist`).
    '**/coverage', 'dist', '**/.env', 'next-env.d.ts  ',
    '**/.env.*', '.env*', '**/boot_error*', '[Dd]ist', '**/*.tar.gz', '!**/.env.example', '**/prisma/dev.db', '/out', '**/',
  ].join('\r\n')), ['upload', 'uploads', '.claude', 'x', 'temp_*', 'coverage', 'dist', '.env', 'next-env.d.ts']);
  assert.equal(probeName('temp_*'), 'temp_probe');
  assert.throws(() => probeName('[ub]pload'), /탐침 이름을 정할 수 없는 패턴/u);
});

test('도출한 모듈·소스 루트·.gitignore 가 비어 있지 않다(빈 모집단으로 통과하지 않는다)', () => {
  assert.ok(modules.includes('api-server') && modules.includes('migration-tool'), `settings.gradle 모듈을 읽지 못했습니다: ${modules}`);
  assert.ok(trackedGitignores.includes('.gitignore'), '루트 .gitignore 가 추적되지 않습니다.');
  const roots = sourceRoots();
  for (const root of [...FIXED_SOURCE_ROOTS, 'tools/project-composer', 'migration-tool/src/main/java', 'api-server/src/test/java']) {
    assert.ok(roots.includes(root), `${root}: 소스 루트에서 빠졌습니다.`);
    assert.ok(trackedFiles.some((file) => file.startsWith(`${root}/`)), `${root}: 추적 파일이 없는 소스 루트입니다 — 이름이 바뀌었으면 고칩니다.`);
  }
});

test('ⓐ 소스 루트 아래 흔한 낱말·모든 깊이 패턴 이름의 폴더는 무시되지 않는다', () => {
  assert.deepEqual(sourceProbeViolations(parsedNames), [],
    '소스 폴더가 무시됩니다 — 흔한 낱말은 실제 출력 위치에 앵커링하고(/X/·/<모듈>/X/), 도구 고유 이름이면 TOOL_OUTPUT_NAMES 에 사유와 함께 둡니다.');
});

test('ⓐ 슬래시 없는 모든 깊이 규칙(`**/coverage`·`dist`·새 이름)을 다시 넣으면 붉다 — 임시 저장소 복제본에서 재현', () => {
  // coverage·dist 는 흔한 낱말이라 고정 탐침으로도, reports·samples 는 슬래시 없는 줄의 파싱으로만 탐침된다.
  const rules = ['**/coverage', 'dist', '**/reports', 'samples'];
  const { unflagged, unrelated, report } = appendedRuleOutcome(rules);
  assert.deepEqual(unrelated, [], '복제본이 더한 규칙과 무관하게 붉습니다 — 복제본이 실제 저장소와 다르게 판정하면 이 시험은 아무것도 증명하지 못합니다.');
  assert.deepEqual(unflagged, [],
    `슬래시 없는 모든 깊이 규칙이 소스 폴더를 가리는데 ⓐ 가 잡지 못했습니다 — 파싱이 \`**/X\`·\`X\` 를 건너뜁니다.\n${report}`);
});

test('ⓐ 지운 출력 이름은 파싱하지 못하는 표기(와일드카드)로 다시 넣어도 고정 탐침이 잡는다', () => {
  const rules = REMOVED_OUTPUT_NAMES.map((name) => `**/${name}*`);
  assert.deepEqual(anyDepthDirectoryNames(rules.join('\n')), [], '와일드카드 파일 규칙은 이름을 뽑지 않아야 이 시험이 고정 탐침만 봅니다.');
  const { unflagged, unrelated, report } = appendedRuleOutcome(rules);
  assert.deepEqual(unrelated, [], '복제본이 더한 규칙과 무관하게 붉습니다 — 복제본이 실제 저장소와 다르게 판정합니다.');
  assert.deepEqual(unflagged, [],
    `지운 출력 이름이 GENERIC_NAMES 탐침에서 빠졌습니다 — 다시 넣은 규칙이 소스 폴더를 가려도 붉지 않습니다.\n${report}`);
});

test('ⓐ 추적하는 dotenv 견본(.env.example)은 무시되지 않는다', () => {
  assert.deepEqual(DOTENV_TEMPLATES.filter((path) => !trackedFiles.includes(path)), [], '견본이 추적되지 않습니다 — 이름이 바뀌었으면 고칩니다.');
  const ignored = ignoringRules(DOTENV_TEMPLATES);
  assert.deepEqual(DOTENV_TEMPLATES.filter((path) => ignored.has(path)).map((path) => `${path} ← ${ignored.get(path)}`), [],
    '견본이 무시됩니다 — 새 클론에서 부트스트랩이 복제할 원본이 빠집니다. **/.env.* 뒤에 !**/.env.example 예외를 둡니다.');
});

test('ⓑ 실제 출력 위치는 계속 무시된다', () => {
  const outputs = realOutputs();
  const ignored = ignoringRules(outputs);
  assert.deepEqual(outputs.filter((path) => !ignored.has(path)), [],
    '출력이 추적 대상으로 드러납니다 — 앵커를 지웠거나 새 Gradle 모듈의 출력 줄(bin·logs·storage/uploads)을 .gitignore 에 더하지 않았습니다.');
});

test('ⓑ dotenv 파일(.env·.env.<무엇>)은 루트·Gradle 모듈·frontend 어디서든 무시된다', () => {
  const paths = ['', ...modules.map((module) => `${module}/`), 'frontend/'].flatMap((directory) => DOTENV_NAMES.map((name) => `${directory}${name}`));
  const ignored = ignoringRules(paths);
  assert.deepEqual(paths.filter((path) => !ignored.has(path)), [],
    'dotenv 파일이 추적 대상으로 드러납니다 — 비밀 값이 `git add -A`·미추적 파일을 복사하는 생성기에 섞입니다. 루트 .gitignore 에 **/.env·**/.env.* 를 둡니다.');
});

test('허용 목록(도구 출력·파일 이름)은 지금 .gitignore 에 있는 패턴만 담고 흔한 낱말을 담지 않는다', () => {
  assert.deepEqual(allowlisted.filter((name) => !parsedNames.includes(name)), [], '.gitignore 에 없는 허용 항목은 지웁니다.');
  assert.deepEqual(allowlisted.filter((name) => GENERIC_NAMES.includes(name)), [], '흔한 낱말은 허용 목록에 둘 수 없습니다.');
  assert.equal(new Set(allowlisted).size, allowlisted.length, '허용 목록에 중복이 있습니다.');
});

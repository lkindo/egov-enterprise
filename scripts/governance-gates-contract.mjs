#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_TIERS = new Set(['pre-push', 'local-full', 'local-e2e', 'ci']);
const RULE_ID = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
const SEVERITY = new Map([['off', 0], ['warn', 1], ['error', 2]]);

/** Reuse only analyses of identical text; each path retains at most its latest source. */
export function createGovernanceAnalysisCache() {
  const entries = new Map();
  let hits = 0;
  let misses = 0;
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  return Object.freeze({
    analyze(file, source, kind, inspect) {
      const key = path.resolve(file);
      let entry = entries.get(key);
      if (entry?.source !== source) {
        entry = { source, results: new Map() };
        entries.set(key, entry);
      }
      if (entry.results.has(kind)) {
        hits++;
        return entry.results.get(kind);
      }
      misses++;
      const result = freeze(inspect(source));
      entry.results.set(kind, result);
      return result;
    },
    stats: () => ({ hits, misses }),
  });
}

/**
 * One synchronous validation observes each file/directory once. Never reuse this
 * snapshot after a disk mutation: create a fresh one, optionally sharing only the
 * content-keyed analysis cache. The CLI always starts with a new snapshot.
 *
 * <p>`repoRoot` 를 주면 snapshot 이 그 저장소에 묶인다. 검증 함수에 snapshot 을 직접 넘기려면 묶인 snapshot 이어야 하고,
 * 다른 루트를 검증하려 하면 거부한다 — 디스크를 바꾸지 않는 여러 검증이 한 번 읽은 결과를 함께 쓰는 경로다.
 */
export function createGovernanceRepositorySnapshot({ fileSystem = fs, analysis = createGovernanceAnalysisCache(), repoRoot } = {}) {
  const texts = new Map();
  const types = new Map();
  const directories = new Map();
  const java = new Map();
  const classes = new Map();
  const catalogs = new Map();
  const once = (cache, key, read) => {
    if (!cache.has(key)) cache.set(key, read());
    return cache.get(key);
  };
  const kind = file => once(types, path.resolve(file), () => {
    try {
      const stat = fileSystem.statSync(file);
      return stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'other';
    } catch { return 'missing'; }
  });
  const entries = directory => once(directories, path.resolve(directory),
    () => fileSystem.readdirSync(directory, { withFileTypes: true }));
  const read = file => once(texts, path.resolve(file), () => fileSystem.readFileSync(file, 'utf8'));
  const javaFiles = directory => once(java, path.resolve(directory), () => Object.freeze(
    kind(directory) !== 'directory' ? [] : entries(directory).flatMap(entry => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? javaFiles(target) : entry.isFile() && entry.name.endsWith('.java') ? [target] : [];
    }),
  ));
  const catalogFiles = (directory, recursive) => once(catalogs, `${path.resolve(directory)}\0${recursive === true}`, () => Object.freeze(
    kind(directory) !== 'directory' ? [] : entries(directory).flatMap(entry => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? recursive ? catalogFiles(target, true) : [] : entry.isFile() ? [target] : [];
    }),
  ));
  return Object.freeze({
    repoRoot: repoRoot === undefined ? undefined : path.resolve(repoRoot),
    read,
    isDirectory: file => kind(file) === 'directory',
    isFile: file => kind(file) === 'file',
    javaFiles,
    catalogFiles,
    javaClassNames: directory => once(classes, path.resolve(directory), () => Object.freeze(
      javaFiles(directory).map(source => path.relative(directory, source).replace(/\.java$/, '').split(path.sep).join('.')),
    )),
    analyze: (file, operation, inspect) => analysis.analyze(file, read(file), operation, inspect),
  });
}

/** 넘겨받은 snapshot 이 검증할 저장소에 묶였는지 확인한다(다른 루트를 읽은 결과로 검증하지 않는다). */
function assertSnapshotRoot(snapshot, repoRoot) {
  const expected = path.resolve(repoRoot);
  if (snapshot?.repoRoot !== expected) {
    throw new TypeError(`governance snapshot is bound to ${snapshot?.repoRoot ?? '(no repository root)'}, not ${expected}`);
  }
}

function posix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function isSafeRelative(relativePath) {
  return typeof relativePath === 'string'
    && relativePath.length > 0
    && !path.isAbsolute(relativePath)
    && !relativePath.split(/[\\/]/).includes('..');
}

function stripJavaComments(source) {
  let output = '';
  let state = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (state === 'line') {
      if (current === '\n') {
        output += current;
        state = 'code';
      }
      continue;
    }
    if (state === 'block') {
      if (current === '*' && next === '/') {
        index += 1;
        state = 'code';
      } else if (current === '\n') {
        output += current;
      }
      continue;
    }
    if (state === 'string' || state === 'character') {
      output += current;
      if (current === '\\') {
        output += source[index + 1] ?? '';
        index += 1;
      } else if ((state === 'string' && current === '"') || (state === 'character' && current === "'")) {
        state = 'code';
      }
      continue;
    }
    if (current === '/' && next === '/') {
      index += 1;
      state = 'line';
    } else if (current === '/' && next === '*') {
      index += 1;
      state = 'block';
    } else {
      output += current;
      if (current === '"') state = 'string';
      if (current === "'") state = 'character';
    }
  }
  return output;
}

function javaCodeMask(source) {
  const output = source.split('');
  let state = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    const third = source[index + 2];
    if (state === 'line') {
      if (current === '\n') state = 'code';
      else output[index] = ' ';
      continue;
    }
    if (state === 'block') {
      if (current === '*' && next === '/') {
        output[index] = output[index + 1] = ' ';
        index += 1;
        state = 'code';
      } else if (current !== '\n' && current !== '\r') output[index] = ' ';
      continue;
    }
    if (state === 'string' || state === 'character' || state === 'template') {
      if (current === '\\') {
        output[index] = ' ';
        if (index + 1 < output.length) output[index + 1] = ' ';
        index += 1;
      } else if ((state === 'string' && current === '"')
        || (state === 'character' && current === "'")
        || (state === 'template' && current === '`')) {
        output[index] = ' ';
        state = 'code';
      } else if (current !== '\n' && current !== '\r') output[index] = ' ';
      continue;
    }
    if (state === 'text-block') {
      if (current === '"' && next === '"' && third === '"') {
        output[index] = output[index + 1] = output[index + 2] = ' ';
        index += 2;
        state = 'code';
      } else if (current !== '\n' && current !== '\r') output[index] = ' ';
      continue;
    }
    if (current === '/' && next === '/') {
      output[index] = output[index + 1] = ' ';
      index += 1;
      state = 'line';
    } else if (current === '/' && next === '*') {
      output[index] = output[index + 1] = ' ';
      index += 1;
      state = 'block';
    } else if (current === '"' && next === '"' && third === '"') {
      output[index] = output[index + 1] = output[index + 2] = ' ';
      index += 2;
      state = 'text-block';
    } else if (current === '"') {
      output[index] = ' ';
      state = 'string';
    } else if (current === "'") {
      output[index] = ' ';
      state = 'character';
    } else if (current === '`') {
      output[index] = ' ';
      state = 'template';
    }
  }
  return output.join('');
}

function stripHashComments(source) {
  return source.split(/\r?\n/).map((line) => {
    let quote = null;
    for (let index = 0; index < line.length; index += 1) {
      const current = line[index];
      if (quote) {
        if (current === '\\') index += 1;
        else if (current === quote) quote = null;
        continue;
      }
      if (current === '"' || current === "'") {
        quote = current;
      } else if (current === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
        return line.slice(0, index);
      }
    }
    return line;
  }).join('\n');
}

function executableContent(source) {
  return stripHashComments(stripJavaComments(source));
}

function yamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed === '' ? null : trimmed;
}

// 이관 스코프가 전용 잡으로 갈라지면서 잡 이름을 받는다(DEC-OPS-104). 기본값은 종전 잡이다.
export function parseMutationScopeMatrix(source, jobName = 'mutation-scope') {
  const lines = source.split(/\r?\n/);
  const jobStart = lines.findIndex((line) => new RegExp(`^  ${jobName}:\\s*$`).test(line));
  if (jobStart < 0) return { scopes: [], errors: [`CI ${jobName} job is missing`] };
  const relativeJobEnd = lines.slice(jobStart + 1)
    .findIndex((line) => /^  [A-Za-z0-9_-]+:\s*$/.test(line));
  const jobEnd = relativeJobEnd < 0 ? lines.length : jobStart + 1 + relativeJobEnd;
  const jobLines = lines.slice(jobStart, jobEnd);
  const includeStart = jobLines.findIndex((line) => /^        include:\s*$/.test(line));
  if (includeStart < 0) return { scopes: [], errors: [`CI ${jobName} matrix include catalog is missing`] };

  const scopes = [];
  const errors = [];
  let current = null;
  const finish = () => {
    if (!current) return;
    const fields = ['scope', 'gradle', 'classes', 'tests'];
    const missing = fields.filter((field) => typeof current[field] !== 'string' || current[field] === '');
    if (missing.length > 0) {
      errors.push(`CI mutation matrix entry is missing fields: ${missing.join(', ')}`);
    } else {
      scopes.push(current);
    }
    current = null;
  };

  for (const line of jobLines.slice(includeStart + 1)) {
    const scopeMatch = /^          - scope:\s*(.+?)\s*$/.exec(line);
    if (scopeMatch) {
      finish();
      current = { scope: yamlScalar(scopeMatch[1]) };
      continue;
    }
    if (/^    steps:\s*$/.test(line)) break;
    // threshold 는 범위별 PIT 하한이다(ADR-0044). 필수 여부와 값은 validateMutationScopeFloors 가 원장과 대조한다.
    const fieldMatch = /^            (gradle|classes|tests|threshold):\s*(.+?)\s*$/.exec(line);
    if (fieldMatch && current) {
      if (Object.hasOwn(current, fieldMatch[1])) {
        errors.push(`CI mutation matrix scope ${current.scope ?? '(missing)'} duplicates field ${fieldMatch[1]}`);
      }
      current[fieldMatch[1]] = yamlScalar(fieldMatch[2]);
    }
  }
  finish();
  return { scopes, errors };
}

function classGlobMatches(glob, className) {
  const pattern = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('*', '.*')
    .replaceAll('?', '.');
  return new RegExp(`^${pattern}$`).test(className);
}

/** Reviewed security boundaries remain in the existing scope even if CI and registry drift together. */
export function validateCriticalMutationTargets(scopes) {
  const required = {
    'business-core-auth': [
      'nuri.business.service.menu.MenuService',
      // 메뉴 구조 저장의 순환·3단계·삭제 뒤 남는 하위·형태 판정이 이 클래스에 있다(MenuService 밖).
      'nuri.business.service.menu.MenuStructurePlan',
      'nuri.business.security.iam.EgovAuthenticationProvider',
      'nuri.business.security.filter.RateLimitFilter',
    ],
    // [2026-10-19 DEC-OPS-366] 설문 결과는 설문 범위로 옮겼다. 사용자 관리의 보안 부작용은 사용자·조직 범위가 지킨다.
    'business-app-survey': ['nuri.business.service.survey.SurveyResultService'],
    'business-core-user-org': ['nuri.business.service.user.UserService', 'nuri.business.service.user.LoginIdReuseGuard'],
  };
  return Object.entries(required).flatMap(([scope, targets]) => {
    const entry = scopes.find(candidate => candidate?.scope === scope);
    const globs = typeof entry?.classes === 'string' ? entry.classes.split(',').map(value => value.trim()) : [];
    return targets.filter(target => !globs.some(glob => classGlobMatches(glob, target)))
      .map(target => `PIT ${scope} is missing critical target '${target}'`);
  });
}

function validateMutationScopeCatalog(selector, repoRoot, errors, setLabel, snapshot) {
  const expected = selector.matrixScopes;
  // 범위 목록은 원장이 정하고 아래에서 ci.yml 과 양방향으로 대조한다. 범위 수를 못 박는 곳은 계약 시험 한 곳이다.
  if (!Array.isArray(expected) || expected.length === 0) {
    errors.push(`${setLabel}: PIT matrix catalog must be a non-empty scope list`);
    return;
  }
  errors.push(...validateCriticalMutationTargets(expected).map(error => `${setLabel}: ${error}`));

  const expectedByScope = new Map();
  for (const entry of expected) {
    const fields = ['scope', 'gradle', 'classes', 'tests'];
    if (fields.some((field) => typeof entry?.[field] !== 'string' || entry[field].trim() === '')) {
      errors.push(`${setLabel}: PIT matrix entries require scope, gradle, classes, and tests`);
      continue;
    }
    if (expectedByScope.has(entry.scope)) {
      errors.push(`${setLabel}: duplicate PIT matrix scope '${entry.scope}'`);
      continue;
    }
    expectedByScope.set(entry.scope, entry);

    const gradleMatch = /^:([a-z0-9-]+):pitest$/.exec(entry.gradle);
    if (!gradleMatch) {
      errors.push(`${setLabel}: PIT scope ${entry.scope} has invalid Gradle task '${entry.gradle}'`);
      continue;
    }
    const moduleRoot = path.join(repoRoot, gradleMatch[1]);
    for (const [field, sourceSet] of [['classes', 'main'], ['tests', 'test']]) {
      const globs = entry[field].split(',').map((glob) => glob.trim());
      if (globs.some((glob) => glob === '') || new Set(globs).size !== globs.length) {
        errors.push(`${setLabel}: PIT scope ${entry.scope} has invalid or duplicate ${field} globs`);
        continue;
      }
      const actualClasses = snapshot.javaClassNames(path.join(moduleRoot, 'src', sourceSet, 'java'));
      for (const glob of globs) {
        if (!actualClasses.some((className) => classGlobMatches(glob, className))) {
          errors.push(`${setLabel}: PIT scope ${entry.scope} ${field} glob '${glob}' matches no Java class in ${gradleMatch[1]}/src/${sourceSet}/java`);
        }
      }
    }
  }

  // 스코프가 두 잡에 나뉘어 산다(DEC-OPS-104). 원장이 선언한 소유 잡 전부를 읽어 union 으로 대조하고,
  //   각 항목이 **선언한 잡에 실제로 있는지**까지 본다 — 한 잡만 읽으면 다른 잡의 스코프가 통째로
  //   사라져도 양방향 exact-match 가 둘 다 초록이 된다.
  const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
  const declaredJobs = [...new Set(expected
    .map((entry) => (typeof entry?.job === 'string' ? entry.job : ''))
    .filter((job) => job !== ''))];
  if (declaredJobs.length === 0) {
    errors.push(`${setLabel}: PIT matrix entries must declare an owning job`);
  }
  const workflowSource = snapshot.isFile(workflowPath) ? snapshot.read(workflowPath) : null;
  const actualByScope = new Map();
  if (workflowSource === null) {
    errors.push(`${setLabel}: CI workflow is missing`);
  } else {
    for (const jobName of declaredJobs) {
      const parsed = parseMutationScopeMatrix(workflowSource, jobName);
      errors.push(...parsed.errors.map((error) => `${setLabel}: ${error}`));
      for (const entry of parsed.scopes) {
        if (actualByScope.has(entry.scope)) {
          errors.push(`${setLabel}: duplicate CI mutation matrix scope '${entry.scope}'`);
        } else {
          actualByScope.set(entry.scope, { ...entry, job: jobName });
        }
      }
    }
  }
  for (const entry of expected) {
    if (typeof entry?.scope !== 'string') continue;
    const actual = actualByScope.get(entry.scope);
    if (actual && actual.job !== entry.job) {
      errors.push(`${setLabel}: PIT scope ${entry.scope} is declared under '${entry.job}' but runs in '${actual.job}'`);
    }
  }
  for (const [scope, expectedEntry] of expectedByScope) {
    const actualEntry = actualByScope.get(scope);
    if (!actualEntry) {
      errors.push(`${setLabel}: PIT matrix scope '${scope}' is missing from ci.yml`);
      continue;
    }
    for (const field of ['gradle', 'classes', 'tests']) {
      if (actualEntry[field] !== expectedEntry[field]) {
        errors.push(`${setLabel}: PIT matrix scope '${scope}' field '${field}' differs between registry and ci.yml`);
      }
    }
  }
  for (const scope of actualByScope.keys()) {
    if (!expectedByScope.has(scope)) {
      errors.push(`${setLabel}: unregistered CI mutation matrix scope '${scope}'`);
    }
  }
}

/**
 * [2026-10-29 ADR-0044] 범위별 PIT 하한. 변이가 많은 범위는 실측 점수에서 여유를 뺀 하한을 쓰고, 그 정본은 mutation ratchet 의
 * scopeFloors 다(없는 범위는 ratchet current = 헌법 하한). 확장한 래칫이라 기존 래칫과 같은 규칙을 범위마다 건다 — current 는
 * baseline 아래로 못 내리고(하한 낮추기 금지), 헌법 하한 아래·100 위는 둘 수 없다. CI 행렬의 범위마다 threshold 가 그 값과 같아야
 * 한다(빠지면 빈 값이 build.gradle 에서 75 로 떨어져 큰 범위의 하한이 조용히 내려간다).
 */
function validateMutationScopeFloors({ registry, ratchet, repoRoot, snapshot, errors }) {
  const id = ratchet.id;
  const floors = ratchet.scopeFloors ?? {};
  if (typeof floors !== 'object' || floors === null || Array.isArray(floors)) {
    errors.push(`${id}: scopeFloors must be an object keyed by PIT scope`);
    return;
  }
  const catalogs = (registry?.gateSets ?? []).filter((set) => Array.isArray(set?.selector?.matrixScopes));
  if (catalogs.length !== 1) {
    errors.push(`${id}: scope floors need exactly one PIT matrix catalog`);
    return;
  }
  const registered = new Map(catalogs[0].selector.matrixScopes.map((entry) => [entry?.scope, entry?.job]));
  const minimum = ratchet.current;
  for (const [scope, floor] of Object.entries(floors)) {
    if (!registered.has(scope)) errors.push(`${id}: scope floor '${scope}' is not a registered PIT matrix scope`);
    if (!Number.isInteger(floor?.current) || !Number.isInteger(floor?.baseline)) {
      errors.push(`${id}: scope floor '${scope}' requires integer current and baseline`);
      continue;
    }
    if (floor.current < floor.baseline) {
      errors.push(`${id}: scope floor '${scope}' weakened below baseline (${floor.current} < ${floor.baseline})`);
    }
    if (floor.current < minimum || floor.current > 100) {
      errors.push(`${id}: scope floor '${scope}' must stay within the constitution minimum ${minimum} and 100 (${floor.current})`);
    }
  }
  const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
  if (!snapshot.isFile(workflowPath)) {
    errors.push(`${id}: CI workflow is missing for the PIT scope floors`);
    return;
  }
  const workflow = snapshot.read(workflowPath);
  const scopeEnvironment = ratchet.selector?.scopeEnvironment;
  if (Object.keys(floors).length > 0 && typeof scopeEnvironment !== 'string') {
    errors.push(`${id}: scope floors require selector.scopeEnvironment so that build.gradle consumes them`);
  }
  for (const job of [...new Set(registered.values())].filter((value) => typeof value === 'string' && value !== '')) {
    // 행렬 값은 이 환경 변수로만 build.gradle 에 닿는다 — 이름이 어긋나면 빈 값이 헌법 하한으로 떨어진다.
    const lines = workflow.split(/\r?\n/);
    const start = lines.findIndex((line) => line === `  ${job}:`);
    const end = start < 0 ? -1 : lines.findIndex((line, index) => index > start && /^  [A-Za-z0-9_-]+:\s*$/.test(line));
    const block = start < 0 ? [] : lines.slice(start, end < 0 ? lines.length : end);
    if (typeof scopeEnvironment === 'string'
      && block.filter((line) => line === `          ${scopeEnvironment}: \${{ matrix.threshold }}`).length !== 1) {
      errors.push(`${id}: ${job} must pass matrix.threshold to the PIT step as ${scopeEnvironment} exactly once`);
    }
    for (const entry of parseMutationScopeMatrix(workflow, job).scopes) {
      const expected = floors[entry.scope]?.current ?? minimum;
      if (entry.threshold === undefined) {
        errors.push(`${id}: PIT matrix scope '${entry.scope}' must declare threshold ${expected}`);
      } else if (!/^[0-9]+$/.test(String(entry.threshold)) || Number(entry.threshold) !== expected) {
        errors.push(`${id}: PIT matrix scope '${entry.scope}' threshold ${entry.threshold} does not match the ratchet floor ${expected}`);
      }
    }
  }
}

/**
 * 소비자 파일의 주석 문법에 맞는 실행 내용 추출기.
 *
 * <p>[2026-09-01 신설 — 커밋 d6097b9f2 ① — 이 수정으로 닫은 하네스 gap] 종전에는 파일 종류와 무관하게
 * {@link executableContent}(= Java 블록/줄 주석 제거 후 hash 주석 제거)를 적용했다. 그런데
 * YAML·셸에는 `/* *\/` 주석이 없다. 그래서 그런 파일에 `/*` 시퀀스가 등장하면 — 경로 glob,
 * 정규식, URL 무엇이든 — 그 지점부터 다음 닫는 기호까지, 없으면 파일 끝까지가 통째로
 * 비실행 구간으로 취급된다.
 *
 * <p>실측(2026-09-01): `.github/workflows/ci.yml` 주석에 `scripts/` + `*.test.mjs` 를 적은 것만으로
 * 무관한 binding 4건(gradle build · schemaValidationTest · operational-contracts · cross-stack)이
 * 동시에 ghost 판정됐다. 라인은 파일에 그대로 있는데 매칭만 실패해 grep 으로는 원인이 보이지 않는다.
 * 반대 방향도 성립한다 — 같은 원리로 실재하지 않는 binding 이 통과할 수 있다(false-green).
 */
function executableContentForSource(sourcePath, source) {
  const base = path.basename(sourcePath).toLowerCase();
  const ext = path.extname(base);
  // YAML 과 셸 훅은 `#` 만 주석이다. 블록 주석 규칙을 적용하면 위 실측처럼 실행 내용을 삼킨다.
  if (ext === '.yml' || ext === '.yaml' || base === 'pre-push' || base === 'pre-commit') {
    return stripHashComments(source);
  }
  // JSON 에는 주석 문법이 없다 — 무엇도 제거하지 않는다.
  if (ext === '.json') return source;
  // Gradle(Groovy)·JS·TS 는 Java 계열 주석 문법을 쓴다(현행 유지).
  return executableContent(source);
}

export function exactBindingLineMatches(source, expectedLine, sourcePath = '') {
  return executableContentForSource(sourcePath, source)
    .split(/\r?\n/)
    .some((line) => line.trim() === expectedLine);
}

function topLevelCallArguments(mask, openIndex, closeIndex) {
  const ranges = [];
  let start = openIndex + 1;
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  for (let index = start; index < closeIndex; index += 1) {
    const current = mask[index];
    if (current === '(') parentheses += 1;
    else if (current === ')') parentheses -= 1;
    else if (current === '[') brackets += 1;
    else if (current === ']') brackets -= 1;
    else if (current === '{') braces += 1;
    else if (current === '}') braces -= 1;
    else if (current === ',' && parentheses === 0 && brackets === 0 && braces === 0) {
      ranges.push({ start, end: index });
      start = index + 1;
    }
  }
  ranges.push({ start, end: closeIndex });
  return ranges;
}

function activeSkipOptionIndexes(mask, start, end) {
  const indexes = [];
  while (start < end && /\s/.test(mask[start])) start += 1;
  if (mask[start] !== '{') return indexes;
  const closeIndex = matchingDelimiter(mask, start, '{', '}');
  if (closeIndex < 0 || closeIndex > end) return indexes;

  let depth = 0;
  for (let index = start; index < closeIndex; index += 1) {
    if (mask[index] === '{') {
      depth += 1;
      continue;
    }
    if (mask[index] === '}') {
      depth -= 1;
      continue;
    }
    if (depth !== 1 || /[\w$]/.test(mask[index - 1] ?? '')) continue;
    const property = /^skip\b\s*:\s*/.exec(mask.slice(index, closeIndex));
    if (!property) continue;
    const value = mask.slice(index + property[0].length, closeIndex).trimStart();
    if (!/^false\b/.test(value)) indexes.push(index);
  }
  return indexes;
}

function runnerCallEnd(mask, markerEnd) {
  let openIndex = markerEnd;
  while (openIndex < mask.length && /\s/.test(mask[openIndex])) openIndex += 1;
  if (mask[openIndex] !== '(') return markerEnd;
  const closeIndex = matchingDelimiter(mask, openIndex, '(', ')');
  return closeIndex < 0 ? markerEnd : closeIndex + 1;
}

function nodeSkipOptions(mask) {
  const constructs = [];
  for (const marker of mask.matchAll(/(?<![\w$.])(?:test|it)\s*\(/g)) {
    const openIndex = mask.indexOf('(', marker.index);
    const closeIndex = matchingDelimiter(mask, openIndex, '(', ')');
    if (closeIndex < 0) continue;
    for (const { start, end } of topLevelCallArguments(mask, openIndex, closeIndex)) {
      for (const index of activeSkipOptionIndexes(mask, start, end)) {
        constructs.push({ kind: 'skip-option', index, end: closeIndex + 1 });
      }
    }
  }
  return constructs;
}

/**
 * 조건부 등록(`if (cond) it(...)`)은 skip 과 같다 — 시험이 조용히 사라진다. 등록 여부는 생성물의 투영 원장
 * 도우미(frontend/src/test-utils/projection.ts)로만 가른다(Phase 2 D6, DEC-OPS-258). 조건이 원장 판정을 부르거나 그 결과를
 * 담은 `*InProjection` 변수·`PROJECTED_SOURCE` 를 쓸 때만 허용한다. 원본에는 원장이 없어 이 조건들은 늘 참이다.
 */
// 정규식은 반복 그룹 안팎에서 공백 수량자가 겹치지 않게 쓴다(js/redos) — 각 반복은 '.' 로 시작한다.
const PROJECTION_CONDITION = /\b(?:inProjection|repoPresent|srcPresent)\s*\(|InProjection\b|\bPROJECTED_SOURCE\b/;
const REGISTRATION_CALL = /^\s*(?:\{\s*)?(?:test|it|describe|suite|specify)(?:\s*\.\s*(?:describe|each|concurrent|sequential)(?:\s*\([^()]*\))?)*\s*\(/;

function conditionalRegistrations(code, source) {
  const constructs = [];
  for (const marker of code.matchAll(/(?<![\w$.])if\s*\(/g)) {
    const openIndex = code.indexOf('(', marker.index);
    const closeIndex = matchingDelimiter(code, openIndex, '(', ')');
    if (closeIndex < 0) continue;
    const call = REGISTRATION_CALL.exec(code.slice(closeIndex + 1));
    if (!call || PROJECTION_CONDITION.test(source.slice(openIndex + 1, closeIndex))) continue;
    constructs.push({ kind: 'conditional-registration', index: marker.index, end: closeIndex + 1 + call[0].length });
  }
  return constructs;
}

export function findRunnerSkipConstructs(source) {
  const code = javaCodeMask(source);
  const constructs = [];
  const patterns = [
    {
      regex: /(?<![\w$.])(?:test|it|describe|suite|specify)\s*(?:\.\s*(?:describe|concurrent|sequential|parallel|serial|each)\s*)*\.\s*(skip|skipIf|todo|only|fixme|fail|fails)\b/g,
      kind: (match) => match[1],
    },
    {
      regex: /(?<![\w$.])x(?:test|it|describe|suite|specify)\s*(?:\.\s*(?:each|concurrent|sequential)\s*)*\(/g,
      kind: () => 'disabled-alias',
    },
    {
      regex: /(?<![\w$.])t\s*\.\s*(skip|todo|only|fixme|fail|fails)\s*\(/g,
      kind: (match) => match[1],
    },
  ];
  for (const { regex, kind } of patterns) {
    for (const match of code.matchAll(regex)) {
      constructs.push({
        kind: kind(match),
        index: match.index,
        end: runnerCallEnd(code, match.index + match[0].replace(/\($/, '').length),
      });
    }
  }
  constructs.push(...nodeSkipOptions(code));
  constructs.push(...conditionalRegistrations(code, source));
  return constructs
    .sort((left, right) => left.index - right.index || left.end - right.end)
    .map((construct) => ({
      ...construct,
      line: source.slice(0, construct.index).split(/\r?\n/).length,
    }));
}

export function containsRunnerSkip(source) {
  return findRunnerSkipConstructs(source).length > 0;
}

/**
 * GitHub Actions 워크플로의 job 블록을 잘라낸다(2칸 들여쓴 `<job-id>:` ~ 다음 job 직전).
 * 파싱이 실패하면 빈 문자열을 반환하고, 호출부가 그것을 위반으로 처리한다(조용한 통과 금지).
 */
function workflowJobBlock(content, jobId) {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const starts = [];
  lines.forEach((line, index) => {
    if (/^ {2}[a-z][a-z0-9-]*:\s*$/.test(line)) starts.push(index);
  });
  const at = starts.find((index) => lines[index].trim() === `${jobId}:`);
  if (at === undefined) return '';
  const next = starts.find((index) => index > at);
  return lines.slice(at, next === undefined ? lines.length : next).join('\n');
}

/** 워크플로 job 블록 안에서 해당 실행 라인이 속한 step 블록을 돌려준다. */
function workflowStepContaining(jobBlock, fragment) {
  const lines = jobBlock.split('\n');
  const at = lines.findIndex((line) => line.trim() === fragment.trim());
  if (at < 0) return null;
  let start = -1;
  for (let index = at; index >= 0; index -= 1) {
    if (/^ {6}- /.test(lines[index])) { start = index; break; }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^ {6}- /.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start, end).join('\n');
}

/**
 * [2026-09-01 신설 — 커밋 d6097b9f2 ② — 이 수정으로 닫은 하네스 gap] 실행 문맥 검증.
 *
 * <p>종전 binding 검증은 "그 trim 라인이 파일 어딘가에 있는가" 만 봤다. 어느 job 인지, 조건부
 * step 뒤인지는 구조적으로 볼 수 없었고, 그래서 tier 선언이 실행 실체와 어긋나도 green 이었다.
 * 실측(2026-08-31): `EXEC-FOUNDATION-COVERAGE` 가 local-full tier 를 선언하고 binding 은
 * `build.gradle` 의 `localGate` 라인을 가리켰는데, 실제 진입점인 `verify.mjs` 는 그 태스크를
 * 부르지 않아 foundation 커버리지 래칫 2종이 로컬에서 한 번도 검증되지 않았다.
 *
 * <p>이제 CI tier binding 은 `job` 을 선언해야 하고, 그 job 블록 안에서 라인을 찾는다. step 에
 * `if:` 가 붙어 있으면 `conditional` 로 명시해야 하며, 명시와 실제가 어긋나면 양방향으로 red 다 —
 * 조건이 새로 붙거나 사라지면 registry diff 에 의도가 드러난다.
 */
function validateWorkflowBindingContext({ binding, content, setLabel, errors }) {
  const declaredJob = binding.job;
  if (typeof declaredJob !== 'string' || declaredJob === '') {
    errors.push(`${setLabel}: CI execution binding must declare the workflow job it runs in: ${binding.fragment}`);
    return;
  }
  const jobBlock = workflowJobBlock(content, declaredJob);
  if (jobBlock === '') {
    errors.push(`${setLabel}: declared workflow job does not exist in ${binding.source}: ${declaredJob}`);
    return;
  }
  if (!exactBindingLineMatches(jobBlock, binding.fragment, binding.source)) {
    errors.push(`${setLabel}: execution binding is not inside job ${declaredJob} in ${binding.source}: ${binding.fragment}`);
    return;
  }
  const step = workflowStepContaining(jobBlock, binding.fragment);
  const conditional = /^ {8}if:/m.test(step ?? '');
  if (conditional && binding.conditional !== true) {
    errors.push(`${setLabel}: execution binding runs behind a step-level 'if:' in job ${declaredJob}`
      + ' — declare conditional: true so the tier claim stays honest');
  }
  if (!conditional && binding.conditional === true) {
    errors.push(`${setLabel}: execution binding declares conditional: true but the step in job ${declaredJob} has no 'if:'`);
  }
}

/**
 * [2026-10-17 신설] 로컬 tier binding 도 실행 경로로 판정한다(위 CI job·조건 결속과 같은 원리).
 *
 * <p>verify.mjs binding 은 "그 줄이 파일 어딘가에 있는가" 만 봐서, 범위 분기가 부르지 않는 함수의 줄이나 `if` 안의 줄도
 * local-full 근거로 통과했다. 실측: cross-stack 결속은 full 이 `crossStack: false` 로 끄는 줄을, frontend 불변식 결속은
 * full 이 부르지 않는 fast 전용 함수의 줄을 가리켰다 — 실제로 full 에서 두 시험군을 돌리는 것은 test:coverage 였다.
 *
 * <p>이제 tier 가 뜻하는 범위 분기(`if (scope === '<범위>') {`)에서 시작한 호출 폐포로 그 줄에 닿는지 본다. 분기·함수 본문 안의
 * 조건 블록(if·else·반복·콜백·catch)이나 조건식 안, 또는 앞선 조건부 조기 종료(return·throw·process.exit) 뒤에 있는 줄은
 * `conditional: true` 를 선언해야 하고, 선언과 실제가 어긋나면 양방향으로 red 다. 무조건 조기 종료 뒤의 줄과 함수 참조로만
 * 넘긴 호출은 닿지 않는 것으로 본다. 구조를 읽지 못하면(괄호 짝·분기 없음) 오류로 보고한다 — 조용한 통과 금지.
 *
 * <p>진입점은 모듈 최상위 문장 사슬의 범위 분기뿐이다. 함수(선언·표현식·화살표·메서드) 본문 안의 범위 분기는 그 함수를 부르는지
 * 이 분석이 따라가지 않으므로 구조 오류로 보고한다 — 부르지 않는 클로저 안의 분기가 tier 를 주장하지 못한다. 분기 안에서 정의만
 * 하고 부르지 않는 콜백의 줄은 설계대로 conditional 이다(선언이 registry diff 에 드러난다).
 *
 * <p>경계: 범위 분기 자체가 실행되는지 — 분기 앞 최상위 코드의 조기 종료·가드와 scope 값의 유도 — 는 이 정적 분석이 보지 않는다.
 * 그 몫은 scripts/pre-push-ref-contract.test.mjs 가 verify.mjs 를 범위마다 실제로 실행해 정확한 명령 목록과 process.exit 부재로 본다.
 */
const VERIFY_RUNNER_SOURCE = 'scripts/verify.mjs';
/** 로컬 tier 가 뜻하는 verify.mjs 범위 분기(DEC-OPS-027 ②: local-full = verify:full). */
const VERIFY_TIER_SCOPES = new Map([['local-full', 'full'], ['local-e2e', 'e2e']]);
const CONDITIONAL_PREFIX = /(?<![\w$])(?:if|else|for|while|do|switch|case|catch)(?![\w$])|&&|\|\||\?|=>/;
const IDENTIFIER = /[A-Za-z_$][\w$]*/y;

function nextCodeIndex(mask, index) {
  let cursor = index;
  while (cursor < mask.length && /\s/.test(mask[cursor])) cursor += 1;
  return cursor;
}

// position 을 감싸는 블록마다 `{` 앞 문장 텍스트(머리)를 바깥부터 돌려준다. 괄호 안의 `;`·`{…}`(for 머리, 조건·인자 안의
// 객체·콜백)는 바깥 문장의 경계가 아니다.
function enclosingBlockHeads(mask, position) {
  const heads = [];
  let statementStart = 0;
  let depth = 0;
  for (let index = 0; index < position; index += 1) {
    const current = mask[index];
    if (current === '(') depth += 1;
    else if (current === ')') depth -= 1;
    else if (current === '{') {
      heads.push(mask.slice(statementStart, index).trim());
      if (depth === 0) statementStart = index + 1;
    } else if (current === '}') {
      heads.pop();
      if (depth === 0) statementStart = index + 1;
    } else if (current === ';' && depth === 0) statementStart = index + 1;
  }
  return heads;
}

// 함수가 아닌 제어 블록의 머리인지 본다: 맨 블록·try·finally·else·do·case·default 이거나, if·for·while·switch·catch 의 괄호가
// 머리 끝에서 닫힌다. 그 밖(function·화살표·메서드·class·객체)은 함수 본문으로 본다.
function isControlBlockHead(head) {
  if (/^(?:|try|finally|else|do|default\s*:|case\s[\s\S]*:)$/.test(head)) return true;
  const keyword = /^(?:else\s+)?(?:if|for|while|switch|catch)\s*\(/.exec(head);
  return keyword !== null && matchingDelimiter(head, keyword[0].length - 1, '(', ')') === head.length - 1;
}

export function analyzeVerifyRunnerExecution(source) {
  const mask = javaCodeMask(source);
  const errors = [];
  const functions = new Map();
  for (const match of mask.matchAll(/(?<![\w$.])function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const paramsClose = matchingDelimiter(mask, match.index + match[0].length - 1, '(', ')');
    const open = paramsClose < 0 ? -1 : nextCodeIndex(mask, paramsClose + 1);
    const close = mask[open] === '{' ? matchingDelimiter(mask, open, '{', '}') : -1;
    if (close < 0) errors.push(`cannot read the body of function ${match[1]}`);
    else if (functions.has(match[1])) errors.push(`duplicate function ${match[1]}`);
    else functions.set(match[1], { open, close });
  }
  const branches = new Map();
  for (const match of mask.matchAll(/(?<![\w$.])if\s*\(/g)) {
    const conditionOpen = match.index + match[0].length - 1;
    const conditionClose = matchingDelimiter(mask, conditionOpen, '(', ')');
    if (conditionClose < 0) {
      errors.push(`unbalanced condition at offset ${match.index}`);
      continue;
    }
    // 문자열 리터럴은 mask 에서 지워지므로 범위 이름은 원문에서, 구조(`scope ===`)는 mask 에서 읽는다.
    const literal = /^\s*scope\s*===\s*'([a-z][a-z0-9-]*)'\s*$/.exec(source.slice(conditionOpen + 1, conditionClose));
    if (!literal || !/^\s*scope\s*===\s*$/.test(mask.slice(conditionOpen + 1, conditionClose))) continue;
    const enclosing = enclosingBlockHeads(mask, match.index).findLast(head => !isControlBlockHead(head));
    if (enclosing !== undefined) {
      errors.push(`verify scope branch '${literal[1]}' is inside a function body (${enclosing.replace(/\s+/g, ' ').slice(0, 60)})`
        + ' — only module-level scope branches are entry points');
      continue;
    }
    const open = nextCodeIndex(mask, conditionClose + 1);
    const close = mask[open] === '{' ? matchingDelimiter(mask, open, '{', '}') : -1;
    if (close < 0) errors.push(`verify scope branch '${literal[1]}' has no block body`);
    else if (branches.has(literal[1])) errors.push(`duplicate verify scope branch '${literal[1]}'`);
    else branches.set(literal[1], { open, close });
  }
  if (branches.size === 0) errors.push("no verify scope branch (if (scope === '<scope>') { … }) was found");

  const nestedFunctions = body => [...functions.values()].filter(fn => fn.open > body.open && fn.close < body.close);
  const insideNested = (body, index) => nestedFunctions(body).some(fn => index > fn.open && index < fn.close);
  // body 안의 한 위치가 그 body 가 실행될 때 늘 실행되는지 본다: 'unconditional' | 'conditional' | 'unreachable'.
  const statusAt = (body, position) => {
    const skipped = nestedFunctions(body);
    const blocks = [];
    let exited = null;
    let statementStart = body.open + 1;
    for (let index = body.open + 1; index < position; index += 1) {
      const fn = skipped.find(candidate => candidate.open === index);
      if (fn) {
        index = fn.close;
        statementStart = index + 1;
        continue;
      }
      const current = mask[index];
      if (current === '{') {
        const head = mask.slice(statementStart, index).trim();
        blocks.push(head !== 'try' && head !== 'finally');
        statementStart = index + 1;
      } else if (current === '}') {
        blocks.pop();
        statementStart = index + 1;
      } else if (current === ';') {
        statementStart = index + 1;
      } else if (/[A-Za-z_$]/.test(current) && !/[\w$.]/.test(mask[index - 1] ?? '')) {
        IDENTIFIER.lastIndex = index;
        const word = IDENTIFIER.exec(mask)[0];
        if (word === 'return' || word === 'throw' || (word === 'process' && /^process\s*\.\s*exit\b/.test(mask.slice(index, index + 40)))) {
          const guarded = blocks.some(Boolean) || CONDITIONAL_PREFIX.test(mask.slice(statementStart, index));
          if (!guarded) exited = 'unconditional';
          else exited ??= 'conditional';
        }
        index += word.length - 1;
      }
    }
    if (exited === 'unconditional') return 'unreachable';
    return exited === 'conditional' || blocks.some(Boolean) || CONDITIONAL_PREFIX.test(mask.slice(statementStart, position))
      ? 'conditional'
      : 'unconditional';
  };
  const callsIn = body => [...mask.slice(body.open + 1, body.close).matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)]
    .map(match => ({ name: match[1], index: body.open + 1 + match.index }))
    .filter(({ name, index }) => functions.has(name)
      && !insideNested(body, index)
      && !/(?<![\w$])function\s+$/.test(mask.slice(Math.max(0, index - 16), index)));
  // 줄 텍스트는 binding 매칭과 같은 실행 내용(주석 제거)에서, 위치는 원문과 길이가 같은 mask 에서 읽는다.
  const executable = executableContent(source).split('\n');
  const lineOffsets = [];
  let offset = 0;
  for (const line of source.split('\n')) {
    lineOffsets.push({ offset, length: line.length });
    offset += line.length + 1;
  }
  const linesIn = body => lineOffsets.flatMap(({ offset: start, length }, line) => {
    const lead = mask.slice(start, start + length).search(/\S/);
    const position = start + lead;
    const text = (executable[line] ?? '').trim();
    return lead < 0 || text === '' || position <= body.open || position >= body.close || insideNested(body, position)
      ? []
      : [{ text, position }];
  });

  const scopes = Object.create(null);
  for (const [scope, branch] of branches) {
    const modes = new Map();
    const visit = (body, mode) => {
      const previous = modes.get(body);
      if (previous === 'unconditional' || previous === mode) return;
      modes.set(body, mode);
      for (const call of callsIn(body)) {
        const status = statusAt(body, call.index);
        if (status === 'unreachable') continue;
        visit(functions.get(call.name), mode === 'unconditional' && status === 'unconditional' ? 'unconditional' : 'conditional');
      }
    };
    visit(branch, 'unconditional');
    const reached = Object.create(null);
    for (const [body, mode] of modes) {
      for (const { text, position } of linesIn(body)) {
        const status = statusAt(body, position);
        if (status === 'unreachable') continue;
        if (reached[text] !== 'unconditional') {
          reached[text] = mode === 'unconditional' && status === 'unconditional' ? 'unconditional' : 'conditional';
        }
      }
    }
    scopes[scope] = reached;
  }
  return { errors, scopes };
}

function validateVerifyRunnerBindingContext({ binding, execution, setLabel, errors }) {
  if (execution.errors.length > 0) {
    errors.push(...execution.errors.map(error => `${setLabel}: cannot read the scope structure of ${VERIFY_RUNNER_SOURCE} — ${error}`));
    return;
  }
  let observed = 0;
  let conditional = false;
  for (const tier of binding.tiers) {
    const scope = VERIFY_TIER_SCOPES.get(tier);
    if (scope === undefined) {
      errors.push(`${setLabel}: ${VERIFY_RUNNER_SOURCE} binding cannot claim tier ${tier} — verify scopes back only ${[...VERIFY_TIER_SCOPES.keys()].join(', ')}`);
      continue;
    }
    const reached = execution.scopes[scope];
    if (reached === undefined) {
      errors.push(`${setLabel}: ${VERIFY_RUNNER_SOURCE} has no '${scope}' scope branch for tier ${tier}`);
      continue;
    }
    if (!Object.hasOwn(reached, binding.fragment)) {
      errors.push(`${setLabel}: execution binding is not reached from the verify '${scope}' branch (tier ${tier}): ${binding.fragment}`);
      continue;
    }
    observed += 1;
    if (reached[binding.fragment] === 'conditional') {
      conditional = true;
      if (binding.conditional !== true) {
        errors.push(`${setLabel}: execution binding runs behind a condition in the verify '${scope}' branch (tier ${tier})`
          + ' — declare conditional: true so the tier claim stays honest');
      }
    }
  }
  if (binding.conditional === true && observed === binding.tiers.length && !conditional) {
    errors.push(`${setLabel}: execution binding declares conditional: true but runs unconditionally in every declared verify scope: ${binding.fragment}`);
  }
}

function validateExecutionBindings({
  bindings,
  repoRoot,
  setLabel,
  errors,
  required = false,
  expectedTiers = [],
  snapshot,
}) {
  if (!Array.isArray(bindings) || (required && bindings.length === 0)) {
    errors.push(`${setLabel}: execution bindings are required`);
    return;
  }
  const boundTiers = new Set();
  for (const binding of bindings) {
    if (!isSafeRelative(binding?.source) || typeof binding?.fragment !== 'string' || binding.fragment === '') {
      errors.push(`${setLabel}: invalid execution binding`);
      continue;
    }
    if (!Array.isArray(binding.tiers)
      || binding.tiers.length === 0
      || new Set(binding.tiers).size !== binding.tiers.length
      || binding.tiers.some((tier) => !ALLOWED_TIERS.has(tier) || !expectedTiers.includes(tier))) {
      errors.push(`${setLabel}: execution binding tiers must be a non-empty subset of the gate tiers`);
      continue;
    }
    for (const tier of binding.tiers) boundTiers.add(tier);
    const absolute = path.join(repoRoot, binding.source);
    const content = snapshot.isFile(absolute) ? snapshot.read(absolute, 'utf8') : '';
    if (!snapshot.isFile(absolute) || !snapshot.analyze(absolute, `binding:${JSON.stringify([binding.fragment, binding.source])}`,
      text => exactBindingLineMatches(text, binding.fragment, binding.source))) {
      errors.push(`${setLabel}: ghost execution binding in ${binding.source}: ${binding.fragment}`);
      continue;
    }
    // 워크플로·verify 소비자는 라인 존재만으로 tier 를 주장할 수 없다 — job·범위 분기·조건까지 결속한다.
    if (/^\.github\/workflows\/.+\.ya?ml$/.test(binding.source)) {
      validateWorkflowBindingContext({ binding, content, setLabel, errors });
      continue;
    }
    if (binding.job !== undefined) errors.push(`${setLabel}: job is a workflow-only binding field: ${binding.source}`);
    if (binding.source === VERIFY_RUNNER_SOURCE) {
      validateVerifyRunnerBindingContext({
        binding,
        execution: snapshot.analyze(absolute, 'verify-runner-execution', analyzeVerifyRunnerExecution),
        setLabel,
        errors,
      });
    } else if (binding.conditional !== undefined) {
      errors.push(`${setLabel}: conditional is a workflow or verify-runner binding field: ${binding.source}`);
    }
  }
  const missingTiers = expectedTiers.filter((tier) => !boundTiers.has(tier));
  if (missingTiers.length > 0) {
    errors.push(`${setLabel}: execution bindings do not cover declared tiers: ${missingTiers.join(', ')}`);
  }
}

export function hasClassAnnotation(source, annotation, value, expectedClassName) {
  const code = javaCodeMask(source);
  const declaration = /\b(?:(?:public|protected|private|abstract|final|static|sealed|non-sealed)\s+)*class\s+([A-Za-z_$][\w$]*)/.exec(code);
  if (!declaration || declaration[1] !== expectedClassName) return false;
  const escapedAnnotation = annotation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`@${escapedAnnotation}\\s*\\(\\s*["']${escapedValue}["']\\s*\\)`, 'g');
  return [...source.slice(0, declaration.index).matchAll(matcher)]
    .some((match) => code[match.index] === '@');
}

function hasRunnableTestAnnotation(source, archUnit) {
  const code = javaCodeMask(source);
  return archUnit
    ? /@ArchTest\b/.test(code)
    : /@(?:Test|ParameterizedTest|RepeatedTest|TestFactory|ArchTest)\b/.test(code);
}

export function hasGateSkipConstruct(source) {
  const code = javaCodeMask(source);
  return /@(?:Disabled|EnabledIf|DisabledIf|EnabledOn|DisabledOn)[A-Za-z0-9_]*\b/.test(code)
    || /\b(?:Assumptions\s*\.\s*)?assume(?:True|False)\s*\(/.test(code);
}

/**
 * [2026-08-31 신설] 게이트 태그가 선언된 selector root **밖**에 있는 파일을 잡는다.
 *
 * Gradle 의 `includeTags` 는 테스트 소스셋 전체에서 태그를 찾지만 registry census 는
 * 선언된 root 만 본다 — 태그된 클래스를 root 밖으로 옮기면 CI 에서 실행은 되면서
 * census 의 양방향 감시(미등록·유령 감지)에서는 사라지는 조용한 탈출 경로였다.
 * 스캔 루트는 5개 모듈의 테스트 소스와 ArchUnit 규칙이 사는 testFixtures 다.
 */
export const JAVA_GATE_SCAN_ROOTS = [
  'api-server/src/test/java',
  'business-app/src/test/java',
  'business-core/src/test/java',
  'business-core/src/testFixtures/java',
  'foundation/src/test/java',
  'migration-tool/src/test/java',
];

/** java-class-annotation 선택자가 판정할 수 있는 모양인가 — 아니면 원장 검증이 'invalid java-class-annotation selector' 로 붉다. */
function isJavaAnnotationSelector(selector) {
  return ['Tag', 'ArchTag'].includes(selector?.annotation)
    && typeof selector.value === 'string'
    && Array.isArray(selector.roots)
    && selector.roots.length > 0;
}

/**
 * java-class-annotation 선택자가 실제로 고르는 소스 — 선언 root 아래에서 파일 이름의 클래스에 그 태그가 붙은 Java 파일(저장소 상대 경로).
 * 안전하지 않거나 없는 root 는 오류로 돌려준다(선택 결과가 조용히 줄면 거짓 녹색이다).
 * 원장 검증(validateGovernanceRegistry)과 등록 사전 점검(taggedGateRegistryErrors)이 이 함수 하나로 센다.
 */
function javaAnnotatedSources({ repoRoot, setLabel, selector, snapshot }) {
  const errors = [];
  const roots = selector.roots.filter(isSafeRelative);
  if (roots.length !== selector.roots.length) errors.push(`${setLabel}: selector roots must be safe relative paths`);
  const sources = new Set();
  for (const root of roots) {
    const absoluteRoot = path.join(repoRoot, root);
    if (!snapshot.isDirectory(absoluteRoot)) {
      errors.push(`${setLabel}: selector root does not exist: ${root}`);
      continue;
    }
    for (const sourcePath of snapshot.javaFiles(absoluteRoot)) {
      if (snapshot.analyze(sourcePath, `annotation:${selector.annotation}:${selector.value}:${path.basename(sourcePath, '.java')}`,
        text => hasClassAnnotation(text, selector.annotation, selector.value, path.basename(sourcePath, '.java')))) {
        sources.add(posix(path.relative(repoRoot, sourcePath)));
      }
    }
  }
  return { sources, errors };
}

/** 원장에 등록된 소스 — 안전한 상대 경로만 센다(나머지는 원장 검증이 'source must be a safe relative path' 로 말한다). */
function registeredGateSources(rules) {
  return new Set(rules.map((rule) => rule?.source).filter(isSafeRelative));
}

/**
 * 태그 시험과 원장 등록의 양방향 대조 — 선택 결과에 있는데 등록되지 않은 시험(미등록)과, 등록됐고 파일도 있는데 선택 결과 밖인 소스(유령).
 * 등록 소스의 파일이 아예 없으면 원장 검증이 'ghost gate source: … does not exist' 로 따로 말한다.
 */
function taggedGateRegistrationErrors({ repoRoot, setLabel, actual, registered, snapshot }) {
  const errors = [];
  for (const source of actual) {
    if (!registered.has(source)) errors.push(`unregistered tagged gate in ${setLabel}: ${source}`);
  }
  for (const source of registered) {
    if (!actual.has(source) && snapshot.isFile(path.join(repoRoot, source))) {
      errors.push(`ghost gate source in ${setLabel}: ${source} is outside the actual selector result`);
    }
  }
  return errors;
}

/**
 * 게이트 원장의 Java 태그 결속만 보는 진입점 — 태그 시험의 등록 대조(미등록·선택 결과 밖 등록·없는 root)와 선언 root 밖 태그.
 * validateGovernanceRegistry 와 같은 함수(javaAnnotatedSources·registeredGateSources·taggedGateRegistrationErrors·
 * findTaggedGatesOutsideRoots)를 부르므로 같은 원장·트리에서 이 결과는 원장 검증 오류의 부분집합이다. 실행 binding·래칫 등 나머지는
 * 원장 검증만 본다. 손 결속 사전 점검(scripts/ledger-precheck.mjs, regen --check)이 운영 계약보다 먼저 부른다.
 * 모양이 틀린 선택자는 건너뛴다 — 원장 검증이 'invalid java-class-annotation selector' 로 붉힌다.
 */
export function taggedGateRegistryErrors({ registry, repoRoot, snapshot = createGovernanceRepositorySnapshot({ repoRoot }),
  scanRoots = JAVA_GATE_SCAN_ROOTS }) {
  assertSnapshotRoot(snapshot, repoRoot);
  const errors = [];
  for (const set of registry?.gateSets ?? []) {
    const selector = set?.selector;
    if (selector?.type !== 'java-class-annotation' || !isJavaAnnotationSelector(selector)
      || !Array.isArray(set.rules) || set.rules.length === 0) continue;
    const setLabel = set.id ?? '(missing-set-id)';
    const { sources: actual, errors: rootErrors } = javaAnnotatedSources({ repoRoot, setLabel, selector, snapshot });
    errors.push(...rootErrors,
      ...taggedGateRegistrationErrors({ repoRoot, setLabel, actual, registered: registeredGateSources(set.rules), snapshot }));
  }
  errors.push(...findTaggedGatesOutsideRoots(repoRoot, registry?.gateSets, scanRoots, snapshot));
  return errors;
}

export function findTaggedGatesOutsideRoots(repoRoot, gateSets, scanRoots = JAVA_GATE_SCAN_ROOTS, snapshot = createGovernanceRepositorySnapshot({ repoRoot })) {
  assertSnapshotRoot(snapshot, repoRoot);
  const errors = [];
  const selectors = (gateSets ?? [])
    .filter((set) => set?.selector?.type === 'java-class-annotation')
    .map((set) => ({
      id: set.id ?? '(missing-gate-set-id)',
      annotation: set.selector.annotation,
      value: set.selector.value,
      roots: (set.selector.roots ?? []).map((root) => posix(root).replace(/\/+$/, '')),
    }));
  if (selectors.length === 0) return errors;
  for (const scanRoot of scanRoots) {
    const absoluteRoot = path.join(repoRoot, scanRoot);
    if (!snapshot.isDirectory(absoluteRoot)) {
      errors.push(`java gate scan root does not exist: ${scanRoot} (silent scan collapse would be a false green)`);
      continue;
    }
    for (const sourcePath of snapshot.javaFiles(absoluteRoot)) {
      const relative = posix(path.relative(repoRoot, sourcePath));
      for (const { id, annotation, value, roots } of selectors) {
        if (roots.some((root) => relative === root || relative.startsWith(`${root}/`))) continue;
        if (snapshot.analyze(sourcePath, `annotation:${annotation}:${value}:${path.basename(sourcePath, '.java')}`,
          text => hasClassAnnotation(text, annotation, value, path.basename(sourcePath, '.java')))) {
          errors.push(`${id}: tagged gate outside declared selector roots — ${relative} carries `
            + `@${annotation}("${value}") so the runner may execute it while the census cannot see it; `
            + 'move it under a declared root or extend the selector roots');
        }
      }
    }
  }
  return errors;
}

function braceBlock(source, markerIndex) {
  const open = source.indexOf('{', markerIndex);
  if (open < 0) return null;
  let depth = 0;
  let quote = null;
  for (let index = open; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (quote) {
      if (current === '\\') index += 1;
      else if (current === quote) quote = null;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }
    if (current === '/' && next === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
      continue;
    }
    if (current === '/' && next === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 1;
      continue;
    }
    if (current === '{') depth += 1;
    if (current === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  return null;
}

function matchingDelimiter(mask, openIndex, openToken, closeToken) {
  let depth = 0;
  for (let index = openIndex; index < mask.length; index += 1) {
    if (mask[index] === openToken) depth += 1;
    if (mask[index] === closeToken) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseQuotedString(source, start, end) {
  const quote = source[start];
  let value = '';
  for (let index = start + 1; index < end; index += 1) {
    const current = source[index];
    if (current === quote) return { value, next: index + 1 };
    if (current !== '\\') {
      value += current;
      continue;
    }
    index += 1;
    if (index >= end) return { error: 'unterminated escape in string array' };
    const escaped = source[index];
    value += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' })[escaped] ?? escaped;
  }
  return { error: 'unterminated string in array' };
}

function parseStringArray(source, mask, openIndex) {
  const closeIndex = matchingDelimiter(mask, openIndex, '[', ']');
  if (closeIndex < 0) return { error: 'unterminated string array' };
  const values = [];
  let index = openIndex + 1;
  while (index < closeIndex) {
    if (/\s|,/.test(source[index])) {
      index += 1;
      continue;
    }
    if (source[index] === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 || newline > closeIndex ? closeIndex : newline + 1;
      continue;
    }
    if (source[index] === '/' && source[index + 1] === '*') {
      const commentClose = source.indexOf('*/', index + 2);
      if (commentClose < 0 || commentClose > closeIndex) return { error: 'unterminated comment in string array' };
      index = commentClose + 2;
      continue;
    }
    if (source[index] !== '"' && source[index] !== "'") {
      return { error: `non-literal value in string array near '${source.slice(index, index + 20).trim()}'` };
    }
    const parsed = parseQuotedString(source, index, closeIndex);
    if (parsed.error) return parsed;
    values.push(parsed.value);
    index = parsed.next;
  }
  return { value: values, closeIndex };
}

function uniqueCodeMatch(mask, pattern, start = 0, end = mask.length) {
  const scoped = mask.slice(start, end);
  const matches = [...scoped.matchAll(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`))];
  return matches.length === 1
    ? { match: matches[0], index: start + matches[0].index }
    : null;
}

function propertyValueStart(mask, name, start, end) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marker = uniqueCodeMatch(mask, new RegExp(`\\b${escapedName}\\s*:`), start, end);
  return marker ? marker.index + marker.match[0].length : -1;
}

function readStringProperty(source, mask, name, start, end) {
  let valueStart = propertyValueStart(mask, name, start, end);
  while (valueStart < end && /\s/.test(source[valueStart])) valueStart += 1;
  if (valueStart < 0 || (source[valueStart] !== '"' && source[valueStart] !== "'")) return null;
  const parsed = parseQuotedString(source, valueStart, end);
  return parsed.error || parsed.next > end ? null : parsed.value;
}

function readRegexProperty(source, mask, name, start, end) {
  let valueStart = propertyValueStart(mask, name, start, end);
  while (valueStart < end && /\s/.test(source[valueStart])) valueStart += 1;
  if (valueStart < 0 || source[valueStart] !== '/') return null;
  let characterClass = false;
  for (let index = valueStart + 1; index < end; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === '[') characterClass = true;
    else if (source[index] === ']') characterClass = false;
    else if (source[index] === '/' && !characterClass) {
      let flagEnd = index + 1;
      while (flagEnd < end && /[a-z]/i.test(source[flagEnd])) flagEnd += 1;
      return source.slice(valueStart, flagEnd);
    }
  }
  return null;
}

function objectRanges(mask, openIndex, closeIndex) {
  const ranges = [];
  let index = openIndex + 1;
  while (index < closeIndex) {
    if (/\s|,/.test(mask[index])) {
      index += 1;
      continue;
    }
    if (mask[index] !== '{') return null;
    const objectClose = matchingDelimiter(mask, index, '{', '}');
    if (objectClose < 0 || objectClose > closeIndex) return null;
    ranges.push({ start: index, end: objectClose + 1 });
    index = objectClose + 1;
  }
  return ranges;
}

export function validatePlaywrightProjectContract(source, contract) {
  const invalidContract = !contract
    || typeof contract.forbidOnly !== 'string'
    || contract.forbidOnly.trim() === ''
    || !Array.isArray(contract.projects)
    || contract.projects.length === 0
    || contract.projects.some((project) => typeof project?.name !== 'string'
      || typeof project?.testMatch !== 'string'
      || (project.dependencies !== undefined
        && (!Array.isArray(project.dependencies)
          || project.dependencies.some((dependency) => typeof dependency !== 'string'))))
    || new Set(contract.projects.map(({ name }) => name)).size !== contract.projects.length;
  if (invalidContract) return ['invalid Playwright project contract'];

  const errors = [];
  const mask = javaCodeMask(source);
  let forbidOnlyStart = propertyValueStart(mask, 'forbidOnly', 0, mask.length);
  while (forbidOnlyStart >= 0 && forbidOnlyStart < mask.length && /\s/.test(mask[forbidOnlyStart])) {
    forbidOnlyStart += 1;
  }
  const forbidOnlyEnd = forbidOnlyStart < 0 ? -1 : mask.indexOf(',', forbidOnlyStart);
  const actualForbidOnly = forbidOnlyEnd < 0
    ? ''
    : mask.slice(forbidOnlyStart, forbidOnlyEnd).replace(/\s/g, '');
  if (actualForbidOnly !== contract.forbidOnly.replace(/\s/g, '')) {
    errors.push('ghost Playwright forbidOnly contract');
  }

  const projectsMarker = uniqueCodeMatch(mask, /\bprojects\s*:\s*\[/);
  const projectsOpen = projectsMarker ? mask.indexOf('[', projectsMarker.index) : -1;
  const projectsClose = projectsOpen < 0 ? -1 : matchingDelimiter(mask, projectsOpen, '[', ']');
  const ranges = projectsClose < 0 ? null : objectRanges(mask, projectsOpen, projectsClose);
  if (!ranges) {
    errors.push('ghost Playwright projects contract');
    return errors;
  }

  const actualNames = ranges.map(({ start, end }) => readStringProperty(source, mask, 'name', start, end));
  const expectedNames = contract.projects.map(({ name }) => name);
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    errors.push(`ghost Playwright project names contract: expected ${expectedNames.join(',')}`);
  }

  for (let index = 0; index < contract.projects.length; index += 1) {
    const expected = contract.projects[index];
    const range = ranges[index];
    if (!range
      || actualNames[index] !== expected.name
      || readRegexProperty(source, mask, 'testMatch', range.start, range.end) !== expected.testMatch) {
      errors.push(`ghost Playwright project contract for ${expected.name}`);
      continue;
    }
    if (expected.dependencies !== undefined) {
      const dependencies = parseArrayProperty(
        source,
        mask,
        'dependencies',
        ':',
        range.start,
        range.end,
      );
      if (dependencies.error
        || JSON.stringify(dependencies.value) !== JSON.stringify(expected.dependencies)) {
        errors.push(`ghost Playwright project contract for ${expected.name}`);
      }
    }
  }
  return errors;
}

function parseArrayProperty(source, mask, name, separator, start = 0, end = mask.length) {
  const escapedName = String(name ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marker = uniqueCodeMatch(mask, new RegExp(`\\b${escapedName}\\s*${separator}\\s*\\[`), start, end);
  if (!marker) return { error: `expected exactly one executable ${name} string array` };
  const openIndex = mask.indexOf('[', marker.index);
  if (openIndex < 0 || openIndex >= end) return { error: `missing ${name} array` };
  return parseStringArray(source, mask, openIndex);
}

function uniqueNamedBlock(source, mask, pattern, label) {
  const marker = uniqueCodeMatch(mask, pattern);
  if (!marker) return { error: `expected exactly one executable ${label} block` };
  const openIndex = mask.indexOf('{', marker.index);
  const closeIndex = openIndex < 0 ? -1 : matchingDelimiter(mask, openIndex, '{', '}');
  return closeIndex < 0
    ? { error: `unterminated ${label} block` }
    : { openIndex, closeIndex };
}

/** Read direct named members only; spreads, computed keys and duplicates are ambiguous. */
function directObjectProperties(mask, openIndex, closeIndex) {
  const properties = new Map();
  let start = openIndex + 1;
  const add = end => {
    if (!mask.slice(start, end).trim()) return true;
    const member = /^\s*([A-Za-z_$][\w$]*)\s*:/.exec(mask.slice(start, end));
    if (!member || properties.has(member[1])) return false;
    properties.set(member[1], { start: start + member[0].length, end });
    return true;
  };
  for (let index = start; index < closeIndex; index++) {
    const closeToken = { '{': '}', '[': ']', '(': ')' }[mask[index]];
    if (closeToken) {
      const end = matchingDelimiter(mask, index, mask[index], closeToken);
      if (end < 0 || end >= closeIndex) return null;
      index = end;
    } else if (mask[index] === ',') {
      if (!add(index)) return null;
      start = index + 1;
    }
  }
  return add(closeIndex) ? properties : null;
}

/** The same unique coverage-block boundary as population discovery, not a TypeScript evaluator. */
function readVitestThreshold(source, key) {
  const mask = javaCodeMask(source);
  const invalid = { error: `Vitest ${key} requires one direct literal coverage.thresholds value` };
  if (!uniqueCodeMatch(mask, /\bcoverage\s*:/)) return invalid;
  const coverage = uniqueNamedBlock(source, mask, /\bcoverage\s*:\s*\{/, 'Vitest coverage');
  if (coverage.error) return invalid;
  const thresholdProperty = directObjectProperties(mask, coverage.openIndex, coverage.closeIndex)?.get('thresholds');
  if (!thresholdProperty) return invalid;
  const thresholdMask = mask.slice(thresholdProperty.start, thresholdProperty.end).trim();
  if (!thresholdMask.startsWith('{')
    || matchingDelimiter(thresholdMask, 0, '{', '}') !== thresholdMask.length - 1) return invalid;
  const value = directObjectProperties(thresholdMask, 0, thresholdMask.length - 1)?.get(key);
  const literal = value ? thresholdMask.slice(value.start, value.end).trim() : '';
  if (!/^\d(?:_?\d)*(?:\.\d(?:_?\d)*)?$/.test(literal)) return invalid;
  return { value: numeric(literal) };
}

export function validatePitResultCheck(source) {
  const code = stripJavaComments(source);
  const mask = javaCodeMask(code);
  const settings = uniqueNamedBlock(code, mask, /\bpitest\s*\{/, 'Gradle pitest');
  if (settings.error) return [settings.error];
  const version = uniqueCodeMatch(mask, /\bpitestVersion\s*=/, settings.openIndex, settings.closeIndex);
  if (!version || !/^pitestVersion\s*=\s*(['"])1\.25\.9\1/.test(code.slice(version.index))) {
    return ['PIT requires the verified 1.25.9 engine pin'];
  }
  const incremental = uniqueCodeMatch(mask, /\benableDefaultIncrementalAnalysis\s*=/, settings.openIndex, settings.closeIndex);
  if (!incremental || !/^enableDefaultIncrementalAnalysis\s*=\s*false\b/.test(code.slice(incremental.index))
      || /\b(?:historyInputLocation|historyOutputLocation)\b/.test(mask.slice(settings.openIndex, settings.closeIndex))) {
    return ['PIT must recompute the selected mutations without incremental history'];
  }
  const timestamped = uniqueCodeMatch(mask, /\btimestampedReports\s*=\s*false\b/, settings.openIndex, settings.closeIndex);
  if (!timestamped) return ['PIT result check requires the current non-timestamped XML report'];
  const hooks = [...code.matchAll(/\btasks\.named\(\s*(['"])pitest\1\s*\)\s*\{/g)]
    .filter(match => mask.slice(match.index).startsWith('tasks.named'));
  if (hooks.length !== 1) return ['PIT requires exactly one executable result-check hook'];
  const open = mask.indexOf('{', hooks[0].index);
  const close = matchingDelimiter(mask, open, '{', '}');
  if (close < 0) return ['PIT result-check hook is unterminated'];
  const hook = code.slice(open + 1, close);
  const hookMask = javaCodeMask(hook);
  const first = uniqueNamedBlock(hook, hookMask, /\bdoFirst\s*\{\s*task\s*->/, 'PIT doFirst freshness check');
  if (first.error) return [first.error];
  const last = uniqueNamedBlock(hook, hookMask, /\bdoLast\s*\{\s*task\s*->/, 'PIT doLast result check');
  if (last.error) return [last.error];
  const body = hook.slice(last.openIndex + 1, last.closeIndex);
  const freshnessBody = hook.slice(first.openIndex + 1, first.closeIndex);
  const freshnessRequired = [
    'File reportDirectory = task.reportDir.get().asFile.canonicalFile',
    "File mutationReport = task.reportDir.file('mutations.xml').get().asFile",
    'if (!reportDirectory.toPath().startsWith(generatedDirectory.get().asFile.canonicalFile.toPath())',
    '|| mutationReport.canonicalFile.parentFile != reportDirectory',
    '|| java.nio.file.Files.isSymbolicLink(mutationReport.toPath())',
    'if (mutationReport.exists() && (!mutationReport.isFile() || !mutationReport.delete()))',
    'throw new GradleException("${task.path}: cannot remove the previous PIT mutations.xml")',
  ];
  const required = [
    "File mutationReport = task.reportDir.file('mutations.xml').get().asFile",
    'if (!mutationReport.isFile()) throw new GradleException',
    'factory.setFeature(javax.xml.XMLConstants.FEATURE_SECURE_PROCESSING, true)',
    "factory.setFeature('http://apache.org/xml/features/disallow-doctype-decl', true)",
    "factory.setFeature('http://xml.org/sax/features/external-general-entities', false)",
    "factory.setFeature('http://xml.org/sax/features/external-parameter-entities', false)",
    "factory.setAttribute(javax.xml.XMLConstants.ACCESS_EXTERNAL_DTD, '')",
    "factory.setAttribute(javax.xml.XMLConstants.ACCESS_EXTERNAL_SCHEMA, '')",
    'factory.setXIncludeAware(false)',
    'factory.setExpandEntityReferences(false)',
    'builder.setErrorHandler(new org.xml.sax.helpers.DefaultHandler()',
    'void error(org.xml.sax.SAXParseException exception) { throw exception }',
    'void fatalError(org.xml.sax.SAXParseException exception) { throw exception }',
    'report = builder.parse(mutationReport)',
    'catch (org.xml.sax.SAXException | IOException exception) { throw new GradleException',
    "if (report.documentElement.tagName != 'mutations') throw new GradleException",
    "def mutations = report.documentElement.getElementsByTagName('mutation')",
    'if (mutations.length == 0) throw new GradleException',
    'for (int index = 0; index < mutations.length; index++)',
    "if (mutations.item(index).getAttribute('status') == 'RUN_ERROR')",
    'throw new GradleException("${task.path}: PIT reported RUN_ERROR; mutation detection is incomplete")',
  ];
  const executable = (content, fragment) => {
    const contentMask = javaCodeMask(content);
    const pattern = fragment.split(/\s+/).map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    return [...content.matchAll(new RegExp(pattern, 'g'))]
      .some(match => contentMask[match.index] === fragment[0]);
  };
  return [...required.filter(fragment => !executable(body, fragment)),
    ...freshnessRequired.filter(fragment => !executable(freshnessBody, fragment)),
    ...(!executable(hook, 'def generatedDirectory = layout.buildDirectory') ? ['def generatedDirectory = layout.buildDirectory'] : [])]
    .map(fragment => `PIT result check is missing executable requirement: ${fragment}`);
}

export function readPopulationConsumer(source, selector) {
  const mask = javaCodeMask(source);
  if (selector?.type === 'gradle-list-assignment') {
    if (typeof selector.name !== 'string' || selector.name.trim() === '') {
      return { error: 'gradle-list-assignment requires a variable name' };
    }
    const escapedName = String(selector.name ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parsed = parseArrayProperty(source, mask, selector.name, '=', 0, mask.length);
    if (parsed.error || !uniqueCodeMatch(mask, new RegExp(`\\bdef\\s+${escapedName}\\s*=`))) {
      return { error: parsed.error ?? `expected exactly one executable def ${selector.name} assignment` };
    }
    return { exclude: parsed.value };
  }

  if (selector?.type === 'vitest-coverage-population') {
    const block = uniqueNamedBlock(source, mask, /\bcoverage\s*:\s*\{/, 'Vitest coverage');
    if (block.error) return block;
    const include = parseArrayProperty(source, mask, 'include', ':', block.openIndex, block.closeIndex);
    const exclude = parseArrayProperty(source, mask, 'exclude', ':', block.openIndex, block.closeIndex);
    if (include.error || exclude.error) return { error: include.error ?? exclude.error };
    return { include: include.value, exclude: exclude.value };
  }

  if (selector?.type === 'gradle-pitest-population') {
    const block = uniqueNamedBlock(source, mask, /\bpitest\s*\{/, 'Gradle pitest');
    if (block.error) return block;
    const excludedClasses = parseArrayProperty(
      source,
      mask,
      'excludedClasses',
      '=',
      block.openIndex,
      block.closeIndex,
    );
    if (excludedClasses.error) return excludedClasses;
    const booleanMatch = uniqueCodeMatch(
      mask,
      /\bfailWhenNoMutations\s*=\s*(true|false)\b/,
      block.openIndex,
      block.closeIndex,
    );
    if (!booleanMatch) return { error: 'expected exactly one executable failWhenNoMutations boolean' };
    return {
      excludedClasses: excludedClasses.value,
      failWhenNoMutations: booleanMatch.match[1] === 'true',
    };
  }

  return { error: `unsupported population selector type '${selector?.type ?? ''}'` };
}

function numeric(value) {
  return Number(String(value).replaceAll('_', ''));
}

function singleMatch(content, pattern) {
  const matches = [...content.matchAll(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`))];
  return matches.length === 1 ? matches[0][1] : null;
}

function readConsumerValue(repoRoot, ratchet, snapshot) {
  const absolute = path.join(repoRoot, ratchet.source);
  if (!snapshot.isFile(absolute)) return { error: `ghost quality source: ${ratchet.source}` };
  return snapshot.analyze(absolute, `consumer:${JSON.stringify(ratchet)}`,
    () => readObservedConsumerValue(repoRoot, ratchet, snapshot));
}

function readObservedConsumerValue(repoRoot, ratchet, snapshot) {
  const absolute = path.join(repoRoot, ratchet.source);
  const content = snapshot.read(absolute, 'utf8');
  const executable = executableContent(content);
  const selector = ratchet.selector ?? {};

  if (selector.type === 'gradle-jacoco-limit') {
    if (selector.equivalentTasks !== undefined) {
      if (!Array.isArray(selector.equivalentTasks) || selector.equivalentTasks.length === 0
          || new Set(selector.equivalentTasks).size !== selector.equivalentTasks.length
          || selector.equivalentTasks.some(task => typeof task !== 'string' || !task || task === selector.task)) {
        return { error: `invalid equivalent coverage tasks for ${ratchet.id}` };
      }
      const { equivalentTasks, ...singleSelector } = selector;
      const values = [selector.task, ...equivalentTasks].map(task => readConsumerValue(repoRoot,
        { ...ratchet, selector: { ...singleSelector, task } }, snapshot));
      const invalid = values.find(result => result.error);
      if (invalid) return invalid;
      if (values.some(result => result.value !== values[0].value)) {
        return { error: `coverage scopes must share the same threshold for ${ratchet.id}` };
      }
      return values[0];
    }
    const marker = executable.indexOf(`tasks.register('${selector.task}'`);
    const block = marker < 0 ? null : braceBlock(executable, marker);
    if (!block) return { error: `ghost quality selector for ${ratchet.id}: Gradle task ${selector.task}` };
    if (/\benabled\s*=\s*false\b/.test(block) || /\bonlyIf\s*\{\s*false\s*\}/.test(block)) {
      return { error: `ghost quality selector for ${ratchet.id}: disabled Gradle task ${selector.task}` };
    }
    const counter = selector.counter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const value = selector.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = singleMatch(block, new RegExp(`counter\\s*=\\s*['"]${counter}['"][\\s\\S]*?value\\s*=\\s*['"]${value}['"][\\s\\S]*?minimum\\s*=\\s*([0-9._]+)`));
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: JaCoCo ${selector.counter}` }
      : { value: numeric(raw) };
  }

  if (selector.type === 'gradle-jacoco-direct-limit') {
    const marker = executable.indexOf(`${selector.task} {`);
    const taskBlock = marker < 0 ? null : braceBlock(executable, marker);
    if (taskBlock && (/\benabled\s*=\s*false\b/.test(taskBlock) || /\bonlyIf\s*\{\s*false\s*\}/.test(taskBlock))) {
      return { error: `ghost quality selector for ${ratchet.id}: disabled Gradle task ${selector.task}` };
    }
    const candidates = [];
    for (const match of taskBlock?.matchAll(/\brule\s*\{/g) ?? []) {
      const rule = braceBlock(taskBlock, match.index);
      if (!rule) continue;
      const element = singleMatch(rule, /\belement\s*=\s*['"]([A-Z]+)['"]/) ?? 'BUNDLE';
      const counter = singleMatch(rule, /\bcounter\s*=\s*['"]([A-Z]+)['"]/) ?? 'INSTRUCTION';
      const value = singleMatch(rule, /\bvalue\s*=\s*['"]([A-Z]+)['"]/) ?? 'COVEREDRATIO';
      const minimum = singleMatch(rule, /\bminimum\s*=\s*([0-9._]+)/);
      if (minimum !== null && element === selector.element && counter === selector.counter && value === selector.value) {
        candidates.push(numeric(minimum));
      }
    }
    return candidates.length === 1
      ? { value: candidates[0] }
      : { error: `ghost quality selector for ${ratchet.id}: ${selector.task} ${selector.element}/${selector.counter}` };
  }

  if (selector.type === 'gradle-mutation-threshold') {
    const environment = String(selector.environment ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const strictValue = String(selector.strictValue ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // [2026-10-29 ADR-0044] 범위별 하한: 엄격 분기는 Math.max(하한, (범위 값 ?: '하한') as int) 이어야 한다 — 하한 아래로는 못 내리고,
    //   범위 값이 비면 하한으로 돌아간다(그 대체값이 하한과 다르면 빈 행렬 값이 조용히 다른 하한이 된다). 범위 값은 아래
    //   validateMutationScopeFloors 가 CI 행렬과 원장 scopeFloors 로 대조한다.
    const scopeEnvironment = selector.scopeEnvironment === undefined ? null
      : String(selector.scopeEnvironment).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const strictBranch = scopeEnvironment === null ? '([0-9_]+)'
      : `Math\\.max\\(\\s*([0-9_]+)\\s*,\\s*\\(\\s*System\\.getenv\\(\\s*['"]${scopeEnvironment}['"]\\s*\\)\\s*\\?:\\s*['"]([0-9_]+)['"]\\s*\\)\\s*as\\s+int\\s*\\)`;
    const pattern = new RegExp(
      `mutationThreshold\\s*=\\s*System\\.getenv\\(\\s*['"]${environment}['"]\\s*\\)\\s*==\\s*['"]${strictValue}['"]\\s*\\?\\s*${strictBranch}\\s*:\\s*([0-9_]+)`,
      'g',
    );
    const matches = [...executable.matchAll(pattern)];
    const assignments = executable.match(/\bmutationThreshold\s*=/g)?.length ?? 0;
    const relaxed = matches[0]?.at(-1);
    if (matches.length !== 1 || assignments !== 1 || numeric(relaxed) !== selector.relaxedValue
        || (scopeEnvironment !== null && numeric(matches[0][2]) !== numeric(matches[0][1]))) {
      return { error: `ghost quality selector for ${ratchet.id}: fail-closed mutationThreshold condition` };
    }
    return { value: numeric(matches[0][1]) };
  }

  if (selector.type === 'vitest-coverage-threshold') {
    const observed = readVitestThreshold(content, selector.key);
    return observed.error
      ? { error: `ghost quality selector for ${ratchet.id}: ${observed.error}` }
      : observed;
  }

  if (selector.type === 'package-script-flag') {
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return { error: `cannot parse ${ratchet.source}: ${error.message}` };
    }
    const command = parsed.scripts?.[selector.script];
    const flag = selector.flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = typeof command === 'string'
      ? singleMatch(command, new RegExp(`${flag}\\s+([0-9_]+)`))
      : null;
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: script ${selector.script} ${selector.flag}` }
      : { value: numeric(raw) };
  }

  if (selector.type === 'javascript-object-number') {
    const marker = executable.indexOf(`const ${selector.object} =`);
    const objectBlock = marker < 0 ? null : braceBlock(executable, marker);
    const propertyMarker = objectBlock?.indexOf(`${selector.property}:`);
    const propertyBlock = propertyMarker === undefined || propertyMarker < 0
      ? null
      : braceBlock(objectBlock, propertyMarker);
    const key = selector.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = propertyBlock ? singleMatch(propertyBlock, new RegExp(`\\b${key}\\s*:\\s*([0-9._]+)`)) : null;
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: ${selector.object}.${selector.property}.${selector.key}` }
      : { value: numeric(raw) };
  }

  if (selector.type === 'eslint-rule-severity') {
    const rule = selector.rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = singleMatch(executable, new RegExp(`["']${rule}["']\\s*:\\s*["'](off|warn|error)["']`));
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: ESLint rule ${selector.rule}` }
      : { value: raw };
  }

  return { error: `unsupported quality selector for ${ratchet.id}: ${selector.type ?? '(missing)'}` };
}

function sameValue(left, right) {
  return typeof left === 'number' && typeof right === 'number'
    ? Math.abs(left - right) < 1e-12
    : left === right;
}

export function loadGovernanceRegistry(registryPath) {
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

function validateRequiredContexts(value, knownContexts, label, errors) {
  const contexts = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(contexts)
    || contexts.length === 0
    || new Set(contexts).size !== contexts.length
    || contexts.some((context) => typeof context !== 'string' || context.trim() === '')) {
    errors.push(`${label}: requiredCiContext must be a non-empty string or unique string array`);
    return;
  }
  for (const context of contexts) {
    if (!knownContexts.has(context)) errors.push(`${label}: unknown required CI context '${context}'`);
  }
}

function validateStringArray(value, label, field, errors) {
  if (!Array.isArray(value)
    || value.length === 0
    || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    errors.push(`${label}: ${field} must be a non-empty string array`);
  }
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function validatePlaywrightSkipWaivers({ selector, catalogSources, repoRoot, setLabel, errors, snapshot }) {
  if (!Array.isArray(selector.skipWaivers)) {
    errors.push(`${setLabel}: Playwright skipWaivers must be an array`);
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const constructsBySource = new Map();
  for (const source of catalogSources) {
    constructsBySource.set(
      source,
      snapshot.analyze(path.join(repoRoot, source), 'runner-constructs', findRunnerSkipConstructs),
    );
  }

  const waiverIds = new Set();
  const waiverLocations = new Set();
  const waivedConstructs = new Set();
  for (const waiver of selector.skipWaivers) {
    const id = waiver?.id ?? '(missing-waiver-id)';
    const location = `${waiver?.source ?? ''}\0${waiver?.stableToken ?? ''}`;
    if (!RULE_ID.test(id)
      || !isSafeRelative(waiver?.source)
      || typeof waiver?.stableToken !== 'string'
      || waiver.stableToken.trim() === ''
      || waiver.stableToken.includes('\n')
      || typeof waiver?.owner !== 'string'
      || waiver.owner.trim() === ''
      || typeof waiver?.reason !== 'string'
      || waiver.reason.trim().length < 20
      || typeof waiver?.condition !== 'string'
      || waiver.condition.trim() === '') {
      errors.push(`${setLabel}: invalid structured Playwright skip waiver ${id}`);
      continue;
    }
    if (waiver.condition !== waiver.stableToken) {
      errors.push(`${setLabel}: Playwright skip waiver ${id} condition must equal its exact stableToken`);
    }
    if (waiverIds.has(id) || waiverLocations.has(location)) {
      errors.push(`${setLabel}: duplicate Playwright skip waiver ${id}`);
      continue;
    }
    waiverIds.add(id);
    waiverLocations.add(location);
    if (!validIsoDate(waiver.reviewBy)) {
      errors.push(`${setLabel}: Playwright skip waiver ${id} has invalid reviewBy`);
    } else if (waiver.reviewBy <= today) {
      errors.push(`${setLabel}: expired Playwright skip waiver ${id} (${waiver.reviewBy})`);
    }
    if (!catalogSources.has(waiver.source)) {
      errors.push(`${setLabel}: stale Playwright skip waiver ${id} points outside the catalog`);
      continue;
    }

    const sourceText = snapshot.read(path.join(repoRoot, waiver.source), 'utf8');
    const tokenIndexes = [];
    let index = sourceText.indexOf(waiver.stableToken);
    while (index >= 0) {
      tokenIndexes.push(index);
      index = sourceText.indexOf(waiver.stableToken, index + waiver.stableToken.length);
    }
    const constructs = constructsBySource.get(waiver.source) ?? [];
    const matches = tokenIndexes.flatMap((tokenIndex) => constructs
      .map((construct, constructIndex) => ({ construct, constructIndex }))
      .filter(({ construct }) => tokenIndex >= construct.index && tokenIndex < construct.end));
    if (tokenIndexes.length !== 1 || matches.length !== 1) {
      errors.push(`${setLabel}: stale Playwright skip waiver ${id} does not identify exactly one construct`);
      continue;
    }
    const [{ construct, constructIndex }] = matches;
    if (!['skip', 'skipIf'].includes(construct.kind)) {
      errors.push(`${setLabel}: Playwright waiver ${id} may cover only a conditional skip, not ${construct.kind}`);
      continue;
    }
    waivedConstructs.add(`${waiver.source}\0${constructIndex}`);
  }

  for (const [source, constructs] of constructsBySource) {
    constructs.forEach((construct, constructIndex) => {
      if (!waivedConstructs.has(`${source}\0${constructIndex}`)) {
        errors.push(`${setLabel}: unwaived Playwright skip construct ${construct.kind} at ${source}:${construct.line}`);
      }
    });
  }
}

function hasValidUniqueStrings(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => typeof item === 'string' && item.trim() !== '')
    && new Set(value).size === value.length;
}

function sameStringList(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((item, index) => item === right[index]);
}

function denominatorWideGlob(pattern) {
  return typeof pattern === 'string'
    && /^(?:\*{1,2})(?:[/.]\*{1,2})*$/.test(pattern.trim().replaceAll('\\', '/'));
}

function validateMinimumPopulation({ currentInclude, baselineInclude, currentExclude, baselineExclude, label, errors }) {
  for (const [field, value] of [
    ['include', currentInclude],
    ['baselineInclude', baselineInclude],
    ['exclude', currentExclude],
    ['baselineExclude', baselineExclude],
  ]) {
    if (value !== undefined && !hasValidUniqueStrings(value)) {
      errors.push(`${label}: ${field} must be a non-empty unique string array`);
    }
  }
  if (Array.isArray(baselineInclude) && Array.isArray(currentInclude)) {
    const missing = baselineInclude.filter((pattern) => !currentInclude.includes(pattern));
    if (missing.length > 0) {
      errors.push(`${label}: coverage include population shrank below baseline: ${missing.join(', ')}`);
    }
  }
  if (Array.isArray(baselineExclude) && Array.isArray(currentExclude)) {
    const added = currentExclude.filter((pattern) => !baselineExclude.includes(pattern));
    if (added.length > 0) {
      errors.push(`${label}: coverage exclude population expanded beyond baseline: ${added.join(', ')}`);
    }
  }
  for (const pattern of currentExclude ?? []) {
    if (denominatorWideGlob(pattern)) {
      errors.push(`${label}: denominator-wide exclusion is forbidden: ${pattern}`);
    }
  }
}

function validatePitMatrixExclusions({ matrixSet, excludedClasses, repoRoot, label, errors, snapshot }) {
  if (!matrixSet || !Array.isArray(matrixSet.selector?.matrixScopes)) {
    errors.push(`${label}: matrixGateSetId does not resolve to a PIT matrix catalog`);
    return;
  }
  const reported = new Set();
  for (const scope of matrixSet.selector.matrixScopes) {
    const gradleMatch = /^:([a-z0-9-]+):pitest$/.exec(scope.gradle ?? '');
    if (!gradleMatch) continue;
    const classes = snapshot.javaClassNames(path.join(repoRoot, gradleMatch[1], 'src', 'main', 'java'));
    for (const targetGlob of String(scope.classes ?? '').split(',').map((value) => value.trim()).filter(Boolean)) {
      const targets = classes.filter((className) => classGlobMatches(targetGlob, className));
      if (targets.length === 0) continue;
      const excludedTargets = targets.filter((className) => excludedClasses
        .some((excludeGlob) => classGlobMatches(excludeGlob, className)));
      if (excludedTargets.length === targets.length) {
        const error = `${label}: PIT exclusions erase matrix target '${scope.scope}:${targetGlob}'`;
        if (!reported.has(error)) {
          errors.push(error);
          reported.add(error);
        }
      }
      for (const excludeGlob of excludedClasses) {
        const isBroadPackageGlob = !excludeGlob.startsWith('*') && /[*?]/.test(excludeGlob);
        if (isBroadPackageGlob && targets.some((className) => classGlobMatches(excludeGlob, className))) {
          const error = `${label}: broad PIT exclusion '${excludeGlob}' intersects matrix target '${scope.scope}:${targetGlob}'`;
          if (!reported.has(error)) {
            errors.push(error);
            reported.add(error);
          }
        }
      }
    }
  }
}

function validateQualityPopulations({ registry, repoRoot, errors, registryIds, snapshot }) {
  if (!Array.isArray(registry?.qualityPopulations) || registry.qualityPopulations.length === 0) {
    errors.push('registry qualityPopulations must be a non-empty array');
    return;
  }

  for (const population of registry.qualityPopulations) {
    const label = population?.id ?? '(missing-population-id)';
    if (!RULE_ID.test(label)) errors.push(`invalid quality population id: ${label}`);
    if (registryIds.has(label)) errors.push(`duplicate registry id: ${label}`);
    registryIds.add(label);
    if (!isSafeRelative(population.source)) {
      errors.push(`${label}: source must be a safe relative path`);
      continue;
    }
    for (const field of ['owner', 'redProof']) {
      if (typeof population[field] !== 'string' || population[field].trim() === '') {
        errors.push(`${label}: missing ${field}`);
      }
    }

    const absolute = path.join(repoRoot, population.source);
    if (!snapshot.isFile(absolute)) {
      errors.push(`${label}: ghost population source: ${population.source}`);
      continue;
    }
    const consumer = snapshot.analyze(absolute, `population:${JSON.stringify(population.selector)}`,
      text => readPopulationConsumer(text, population.selector));
    if (consumer.error) {
      errors.push(`${label}: ghost population selector: ${consumer.error}`);
      continue;
    }

    if (population.selector?.type === 'gradle-list-assignment') {
      validateMinimumPopulation({
        currentExclude: population.exclude,
        baselineExclude: population.baselineExclude,
        label,
        errors,
      });
      if (!sameStringList(consumer.exclude, population.exclude)) {
        errors.push(`${label}: build.gradle exclusion population differs from registry exact order/content`);
      }
      continue;
    }

    if (population.selector?.type === 'vitest-coverage-population') {
      validateMinimumPopulation({
        currentInclude: population.include,
        baselineInclude: population.baselineInclude,
        currentExclude: population.exclude,
        baselineExclude: population.baselineExclude,
        label,
        errors,
      });
      if (!sameStringList(consumer.include, population.include)
        || !sameStringList(consumer.exclude, population.exclude)) {
        errors.push(`${label}: Vitest coverage population differs from registry exact order/content`);
      }
      continue;
    }

    if (population.selector?.type === 'gradle-pitest-population') {
      errors.push(...snapshot.analyze(absolute, 'pit-result', validatePitResultCheck)
        .map(error => `${label}: ${error}`));
      if (!hasValidUniqueStrings(population.excludedClasses)
        || !hasValidUniqueStrings(population.baselineExcludedClasses)) {
        errors.push(`${label}: PIT exclusion allowlists must be non-empty unique string arrays`);
      }
      for (const pattern of population.excludedClasses ?? []) {
        if (denominatorWideGlob(pattern)) {
          errors.push(`${label}: denominator-wide exclusion is forbidden: ${pattern}`);
        }
      }
      if (!sameStringList(population.excludedClasses, population.baselineExcludedClasses)) {
        errors.push(`${label}: PIT excludedClasses allowlist must remain exact-frozen`);
      }
      if (population.failWhenNoMutations !== true) {
        errors.push(`${label}: failWhenNoMutations must remain true`);
      }
      if (!sameStringList(consumer.excludedClasses, population.excludedClasses)) {
        errors.push(`${label}: Gradle PIT excludedClasses differs from registry exact order/content`);
      }
      if (consumer.failWhenNoMutations !== true) {
        errors.push(`${label}: executable Gradle pitest must set failWhenNoMutations = true`);
      }
      if (consumer.failWhenNoMutations !== population.failWhenNoMutations) {
        errors.push(`${label}: Gradle failWhenNoMutations differs from registry`);
      }
      const matrixSet = registry.gateSets?.find(({ id }) => id === population.matrixGateSetId);
      validatePitMatrixExclusions({
        matrixSet,
        excludedClasses: population.excludedClasses ?? [],
        repoRoot,
        label,
        errors,
        snapshot,
      });
      continue;
    }

    errors.push(`${label}: unsupported quality population selector '${population.selector?.type ?? ''}'`);
  }
}

function collectGovernanceAssets(registry, repoRoot, snapshot) {
  const assets = new Set([
    '.github/CODEOWNERS',
    'config/governance/gates.json',
    'scripts/governance-gates-contract.mjs',
    'scripts/governance-gates-contract.test.mjs',
  ]);
  const addFile = (source) => {
    if (isSafeRelative(source) && snapshot.isFile(path.join(repoRoot, source))) assets.add(posix(source));
  };

  for (const set of registry?.gateSets ?? []) {
    for (const rule of set.rules ?? []) addFile(rule.source);
    const selector = set.selector ?? {};
    addFile(selector.packageScript?.source);
    addFile(selector.projectContract?.source);
    for (const catalog of [...(selector.catalogs ?? []), ...(selector.supportRoots ?? [])]) {
      if (!isSafeRelative(catalog?.root) || !Array.isArray(catalog?.suffixes)) continue;
      const root = path.join(repoRoot, catalog.root);
      for (const file of snapshot.catalogFiles(root, catalog.recursive === true)) {
        if (catalog.suffixes.some((suffix) => file.endsWith(suffix))) {
          assets.add(posix(path.relative(repoRoot, file)));
        }
      }
    }
    for (const binding of selector.commandBindings ?? []) addFile(binding.source);
    for (const binding of selector.executionBindings ?? []) addFile(binding.source);
    for (const input of set.inputs ?? []) addFile(input);
  }
  for (const ratchet of registry?.qualityRatchets ?? []) {
    addFile(ratchet.source);
    for (const input of ratchet.inputs ?? []) addFile(input);
  }
  for (const profile of registry?.executionProfiles ?? []) {
    for (const binding of profile.bindings ?? []) addFile(binding.source);
  }
  for (const population of registry?.qualityPopulations ?? []) addFile(population.source);
  return assets;
}

export function codeOwnerCovers(pattern, source) {
  const normalized = pattern.replace(/^\//, '').replaceAll('\\', '/');
  if (normalized.endsWith('/')) return source.startsWith(normalized);
  const glob = normalized
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('**/', '\u0000')
    .replaceAll('**', '\u0001')
    .replaceAll('*', '[^/]*')
    .replaceAll('?', '[^/]')
    .replaceAll('\u0000', '(?:.*/)?')
    .replaceAll('\u0001', '.*');
  return new RegExp(`^${glob}$`).test(source);
}

export function effectiveCodeOwners(rules, source) {
  let owners = [];
  for (const [pattern, ...candidateOwners] of rules) {
    if (codeOwnerCovers(pattern, source)) owners = candidateOwners;
  }
  return owners;
}

function validateGovernanceOwnership(registry, repoRoot, errors, snapshot) {
  const codeownersPath = path.join(repoRoot, '.github', 'CODEOWNERS');
  if (!snapshot.isFile(codeownersPath)) {
    errors.push('governance CODEOWNERS file is missing');
    return;
  }
  const rules = snapshot.read(codeownersPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));

  for (const source of collectGovernanceAssets(registry, repoRoot, snapshot)) {
    if (!effectiveCodeOwners(rules, source).includes('@lkindo')) {
      errors.push(`governance asset is not CODEOWNERS-protected: ${source}`);
    }
  }
}

export function validateGovernanceRegistry({ registry, repoRoot, analysis, snapshot }) {
  // 기본(CLI 포함)은 검증마다 디스크를 새로 읽는다 — analysis 를 공유해도 파일 관찰은 공유하지 않는다.
  // 디스크를 바꾸지 않는 여러 검증은 같은 저장소에 묶인 snapshot 하나를 넘겨 읽은 결과를 함께 쓸 수 있다.
  if (snapshot === undefined) snapshot = createGovernanceRepositorySnapshot({ analysis, repoRoot });
  else assertSnapshotRoot(snapshot, repoRoot);
  const errors = [];
  const registryIds = new Set();
  const registeredSources = new Set();
  const registeredSelectors = new Set();
  let requiredChecks = [];
  let requiredContexts = new Set();

  try {
    const required = JSON.parse(snapshot.read(path.join(repoRoot, '.github', 'required-checks.json'), 'utf8'));
    requiredChecks = required.requiredChecks ?? [];
    requiredContexts = new Set(requiredChecks.map(({ context }) => context));
  } catch (error) {
    errors.push(`cannot read required CI contexts: ${error.message}`);
  }

  if (registry?.schemaVersion !== 1) errors.push('registry schemaVersion must be 1');
  const executionProfiles = new Map();
  if (!Array.isArray(registry?.executionProfiles) || registry.executionProfiles.length === 0) {
    errors.push('registry executionProfiles must be a non-empty array');
  }
  for (const profile of registry?.executionProfiles ?? []) {
    const label = profile?.id ?? '(missing-execution-profile-id)';
    if (!RULE_ID.test(label)) errors.push(`invalid execution profile id: ${label}`);
    if (executionProfiles.has(label)) errors.push(`duplicate execution profile id: ${label}`);
    executionProfiles.set(label, profile);
    if (typeof profile.command !== 'string' || profile.command.trim() === '') {
      errors.push(`${label}: missing execution profile command`);
    }
    if (!Array.isArray(profile.tier)
      || profile.tier.length === 0
      || new Set(profile.tier).size !== profile.tier.length
      || profile.tier.some((tier) => !ALLOWED_TIERS.has(tier))) {
      errors.push(`${label}: execution profile tier is invalid`);
    } else {
      validateExecutionBindings({
        bindings: profile.bindings,
        repoRoot,
        setLabel: label,
        errors,
        required: true,
        expectedTiers: profile.tier,
        snapshot,
      });
    }
  }
  if (!Array.isArray(registry?.gateSets) || registry.gateSets.length === 0) {
    errors.push('registry gateSets must be a non-empty array');
  }

  for (const set of registry?.gateSets ?? []) {
    const setLabel = set?.id ?? '(missing-set-id)';
    if (!RULE_ID.test(setLabel)) errors.push(`invalid gate set id: ${setLabel}`);
    if (registryIds.has(setLabel)) errors.push(`duplicate registry id: ${setLabel}`);
    registryIds.add(setLabel);
    const selector = set?.selector;
    if (!Array.isArray(set.tier)
      || set.tier.length === 0
      || new Set(set.tier).size !== set.tier.length
      || set.tier.some((tier) => !ALLOWED_TIERS.has(tier))) {
      errors.push(`${setLabel}: tier must contain only ${[...ALLOWED_TIERS].join(', ')}`);
    }
    if (!(typeof set.task === 'string' && set.task.trim() !== '')
      && !(Array.isArray(set.task)
        && set.task.length > 0
        && set.task.every((task) => typeof task === 'string' && task.trim() !== ''))) {
      errors.push(`${setLabel}: task must be a non-empty string or array`);
    }
    for (const field of ['category', 'owner', 'redProof']) {
      if (typeof set[field] !== 'string' || set[field].trim() === '') errors.push(`${setLabel}: missing ${field}`);
    }
    validateStringArray(set.inputs, setLabel, 'inputs', errors);
    validateStringArray(set.evidence, setLabel, 'evidence', errors);
    validateRequiredContexts(set.requiredCiContext, requiredContexts, setLabel, errors);

    if (selector?.type === 'java-class-annotation') {
      if (!isJavaAnnotationSelector(selector)) {
        errors.push(`${setLabel}: invalid java-class-annotation selector`);
        continue;
      }
      if (!Array.isArray(set.rules) || set.rules.length === 0) {
        errors.push(`${setLabel}: rules must be a non-empty array`);
        continue;
      }

      // 실제 선택 결과와 등록 대조는 사전 점검(taggedGateRegistryErrors)과 같은 함수다 — 판정기를 둘로 두지 않는다.
      const { sources: actual, errors: rootErrors } = javaAnnotatedSources({ repoRoot, setLabel, selector, snapshot });
      errors.push(...rootErrors);

      for (const rule of set.rules) {
        const id = rule?.id ?? '(missing-rule-id)';
        const source = rule?.source;
        if (!RULE_ID.test(id)) errors.push(`invalid gate id: ${id}`);
        if (registryIds.has(id)) errors.push(`duplicate gate id: ${id}`);
        registryIds.add(id);
        if (!isSafeRelative(source)) {
          errors.push(`${id}: source must be a safe relative path`);
          continue;
        }
        if (registeredSources.has(source)) errors.push(`duplicate registered source: ${source}`);
        registeredSources.add(source);
        const absolute = path.join(repoRoot, source);
        if (!snapshot.isFile(absolute)) {
          errors.push(`ghost gate source: ${source} does not exist`);
        } else {
          const expectedClassName = path.basename(source, '.java');
          if (!snapshot.analyze(absolute, `annotation:${selector.annotation}:${selector.value}:${expectedClassName}`,
            text => hasClassAnnotation(text, selector.annotation, selector.value, expectedClassName))) {
            errors.push(`ghost gate source: ${source} does not satisfy @${selector.annotation}("${selector.value}") on ${expectedClassName}`);
          }
          if (!snapshot.analyze(absolute, `runnable:${selector.annotation === 'ArchTag'}`, text => hasRunnableTestAnnotation(text, selector.annotation === 'ArchTag'))) {
            errors.push(`ghost gate source: ${source} declares no runnable test annotation`);
          }
          if (snapshot.analyze(absolute, 'gate-skip', hasGateSkipConstruct)) {
            errors.push(`ghost gate source: ${source} contains a disabled, conditional, or assumption-based skip`);
          }
        }
      }
      errors.push(...taggedGateRegistrationErrors({ repoRoot, setLabel, actual, registered: registeredGateSources(set.rules), snapshot }));
      validateExecutionBindings({
        bindings: selector.executionBindings,
        repoRoot,
        setLabel,
        errors,
        required: true,
        expectedTiers: set.tier,
        snapshot,
      });
      continue;
    }

    if (selector?.type === 'runner-catalog') {
      if (set.rules !== undefined) errors.push(`${setLabel}: runner catalogs must not enumerate individual test rules`);
      if (!['node-test', 'vitest', 'playwright'].includes(selector.runner)
        || !Array.isArray(selector.catalogs)
        || selector.catalogs.length === 0) {
        errors.push(`${setLabel}: invalid runner-catalog selector`);
        continue;
      }
      const catalogSources = new Set();
      for (const catalog of selector.catalogs) {
        if (!isSafeRelative(catalog?.root)
          || !Array.isArray(catalog?.suffixes)
          || catalog.suffixes.length === 0
          || catalog.suffixes.some((suffix) => typeof suffix !== 'string' || !suffix.startsWith('.'))) {
          errors.push(`${setLabel}: invalid runner catalog root or suffix selector`);
          continue;
        }
        const absoluteRoot = path.join(repoRoot, catalog.root);
        if (!snapshot.isDirectory(absoluteRoot)) {
          errors.push(`${setLabel}: ghost runner selector root: ${catalog.root}`);
          continue;
        }
        const matches = snapshot.catalogFiles(absoluteRoot, catalog.recursive === true)
          .filter((source) => catalog.suffixes.some((suffix) => source.endsWith(suffix)));
        if (matches.length === 0) errors.push(`${setLabel}: ghost runner selector matched no tests in ${catalog.root}`);
        for (const source of matches) catalogSources.add(posix(path.relative(repoRoot, source)));
      }

      if (selector.forbidSkips === true) {
        for (const source of catalogSources) {
          if (snapshot.analyze(path.join(repoRoot, source), 'runner-skip', containsRunnerSkip)) {
            errors.push(`${setLabel}: runner catalog contains a forbidden skip/only/todo: ${source}`);
          }
        }
      }
      if (selector.runner !== 'playwright' && selector.skipWaivers !== undefined) {
        errors.push(`${setLabel}: only Playwright catalogs may declare skipWaivers`);
      }

      for (const support of selector.supportRoots ?? []) {
        if (!isSafeRelative(support?.root)
          || !Array.isArray(support?.suffixes)
          || support.suffixes.length === 0
          || support.suffixes.some((suffix) => typeof suffix !== 'string' || !suffix.startsWith('.'))) {
          errors.push(`${setLabel}: invalid runner support root or suffix selector`);
          continue;
        }
        const matches = snapshot.catalogFiles(path.join(repoRoot, support.root), support.recursive === true)
          .filter((source) => support.suffixes.some((suffix) => source.endsWith(suffix)));
        if (matches.length === 0) errors.push(`${setLabel}: ghost runner support root matched no files in ${support.root}`);
      }

      const packageBinding = selector.packageScript;
      if (packageBinding !== undefined) {
        if (!isSafeRelative(packageBinding?.source)
          || typeof packageBinding?.name !== 'string'
          || typeof packageBinding?.command !== 'string') {
          errors.push(`${setLabel}: invalid packageScript selector`);
        } else {
          const absolute = path.join(repoRoot, packageBinding.source);
          try {
            const parsed = JSON.parse(snapshot.read(absolute, 'utf8'));
            const actualCommand = parsed.scripts?.[packageBinding.name];
            if (actualCommand !== packageBinding.command) {
              errors.push(`${setLabel}: ghost runner selector package script ${packageBinding.name}`);
            }
          } catch (error) {
            errors.push(`${setLabel}: cannot read runner package ${packageBinding.source}: ${error.message}`);
          }
        }
      }

      if (selector.runner === 'playwright') {
        validatePlaywrightSkipWaivers({ selector, catalogSources, repoRoot, setLabel, errors, snapshot });
        for (const source of catalogSources) {
          const content = snapshot.analyze(path.join(repoRoot, source), 'executable', executableContent);
          if (!/\btest\s*\(/.test(content)) {
            errors.push(`${setLabel}: Playwright spec has no runnable test(): ${source}`);
          }
        }
        const project = selector.projectContract;
        if (!isSafeRelative(project?.source)) {
          errors.push(`${setLabel}: invalid Playwright project contract`);
        } else {
          const absolute = path.join(repoRoot, project.source);
          const content = snapshot.isFile(absolute) ? snapshot.read(absolute, 'utf8') : '';
          errors.push(...validatePlaywrightProjectContract(content, project)
            .map((error) => `${setLabel}: ${error}`));
        }
      }

      const commandBindings = selector.commandBindings ?? [];
      const bindingErrorStart = errors.length;
      validateExecutionBindings({
        bindings: commandBindings,
        repoRoot,
        setLabel,
        errors,
        expectedTiers: set.tier,
        snapshot,
      });
      for (let index = bindingErrorStart; index < errors.length; index += 1) {
        errors[index] = errors[index]
          .replace('invalid execution binding', 'invalid runner command binding')
          .replace('ghost execution binding', 'ghost runner command binding');
      }

      for (const bindingSource of selector.catalogCoverage ?? []) {
        if (!isSafeRelative(bindingSource) || !snapshot.isFile(path.join(repoRoot, bindingSource))) {
          errors.push(`${setLabel}: ghost catalog coverage binding: ${bindingSource}`);
          continue;
        }
        const content = snapshot.read(path.join(repoRoot, bindingSource), 'utf8');
        for (const source of catalogSources) {
          if (!content.includes(source)) {
            errors.push(`${setLabel}: unregistered runner catalog item in ${bindingSource}: ${source}`);
          }
        }
      }

      if (packageBinding === undefined && commandBindings.length === 0) {
        errors.push(`${setLabel}: runner catalog has no execution binding`);
      }
      continue;
    }

    if (selector?.type === 'required-check-aggregate') {
      if (set.rules !== undefined) errors.push(`${setLabel}: aggregate runners must not enumerate individual test rules`);
      const check = requiredChecks.find(({ context }) => context === selector.context);
      // 한 context 가 소스 잡을 여럿 가질 수 있다(DEC-OPS-104). 선언 집합이 매니페스트와 정확히 같아야 하고,
      //   strictEnvironment 는 **모든** 소스에서 성립해야 한다 — 한 잡에서만 STRICT_MUTATION 을 빼는 경로를 막는다.
      const declaredSources = Array.isArray(check?.aggregate)
        ? check.aggregate
        : (check?.aggregate ? [check.aggregate] : []);
      const expectedSourceJobIds = Array.isArray(selector.sourceJobIds) ? selector.sourceJobIds : [];
      const actualSourceJobIds = declaredSources.map((source) => source?.sourceJobId);
      const sameSources = expectedSourceJobIds.length === actualSourceJobIds.length
        && expectedSourceJobIds.every((jobId, index) => jobId === actualSourceJobIds[index]);
      if (!check || !sameSources || declaredSources.some((source) => source?.sourceRun !== set.task)) {
        errors.push(`${setLabel}: ghost required-check aggregate selector for ${selector?.context ?? ''}`);
      } else {
        for (const [name, value] of Object.entries(selector.strictEnvironment ?? {})) {
          for (const source of declaredSources) {
            if (source.sourceEnv?.[name] !== value) {
              errors.push(`${setLabel}: aggregate environment ${name} must remain ${value} in '${source.sourceJobId}'`);
            }
          }
        }
      }
      if (selector.context === 'mutation-test') {
        validateMutationScopeCatalog(selector, repoRoot, errors, setLabel, snapshot);
      }
      continue;
    }

    errors.push(`${setLabel}: unsupported gate selector type '${selector?.type ?? ''}'`);
  }

  validateQualityPopulations({ registry, repoRoot, errors, registryIds, snapshot });

  if (!Array.isArray(registry?.qualityRatchets) || registry.qualityRatchets.length === 0) {
    errors.push('registry qualityRatchets must be a non-empty array');
  }
  for (const ratchet of registry?.qualityRatchets ?? []) {
    const id = ratchet?.id ?? '(missing-quality-id)';
    if (!RULE_ID.test(id)) errors.push(`invalid quality id: ${id}`);
    if (registryIds.has(id)) errors.push(`duplicate gate id: ${id}`);
    registryIds.add(id);
    const sourceIsSafe = isSafeRelative(ratchet.source);
    if (!sourceIsSafe) errors.push(`${id}: source must be a safe relative path`);
    const selectorFingerprint = `${ratchet.source}\0${JSON.stringify(ratchet.selector)}`;
    if (registeredSelectors.has(selectorFingerprint)) errors.push(`duplicate quality selector: ${id}`);
    registeredSelectors.add(selectorFingerprint);
    if (!Array.isArray(ratchet.tier)
      || ratchet.tier.length === 0
      || new Set(ratchet.tier).size !== ratchet.tier.length
      || ratchet.tier.some((tier) => !ALLOWED_TIERS.has(tier))) {
      errors.push(`${id}: tier must contain only ${[...ALLOWED_TIERS].join(', ')}`);
    }
    for (const field of ['command', 'category', 'owner', 'redProof']) {
      if (typeof ratchet[field] !== 'string' || ratchet[field].trim() === '') errors.push(`${id}: missing ${field}`);
    }
    const executionProfile = executionProfiles.get(ratchet.executionProfile);
    if (!executionProfile) {
      errors.push(`${id}: unknown execution profile '${ratchet.executionProfile ?? ''}'`);
    } else {
      const profileTiers = [...executionProfile.tier].sort();
      const ratchetTiers = [...ratchet.tier].sort();
      if (JSON.stringify(profileTiers) !== JSON.stringify(ratchetTiers)) {
        errors.push(`${id}: execution profile tiers do not match the ratchet tiers`);
      }
      if (executionProfile.command !== ratchet.command) {
        errors.push(`${id}: execution profile command does not match the ratchet command`);
      }
    }
    if (!Array.isArray(ratchet.inputs)
      || ratchet.inputs.length === 0
      || ratchet.inputs.some((input) => typeof input !== 'string' || input.trim() === '')) {
      errors.push(`${id}: inputs must be a non-empty string array`);
    }
    if (!Array.isArray(ratchet.evidence)
      || ratchet.evidence.length === 0
      || ratchet.evidence.some((item) => typeof item !== 'string' || item.trim() === '')) {
      errors.push(`${id}: evidence must be a non-empty string array`);
    }
    validateRequiredContexts(ratchet.requiredCiContext, requiredContexts, id, errors);

    if (ratchet.direction === 'minimum') {
      if (!(typeof ratchet.current === 'number' && typeof ratchet.baseline === 'number')) {
        errors.push(`${id}: numeric minimum ratchet requires current and baseline`);
      } else if (ratchet.current < ratchet.baseline) {
        errors.push(`${id}: weakened below baseline (${ratchet.current} < ${ratchet.baseline})`);
      }
    } else if (ratchet.direction === 'maximum') {
      if (!(typeof ratchet.current === 'number' && typeof ratchet.baseline === 'number')) {
        errors.push(`${id}: numeric maximum ratchet requires current and baseline`);
      } else if (ratchet.current > ratchet.baseline) {
        errors.push(`${id}: weakened above baseline (${ratchet.current} > ${ratchet.baseline})`);
      }
    } else if (ratchet.direction === 'minimum-severity') {
      if (!SEVERITY.has(ratchet.current) || !SEVERITY.has(ratchet.baseline)) {
        errors.push(`${id}: invalid severity ratchet`);
      } else if (SEVERITY.get(ratchet.current) < SEVERITY.get(ratchet.baseline)) {
        errors.push(`${id}: weakened below baseline severity (${ratchet.current} < ${ratchet.baseline})`);
      }
    } else {
      errors.push(`${id}: direction must be minimum, maximum, or minimum-severity`);
    }

    if (sourceIsSafe) {
      const consumer = readConsumerValue(repoRoot, ratchet, snapshot);
      if (consumer.error) errors.push(consumer.error);
      else if (!sameValue(consumer.value, ratchet.current)) {
        errors.push(`${id}: consumer value ${consumer.value} does not match registry current ${ratchet.current}`);
      }
    }
    if (ratchet.selector?.type === 'gradle-mutation-threshold') {
      validateMutationScopeFloors({ registry, ratchet, repoRoot, snapshot, errors });
    }
  }

  validateGovernanceOwnership(registry, repoRoot, errors, snapshot);
  errors.push(...findTaggedGatesOutsideRoots(repoRoot, registry.gateSets, JAVA_GATE_SCAN_ROOTS, snapshot));

  return errors;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const registryPath = path.join(repoRoot, 'config', 'governance', 'gates.json');
  try {
    const registry = loadGovernanceRegistry(registryPath);
    const errors = validateGovernanceRegistry({ registry, repoRoot });
    if (errors.length > 0) {
      console.error('❌ governance gate registry contract failed:');
      errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }
    const ruleCount = registry.gateSets.reduce((sum, set) => sum + (set.rules?.length ?? 0), 0);
    const runnerCount = registry.gateSets.filter(({ selector }) => selector.type !== 'java-class-annotation').length;
    console.log(`✅ governance registry: ${ruleCount} tagged gates, ${runnerCount} runner gates, ${registry.qualityRatchets.length} quality ratchets, ${registry.qualityPopulations.length} population contracts`);
  } catch (error) {
    console.error(`❌ cannot validate governance registry: ${error.message}`);
    process.exit(1);
  }
}

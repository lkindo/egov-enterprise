/**
 * 프런트 모듈 지정자 해석기 — frontend-module-graph.mjs 가 읽은 지정자를 파일로 잇는다.
 *
 * 도달성 census 와 재사용 base 생성기(정밀 점검 포함)가 같은 해석기를 쓴다(슬롯 단계 PR-2 판정 통일).
 * frontend 안의 대상은 **넘겨받은 파일 목록과 정확히 같은 표기**로만 판정한다. 디스크를 묻지 않으므로 대소문자를 가리지
 * 않는 디스크(Windows·macOS)에서도 대소문자만 다른 지정자는 일치가 아니라 IMPORT_TARGET_CASE_MISMATCH 다 — 같은
 * manifest 가 플랫폼마다 다른 결과를 내지 않게 한다. 후보가 둘 이상이면 AMBIGUOUS_IMPORT_TARGET 이다.
 *
 * 결과는 다음 가운데 하나다.
 * - `{ target }`: 파일 목록 안의 파일.
 * - `{ external: 'package' }`: 패키지 지정자(상대·`@/` 가 아님).
 * - `{ external: 'build-output' }`: frontend 아래 빌드·의존성 폴더(.next·node_modules 등). 간선도 issue 도 아니다(next-env.d.ts).
 * - `{ external: 'outside-frontend' }`: frontend 밖 저장소 파일. `outsideFile` 을 넘기면 대신 그 판정으로 잇는다(census).
 * - `{ missing: true, issue }`: frontend 안인데 목록에 없다.
 * - `{ issue }`: 판정할 수 없다(대소문자 불일치·모호·지정자 접미사).
 * 생성기는 Node 내장 모듈만 쓴다(의존성 설치 전에 돈다). 운영 계약 frontend-reachability-census.test.mjs 의 import 폐포 시험이
 * 지킨다 — reusable-base·custom 잡은 루트 설치 없이 돌아 늦게 붉고, 지연 로드 경로는 실행하지 않으므로 운영 계약 단계로 앞당긴다.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const MODULE_EXTENSIONS = Object.freeze([
  '.d.ts',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);
const RESOLVABLE_EXTENSIONS = Object.freeze([
  ...MODULE_EXTENSIONS,
  '.json',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.woff',
  '.woff2',
]);
/**
 * frontend 아래에서 소스가 아닌 빌드·의존성 폴더. census 의 파일 걷기와 해석기의 build-output 판정이 같은 목록을 쓴다.
 * `.pnpm-store` 는 pnpm 이 프로젝트 안에 둔 내용 주소 저장소다 — 수만 개 파일이지만 소스가 아니고 생성기의 복사 목록에도 없다.
 */
export const IGNORED_FRONTEND_DIRECTORIES = new Set([
  'node_modules',
  '.pnpm-store',
  '.next',
  'coverage',
  '.turbo',
  'dist',
  'build',
  'playwright-report',
  'test-results',
]);

export function normalizePath(path) {
  return path.split(sep).join('/');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'en'));
}

export function buildCaseMap(paths) {
  const map = new Map();
  for (const path of paths) {
    const key = normalizePath(resolve(path)).toLowerCase();
    const values = map.get(key) ?? [];
    values.push(resolve(path));
    map.set(key, values);
  }
  return map;
}

function withoutQueryOrFragment(specifier) {
  const marker = specifier.search(/[?#]/);
  return marker < 0 ? specifier : specifier.slice(0, marker);
}

// 후보 경로는 base 만의 순수 함수다. 구성을 여럿 도는 연쇄 계획이 같은 지정자를 거듭 풀므로 기억해 둔다.
// 같은 배열을 모든 호출자(census 포함)에게 돌려주므로 얼려 둔다 — 한 소비자가 배열을 고치면 다음 해석이 조용히 바뀐다.
const candidateCache = new Map();
export function candidatePaths(base) {
  if (!candidateCache.has(base)) candidateCache.set(base, Object.freeze(computeCandidatePaths(base)));
  return candidateCache.get(base);
}

function computeCandidatePaths(base) {
  const output = [base];
  if (extname(base)) {
    const extension = extname(base);
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(extension)) {
      const withoutExtension = base.slice(0, -extension.length);
      output.push(...MODULE_EXTENSIONS.map((candidate) => `${withoutExtension}${candidate}`));
    }
  } else {
    output.push(...RESOLVABLE_EXTENSIONS.map((extension) => `${base}${extension}`));
    output.push(...RESOLVABLE_EXTENSIONS.map((extension) => join(base, `index${extension}`)));
  }
  return uniqueSorted(output.map((path) => resolve(path)));
}

/**
 * frontend 밖 저장소 파일을 디스크에서 찾는 판정(census 전용). 경로 조각마다 디렉터리의 실제 이름과 대조해, 표기가 정확히
 * 같을 때만 'exact' 다. 대소문자를 가리지 않는 디스크에서 이름만 다르게 찾히면 'case' 다. 결과는 플랫폼과 무관하다.
 * 저장소 밖 파일은 이름 대조 없이 'exact' 다. 디스크 질의(exists·isFile·list)는 주입할 수 있다 — 'case' 분기는 대소문자를 가리지
 * 않는 디스크에서만 닿으므로, 시험이 가짜 디스크로 플랫폼과 무관하게 고정한다.
 */
export function repositoryFileLookup(repoRoot, {
  exists = existsSync,
  isFile = (path) => statSync(path).isFile(),
  list = readdirSync,
} = {}) {
  const root = resolve(repoRoot);
  const names = new Map();
  const entriesOf = (directory) => {
    if (!names.has(directory)) {
      let entries;
      try { entries = new Set(list(directory)); } catch { entries = new Set(); }
      names.set(directory, entries);
    }
    return names.get(directory);
  };
  return (candidate) => {
    if (!exists(candidate) || !isFile(candidate)) return undefined;
    const rel = relative(root, candidate);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return 'exact';
    let directory = root;
    for (const segment of rel.split(sep)) {
      if (!entriesOf(directory).has(segment)) return 'case';
      directory = join(directory, segment);
    }
    return 'exact';
  };
}

function isOutside(root, target) {
  const rel = relative(root, target);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

/**
 * 지정자 하나를 해석한다. `knownFiles` 는 frontend 파일 절대 경로(resolve 된 표기)의 집합, `caseMap` 은 같은 목록의
 * buildCaseMap 결과다. `repoRoot` 는 issue 의 파일 표기 기준이다.
 */
export function resolveModuleReference({
  importer,
  specifier,
  frontendRoot,
  sourceRoot = join(frontendRoot, 'src'),
  knownFiles,
  caseMap,
  repoRoot = dirname(frontendRoot),
  line,
  outsideFile,
}) {
  const cleanSpecifier = withoutQueryOrFragment(specifier);
  let base;
  if (cleanSpecifier.startsWith('@/')) base = join(sourceRoot, cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('./') || cleanSpecifier.startsWith('../')) {
    base = resolve(dirname(importer), cleanSpecifier);
  } else {
    return { external: 'package' };
  }
  const file = normalizePath(relative(repoRoot, importer));

  if (cleanSpecifier !== specifier) {
    return { issue: { code: 'UNSUPPORTED_LOCAL_IMPORT_SUFFIX', file, line, detail: specifier } };
  }

  const frontend = resolve(frontendRoot);
  const outside = isOutside(frontend, resolve(base));
  if (outside && !outsideFile) return { external: 'outside-frontend' };
  if (!outside && IGNORED_FRONTEND_DIRECTORIES.has(relative(frontend, resolve(base)).split(sep)[0])) {
    return { external: 'build-output' };
  }

  const matches = [];
  const caseMismatches = [];
  for (const candidate of candidatePaths(base)) {
    if (outside) {
      const found = outsideFile(candidate);
      if (found === 'exact') matches.push(candidate);
      else if (found === 'case') caseMismatches.push(candidate);
      continue;
    }
    if (knownFiles.has(candidate)) matches.push(candidate);
  }
  // 대소문자 불일치는 정확한 일치가 하나도 없을 때만 쓴다. 그때만 후보마다 대소문자 맵을 묻는다 — 모든 후보(확장자 없는 지정자는
  // 47개)마다 묻던 것이 연쇄 계획 시간의 대부분이었다. 판정은 같다(정확한 일치가 대소문자만 다른 형제보다 늘 앞선다).
  if (!outside && matches.length === 0) {
    for (const candidate of candidatePaths(base)) {
      for (const match of caseMap.get(normalizePath(candidate).toLowerCase()) ?? []) caseMismatches.push(match);
    }
  }

  const uniqueMatches = uniqueSorted(matches);
  if (uniqueMatches.length === 1) return { target: uniqueMatches[0] };
  const display = (path) => normalizePath(relative(repoRoot, path));
  if (uniqueMatches.length > 1) {
    return { issue: { code: 'AMBIGUOUS_IMPORT_TARGET', file, line, detail: `${specifier} -> ${uniqueMatches.map(display).join(', ')}` } };
  }
  if (caseMismatches.length > 0) {
    return { issue: { code: 'IMPORT_TARGET_CASE_MISMATCH', file, line, detail: `${specifier} -> ${uniqueSorted(caseMismatches).map(display).join(', ')}` } };
  }
  return { missing: true, issue: { code: 'MISSING_IMPORT_TARGET', file, line, detail: specifier } };
}

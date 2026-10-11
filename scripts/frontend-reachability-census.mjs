#!/usr/bin/env node
/**
 * Frontend source reachability census.
 *
 * This is deliberately a deletion preflight, not a delete list. It uses only
 * Node built-ins so the root operational-contract job can run before frontend
 * dependencies are installed. Unknown import syntax and unresolved local
 * dependencies are errors; callers may inspect the partial census with
 * `failOnErrors: false`, but the CLI always fails closed.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseModuleReferences, tokenizeDependencies } from './frontend-module-graph.mjs';
import {
  IGNORED_FRONTEND_DIRECTORIES,
  buildCaseMap,
  candidatePaths,
  normalizePath,
  repositoryFileLookup,
  resolveModuleReference,
} from './frontend-module-resolver.mjs';
import { createFrontendProjector, isFrontendModuleFile, planFrontendRemoval } from './reusable-source-frontend.mjs';
import { git, isCopyableSourceFile, trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

/*
 * [2026-10-11 슬롯 단계 PR-2] 간선을 읽는 토크나이저·파서와 지정자 해석기는 frontend-module-graph.mjs·frontend-module-resolver.mjs
 * 로 옮겼다. 재사용 base 생성기·정밀 점검이 같은 함수로 연쇄 제거를 판정한다. 프로필 제약도 생성기의 투영(createFrontendProjector)과
 * 연쇄 계획(planFrontendRemoval)을 생성기와 같은 모집단(Git 복사 목록, copiedFrontendFiles)에 그대로 불러 계산한다 — census 안에 두 번째
 * 마커 파서·연쇄 루프를 두지 않고, 같은 함수·같은 입력이라 census 의 연쇄 제약이 곧 생성기의 연쇄다.
 */

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = resolve(dirname(SCRIPT_PATH), '..');

const NEXT_APP_ENTRY_NAMES = new Set([
  'page',
  'layout',
  'template',
  'loading',
  'error',
  'global-error',
  'not-found',
  'default',
  'route',
  'sitemap',
  'robots',
  'manifest',
  'icon',
  'apple-icon',
  'opengraph-image',
  'twitter-image',
]);
const ROOT_RUNTIME_ENTRY_NAMES = new Set([
  'proxy',
  'middleware',
  'instrumentation',
  'instrumentation-client',
]);
const DELETION_CLASSES = new Set([
  'safe-candidate',
  'runtime-reachable',
  'test-only',
  'ambiguous',
]);

export const CURRENT_REPOSITORY_ASSERTIONS = Object.freeze({
  // [2026-09-07] 쪽지 작성이 UserPicker → RecipientPicker 로 옮겨가 이 체인의 진입점이 바뀌었다.
  // UserPicker 는 죽지 않았다 — 메모보고 관리와 결재 기안 다이얼로그가 계속 렌더한다. 이 단언이
  // 지키는 것은 "가상 리스트가 실제 라우트에서 도달 가능하다" 이므로 진입점만 갱신한다.
  runtimeChains: [
    [
      'frontend/src/app/admin/operation/memo-reports/page.tsx',
      'frontend/src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx',
      'frontend/src/app/components/ui/user-picker.tsx',
      'frontend/src/app/components/ui/virtual-scroll-list.tsx',
    ],
  ],
  runtimeReachable: [
    'frontend/src/app/admin/user/UserOrgHubClient.tsx',
  ],
  // [2026-08-23 m-2] test-only 였던 admin/user/manage/UserManageClient.tsx 는 전용 테스트와 함께
  // 삭제됐다(장식 카드·死버튼 정리 — 실제 라우트는 UserOrgHubClient 를 렌더한다).
  notRuntimeReachable: [],
  deletionClasses: {},
});

function repoRelative(repoRoot, path) {
  return normalizePath(relative(repoRoot, path));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'en'));
}

function isInside(root, target) {
  const rel = relative(root, target);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}

function walkFiles(root, predicate = () => true, options = {}) {
  const output = [];
  if (!existsSync(root)) return output;
  const ignoredDirectories = options.ignoredDirectories ?? new Set();

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(path);
      } else if (entry.isFile() && predicate(path)) {
        output.push(resolve(path));
      }
    }
  }

  visit(root);
  return output.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right), 'en'));
}

function isTestFile(path) {
  const normalized = normalizePath(path);
  return normalized.split('/').includes('__tests__')
    || /(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/.test(normalized);
}

function isStoryFile(path) {
  return /(?:^|\/)[^/]+\.(?:stories|story)\.(?:[cm]?[jt]sx?)$/.test(normalizePath(path));
}

function isTestHarnessEntry(path, frontendRoot) {
  if (isTestFile(path)) return true;
  const rel = normalizePath(relative(frontendRoot, path));
  return rel.startsWith('e2e/')
    || /^(?:vitest|playwright)(?:\.config|\.setup)?\.(?:[cm]?[jt]s)$/.test(basename(path));
}

function isNextRuntimeEntry(path, sourceRoot) {
  const relativeSource = normalizePath(relative(sourceRoot, path));
  const extension = extname(path);
  const stem = basename(path, extension);
  if (relativeSource.startsWith('app/') && NEXT_APP_ENTRY_NAMES.has(stem)) return true;
  return !relativeSource.includes('/') && ROOT_RUNTIME_ENTRY_NAMES.has(stem);
}

function isConfigEntry(path, frontendRoot) {
  const rel = normalizePath(relative(frontendRoot, path));
  if (rel.includes('/')) return false;
  return /(?:^|\.)(?:config)\.(?:[cm]?[jt]s)$/.test(basename(path))
    || /^(?:next|eslint|postcss|tailwind|vitest|playwright)\..*\.(?:[cm]?[jt]s)$/.test(basename(path))
    || /^(?:next|eslint|postcss|tailwind|vitest|playwright)\.config\.(?:[cm]?[jt]s)$/.test(basename(path));
}

function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (source[index] === '\n') line += 1;
  return line;
}

function parseConfigStringReferences(source, file, moduleReferences) {
  const { tokens } = tokenizeDependencies(source, file);
  const moduleSpecifiers = new Set(moduleReferences.map(({ specifier }) => specifier));
  const references = [];
  const requiredFileProperties = new Set(['setupFiles', 'globalSetup', 'globalTeardown']);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!['string', 'template'].includes(token.type) || token.interpolated) continue;
    if (!token.value.startsWith('./') && !token.value.startsWith('../') && !token.value.startsWith('@/')) continue;
    if (moduleSpecifiers.has(token.value)) continue;
    let property;
    for (let cursor = index - 1; cursor >= 0 && index - cursor <= 12; cursor -= 1) {
      if (tokens[cursor].value === ':' && tokens[cursor - 1]?.type === 'identifier') {
        property = tokens[cursor - 1].value;
        break;
      }
      if (['{', '}', ';'].includes(tokens[cursor].value)) break;
    }
    references.push({
      kind: 'config-string',
      specifier: token.value,
      typeOnly: false,
      line: token.line,
      optionalConfigReference: !requiredFileProperties.has(property),
    });
  }
  return references;
}

function issueKey(issue) {
  return `${issue.code}\0${issue.file}\0${issue.line ?? ''}\0${issue.detail ?? ''}`;
}

function formatIssues(issues) {
  return issues
    .map((issue) => `[${issue.code}] ${issue.file}${issue.line ? `:${issue.line}` : ''}${issue.detail ? ` — ${issue.detail}` : ''}`)
    .join('\n');
}

function bfs(roots, adjacency, includeTypeOnly = true) {
  const parent = new Map();
  const queue = [];
  for (const root of uniqueSorted(roots)) {
    if (parent.has(root)) continue;
    parent.set(root, { root: true });
    queue.push(root);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const from = queue[index];
    for (const edge of adjacency.get(from) ?? []) {
      if (!includeTypeOnly && edge.typeOnly) continue;
      if (parent.has(edge.to)) continue;
      parent.set(edge.to, { from, edge });
      queue.push(edge.to);
    }
  }
  return parent;
}

function evidencePath(parent, target, repoRoot) {
  if (!parent.has(target)) return undefined;
  const nodes = [];
  const edges = [];
  let cursor = target;
  while (cursor) {
    nodes.push(repoRelative(repoRoot, cursor));
    const record = parent.get(cursor);
    if (!record || record.root) break;
    edges.push({
      from: repoRelative(repoRoot, record.from),
      to: repoRelative(repoRoot, cursor),
      kind: record.edge.kind,
      typeOnly: record.edge.typeOnly,
      specifier: record.edge.specifier,
      line: record.edge.line,
    });
    cursor = record.from;
  }
  nodes.reverse();
  edges.reverse();
  return { nodes, edges };
}

function collectTextFiles(roots, extensions) {
  const files = [];
  for (const root of roots) {
    if (!root || !existsSync(root)) continue;
    const stat = statSync(root);
    if (stat.isFile()) {
      if (extensions.has(extname(root).toLowerCase())) files.push(resolve(root));
    } else if (stat.isDirectory()) {
      files.push(...walkFiles(root, (path) => extensions.has(extname(path).toLowerCase()), {
        ignoredDirectories: IGNORED_FRONTEND_DIRECTORIES,
      }));
    }
  }
  return uniqueSorted(files);
}

function referencedSourceFile(rawReference, { repoRoot, frontendRoot, sourceRoot, sourceFiles, caseMap }) {
  const normalized = rawReference.replaceAll('\\', '/').replace(/[),;:'"`]+$/g, '');
  let base;
  if (normalized.startsWith('frontend/src/')) base = join(repoRoot, ...normalized.split('/'));
  else if (normalized.startsWith('src/')) base = join(frontendRoot, ...normalized.split('/'));
  else if (normalized.startsWith('@/')) base = join(sourceRoot, ...normalized.slice(2).split('/'));
  else return undefined;

  const matches = candidatePaths(base).filter((candidate) => sourceFiles.has(candidate));
  if (matches.length === 1) return matches[0];
  const caseMatches = candidatePaths(base)
    .flatMap((candidate) => caseMap.get(normalizePath(candidate).toLowerCase()) ?? [])
    .filter((candidate) => sourceFiles.has(candidate));
  return uniqueSorted(caseMatches).length === 1 ? uniqueSorted(caseMatches)[0] : undefined;
}

function scanTextReferences(files, context) {
  const result = new Map();
  const pattern = /(?:frontend\/src\/|src\/|@\/)[A-Za-z0-9_.$@/\\\-[\]()]+(?:\.[cm]?[jt]sx?|\.css|\.scss|\.sass|\.less)?/g;
  for (const sourcePath of files) {
    const source = readFileSync(sourcePath, 'utf8');
    for (const match of source.matchAll(pattern)) {
      const target = referencedSourceFile(match[0], context);
      if (!target) continue;
      const references = result.get(target) ?? [];
      references.push({
        kind: 'path',
        source: repoRelative(context.repoRoot, sourcePath),
        line: lineAt(source, match.index ?? 0),
        reference: match[0],
      });
      result.set(target, references);
    }
  }
  for (const references of result.values()) {
    references.sort((left, right) => left.source.localeCompare(right.source, 'en') || left.line - right.line);
  }
  return result;
}

function scanNarrativeBasenameReferences(files, sourceFiles, repoRoot) {
  const candidatesByToken = new Map();
  for (const file of sourceFiles) {
    const name = basename(file);
    const stem = name.replace(/(?:\.d)?\.[cm]?[jt]sx?$/, '');
    for (const token of [name, stem]) {
      if (token.length < 8) continue;
      const candidates = candidatesByToken.get(token) ?? [];
      candidates.push(file);
      candidatesByToken.set(token, candidates);
    }
  }
  const uniqueCandidates = new Map(
    [...candidatesByToken].filter(([, candidates]) => uniqueSorted(candidates).length === 1),
  );
  const result = new Map();
  const tokenPattern = /[A-Za-z_$][A-Za-z0-9_$-]*(?:(?:\.d)?\.[cm]?[jt]sx?)?/g;
  for (const sourcePath of files) {
    const source = readFileSync(sourcePath, 'utf8');
    for (const match of source.matchAll(tokenPattern)) {
      const candidates = uniqueCandidates.get(match[0]);
      if (!candidates) continue;
      const target = candidates[0];
      const references = result.get(target) ?? [];
      references.push({
        kind: 'basename',
        source: repoRelative(repoRoot, sourcePath),
        line: lineAt(source, match.index ?? 0),
        reference: match[0],
      });
      result.set(target, references);
    }
  }
  return result;
}

function mergeReferenceMaps(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [file, references] of map) {
      const byEvidence = new Map((merged.get(file) ?? []).map((reference) => [
        `${reference.source}\0${reference.line}`,
        reference,
      ]));
      for (const reference of references) {
        const key = `${reference.source}\0${reference.line}`;
        if (!byEvidence.has(key)) byEvidence.set(key, reference);
      }
      merged.set(file, [...byEvidence.values()].sort(
        (left, right) => left.source.localeCompare(right.source, 'en') || left.line - right.line,
      ));
    }
  }
  return merged;
}

function directProfileFiles(frontendRoot, sourceFiles, directPaths, repoRoot, profileName, issues) {
  const direct = new Map();
  const accepted = [];
  for (const configuredPath of directPaths) {
    if (typeof configuredPath !== 'string' || configuredPath.trim() === '') {
      issues.push({ code: 'INVALID_PROFILE_REMOVE_PATH', file: 'config/reusable-base-profiles.json', detail: profileName });
      continue;
    }
    const absolute = resolve(frontendRoot, configuredPath);
    if (!isInside(frontendRoot, absolute)) {
      issues.push({ code: 'UNSAFE_PROFILE_REMOVE_PATH', file: 'config/reusable-base-profiles.json', detail: configuredPath });
      continue;
    }
    const matches = [...sourceFiles].filter((file) => file === absolute || isInside(absolute, file));
    if (matches.length === 0 && !existsSync(absolute)) {
      issues.push({
        code: 'STALE_PROFILE_REMOVE_PATH',
        file: 'config/reusable-base-profiles.json',
        detail: `${profileName}: ${configuredPath}`,
      });
      continue;
    }
    accepted.push(configuredPath);
    for (const file of matches) direct.set(file, configuredPath);
  }
  return { direct, accepted };
}

/*
 * 프로필 제약을 계산할 프런트 파일 모집단. repoRoot 가 Git 저장소의 최상위이면 생성기·정밀 점검과 같은 복사 목록(git ls-files
 * --cached --others --exclude-standard, build 경로 제외, isCopyableSourceFile)을 쓴다 — 같은 projector·planner 를 같은 모집단에
 * 돌려야 census 의 연쇄 제약이 생성기 연쇄와 같다. 그래야 무시된 로컬 파일(생성 모듈·임시 스크립트)이 census 에서만 간선을 만들거나,
 * 판정할 수 없는 import 로 프로필을 붉게 하지 않는다. Git 저장소가 아니거나 다른 저장소 안의 폴더면(시험 픽스처) undefined 를 돌려줘
 * 디스크 걷기 목록을 쓰게 한다. census 자신의 그래프(도달성·MISSING_IMPORT_TARGET)는 계속 디스크 기준이다.
 */
function copiedFrontendFiles(repoRoot, frontendRoot) {
  let topLevel;
  try {
    topLevel = git(['-C', repoRoot, 'rev-parse', '--show-toplevel']);
  } catch {
    return undefined;
  }
  if (!topLevel || realpathSync.native(resolve(topLevel)) !== realpathSync.native(repoRoot)) return undefined;
  return trackedAndUntrackedFiles(repoRoot)
    .filter((rel) => isCopyableSourceFile(rel, repoRoot))
    .map((rel) => resolve(repoRoot, rel))
    .filter((path) => isInside(frontendRoot, path));
}

/*
 * 프로필 제약을 계산할 모집단을 고르고, 복사 목록과 디스크 걷기 목록이 어긋나 제약이 조용히 사라지는 경우를 막는다. census 행은
 * 디스크 표기이고 계획 결과는 복사 목록 표기라, 두 목록이 어긋나면 행이 계획과 이어지지 않아 제약 없이 삭제 후보가 된다(fail-open).
 * - 대소문자만 다른 파일: 대소문자를 가리지 않는 디스크에서 디스크 이름만 바꾸면 git status 는 깨끗하고 복사 목록은 색인 표기를 낸다.
 *   생성물의 이름이 디스크와 달라지므로 PROFILE_POPULATION_CASE_MISMATCH 다. 무시된 로컬 파일처럼 디스크에만 있는 파일은 정당하게
 *   다르다 — 대소문자만 다른 경우만 오류다.
 * - 복사 목록에 frontend 파일이 하나도 없는데 디스크에는 census 모듈이 있다(frontend 가 중첩 저장소·submodule 이면 목록에 디렉터리
 *   항목 하나만 남는다): 생성기는 frontend 를 복사하지 못해 실패하므로 EMPTY_PROFILE_POPULATION 으로 gate 를 붉힌다. 그리고 디스크
 *   걷기 목록으로 계산한다 — 빈 목록으로 계산하면 검사 모드에서 모든 제약이 사라져(선언 제거 포함) 파일이 삭제 후보가 된다.
 * `copied` 는 copiedFrontendFiles 의 결과(Git 저장소가 아니면 undefined)다. 대소문자 판정은 디스크에 따라 갈리므로 목록을 넘겨받는
 * 순수 함수로 두어, 시험이 두 목록으로 플랫폼과 무관하게 고정한다.
 */
export function profilePopulation({ copied, repoRoot, frontendRoot, diskFiles, sourceFiles, issues }) {
  if (!copied) return diskFiles;
  if (copied.length === 0 && sourceFiles.size > 0) {
    issues.push({
      code: 'EMPTY_PROFILE_POPULATION',
      file: repoRelative(repoRoot, frontendRoot),
      detail: 'the Git copy list has no frontend file (nested repository or submodule)',
    });
    return diskFiles;
  }
  const listed = new Set(copied);
  const byLowerCase = new Map(copied.map((path) => [normalizePath(path).toLowerCase(), path]));
  for (const file of diskFiles) {
    if (listed.has(file)) continue;
    const other = byLowerCase.get(normalizePath(file).toLowerCase());
    if (other) {
      issues.push({
        code: 'PROFILE_POPULATION_CASE_MISMATCH',
        file: repoRelative(repoRoot, file),
        detail: `Git copy list: ${repoRelative(repoRoot, other)}`,
      });
    }
  }
  return copied;
}

/*
 * 프로필마다 생성기와 같은 투영(createFrontendProjector)과 연쇄 계획(planFrontendRemoval)을 frontend 전체에 돌리고, 결과를 census
 * 모집단(frontend/src 모듈)으로 거른다. 연쇄 증거 경로는 계획의 parent(BFS 단계가 가장 낮은 제거 의존, 같으면 참조 목록 순서상 첫 번째 —
 * 즉시 호출 createRequire 참조가 앞이고 나머지는 소스 순서)를 따라간다. 투영·간선 판정이 실패하면(마커 오류·판정할 수 없는 import·
 * 대소문자 불일치·모호 해석) 그 프로필을 issue 로 올린다 — 생성기는 같은 자리에서 실패한다. 마커 오류처럼 파일을 짚을 수 있으면 issue 를
 * 그 파일에 붙인다(census 모집단 파일이면 blocked 가 된다). 검사 모드(failOnErrors: false)에서는 실패한 프로필의 제약을 모든 파일에 'unknown' 으로
 * 남겨, 무관한 파일 하나의 오류 때문에 어떤 파일도 삭제 후보(safe-candidate)가 되지 않게 한다. gate 모드는 issue 로 실패한다.
 */
function computeProfileConstraints({
  manifestPath,
  frontendRoot,
  sourceFiles,
  frontendFiles,
  repoRoot,
  issues,
}) {
  const constraints = new Map([...sourceFiles].map((file) => [file, []]));
  if (!manifestPath) return constraints;
  if (!existsSync(manifestPath)) {
    issues.push({
      code: 'MISSING_PROFILE_MANIFEST',
      file: repoRelative(repoRoot, manifestPath),
    });
    return constraints;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    issues.push({
      code: 'INVALID_PROFILE_MANIFEST',
      file: repoRelative(repoRoot, manifestPath),
      detail: error instanceof Error ? error.message : String(error),
    });
    return constraints;
  }
  const profiles = manifest?.profiles;
  const packs = manifest?.packs;
  if (!profiles || typeof profiles !== 'object' || !packs || typeof packs !== 'object') {
    issues.push({ code: 'INVALID_PROFILE_MANIFEST', file: repoRelative(repoRoot, manifestPath), detail: 'profiles/packs missing' });
    return constraints;
  }
  const knownPacks = new Set(Object.keys(packs));
  const sources = new Map();
  const read = (path) => {
    if (!sources.has(path)) sources.set(path, readFileSync(path, 'utf8'));
    return sources.get(path);
  };

  for (const [profileName, profile] of Object.entries(profiles)) {
    const allowedPacks = new Set(Array.isArray(profile?.packs) ? profile.packs : []);
    const unknownAllowed = [...allowedPacks].filter((packName) => !knownPacks.has(packName));
    if (unknownAllowed.length > 0) {
      issues.push({
        code: 'UNKNOWN_PROFILE_PACK',
        file: repoRelative(repoRoot, manifestPath),
        detail: `${profileName}: ${unknownAllowed.join(', ')}`,
      });
      continue;
    }
    // 슬롯 레지스트리는 생성기처럼 같은 복사 목록으로 렌더한다(PR-4).
    const projector = createFrontendProjector({ manifest, profile: { ...profile, packs: [...allowedPacks] },
      files: frontendFiles.map((path) => normalizePath(relative(frontendRoot, path))) });
    const { accepted } = directProfileFiles(frontendRoot, sourceFiles, projector.directPaths, repoRoot, profileName, issues);
    let plan;
    try {
      plan = planFrontendRemoval({
        frontendRoot,
        files: frontendFiles,
        directPaths: accepted,
        readSource: (path) => {
          try {
            return projector.project(normalizePath(relative(frontendRoot, path)), read(path)).source;
          } catch (error) {
            // 투영 오류(마커)는 그 파일을 짚는다. 연쇄 계획의 다른 실패는 파일을 특정할 수 없어 manifest 에 붙는다.
            if (error && typeof error === 'object') error.censusFile = path;
            throw error;
          }
        },
      });
    } catch (error) {
      issues.push({
        code: 'PROFILE_PROJECTION_FAILED',
        file: repoRelative(repoRoot, error?.censusFile ?? manifestPath),
        detail: `${profileName}: ${error instanceof Error ? error.message : String(error)}`,
      });
      // 계산하지 못한 프로필은 '제약 없음'이 아니다. 검사 모드에서 그 프로필의 판정을 모르는 채로 두어 삭제 후보에서 뺀다.
      for (const list of constraints.values()) {
        list.push({ profile: profileName, removal: 'unknown', evidencePath: [repoRelative(repoRoot, manifestPath)] });
      }
      continue;
    }
    const configuredPathOf = (file) => accepted.find((configuredPath) => {
      const absolute = resolve(frontendRoot, configuredPath);
      return file === absolute || isInside(absolute, file);
    });

    for (const file of plan.removed) {
      if (!constraints.has(file)) continue;
      if (plan.direct.has(file)) {
        constraints.get(file).push({
          profile: profileName,
          removal: 'direct',
          configuredPath: configuredPathOf(file),
          evidencePath: [repoRelative(repoRoot, manifestPath), repoRelative(repoRoot, file)],
        });
        continue;
      }
      const nodes = [repoRelative(repoRoot, file)];
      let cursor = file;
      while (plan.parent.has(cursor)) {
        cursor = plan.parent.get(cursor).to;
        nodes.push(repoRelative(repoRoot, cursor));
        if (plan.direct.has(cursor)) break;
      }
      constraints.get(file).push({
        profile: profileName,
        removal: 'transitive',
        configuredPath: configuredPathOf(cursor),
        evidencePath: nodes,
      });
    }
  }
  return constraints;
}

function sourceIssueMap(issues, sourceFilesByRelative) {
  const map = new Map([...sourceFilesByRelative.keys()].map((file) => [file, []]));
  for (const issue of issues) {
    if (map.has(issue.file)) map.get(issue.file).push(issue);
  }
  return map;
}

function loadRouteShadows(routeManifestPath, sourceFiles, repoRoot, issues) {
  const shadows = new Map();
  if (!routeManifestPath) return shadows;
  if (!existsSync(routeManifestPath)) {
    issues.push({ code: 'MISSING_ROUTE_CAPABILITY_MANIFEST', file: repoRelative(repoRoot, routeManifestPath) });
    return shadows;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(routeManifestPath, 'utf8'));
  } catch (error) {
    issues.push({
      code: 'INVALID_ROUTE_CAPABILITY_MANIFEST',
      file: repoRelative(repoRoot, routeManifestPath),
      detail: error instanceof Error ? error.message : String(error),
    });
    return shadows;
  }
  if (!Array.isArray(manifest?.routes)) {
    issues.push({
      code: 'INVALID_ROUTE_CAPABILITY_MANIFEST',
      file: repoRelative(repoRoot, routeManifestPath),
      detail: 'routes array missing',
    });
    return shadows;
  }
  for (const route of manifest.routes) {
    if (route?.routing?.kind !== 'config-redirect') continue;
    if (typeof route.source !== 'string' || typeof route.routing.target !== 'string') {
      issues.push({
        code: 'INVALID_ROUTE_SHADOW',
        file: repoRelative(repoRoot, routeManifestPath),
        detail: String(route?.route ?? '<unknown>'),
      });
      continue;
    }
    const source = resolve(repoRoot, route.source);
    if (!sourceFiles.has(source)) {
      issues.push({
        code: 'ROUTE_SHADOW_SOURCE_MISSING',
        file: repoRelative(repoRoot, routeManifestPath),
        detail: route.source,
      });
      continue;
    }
    if (shadows.has(source)) {
      issues.push({
        code: 'DUPLICATE_ROUTE_SHADOW',
        file: repoRelative(repoRoot, routeManifestPath),
        detail: route.source,
      });
      continue;
    }
    shadows.set(source, {
      kind: 'config-redirect',
      route: route.route,
      target: route.routing.target,
      evidence: repoRelative(repoRoot, routeManifestPath),
    });
  }
  return shadows;
}

function chooseDeletionClass({
  productionReachable,
  testReachable,
  storyReachable,
  configReachable,
  docsReferences,
  configReferences,
  profileConstraints,
  sourceImports,
  fileIssues,
}) {
  if (productionReachable) return 'runtime-reachable';
  if (fileIssues.length > 0) return 'ambiguous';
  if (testReachable) return 'test-only';
  if (
    storyReachable
    || configReachable
    || docsReferences.length > 0
    || configReferences.length > 0
    || profileConstraints.length > 0
    || sourceImports.length > 0
  ) return 'ambiguous';
  return 'safe-candidate';
}

function deletionDecision({
  productionReachable,
  testReachable,
  storyReachable,
  configReachable,
  docsReferences,
  configReferences,
  profileConstraints,
  sourceImports,
  fileIssues,
}) {
  const blockingReasons = [];
  if (productionReachable) blockingReasons.push('production-build-reachable');
  if (testReachable) blockingReasons.push('test-reachable');
  if (storyReachable) blockingReasons.push('story-reachable');
  if (configReachable) blockingReasons.push('config-reachable');
  if (docsReferences.length > 0) blockingReasons.push('documentation-reference');
  if (configReferences.length > 0) blockingReasons.push('configuration-reference');
  if (profileConstraints.length > 0) blockingReasons.push('profile-removal-constraint');
  if (sourceImports.length > 0) blockingReasons.push('source-import-reference');
  blockingReasons.push(...fileIssues.map(({ code }) => `parser:${code}`));

  let decision = 'candidate';
  if (productionReachable || fileIssues.length > 0) decision = 'blocked';
  else if (blockingReasons.length > 0) decision = 'review-required';
  return { decision, blockingReasons: uniqueSorted(blockingReasons) };
}

/**
 * Build the census. `runtime-reachable` is deletion terminology: it includes
 * type-only dependencies reached from a production entry because deleting them
 * would still break the production type-check/build. `reachability.runtime`
 * separately reports value-level runtime reachability.
 */
export function buildFrontendReachabilityCensus(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const frontendRoot = resolve(options.frontendRoot ?? join(repoRoot, 'frontend'));
  const sourceRoot = resolve(options.sourceRoot ?? join(frontendRoot, 'src'));
  const manifestPath = options.profileManifestPath === null
    ? undefined
    : resolve(options.profileManifestPath ?? join(repoRoot, 'config', 'reusable-base-profiles.json'));
  const routeManifestPath = options.routeManifestPath === null
    ? undefined
    : resolve(options.routeManifestPath ?? join(repoRoot, 'config', 'ui-route-capabilities.json'));
  const documentationRoots = options.documentationRoots
    ?? [join(repoRoot, 'docs'), join(repoRoot, 'README.md'), join(frontendRoot, 'README.md')];
  const configRoots = options.configRoots
    ?? [join(repoRoot, 'config'), join(repoRoot, 'package.json'), join(frontendRoot, 'package.json')];
  const failOnErrors = options.failOnErrors !== false;

  const issues = [];
  const sourceFiles = new Set(walkFiles(sourceRoot, isFrontendModuleFile, {
    ignoredDirectories: IGNORED_FRONTEND_DIRECTORIES,
  }));
  if (sourceFiles.size === 0) {
    issues.push({ code: 'EMPTY_POPULATION', file: repoRelative(repoRoot, sourceRoot), detail: 'no frontend source modules' });
  }

  const allFrontendModules = new Set(walkFiles(frontendRoot, isFrontendModuleFile, {
    ignoredDirectories: IGNORED_FRONTEND_DIRECTORIES,
  }));
  const allFrontendFiles = new Set(walkFiles(frontendRoot, () => true, {
    ignoredDirectories: IGNORED_FRONTEND_DIRECTORIES,
  }));
  const caseMap = buildCaseMap(allFrontendFiles);
  // frontend 밖 저장소 파일(e2e·도구 스크립트가 부르는 루트 scripts)은 디스크의 실제 이름과 정확히 같을 때만 잇는다.
  const repositoryFile = repositoryFileLookup(repoRoot);
  const adjacency = new Map();
  const parsedFiles = new Set();

  function parseFile(file) {
    if (parsedFiles.has(file) || !isFrontendModuleFile(file)) return;
    parsedFiles.add(file);
    const rel = repoRelative(repoRoot, file);
    const source = readFileSync(file, 'utf8');
    const parsed = parseModuleReferences(source, rel);
    issues.push(...parsed.issues);
    const references = isConfigEntry(file, frontendRoot)
      ? [...parsed.references, ...parseConfigStringReferences(source, rel, parsed.references)]
      : parsed.references;
    const edges = [];
    for (const reference of references) {
      const resolution = resolveModuleReference({
        importer: file,
        specifier: reference.specifier,
        frontendRoot,
        sourceRoot,
        knownFiles: allFrontendFiles,
        caseMap,
        repoRoot,
        line: reference.line,
        outsideFile: repositoryFile,
      });
      if (resolution.issue && !(reference.optionalConfigReference && resolution.issue.code === 'MISSING_IMPORT_TARGET')) {
        issues.push(resolution.issue);
      }
      if (resolution.target && isFrontendModuleFile(resolution.target)) {
        allFrontendModules.add(resolution.target);
        edges.push({ from: file, to: resolution.target, ...reference });
      }
    }
    adjacency.set(file, edges.sort((left, right) => normalizePath(left.to).localeCompare(normalizePath(right.to), 'en')));
  }

  for (const file of sourceFiles) parseFile(file);
  const runtimeEntries = [...sourceFiles].filter((file) => isNextRuntimeEntry(file, sourceRoot));
  const routeShadows = loadRouteShadows(routeManifestPath, sourceFiles, repoRoot, issues);
  const effectiveRuntimeEntries = runtimeEntries.filter((file) => !routeShadows.has(file));
  const testEntries = [...allFrontendModules].filter((file) => isTestHarnessEntry(file, frontendRoot));
  const storyEntries = [...allFrontendModules].filter(isStoryFile);
  const configEntries = [...allFrontendModules].filter((file) => isConfigEntry(file, frontendRoot));

  function traverse(roots, includeTypeOnly) {
    const queue = [...roots];
    const seen = new Set();
    for (let index = 0; index < queue.length; index += 1) {
      const file = queue[index];
      if (seen.has(file)) continue;
      seen.add(file);
      parseFile(file);
      for (const edge of adjacency.get(file) ?? []) {
        if (!includeTypeOnly && edge.typeOnly) continue;
        queue.push(edge.to);
      }
    }
    return bfs(roots, adjacency, includeTypeOnly);
  }

  const runtimeValueParent = traverse(runtimeEntries, false);
  const productionParent = traverse(runtimeEntries, true);
  const effectiveProductParent = traverse(effectiveRuntimeEntries, false);
  const testParent = traverse(testEntries, true);
  const storyParent = traverse(storyEntries, true);
  const configParent = traverse(configEntries, true);

  const documentationFiles = collectTextFiles(documentationRoots, new Set(['.md', '.mdx', '.txt']));
  const configFiles = collectTextFiles(configRoots, new Set(['.json', '.jsonc', '.yml', '.yaml', '.toml', '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']));
  const referenceContext = { repoRoot, frontendRoot, sourceRoot, sourceFiles, caseMap };
  const docsReferences = mergeReferenceMaps(
    scanTextReferences(documentationFiles, referenceContext),
    scanNarrativeBasenameReferences(documentationFiles, sourceFiles, repoRoot),
  );
  const configReferences = scanTextReferences(configFiles, referenceContext);
  const profileConstraints = computeProfileConstraints({
    manifestPath,
    frontendRoot,
    sourceFiles,
    // 생성기와 같은 복사 목록(Git 저장소일 때). 아니면 디스크 걷기 목록이다. 두 목록의 어긋남은 profilePopulation 이 막는다.
    frontendFiles: manifestPath
      ? profilePopulation({
        copied: copiedFrontendFiles(repoRoot, frontendRoot), repoRoot, frontendRoot, diskFiles: [...allFrontendFiles], sourceFiles, issues,
      })
      : [...allFrontendFiles],
    repoRoot,
    issues,
  });

  const deduplicatedIssues = [...new Map(issues.map((issue) => [issueKey(issue), issue])).values()]
    .sort((left, right) => issueKey(left).localeCompare(issueKey(right), 'en'));
  const relativeToAbsolute = new Map([...sourceFiles].map((file) => [repoRelative(repoRoot, file), file]));
  const perFileIssues = sourceIssueMap(deduplicatedIssues, relativeToAbsolute);
  const sourceImports = new Map([...sourceFiles].map((file) => [file, []]));
  for (const [from, edges] of adjacency) {
    if (!sourceFiles.has(from)) continue;
    for (const edge of edges) {
      if (!sourceFiles.has(edge.to)) continue;
      sourceImports.get(edge.to).push({
        source: repoRelative(repoRoot, from),
        kind: edge.kind,
        typeOnly: edge.typeOnly,
        line: edge.line,
      });
    }
  }
  for (const imports of sourceImports.values()) {
    imports.sort((left, right) => left.source.localeCompare(right.source, 'en') || left.line - right.line);
  }

  const files = [...sourceFiles].map((file) => {
    const rel = repoRelative(repoRoot, file);
    const docs = docsReferences.get(file) ?? [];
    const configs = configReferences.get(file) ?? [];
    const profiles = profileConstraints.get(file) ?? [];
    const inboundSourceImports = sourceImports.get(file) ?? [];
    const fileIssues = perFileIssues.get(rel) ?? [];
    const productionReachable = productionParent.has(file);
    const testReachable = testParent.has(file);
    const storyReachable = storyParent.has(file);
    const configReachable = configParent.has(file);
    const deletionClass = chooseDeletionClass({
      productionReachable,
      testReachable,
      storyReachable,
      configReachable,
      docsReferences: docs,
      configReferences: configs,
      profileConstraints: profiles,
      sourceImports: inboundSourceImports,
      fileIssues,
    });
    const deletion = deletionDecision({
      productionReachable,
      testReachable,
      storyReachable,
      configReachable,
      docsReferences: docs,
      configReferences: configs,
      profileConstraints: profiles,
      sourceImports: inboundSourceImports,
      fileIssues,
    });
    return {
      file: rel,
      deletionClass,
      deletionDecision: deletion.decision,
      blockingReasons: deletion.blockingReasons,
      entryKinds: {
        nextRoute: runtimeEntries.includes(file),
        test: testEntries.includes(file),
        story: storyEntries.includes(file),
        config: configEntries.includes(file),
      },
      reachability: {
        runtime: runtimeValueParent.has(file),
        productionCompile: productionReachable,
        effectiveProduct: effectiveProductParent.has(file),
        test: testReachable,
        story: storyReachable,
        config: configReachable,
      },
      evidencePaths: {
        runtime: evidencePath(runtimeValueParent, file, repoRoot),
        productionCompile: evidencePath(productionParent, file, repoRoot),
        effectiveProduct: evidencePath(effectiveProductParent, file, repoRoot),
        test: evidencePath(testParent, file, repoRoot),
        story: evidencePath(storyParent, file, repoRoot),
        config: evidencePath(configParent, file, repoRoot),
      },
      dependencies: (adjacency.get(file) ?? [])
        .filter((edge) => sourceFiles.has(edge.to))
        .map((edge) => ({
          to: repoRelative(repoRoot, edge.to),
          kind: edge.kind,
          typeOnly: edge.typeOnly,
          specifier: edge.specifier,
          line: edge.line,
        })),
      routing: {
        buildEntry: runtimeEntries.includes(file),
        effectiveProductEntry: effectiveRuntimeEntries.includes(file),
        shadowedBy: routeShadows.get(file),
      },
      references: {
        sourceImports: inboundSourceImports,
        docs,
        config: configs,
      },
      profileRemovalConstraints: profiles.sort((left, right) => left.profile.localeCompare(right.profile, 'en')),
      ambiguities: fileIssues,
    };
  }).sort((left, right) => left.file.localeCompare(right.file, 'en'));

  const counts = Object.fromEntries([...DELETION_CLASSES].map((name) => [name, 0]));
  for (const file of files) counts[file.deletionClass] += 1;
  const census = {
    schemaVersion: 1,
    generatedFrom: {
      repoRoot: normalizePath(repoRoot),
      sourceRoot: repoRelative(repoRoot, sourceRoot),
      profileManifest: manifestPath ? repoRelative(repoRoot, manifestPath) : null,
      routeManifest: routeManifestPath ? repoRelative(repoRoot, routeManifestPath) : null,
    },
    semantics: {
      safeCandidate: 'No production/test/story/config/docs/profile evidence was found; still requires human review before deletion.',
      runtimeReachable: 'Reachable from a Next filesystem/build entry by value or type/build dependency.',
      effectiveProduct: 'Value-reachable after config-redirect-shadowed filesystem entries are removed using the route capability contract.',
      testOnly: 'Not production reachable, but reachable from a test entry. Docs/config evidence remains separately visible.',
      ambiguous: 'Non-runtime evidence, profile constraint, or parser uncertainty prevents safe deletion.',
    },
    summary: {
      population: files.length,
      nextRuntimeEntries: runtimeEntries.length,
      effectiveProductEntries: effectiveRuntimeEntries.length,
      testEntries: testEntries.length,
      storyEntries: storyEntries.length,
      configEntries: configEntries.length,
      parsedFiles: parsedFiles.size,
      dependencyEdges: [...adjacency.values()].reduce((sum, edges) => sum + edges.length, 0),
      deletionClasses: counts,
      issueCount: deduplicatedIssues.length,
    },
    issues: deduplicatedIssues,
    files,
  };

  if (failOnErrors && deduplicatedIssues.length > 0) {
    throw new Error(`frontend reachability census failed closed:\n${formatIssues(deduplicatedIssues)}`);
  }
  return census;
}

function edgeExists(census, from, to) {
  const source = census.files.find((file) => file.file === from);
  return source?.dependencies.some((dependency) => dependency.to === to) ?? false;
}

/** Validate repository facts that must remain explicit deletion-safety regressions. */
export function validateReachabilityAssertions(census, assertions = CURRENT_REPOSITORY_ASSERTIONS) {
  const errors = [];
  const byFile = new Map(census.files.map((file) => [file.file, file]));
  for (const chain of assertions.runtimeChains ?? []) {
    if (!Array.isArray(chain) || chain.length < 2) {
      errors.push('runtime chain assertion must contain at least two files');
      continue;
    }
    for (const file of chain) if (!byFile.has(file)) errors.push(`runtime chain file missing: ${file}`);
    for (let index = 0; index < chain.length - 1; index += 1) {
      if (!edgeExists(census, chain[index], chain[index + 1])) {
        errors.push(`runtime chain edge missing: ${chain[index]} -> ${chain[index + 1]}`);
      }
    }
    const terminal = byFile.get(chain.at(-1));
    if (terminal && terminal.deletionClass !== 'runtime-reachable') {
      errors.push(`runtime chain terminal misclassified: ${terminal.file} -> ${terminal.deletionClass}`);
    }
  }
  for (const file of assertions.runtimeReachable ?? []) {
    const entry = byFile.get(file);
    if (!entry) errors.push(`runtime assertion file missing: ${file}`);
    else if (entry.deletionClass !== 'runtime-reachable') {
      errors.push(`expected runtime-reachable: ${file} -> ${entry.deletionClass}`);
    }
  }
  for (const file of assertions.notRuntimeReachable ?? []) {
    const entry = byFile.get(file);
    if (!entry) errors.push(`non-runtime assertion file missing: ${file}`);
    else if (entry.reachability.productionCompile) errors.push(`unexpected production reachability: ${file}`);
  }
  for (const [file, expectedClass] of Object.entries(assertions.deletionClasses ?? {})) {
    const entry = byFile.get(file);
    if (!entry) errors.push(`classification assertion file missing: ${file}`);
    else if (entry.deletionClass !== expectedClass) {
      errors.push(`expected ${expectedClass}: ${file} -> ${entry.deletionClass}`);
    }
  }
  return errors;
}

function parseCliArgs(argv) {
  const args = { json: false, check: false };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    else if (arg === '--check') args.check = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.json && !args.check) args.check = true;
  return args;
}

function runCli() {
  const args = parseCliArgs(process.argv.slice(2));
  const census = buildFrontendReachabilityCensus();
  const assertionErrors = validateReachabilityAssertions(census);
  if (assertionErrors.length > 0) {
    throw new Error(`known frontend reachability facts failed:\n${assertionErrors.join('\n')}`);
  }
  if (args.json) process.stdout.write(`${JSON.stringify(census, null, 2)}\n`);
  else {
    const classes = census.summary.deletionClasses;
    process.stdout.write(
      `frontend reachability census: ${census.summary.population} files; `
      + `runtime=${classes['runtime-reachable']}, test-only=${classes['test-only']}, `
      + `ambiguous=${classes.ambiguous}, safe-candidate=${classes['safe-candidate']}\n`,
    );
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

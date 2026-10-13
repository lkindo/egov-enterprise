/**
 * 소스 투영의 프런트 단계 — 마커 블록 투영과 슬롯 레지스트리 렌더(createFrontendProjector), 제외 경로와 그 import 연쇄
 * 제거(planFrontendRemoval).
 *
 * [2026-10-11 슬롯 단계 PR-2 판정 통일] 마커를 읽는 파서는 이 파일의 parseMarkerBlocks 하나다. 화면 제외 경로와 마커 블록 투영은
 * 한 번에 판정한다(createFrontendProjector). 간선은 주석·문자열을 건너뛰는 토크나이저(frontend-module-graph.mjs)로
 * 읽고, 넘겨받은 파일 목록 안에서만 정확한 표기로 잇는다(frontend-module-resolver.mjs). 생성기·정밀 점검·도달성 census·생존 시험·경계
 * 계약·거버넌스 투영이 모두 이 함수들을 쓴다 — 두 번째 마커 파서·연쇄 루프를 두지 않는다(단일 모듈 계약이 지킨다).
 *
 * [11단계 C3·C5·C6] 생성기·정밀 점검·도달성 census 는 시작 구성도 기능 투영(구성의 화면 제외 경로·블록 소유 기능)으로 한다. pack 프로필
 * 투영은 C5 에서 걷었고, C6 부터 마커 토큰은 블록을 소유한 기능 id 다 — 블록은 그 기능이 구성에 있을 때만 남는다. 마커 선언(파일별 블록
 * 수·단계·사유)은 기능 파일의 owns.markerBlocks 이고(composerMarkerDeclarations), 선언 없는 블록과 기능이 아닌 토큰은 실패한다.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composerMarkerDeclarations, readComposerModuleFiles } from './composer-modules.mjs';
import { parseModuleReferences } from './frontend-module-graph.mjs';
import { MODULE_EXTENSIONS, buildCaseMap, resolveModuleReference } from './frontend-module-resolver.mjs';
import { discoverSlotContributions, frontendRelativePath, renderSlotRegistry, slotPathKind, slotRegistryPath } from './slot-registry.mjs';
import { fail, normalize, removePath, walk } from './reusable-source-tree.mjs';

/**
 * 투영·연쇄·마커 판정이 읽는 프런트 모듈 파일인가. 해석기가 대상으로 잇는 확장자(MODULE_EXTENSIONS, 대소문자 무시)와 같은 집합이다 —
 * 대상으로는 풀면서 그 파일의 간선·마커는 읽지 않는 비대칭을 두지 않는다. 판정은 이 함수 하나이고, census 도 이것을 쓴다.
 */
export const isFrontendModuleFile = (path) => MODULE_EXTENSIONS.includes(extname(path).toLowerCase());
/** frontend 거버넌스 계약이 사는 곳 — census·guard·cross-stack 계약이 전부 이 아래다. */
const FRONTEND_GATE_DIR = 'frontend/src/__tests__/';
/** 라우트가 아닌 필수 진입점(루트 레이아웃). 화면(page)의 생존은 구성 기대값 대조가 본다. */
export const FRONTEND_LAYOUT = 'src/app/layout.tsx';

/*
 * 화면 파일(page)과 next.config 의 라우트 종류는 그 본문에서 판정한다(redirect 호출·return 유무, next.config 선언 —
 * ui-route-capabilities-contract.expectedRouting). 마커 블록이 그 근거를 품으면 같은 화면의 종류가 프로필마다 갈려, 원본 라우트
 * 원장으로 계산하는 화면 생존 기대값과 투영 뒤 본문을 보는 거버넌스 투영이 어긋난다. 그래서 그런 블록은 작성 시점에 막는다.
 * 판정은 expectedRouting 과 같은 정규식이다(redirect 호출은 주석까지, return 은 주석을 뺀 본문에서 센다).
 */
const PAGE_FILE = /(?:^|\/)src\/app\/(?:.+\/)?page\.(?:ts|tsx|js|jsx)$/;
// Next 가 읽는 설정 파일 전부(Next 16 은 next.config.mts 도 읽는다). 투영 판정(isFrontendModuleFile)처럼 대소문자를 가리지 않는다.
const NEXT_CONFIG = /(?:^|\/)next\.config\.(?:ts|mts|mjs|js)$/i;
const REDIRECT_CALL = /\bredirect\s*\(\s*(['"`])[^\r\n]*?\1\s*\)/;
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');

/**
 * 한 파일의 마커 블록을 읽는다. 마커 토큰은 블록을 소유한 기능 id 다(11단계 C6). 마커는 한 줄에 하나이고 중첩하지 않으며, 같은 기능의
 * start·end 가 짝을 이룬다. 한 줄에 마커 둘·알 수 없는 기능·중첩·짝 불일치·미닫힘, next.config 의 마커, page 파일에서 redirect 호출이나
 * return 을 품은 블록은 FAIL 이다(블록을 남기든 걷든 같다 — 구성마다 갈리는 것이 문제다). `knownFeatures`(has 를 가진 집합)를 주지 않으면
 * 알 수 없는 기능 검사만 하지 않는다(투영은 기능 파일의 기능 id 를 준다).
 * 결과의 `lines` 는 줄 끝을 포함한 원문 줄, 블록의 `feature` 는 토큰, `startLine`·`endLine` 은 1부터 센 마커 줄 번호, `text` 는 마커 줄을
 * 포함한 원문이다.
 */
export function parseMarkerBlocks(source, { knownFeatures, label }) {
  const path = String(label).replaceAll('\\', '/');
  const lines = source.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const blocks = [];
  let openMarker;

  for (let index = 0; index < lines.length; index += 1) {
    const markers = [...lines[index].matchAll(/reusable-base:([a-z0-9_-]+):(start|end)/g)];
    if (markers.length > 1) {
      fail(`frontend 마커는 한 줄에 하나만 허용한다: ${label}:${index + 1}`);
    }
    const marker = markers[0];
    if (!marker) continue;

    const [, feature, boundary] = marker;
    if (knownFeatures && !knownFeatures.has(feature)) {
      fail(`unknown marker feature: ${feature} (${label}:${index + 1})`);
    }
    if (NEXT_CONFIG.test(path)) {
      fail(`next.config 는 마커를 둘 수 없다 — 리다이렉트 선언은 거버넌스 투영이 정리한다: ${label}:${index + 1}`);
    }
    if (boundary === 'start') {
      if (openMarker) {
        fail(`frontend 마커 중첩은 허용하지 않는다: ${label}:${index + 1}`);
      }
      openMarker = { feature, index };
      continue;
    }

    if (!openMarker || openMarker.feature !== feature) {
      fail(`짝이 맞지 않는 frontend 마커: ${feature} (${label}:${index + 1})`);
    }
    const body = lines.slice(openMarker.index + 1, index).join('');
    if (PAGE_FILE.test(path) && (REDIRECT_CALL.test(body) || /\breturn\b/.test(withoutComments(body)))) {
      fail(`page 파일의 마커 블록은 redirect 호출이나 return 을 품을 수 없다 — 화면의 라우트 종류가 구성마다 갈린다: ${label}:${openMarker.index + 1}`);
    }
    blocks.push({ feature, startLine: openMarker.index + 1, endLine: index + 1, text: lines.slice(openMarker.index, index + 1).join('') });
    openMarker = undefined;
  }

  if (openMarker) {
    fail(`닫히지 않은 frontend 마커: ${openMarker.feature} (${label}:${openMarker.index + 1})`);
  }
  return { lines, blocks };
}

/** parseMarkerBlocks 가 읽은 줄에서 주어진 블록을 마커 줄과 함께 걷는다. 소유 판정 없이 걷으므로 projector 밖에 내놓지 않는다. */
function stripMarkerBlocks(lines, blocks) {
  if (!blocks.length) return lines.join('');
  const dropped = new Set(blocks.flatMap((block) => Array.from({ length: block.endLine - block.startLine + 1 }, (_, offset) => block.startLine - 1 + offset)));
  return lines.filter((_, index) => !dropped.has(index)).join('');
}

/*
 * 마커 선언(기능 파일의 owns.markerBlocks, 11단계 C6)은 투영하는 트리가 아니라 이 스크립트가 속한 저장소의 config/modules 에서 읽는다 —
 * 원본 체크아웃의 스크립트는 원본을, 생성물의 스크립트는 생성물(구성의 기능 파일만 있다)을 투영한다. 시험의 합성 트리에는 기능 파일이
 * 없으므로 이 저장소의 선언을 쓴다. 마커 줄을 처음 만날 때 한 번 읽는다 — 마커 없는 파일만 투영하면 읽지 않는다.
 */
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let repositoryMarkers;
const markerDeclarations = () => (repositoryMarkers ??= composerMarkerDeclarations(readComposerModuleFiles(REPOSITORY_ROOT)));
/** 마커 토큰 어휘 — 기능 파일의 기능 id. 모르는 토큰은 마커 줄에서 실패한다. */
const KNOWN_MARKER_FEATURES = Object.freeze({ has: (feature) => markerDeclarations().features.has(feature) });

/**
 * 한 구성의 프런트 투영(기능 투영). 생성기·정밀 점검·도달성 census 가 시작 구성과 직접 선택을 모두 이렇게 투영한다(11단계 C3·C5).
 * 직접 제거 경로는 해석기가 기능 규칙에서 계산한 목록(composition.frontend.removePaths)이고, 마커 블록은 토큰의 기능이 선택돼 있을 때만
 * 남긴다(11단계 C6 — 토큰이 곧 소유다). 기능 파일의 owns.markerBlocks 에 선언하지 않은 블록은 실패한다(조용히 남거나 빠지지 않는다).
 * `project(path, source)` 의 path 는 frontend 기준(`src/…`)이나 저장소 기준(`frontend/src/…`) 표기이고 오류 문장에 그대로 쓴다.
 * 결과의 `strippedBlocks` 는 걷은 마커 블록 수다(lock.frontend.markerBlocks).
 *
 * [슬롯 단계 PR-4] 슬롯 레지스트리(src/extensions/generated-<슬롯>.ts)는 마커 대신 다시 렌더한다. 렌더 집합은 `files`(복사할 프런트
 * 파일 목록, frontend 기준 또는 저장소 기준 경로) 가운데 직접 제거 경로(directPaths)에 걸리지 않은 기여 파일이다 — 기여 파일은 기능
 * 경로와 함께 직접 지워지므로 두 번째 소유 판정을 두지 않는다. 마커 투영과 같은 패스, 즉 연쇄 계산 전이라 렌더가 빠진 레지스트리가
 * 지워진 기여를 import 해 셸까지 연쇄로 지우는 일이 생기지 않는다. 레지스트리를 투영하는데 `files` 가 없으면 실패한다(조용히 원문을
 * 두지 않는다). 렌더 결과가 원문과 줄 끝(CRLF)만 다르면 원문을 그대로 돌려준다 — 원본 구성의 투영은 원문과 바이트가 같다.
 * 슬롯 파일은 마커를 둘 수 없다(기여는 파일 단위로 빠진다).
 */
export function createFrontendProjector({ composition, files }) {
  if (!Array.isArray(composition?.resolvedDomains) || !Array.isArray(composition.frontend?.removePaths)) {
    fail('구성 투영에는 해석된 기능 목록(resolvedDomains)과 화면 제외 경로(frontend.removePaths)가 필요하다.');
  }
  const selected = new Set(composition.resolvedDomains);
  const directPaths = [...composition.frontend.removePaths];
  let slotOwners;
  const registryOwners = (slot, label) => {
    if (!files) fail(`슬롯 레지스트리를 투영하려면 복사할 프런트 파일 목록(files)이 필요하다: ${label}`);
    if (!slotOwners) {
      const removed = directPaths.map((rel) => posix.normalize(frontendRelativePath(rel)).replace(/\/+$/, ''));
      slotOwners = discoverSlotContributions([...files].map(frontendRelativePath)
        .filter((file) => !removed.some((target) => file === target || file.startsWith(`${target}/`))));
    }
    return slotOwners.get(slot) ?? [];
  };
  return {
    directPaths,
    project(path, source) {
      const label = String(path).replaceAll('\\', '/');
      const { lines, blocks } = parseMarkerBlocks(source, { knownFeatures: KNOWN_MARKER_FEATURES, label });
      const slotFile = slotPathKind(label);
      if (slotFile && blocks.length) fail(`슬롯 파일은 마커를 둘 수 없다 — 기여는 파일 단위로 빠진다: ${label}`);
      if (slotFile?.kind === 'registry') {
        const rendered = renderSlotRegistry(slotFile.slot, registryOwners(slotFile.slot, label));
        return { source: rendered === source.replace(/\r\n/g, '\n') ? source : rendered, strippedBlocks: 0, markerChanged: false };
      }
      if (!blocks.length) return { source, strippedBlocks: 0, markerChanged: false };
      const file = label.replace(/^frontend\//, '');
      const { declared } = markerDeclarations();
      const unclassified = blocks.find((block) => !declared.has(`${file}\u0000${block.feature}`));
      if (unclassified) {
        fail(`Unclassified composer UI block: ${file}/${unclassified.feature} — config/modules/${unclassified.feature}.json 의 owns.markerBlocks 에 없는 블록이다`);
      }
      const dropped = blocks.filter((block) => !selected.has(block.feature));
      return { source: stripMarkerBlocks(lines, dropped), strippedBlocks: dropped.length, markerChanged: dropped.length > 0 };
    },
  };
}

/** 복사한 트리의 프런트 모듈 파일(isFrontendModuleFile) 전부에 투영을 쓴다. lock.frontend.markerBlocks 를 돌려준다. */
export function applyFrontendProjection(output, projector) {
  const frontendRoot = join(output, 'frontend');
  let changedFiles = 0;
  let strippedBlocks = 0;
  for (const path of walk(frontendRoot, isFrontendModuleFile)) {
    const source = readFileSync(path, 'utf8');
    const projection = projector.project(normalize(relative(frontendRoot, path)), source);
    strippedBlocks += projection.strippedBlocks;
    if (projection.markerChanged) changedFiles += 1;
    if (projection.source !== source) writeFileSync(path, projection.source, 'utf8');
  }
  return { strippedBlocks, changedFiles };
}

/**
 * 제외 경로를 frontend 안의 정규 경로로 바꾼다(끝의 구분자·`./` 를 걷는다). frontend 밖이나 frontend 전체를 가리키면 실패한다.
 * 계산(planFrontendRemoval)과 디스크 삭제(pruneFrontend)가 같은 경로를 봐야 지운 파일을 빠짐없이 센다.
 */
export function frontendRemoveTarget(frontendRoot, rel) {
  const target = resolve(frontendRoot, rel);
  const inside = relative(frontendRoot, target);
  if (!inside || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) fail(`frontend removePath 는 frontend 안의 하위 경로여야 한다: ${rel}`);
  return target;
}

const describeIssue = (issue) => `${issue.code} ${issue.file}${issue.line ? `:${issue.line}` : ''}${issue.detail ? ` — ${issue.detail}` : ''}`;
// 파일마다 마지막으로 읽은 투영 내용과 그 파싱 결과 하나만 둔다(파서는 (내용, 표기)의 순수 함수다). 구성을 여럿 도는 census·시험은
// 바뀌지 않은 파일을 그대로 적중하고, 마커 블록이 있어 구성마다 내용이 갈리는 파일만 다시 읽는다. 내용이 바뀌면 옛 항목을 바꿔
// 끼우므로 오래 도는 composer 서버(정밀 점검)에서도 원문이 쌓이지 않는다. 모든 호출이 같은 결과를 받으므로 깊게 얼려 둔다.
const parsedSources = new Map();
function parseOnce(label, source) {
  const hit = parsedSources.get(label);
  if (hit?.source === source) return hit.parsed;
  const parsed = parseModuleReferences(source, label);
  for (const reference of parsed.references) Object.freeze(reference);
  for (const issue of parsed.issues) Object.freeze(issue);
  Object.freeze(parsed.references);
  Object.freeze(parsed.issues);
  Object.freeze(parsed);
  parsedSources.set(label, { source, parsed });
  return parsed;
}

/**
 * 제외 경로와 그 import 연쇄로 지워질 프런트 파일을 계산한다. 디스크는 바꾸지 않는다.
 * `files` 는 frontendRoot 아래 파일의 절대 경로 전부(소스가 아닌 자산 포함 — 제외 경로 안의 .css 를 가져오는 파일도 걷는다),
 * `readSource` 는 투영된(마커를 걷은) 내용을 돌려준다. 간선은 프런트 모듈 파일(isFrontendModuleFile — 해석기의 모듈 확장자)마다
 * 토크나이저로 읽고 `files` 안에서만 잇는다. 판정할 수 없는 import(계산된 동적 import 등)·대소문자만 다른 대상·모호한 해석은
 * 실패다. frontend 밖·빌드 폴더·패키지 대상과 목록에 없는 대상은 간선이 아니다(지워질 수 있는 파일은 frontend 안에만 있다).
 * `public/` 은 Next 가 URL 로만 내주는 정적 폴더라(tsc include·lint 범위 밖) 그 파일의 간선은 읽지 않는다 — 벤더 번들의 변수
 * 인자 require 같은 문법이 생성을 막지 않게 한다. 다만 public 모듈 파일도 `readSource` 로 투영은 한다(결과는 버리고 파싱하지
 * 않는다) — 생성기(applyFrontendProjection)와 정밀 점검도 그 파일을 투영하므로, 마커 오류에서 census 도 같은 자리에서 실패한다.
 * public 파일도 `files` 에 있으므로 src 에서 그 파일로 가는 간선은 그대로 잇는다.
 * 결과: `direct`(선언 경로 아래 파일), `removed`(연쇄 포함), `parent`(연쇄로 지운 파일 → 그 원인 간선. BFS 단계가 가장 낮은 제거
 * 의존 가운데 참조 목록(parseModuleReferences) 순서상 첫 번째라 반복 순서와 무관하게 정해진다. 참조 목록은 즉시 호출 createRequire
 * 참조가 앞이고 나머지는 소스 순서다), `edges`(모듈 파일 → 해석된 간선 목록).
 */
export function planFrontendRemoval({ frontendRoot, files, directPaths, readSource }) {
  const root = resolve(frontendRoot);
  const original = new Map(files.map((path) => [resolve(path), path]));
  const knownFiles = new Set(original.keys());
  const caseMap = buildCaseMap(files);
  const under = (path, target) => path === target || path.startsWith(`${target}${sep}`);
  const publicDir = join(root, 'public');
  const moduleFiles = files.filter(isFrontendModuleFile);
  const isPublic = (path) => under(resolve(path), publicDir);
  const sourceFiles = moduleFiles.filter((path) => !isPublic(path));
  const direct = new Set();
  for (const rel of directPaths) {
    const target = frontendRemoveTarget(frontendRoot, rel);
    const matched = files.filter((path) => under(path, target));
    // 대소문자만 다른 경로는 디스크에 따라 지워지기도 하고 아니기도 하며, 지워져도 이름이 달라 셈에서 빠진다.
    // 같은 manifest 가 플랫폼마다 다른 생성물을 만들지 않도록 실패한다.
    const caseOnly = matched.length ? undefined : files.find((path) => under(path.toLowerCase(), target.toLowerCase()));
    if (caseOnly) fail(`frontend removePath 의 대소문자가 실제 경로와 다르다: ${rel} (실제: ${normalize(relative(frontendRoot, caseOnly))})`);
    for (const path of matched) direct.add(path);
  }

  const edges = new Map();
  for (const path of moduleFiles) {
    const source = readSource(path);
    if (isPublic(path)) continue;
    const parsed = parseOnce(normalize(relative(dirname(root), resolve(path))), source);
    if (parsed.issues.length) fail(`프런트 import 를 판정할 수 없다: ${parsed.issues.map(describeIssue).join(' · ')}`);
    const list = [];
    for (const reference of parsed.references) {
      const resolution = resolveModuleReference({ importer: resolve(path), specifier: reference.specifier, frontendRoot: root, knownFiles, caseMap,
        line: reference.line });
      if (resolution.issue && !resolution.missing) fail(`프런트 import 를 판정할 수 없다: ${describeIssue(resolution.issue)}`);
      if (resolution.target) {
        list.push({ to: original.get(resolution.target), kind: reference.kind, typeOnly: reference.typeOnly, specifier: reference.specifier, line: reference.line });
      }
    }
    edges.set(path, list);
  }

  // BFS 단계별로 센다. 한 단계에서 찾은 파일은 단계가 끝난 뒤에 더하므로, 찾은 순간의 제거 의존은 모두 바로 앞 단계까지의 것이고
  // 그중 가장 낮은 단계에서 처음 찾힌다. 원인은 그 의존 가운데 참조 목록 순서상 첫 번째다(즉시 호출 createRequire 참조가 앞이고
  // 나머지는 소스 순서) — 파일을 도는 순서와 무관하다.
  const removed = new Set(direct);
  const parent = new Map();
  for (;;) {
    const found = [];
    for (const path of sourceFiles) {
      if (removed.has(path)) continue;
      const cause = edges.get(path).find((edge) => removed.has(edge.to));
      if (cause) found.push([path, cause]);
    }
    if (!found.length) break;
    for (const [path, cause] of found) {
      removed.add(path);
      parent.set(path, cause);
    }
  }
  return { direct, removed, parent, edges };
}

// `directPaths` 는 같은 구성의 projector(createFrontendProjector(...).directPaths)가 계산한 직접 제거 경로다 — 투영과 삭제가 같은 목록을 쓴다.
export function pruneFrontend(output, directPaths) {
  const frontendRoot = join(output, 'frontend');
  // 직접 제거 경로는 기능 선언에 의도가 남는다. 문제는 **연쇄로 딸려 가는 것**이라 나눠 센다.
  const files = walk(frontendRoot, () => true);
  const { direct: directRemoved, removed } = planFrontendRemoval({
    frontendRoot, files, directPaths, readSource: (path) => readFileSync(path, 'utf8'),
  });
  for (const rel of directPaths) removePath(frontendRemoveTarget(frontendRoot, rel), new Set());
  for (const path of removed) if (existsSync(path)) rmSync(path);

  // 화면(page)의 생존은 구성 기대값과의 대조가 본다(project-composer-source.projectedScreenLosses). 라우트가 아닌 루트 레이아웃만 여기서 본다.
  // 종전의 'dangling import' 검사는 연쇄와 같은 판정·같은 제거 집합으로 다시 봐서 실패할 수 없었다(항진) — 화면 대조로 바꿨다.
  if (!existsSync(join(frontendRoot, FRONTEND_LAYOUT))) fail(`frontend 필수 진입점이 projection에서 제거됐다: ${FRONTEND_LAYOUT}`);
  const slots = projectedSlotRegistries(frontendRoot, files, removed);
  const removedGates = [...removed]
    .map((path) => normalize(relative(output, path)))
    .filter((rel) => rel.startsWith(FRONTEND_GATE_DIR))
    .sort((left, right) => left.localeCompare(right));
  return {
    directPaths: [...directPaths].sort(),
    removedFiles: removed.size,
    cascadedFiles: removed.size - directRemoved.size,
    removedGates,
    slots,
  };
}

/**
 * 투영 뒤 슬롯 레지스트리가 남은 기여와 같은지 본다(lock.frontend.slots). 슬롯 집합은 복사한 트리 전체에서, 기여는 연쇄까지 끝난 뒤
 * 남은 파일에서 얻는다. 투영(createFrontendProjector)이 직접 제거 경로로 렌더한 레지스트리와 남은 기여가 다르면 — 기여가 다른 기능
 * 모듈을 import 해 연쇄로 지워진 경우, 그래서 레지스트리까지 연쇄로 지워진 경우 — 실패한다. 슬롯은 조용히 사라지지 않는다.
 */
function projectedSlotRegistries(frontendRoot, files, removed) {
  const rel = (path) => normalize(relative(frontendRoot, path));
  const surviving = discoverSlotContributions(files.filter((path) => !removed.has(path)).map(rel));
  const slots = [];
  for (const slot of discoverSlotContributions(files.map(rel)).keys()) {
    const owners = surviving.get(slot) ?? [];
    const path = join(frontendRoot, slotRegistryPath(slot));
    const actual = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : undefined;
    if (actual !== renderSlotRegistry(slot, owners)) {
      fail(`투영 뒤 슬롯 레지스트리가 남은 기여와 다르다: ${slotRegistryPath(slot)} (남은 기여: ${owners.join(', ') || '없음'})`);
    }
    slots.push({ slot, owners });
  }
  return slots;
}

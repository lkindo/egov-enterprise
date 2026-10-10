/**
 * 소스 투영의 프런트 단계 — import 해석, pack 마커 블록 투영, 제외 경로와 그 연쇄 제거.
 */
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fail, normalize, removePath, walk } from './reusable-source-tree.mjs';

export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
/** frontend 거버넌스 계약이 사는 곳 — census·guard·cross-stack 계약이 전부 이 아래다. */
const FRONTEND_GATE_DIR = 'frontend/src/__tests__/';

export function resolveFrontendImport(frontendRoot, importer, specifier, knownFiles) {
  let base;
  if (specifier.startsWith('@/')) base = join(frontendRoot, 'src', specifier.slice(2));
  else if (specifier.startsWith('./') || specifier.startsWith('../')) base = resolve(dirname(importer), specifier);
  else return undefined;
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ];
  return candidates.find((path) => knownFiles.has(path) || (existsSync(path) && statSync(path).isFile()));
}

/**
 * cascade 가 간선으로 읽는 import 지정자. 주석·문자열을 지우지 않은 **원문**에 적용한다 — 주석 속 import 인용도 간선이다.
 * 계약 테스트가 같은 판정을 재사용하도록 순수 함수로 export 한다.
 */
export function frontendImportSpecifiers(source) {
  return [
    ...source.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((match) => match[1]);
}

function importedFrontendFiles(frontendRoot, path, knownFiles) {
  const source = readFileSync(path, 'utf8');
  return frontendImportSpecifiers(source)
    .map((specifier) => resolveFrontendImport(frontendRoot, path, specifier, knownFiles))
    .filter(Boolean);
}

/**
 * 한 파일의 pack 마커 블록을 투영한다. 제외 pack 블록은 마커 줄과 함께 지우고 허용 pack 블록은 그대로 둔다.
 * 한 줄에 마커 둘·알 수 없는 pack·중첩·짝 불일치·미닫힘은 FAIL 이다. 계약 테스트가 같은 투영을 재사용하도록 export 한다.
 */
export function projectFrontendPackMarkers(source, { knownPacks, excludedPacks, label }) {
  const lines = source.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const projected = [];
  let openMarker;
  let strippedBlocks = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const markers = [...line.matchAll(/reusable-base:([a-z0-9_-]+):(start|end)/g)];
    if (markers.length > 1) {
      fail(`frontend pack marker는 한 줄에 하나만 허용한다: ${label}:${index + 1}`);
    }
    const marker = markers[0];
    if (!marker) {
      if (!openMarker?.strip) projected.push(line);
      continue;
    }

    const [, packName, boundary] = marker;
    if (!knownPacks.has(packName)) {
      fail(`알 수 없는 frontend pack marker: ${packName} (${label}:${index + 1})`);
    }
    if (boundary === 'start') {
      if (openMarker) {
        fail(`frontend pack marker 중첩은 허용하지 않는다: ${label}:${index + 1}`);
      }
      openMarker = { packName, line: index + 1, strip: excludedPacks.has(packName) };
      if (!openMarker.strip) projected.push(line);
      continue;
    }

    if (!openMarker || openMarker.packName !== packName) {
      fail(`짝이 맞지 않는 frontend pack marker: ${packName} (${label}:${index + 1})`);
    }
    if (!openMarker.strip) projected.push(line);
    else strippedBlocks += 1;
    openMarker = undefined;
  }

  if (openMarker) {
    fail(`닫히지 않은 frontend pack marker: ${openMarker.packName} (${label}:${openMarker.line})`);
  }
  return { source: projected.join(''), strippedBlocks };
}

export function stripExcludedFrontendPackBlocks(output, manifest, profile) {
  const frontendRoot = join(output, 'frontend');
  const knownPacks = new Set(Object.keys(manifest.packs));
  const allowedPacks = new Set(profile.packs);
  const excludedPacks = new Set([...knownPacks].filter((packName) => !allowedPacks.has(packName)));
  let changedFiles = 0;
  let strippedBlocks = 0;

  for (const path of walk(frontendRoot, (candidate) => SOURCE_EXTENSIONS.includes(extname(candidate)))) {
    const source = readFileSync(path, 'utf8');
    const projection = projectFrontendPackMarkers(source, {
      knownPacks,
      excludedPacks,
      label: normalize(relative(frontendRoot, path)),
    });
    strippedBlocks += projection.strippedBlocks;
    const nextSource = projection.source;
    if (nextSource !== source) {
      writeFileSync(path, nextSource, 'utf8');
      changedFiles += 1;
    }
  }

  return { excludedPacks: [...excludedPacks].sort(), strippedBlocks, changedFiles };
}

/** profile 이 직접 지우는 프런트 경로(frontend/ 기준). custom 구성은 해석기가 계산한 목록을, 프리셋은 제외 pack 의 선언을 쓴다. */
export function frontendDirectRemovePaths(manifest, profile) {
  const allowedPacks = new Set(profile.packs);
  return profile.frontendRemovePaths ?? Object.entries(manifest.packs)
    .filter(([packName]) => !allowedPacks.has(packName))
    .flatMap(([, pack]) => pack.frontend?.removePaths ?? []);
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

/**
 * 제외 경로와 그 import 연쇄로 지워질 프런트 파일을 계산한다. 디스크는 바꾸지 않는다.
 * `files` 는 frontendRoot 아래 파일의 절대 경로 전부, `readSource` 는 투영된(마커를 걷은) 내용을 돌려준다.
 * 생성기(pruneFrontend)와 정밀 점검(plan/deep)이 같은 판정을 쓴다. `importSpecifiers` 는 간선을 읽는 판정이다 —
 * 생성기는 원문 정규식을 쓰고, 판정 동치 계약은 같은 연쇄에 census 토크나이저를 넣어 결과를 대조한다(설계서 C5).
 */
export function planFrontendRemoval({ frontendRoot, files, directPaths, readSource, importSpecifiers = frontendImportSpecifiers }) {
  const sourceFiles = files.filter((path) => SOURCE_EXTENSIONS.includes(extname(path)));
  const knownFiles = new Set(sourceFiles);
  const direct = new Set();
  const under = (path, target) => path === target || path.startsWith(`${target}${sep}`);
  for (const rel of directPaths) {
    const target = frontendRemoveTarget(frontendRoot, rel);
    const matched = files.filter((path) => under(path, target));
    // 대소문자만 다른 경로는 디스크에 따라 지워지기도 하고 아니기도 하며, 지워져도 이름이 달라 셈에서 빠진다.
    // 같은 manifest 가 플랫폼마다 다른 생성물을 만들지 않도록 실패한다.
    const caseOnly = matched.length ? undefined : files.find((path) => under(path.toLowerCase(), target.toLowerCase()));
    if (caseOnly) fail(`frontend removePath 의 대소문자가 실제 경로와 다르다: ${rel} (실제: ${normalize(relative(frontendRoot, caseOnly))})`);
    for (const path of matched) direct.add(path);
  }
  const imports = new Map();
  const importsOf = (path) => {
    if (!imports.has(path)) {
      imports.set(path, importSpecifiers(readSource(path))
        .map((specifier) => resolveFrontendImport(frontendRoot, path, specifier, knownFiles))
        .filter(Boolean));
    }
    return imports.get(path);
  };
  const removed = new Set(direct);
  let changed = true;
  while (changed) {
    changed = false;
    for (const path of sourceFiles) {
      if (removed.has(path)) continue;
      if (!importsOf(path).some((dependency) => removed.has(dependency))) continue;
      removed.add(path);
      changed = true;
    }
  }
  return { direct, removed };
}

export function pruneFrontend(output, manifest, profile) {
  const frontendRoot = join(output, 'frontend');
  const directPaths = frontendDirectRemovePaths(manifest, profile);
  // 선언된 removePaths 는 manifest 에 의도가 남는다. 문제는 **연쇄로 딸려 가는 것**이라 나눠 센다.
  const files = walk(frontendRoot, () => true);
  const knownFiles = new Set(files.filter((path) => SOURCE_EXTENSIONS.includes(extname(path))));
  const { direct: directRemoved, removed } = planFrontendRemoval({
    frontendRoot, files, directPaths, readSource: (path) => readFileSync(path, 'utf8'),
  });
  for (const rel of directPaths) removePath(frontendRemoveTarget(frontendRoot, rel), new Set());
  for (const path of removed) if (existsSync(path)) rmSync(path);

  for (const critical of ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/login/page.tsx']) {
    if (!existsSync(join(frontendRoot, critical))) fail(`frontend 필수 진입점이 projection에서 제거됐다: ${critical}`);
  }
  for (const path of walk(frontendRoot, (candidate) => SOURCE_EXTENSIONS.includes(extname(candidate)))) {
    const dangling = importedFrontendFiles(frontendRoot, path, knownFiles).filter((dependency) => removed.has(dependency));
    if (dangling.length) fail(`frontend projection dangling import: ${normalize(relative(frontendRoot, path))}`);
  }
  const removedGates = [...removed]
    .map((path) => normalize(relative(output, path)))
    .filter((rel) => rel.startsWith(FRONTEND_GATE_DIR))
    .sort((left, right) => left.localeCompare(right));
  return {
    directPaths: directPaths.sort(),
    removedFiles: removed.size,
    cascadedFiles: removed.size - directRemoved.size,
    removedGates,
  };
}


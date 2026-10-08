/**
 * 소스 투영의 프런트 단계 — import 해석, pack 마커 블록 투영, 제외 경로와 그 연쇄 제거.
 */
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
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

export function pruneFrontend(output, manifest, profile) {
  const frontendRoot = join(output, 'frontend');
  const allowedPacks = new Set(profile.packs);
  const directPaths = profile.frontendRemovePaths ?? Object.entries(manifest.packs)
    .filter(([packName]) => !allowedPacks.has(packName))
    .flatMap(([, pack]) => pack.frontend?.removePaths ?? []);
  const sourceFiles = walk(frontendRoot, (path) => SOURCE_EXTENSIONS.includes(extname(path)));
  const knownFiles = new Set(sourceFiles);
  const removed = new Set();
  for (const rel of directPaths) removePath(join(frontendRoot, rel), removed);
  // 선언된 removePaths 는 manifest 에 의도가 남는다. 문제는 **연쇄로 딸려 가는 것**이라 나눠 센다.
  const directRemoved = new Set(removed);

  let changed = true;
  while (changed) {
    changed = false;
    for (const path of sourceFiles) {
      if (removed.has(path) || !existsSync(path)) continue;
      if (!importedFrontendFiles(frontendRoot, path, knownFiles).some((dependency) => removed.has(dependency))) continue;
      removed.add(path);
      changed = true;
    }
  }
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


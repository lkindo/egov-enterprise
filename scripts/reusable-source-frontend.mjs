/**
 * 소스 투영의 프런트 단계 — import 해석, pack 마커 블록 투영, 제외 경로와 그 연쇄 제거.
 */
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fail, normalize, removePath, walk } from './reusable-source-tree.mjs';

export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
/** frontend 거버넌스 계약이 사는 곳 — census·guard·cross-stack 계약이 전부 이 아래다. */
const FRONTEND_GATE_DIR = 'frontend/src/__tests__/';
/** 라우트가 아닌 필수 진입점(루트 레이아웃). 화면(page)의 생존은 구성 기대값 대조가 본다. */
export const FRONTEND_LAYOUT = 'src/app/layout.tsx';

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

/*
 * 화면 파일(page)과 next.config 의 라우트 종류는 그 본문에서 판정한다(redirect 호출·return 유무, next.config 선언 —
 * ui-route-capabilities-contract.expectedRouting). 마커 블록이 그 근거를 품으면 같은 화면의 종류가 프로필마다 갈려, 원본 라우트
 * 원장으로 계산하는 화면 생존 기대값과 투영 뒤 본문을 보는 거버넌스 투영이 어긋난다. 그래서 그런 블록은 작성 시점에 막는다.
 * 판정은 expectedRouting 과 같은 정규식이다(redirect 호출은 주석까지, return 은 주석을 뺀 본문에서 센다).
 */
const PAGE_FILE = /(?:^|\/)src\/app\/(?:.+\/)?page\.(?:ts|tsx|js|jsx)$/;
const NEXT_CONFIG = /(?:^|\/)next\.config\.(?:ts|mjs|js)$/;
const REDIRECT_CALL = /\bredirect\s*\(\s*(['"`])[^\r\n]*?\1\s*\)/;
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');

/**
 * 한 파일의 pack 마커 블록을 투영한다. 제외 pack 블록은 마커 줄과 함께 지우고 허용 pack 블록은 그대로 둔다.
 * 한 줄에 마커 둘·알 수 없는 pack·중첩·짝 불일치·미닫힘, next.config 의 마커, page 파일에서 redirect 호출이나 return 을
 * 품은 블록은 FAIL 이다. 계약 테스트가 같은 투영을 재사용하도록 export 한다.
 */
export function projectFrontendPackMarkers(source, { knownPacks, excludedPacks, label }) {
  const path = String(label).replaceAll('\\', '/');
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
      if (openMarker) openMarker.body.push(line);
      if (!openMarker?.strip) projected.push(line);
      continue;
    }

    const [, packName, boundary] = marker;
    if (!knownPacks.has(packName)) {
      fail(`알 수 없는 frontend pack marker: ${packName} (${label}:${index + 1})`);
    }
    if (NEXT_CONFIG.test(path)) {
      fail(`next.config 는 pack 마커를 둘 수 없다 — 리다이렉트 선언은 거버넌스 투영이 정리한다: ${label}:${index + 1}`);
    }
    if (boundary === 'start') {
      if (openMarker) {
        fail(`frontend pack marker 중첩은 허용하지 않는다: ${label}:${index + 1}`);
      }
      openMarker = { packName, line: index + 1, strip: excludedPacks.has(packName), body: [] };
      if (!openMarker.strip) projected.push(line);
      continue;
    }

    if (!openMarker || openMarker.packName !== packName) {
      fail(`짝이 맞지 않는 frontend pack marker: ${packName} (${label}:${index + 1})`);
    }
    const body = openMarker.body.join('');
    if (PAGE_FILE.test(path) && (REDIRECT_CALL.test(body) || /\breturn\b/.test(withoutComments(body)))) {
      fail(`page 파일의 pack 마커 블록은 redirect 호출이나 return 을 품을 수 없다 — 화면의 라우트 종류가 프로필마다 갈린다: ${label}:${openMarker.line}`);
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
  const { direct: directRemoved, removed } = planFrontendRemoval({
    frontendRoot, files, directPaths, readSource: (path) => readFileSync(path, 'utf8'),
  });
  for (const rel of directPaths) removePath(frontendRemoveTarget(frontendRoot, rel), new Set());
  for (const path of removed) if (existsSync(path)) rmSync(path);

  // 화면(page)의 생존은 구성 기대값과의 대조가 본다(project-composer-source.projectedScreenLosses). 라우트가 아닌 루트 레이아웃만 여기서 본다.
  // 종전의 'dangling import' 검사는 연쇄와 같은 판정·같은 제거 집합으로 다시 봐서 실패할 수 없었다(항진) — 화면 대조로 바꿨다.
  if (!existsSync(join(frontendRoot, FRONTEND_LAYOUT))) fail(`frontend 필수 진입점이 projection에서 제거됐다: ${FRONTEND_LAYOUT}`);
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


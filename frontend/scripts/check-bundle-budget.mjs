#!/usr/bin/env node

/**
 * Next 프로덕션 산출물 크기 래칫.
 *
 * Lighthouse는 실제 페이지 경험을 측정하지만 실행 환경 편차가 크다. 이 게이트는 그와 별도로
 * 정적 JS/CSS 전체와 단일 청크의 gzip 크기를 매 빌드에서 결정론적으로 제한한다. 예산은
 * 실측 기준에 약 10% 여유를 둔다.
 * 임계를 올리는 대신 새 의존의 필요성, dynamic import, 공통 레이아웃 유입부터 점검할 것.
 *
 * ## 실측 기준(갱신 시 날짜와 함께 남길 것)
 *
 * | 측정일 | JS 합계 | JS 최대 | CSS 합계 | CSS 최대 | JS 공용 |
 * |---|---|---|---|---|---|
 * | 2026-08-12 | 2,048,260B | 133,566B | 35,223B | 34,200B | - |
 * | 2026-09-03 | 2,201,553B | 133,489B | 35,048B | 34,025B | - |
 * | 2026-10-19 | 1,881,283B | 148,518B | 29,409B | 28,424B | 345,355B |
 * | 2026-10-24 | 1,996,457B | 145,279B | 29,966B | 28,981B | 355,604B |
 *
 * [2026-09-03] **JS 합계가 3주 만에 +153,293B(+7.5%) 늘어 설계 여유 10% 중 78%를 먹었다**
 * (남은 여유 2.2%). 종전에는 이 사실이 어디에도 드러나지 않았다 — 스크립트가 여유 50% 일 때와
 * 97.8% 를 쓴 때에 **똑같이 ✅ 만 찍었기** 때문이다. 그래서 사용률·남은 여유를 항상 출력하고,
 * 정책 하한 미만이면 경고를 낸다. 경고는 차단하지 않는다 — 해소 방향(번들 축소 vs 예산 재산정)은
 * frontend-platform 소유자의 결정이고, 이 스크립트가 대신 정할 일이 아니다.
 *
 * [2026-09-13] **zod 는 `~4.4.3` 으로 고정한다.** dependabot minor 그룹의 zod 4.6.2 가 단일 청크
 * 예산을 넘겼다(최대 청크 132,684B → 152,335B, +19,651B). 4.5~4.6 이 core 에 JIT 컴파일러
 * (`v4/core/compile.js`)·memoizer·visit 등을 더해 core 배포 크기가 220KB→412KB 로 늘었고,
 * `import { z } from 'zod'` 는 tree-shaking 되지 않아 생성 스키마(`generated-zod.ts`)와 함께 한
 * 청크에 그대로 실린다. zod 만 4.4.3 으로 되돌린 동일 빌드의 최대 청크는 132,691B 였다(원인 격리 실측).
 * 4.5+ 기능을 쓰는 코드는 없다. 고정을 풀려면 예산 재산정 또는 zod 소비 방식 변경(`zod/mini` 등)이 선행이다.
 * [2026-10-24] **고정을 풀었다(`~4.6.6`).** 4.6.6 미만의 운영 경로 high 권고(advisory 1243066, 오버사이즈 제약 컬렉션 검증의 메모리
 * 고갈)가 감사로 모든 PR 을 막았다. 2026-10-19 에 생성 스키마를 태그 묶음 모듈로 나눈 뒤라 zod 4.6.7 로도 예산 안이다 — 위 표의
 * 2026-10-24 행(로컬 Windows 프로덕션 빌드): 단일 청크 최대 145,279B(여유 3.1%)·공용 JS 355,604B(+10,249B, 여유 7.4%)로 둘 다
 * 정책 하한 10% 미만 경고 구간이다. 예산은 올리지 않았다. dependabot.yml 의 zod ignore 도 같은 변경에서 걷었다.
 *
 * [2026-10-01] **미리 불러오는(preload) 글꼴도 센다.** 한글 전체를 담은 Pretendard 가변 글꼴(2,057,688B)이
 * 모든 라우트에 `<link rel=preload>` 로 실려 첫 방문마다 JS 와 대역폭을 다퉜다 — JS 합계 예산보다 크다.
 * 글꼴은 `display: swap` 으로 받으므로 미리 불러오지 않아도 본문은 대체 글꼴로 먼저 보인다. next/font 매니페스트
 * (`.next/server/next-font-manifest.json`)에서 라우트마다 preload 되는 글꼴 바이트를 더해 가장 큰 라우트를 본다.
 * 매니페스트가 없으면 측정할 수 없으므로 통과시키지 않는다.
 *
 * [2026-10-19] **모든 라우트가 첫 로드에 받는 JS(공용 JS)를 센다.** 합계·단일 청크 예산은 어느 화면이 무엇을 받는지 말하지
 * 않는다 — 루트 레이아웃이 끌어온 모듈은 121개 라우트 모두의 첫 로드에 실리는데도 두 예산 안이었다. 실측(main 682d203f3)에서
 * 공용 JS 는 414,239B 로 업무 홈 첫 로드(419,361B)의 99% 였고, 그 안에 루트의 화면 전환·사이드바가 부른 framer-motion(약 40KB)과
 * 루트의 인증·메뉴 연산 몇 개가 끌어온 생성 스키마·연산 전체(약 37KB, 한 파일이라 번들러가 나누지 못했다)가 있었다.
 * 앞의 것은 CSS 로, 뒤의 것은 생성기가 API 태그 묶음 모듈로 나눠 345,355B 로 줄였다(라우트 첫 로드 평균 447,718B → 415,471B).
 * 공용 JS 는 루트 레이아웃 아래 모든 페이지의 첫 로드 JS 의 교집합이다. 페이지마다 첫 로드 JS 는 build-manifest 의 rootMainFiles 와
 * 그 페이지 client reference 매니페스트(`.next/server/app/**\/page_client-reference-manifest.js`)의 entryJSFiles 전부의 합집합이다.
 * 루트 레이아웃 entry 가 없는 페이지(`_global-error`)는 루트 레이아웃 밖이라 뺀다. 매니페스트를 읽지 못하면 통과시키지 않는다.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const CHUNK_ROOT = path.resolve('.next/static/chunks');
const BUDGETS = {
  // shared: 공용 JS(위 2026-10-19). 실측 345,355B 를 정책 하한(여유 10%) 안에 두는 가장 작은 천 단위 값이다.
  js: { total: 2_250_000, single: 150_000, shared: 384_000 },
  css: { total: 40_000, single: 38_000 },
};

/**
 * 위 docstring 의 "약 10% 여유" 정책을 실행 가능한 값으로 옮긴 것. 남은 여유가 이 아래로
 * 내려가면 경고한다.
 *
 * ⚠ 경고를 없애려고 이 값을 낮추는 것은 수정이 아니라 은폐다(AGENTS.md H2).
 * 여유가 줄었다는 사실 자체가 신호이며, 해소는 번들을 줄이거나 예산을 **사유와 함께** 재산정하는 것이다.
 */
const HEADROOM_FLOOR = 0.1;

/** 한 라우트가 미리 불러오는 글꼴 바이트 상한. 라틴 부분집합 몇 개는 들어가고 한글 전체 글꼴은 들어가지 않는다. */
const PRELOADED_FONT_BUDGET = 200_000;
const FONT_MANIFEST = path.resolve('.next/server/next-font-manifest.json');

/** 라우트별 preload 글꼴 바이트 합계 중 가장 큰 것. 매니페스트의 파일 경로는 `.next` 기준이다. */
async function measurePreloadedFonts() {
  const manifest = JSON.parse(await readFile(FONT_MANIFEST, 'utf8'));
  const sizes = new Map();
  let largest = { route: null, bytes: 0, files: [] };
  for (const [route, files] of Object.entries(manifest.app ?? {})) {
    let bytes = 0;
    for (const file of files) {
      if (!sizes.has(file)) sizes.set(file, (await readFile(path.resolve('.next', file))).byteLength);
      bytes += sizes.get(file);
    }
    if (bytes > largest.bytes) largest = { route, bytes, files };
  }
  return largest;
}

const BUILD_MANIFEST = path.resolve('.next/build-manifest.json');
const APP_SERVER_ROOT = path.resolve('.next/server/app');
const CLIENT_REFERENCE_MANIFEST = 'page_client-reference-manifest.js';
/** entryJSFiles 의 루트 레이아웃 키(`[project]/frontend/src/app/layout` — turbopack root 에 따라 앞부분이 달라진다). */
const ROOT_LAYOUT_ENTRY = /(?:^|\/)src\/app\/layout$/u;
/** 매니페스트 한 줄: `globalThis.__RSC_MANIFEST["/login/page"] = {...};` — 실행하지 않고 JSON 으로 읽는다. */
const MANIFEST_ASSIGNMENT = /^globalThis\.__RSC_MANIFEST\[("(?:[^"\\]|\\.)*")\]\s*=\s*(\{.*\});?\s*$/u;

/** client reference 매니페스트 파일 하나의 페이지들. 형식을 모르면 측정할 수 없으므로 실패한다. */
function parseClientReferenceManifest(source, file) {
  const pages = [];
  for (const line of source.split(/\r?\n/u)) {
    if (!line.startsWith('globalThis.__RSC_MANIFEST[')) continue;
    const match = MANIFEST_ASSIGNMENT.exec(line);
    if (!match) throw new Error(`client reference 매니페스트 형식을 읽지 못했습니다: ${file}`);
    pages.push({ page: JSON.parse(match[1]), manifest: JSON.parse(match[2]) });
  }
  if (pages.length === 0) throw new Error(`client reference 매니페스트에 페이지가 없습니다: ${file}`);
  return pages;
}

/**
 * 공용 JS — 루트 레이아웃 아래 모든 페이지가 첫 로드에 받는 JS 파일의 교집합과 그 gzip 크기.
 * 페이지의 첫 로드 JS = build-manifest 의 rootMainFiles ∪ 그 페이지 매니페스트의 entryJSFiles 전부(레이아웃·경계·페이지).
 */
async function measureSharedJs() {
  const { rootMainFiles } = JSON.parse(await readFile(BUILD_MANIFEST, 'utf8'));
  if (!Array.isArray(rootMainFiles) || rootMainFiles.length === 0) {
    throw new Error('build-manifest.json 에 rootMainFiles 가 없습니다');
  }
  const manifests = (await walk(APP_SERVER_ROOT)).filter((file) => path.basename(file) === CLIENT_REFERENCE_MANIFEST);
  let shared = null;
  let pages = 0;
  for (const file of manifests) {
    for (const { manifest } of parseClientReferenceManifest(await readFile(file, 'utf8'), file)) {
      const entries = manifest.entryJSFiles ?? {};
      if (!Object.keys(entries).some((entry) => ROOT_LAYOUT_ENTRY.test(entry))) continue;
      const firstLoad = new Set(rootMainFiles);
      for (const files of Object.values(entries)) for (const chunk of files) firstLoad.add(chunk);
      shared = shared === null ? firstLoad : new Set([...shared].filter((chunk) => firstLoad.has(chunk)));
      pages += 1;
    }
  }
  if (pages === 0) throw new Error('루트 레이아웃 아래 페이지의 client reference 매니페스트를 찾지 못했습니다 — next build 선행 여부를 확인하십시오');
  const rows = await Promise.all([...shared].map(async (chunk) => ({
    file: chunk,
    gzip: gzipSync(await readFile(path.resolve('.next', chunk)), { level: 9 }).byteLength,
  })));
  rows.sort((left, right) => right.gzip - left.gzip);
  return { pages, rows, total: rows.reduce((sum, row) => sum + row.gzip, 0) };
}

function headroomOf(actual, budget) {
  return { remaining: budget - actual, ratio: (budget - actual) / budget };
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')}B`;
}

function formatHeadroom({ remaining, ratio }) {
  return `${(ratio * 100).toFixed(1)}% · ${formatBytes(remaining)}`;
}

async function measure(extension) {
  const files = (await walk(CHUNK_ROOT)).filter((file) => file.endsWith(`.${extension}`));
  const rows = await Promise.all(files.map(async (file) => {
    const content = await readFile(file);
    return {
      file: path.relative(process.cwd(), file).split(path.sep).join('/'),
      gzip: gzipSync(content, { level: 9 }).byteLength,
    };
  }));
  rows.sort((left, right) => right.gzip - left.gzip);
  return {
    rows,
    total: rows.reduce((sum, row) => sum + row.gzip, 0),
  };
}

try {
  const violations = [];
  for (const extension of ['js', 'css']) {
    const result = await measure(extension);
    const budget = BUDGETS[extension];
    if (result.rows.length === 0) {
      violations.push(`${extension.toUpperCase()} 산출물이 0건 — next build 선행 여부를 확인하십시오.`);
      continue;
    }

    const largest = result.rows[0];
    const totalHeadroom = headroomOf(result.total, budget.total);
    const singleHeadroom = headroomOf(largest.gzip, budget.single);
    const label = extension.toUpperCase();
    console.log(
      `${label}: ${result.rows.length}개 · gzip 합계 ${formatBytes(result.total)}`
      + `/${formatBytes(budget.total)} (여유 ${formatHeadroom(totalHeadroom)})`
      + ` · 최대 ${formatBytes(largest.gzip)}`
      + `/${formatBytes(budget.single)} (여유 ${formatHeadroom(singleHeadroom)}, ${largest.file})`,
    );

    // 예산 안이어도 여유가 정책 하한 밑으로 내려갔으면 그 사실을 드러낸다 —
    // 초과한 뒤에야 알게 되면 그때는 이미 어느 변경이 원인인지 가리기 어렵다.
    for (const [axis, headroom] of [['합계', totalHeadroom], ['단일 청크', singleHeadroom]]) {
      if (headroom.ratio >= HEADROOM_FLOOR || headroom.remaining < 0) continue;
      console.warn(
        `⚠ ${label} ${axis} 여유 ${formatHeadroom(headroom)} — 정책 하한 `
        + `${(HEADROOM_FLOOR * 100).toFixed(0)}% 미만입니다(차단하지 않음).\n`
        + '   임계를 올리기 전에 새 의존의 필요성·dynamic import·공통 레이아웃 유입을 점검하십시오.',
      );
    }

    if (result.total > budget.total) {
      violations.push(
        `${extension.toUpperCase()} gzip 합계 ${formatBytes(result.total)}가 예산 ${formatBytes(budget.total)} 초과`,
      );
    }
    for (const row of result.rows.filter((candidate) => candidate.gzip > budget.single)) {
      violations.push(
        `${extension.toUpperCase()} 청크 ${row.file} ${formatBytes(row.gzip)}`
        + `가 단일 예산 ${formatBytes(budget.single)} 초과`,
      );
    }
  }

  const shared = await measureSharedJs();
  const sharedHeadroom = headroomOf(shared.total, BUDGETS.js.shared);
  const largestShared = shared.rows.slice(0, 3).map((row) => `${row.file} ${formatBytes(row.gzip)}`).join(', ');
  console.log(
    `JS 공용(루트 레이아웃 아래 ${shared.pages}개 페이지가 모두 받는 첫 로드): ${shared.rows.length}개 · gzip `
    + `${formatBytes(shared.total)}/${formatBytes(BUDGETS.js.shared)} (여유 ${formatHeadroom(sharedHeadroom)}) · 큰 청크 ${largestShared}`,
  );
  if (sharedHeadroom.ratio < HEADROOM_FLOOR && sharedHeadroom.remaining >= 0) {
    console.warn(
      `⚠ JS 공용 여유 ${formatHeadroom(sharedHeadroom)} — 정책 하한 ${(HEADROOM_FLOOR * 100).toFixed(0)}% 미만입니다(차단하지 않음).\n`
      + '   루트 레이아웃(src/app/layout.tsx)·providers 에서 새로 닿은 모듈부터 점검하십시오.',
    );
  }
  if (shared.total > BUDGETS.js.shared) {
    violations.push(
      `모든 라우트가 첫 로드에 받는 JS gzip ${formatBytes(shared.total)}가 공용 예산 ${formatBytes(BUDGETS.js.shared)} 초과`
      + ` — 루트 레이아웃(src/app/layout.tsx)에서 닿는 모듈을 점검하십시오(큰 청크: ${largestShared}).`,
    );
  }

  const fonts = await measurePreloadedFonts();
  console.log(
    `FONT preload: 라우트 최대 ${formatBytes(fonts.bytes)}/${formatBytes(PRELOADED_FONT_BUDGET)}`
    + (fonts.route ? ` (${fonts.route})` : ' (미리 불러오는 글꼴 없음)'),
  );
  if (fonts.bytes > PRELOADED_FONT_BUDGET) {
    violations.push(
      `라우트 ${fonts.route} 가 미리 불러오는 글꼴 ${formatBytes(fonts.bytes)}가 예산 `
      + `${formatBytes(PRELOADED_FONT_BUDGET)} 초과(${fonts.files.join(', ')}) — next/font 의 preload: false 를 검토하십시오.`,
    );
  }

  if (violations.length > 0) {
    console.error(`\n❌ 번들 예산 초과:\n- ${violations.join('\n- ')}`);
    process.exit(1);
  }
  console.log('✅ 프로덕션 정적 자산이 고정 gzip 예산 안에 있습니다.');
} catch (error) {
  console.error(`❌ 번들 예산을 측정할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

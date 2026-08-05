#!/usr/bin/env node
/**
 * code-census — 코드 간결화 작업의 성과를 기계로 측정한다.
 *
 * 왜 필요한가: 리팩터의 성과를 "간결해졌다" 는 주관적 서술로 보고하면 회귀가 숨는다.
 * 이 스크립트는 착수 전/후의 델타를 같은 방식으로 산출해, 무엇이 실제로 줄었는지를
 * 재현 가능하게 만든다. (GEMINI.md §0.7-H5 — 실행 경로 없는 규칙은 규칙이 아니다)
 *
 * 사용법:
 *   node scripts/code-census.mjs              # 사람이 읽는 표
 *   node scripts/code-census.mjs --json       # 기계 판독용
 *   node scripts/code-census.mjs --baseline   # 현재 값을 기준선으로 저장
 *   node scripts/code-census.mjs --diff       # 저장된 기준선 대비 델타
 *
 * 계획 문서: .gemini/tasks/20260805-code-simplification-plan.md
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, '.gemini', 'tasks', 'code-census-baseline.json');

const BE_MODULES = ['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool'];
/** 스캔에서 제외한다 — 자동 산출물·의존성·빌드 결과는 최적화 대상이 아니다. */
const SKIP_DIRS = new Set(['build', 'node_modules', '.git', '.next', '.gradle', 'coverage', 'test-results', 'playwright-report']);
/** generated 파일은 codegen 이 소유한다. 손대면 codegen:verify 가 red 가 되고 그게 정상이다. */
const GENERATED = /generated-api\.d\.ts$|generated-zod\.ts$/;

function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

const isJava = (p) => p.endsWith('.java');
const isTsx = (p) => (p.endsWith('.ts') || p.endsWith('.tsx')) && !GENERATED.test(p);

/** 주석·빈 줄을 분리해 센다. 주석 총량은 감축 목표가 아니라 관측 지표다. */
function classify(files) {
  let total = 0, comment = 0, blank = 0;
  for (const f of files) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      total++;
      const t = line.trim();
      if (!t) blank++;
      else if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) comment++;
    }
  }
  return { files: files.length, loc: total, comment, blank };
}

/**
 * 정규화 8줄 윈도우 해시로 파일 간 중복을 센다.
 * 정밀 CPD 가 아니라 리팩터 규모를 추정하기 위한 신호다 — 절대값보다 델타가 의미를 갖는다.
 */
function duplication(files) {
  const map = new Map();
  for (const f of files) {
    const lines = readFileSync(f, 'utf8').split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//') && !l.startsWith('*') && !l.startsWith('/*')
                  && !l.startsWith('import ') && l !== '}' && l !== '{' && l !== ');');
    for (let i = 0; i + 8 <= lines.length; i++) {
      const k = lines.slice(i, i + 8).join('');
      if (!map.has(k)) map.set(k, new Set());
      map.get(k).add(f);
    }
  }
  let windows = 0;
  const involved = new Set();
  for (const owners of map.values()) {
    if (owners.size > 1) { windows++; owners.forEach((f) => involved.add(f)); }
  }
  return { windows, files: involved.size };
}

function census() {
  const beMain = BE_MODULES.flatMap((m) => walk(join(ROOT, m, 'src', 'main'), isJava));
  const beTest = BE_MODULES.flatMap((m) => [
    ...walk(join(ROOT, m, 'src', 'test'), isJava),
    ...walk(join(ROOT, m, 'src', 'testFixtures'), isJava),
  ]);
  const feAll = walk(join(ROOT, 'frontend', 'src'), isTsx);
  const feClient = feAll.filter((f) => f.endsWith('.tsx') && readFileSync(f, 'utf8').includes("'use client'"));

  const beMainC = classify(beMain);
  const beTestC = classify(beTest);
  const feC = classify(feAll);
  const feClientLoc = classify(feClient).loc;

  // 600줄 초과 파일 — 코드 리뷰 정확성의 직접 저해 요인 (§1.3 성공 기준)
  const oversized = (files) => files
    .map((f) => ({ file: relative(ROOT, f).split(sep).join('/'), loc: readFileSync(f, 'utf8').split('\n').length }))
    .filter((x) => x.loc > 600)
    .sort((a, b) => b.loc - a.loc);

  return {
    scale: {
      beMain: beMainC,
      beTest: beTestC,
      frontend: { ...feC, clientFiles: feClient.length, clientLoc: feClientLoc },
      totalLoc: beMainC.loc + beTestC.loc + feC.loc,
    },
    // §1.3 목표 지표
    targets: {
      oversizedFe: oversized(feAll).length,
      oversizedBe: oversized(beMain).length,
      clientRatio: +(feClientLoc / feC.loc * 100).toFixed(1),
      dupFe: duplication(feAll.filter((f) => f.endsWith('.tsx'))),
      dupBeMain: duplication(beMain),
      dupBeTest: duplication(beTest),
    },
    oversizedFiles: [...oversized(feAll), ...oversized(beMain)],
  };
}

function table(c) {
  const { scale, targets } = c;
  const pct = (n, d) => `${(n / d * 100).toFixed(1)}%`;
  console.log('\n=== 규모 ===');
  console.log(`BE main    : ${scale.beMain.files} 파일  ${scale.beMain.loc} LOC  (주석 ${pct(scale.beMain.comment, scale.beMain.loc)})`);
  console.log(`BE test    : ${scale.beTest.files} 파일  ${scale.beTest.loc} LOC  (주석 ${pct(scale.beTest.comment, scale.beTest.loc)})`);
  console.log(`FE src     : ${scale.frontend.files} 파일  ${scale.frontend.loc} LOC  (주석 ${pct(scale.frontend.comment, scale.frontend.loc)})`);
  console.log(`합계       : ${scale.totalLoc} LOC`);
  console.log('\n=== §1.3 목표 지표 (낮을수록 좋음) ===');
  console.log(`600줄 초과 파일      : FE ${targets.oversizedFe} / BE ${targets.oversizedBe}   [목표 FE≤3 · BE 0]`);
  console.log(`FE 클라이언트 LOC 비중: ${targets.clientRatio}%  (${scale.frontend.clientFiles} 파일)   [목표 ≤45%]`);
  console.log(`교차 중복 8줄 윈도우  : FE ${targets.dupFe.windows} / BE main ${targets.dupBeMain.windows} / BE test ${targets.dupBeTest.windows}   [목표 각 50% 이하]`);
  if (c.oversizedFiles.length) {
    console.log('\n--- 600줄 초과 파일 ---');
    for (const x of c.oversizedFiles) console.log(`  ${String(x.loc).padStart(5)}  ${x.file}`);
  }
}

function flatten(o, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else if (typeof v === 'number') out[key] = v;
  }
  return out;
}

const args = process.argv.slice(2);
const result = census();

if (args.includes('--baseline')) {
  writeFileSync(BASELINE_PATH, JSON.stringify(result, null, 2) + '\n');
  console.log(`기준선 저장: ${relative(ROOT, BASELINE_PATH)}`);
  table(result);
} else if (args.includes('--diff')) {
  if (!existsSync(BASELINE_PATH)) {
    console.error('기준선이 없다. 먼저 --baseline 으로 저장할 것.');
    process.exit(1);
  }
  const base = flatten(JSON.parse(readFileSync(BASELINE_PATH, 'utf8')));
  const now = flatten(result);
  console.log('\n=== 기준선 대비 델타 ===');
  for (const k of Object.keys(now)) {
    const d = now[k] - (base[k] ?? 0);
    if (d !== 0) console.log(`  ${d > 0 ? '+' : ''}${d}\t${k}  (${base[k] ?? 0} → ${now[k]})`);
  }
} else if (args.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  table(result);
}

#!/usr/bin/env node
/**
 * code-census — 코드 간결화 작업의 성과를 기계로 측정한다.
 *
 * 왜 필요한가: 리팩터의 성과를 "간결해졌다" 는 주관적 서술로 보고하면 회귀가 숨는다.
 * 이 스크립트는 착수 전/후의 델타를 같은 방식으로 산출해, 무엇이 실제로 줄었는지를
 * 재현 가능하게 만든다. (AGENTS.md Evidence guardrails H5 — 실행 경로 없는 규칙은 규칙이 아니다)
 *
 * 사용법:
 *   node scripts/code-census.mjs              # 사람이 읽는 표
 *   node scripts/code-census.mjs --json       # 기계 판독용
 *   node scripts/code-census.mjs --baseline <file> # 명시한 파일에 비교용 snapshot 저장
 *   node scripts/code-census.mjs --diff <file>     # 같은 측정 정의의 snapshot과 비교
 *
 * 운영·테스트·생성물은 별도 모집단이다. 이 관측 도구는 품질 게이트나 현재 상태 원장이 아니다.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { skipBlockComment, skipLineComment } from './source-lexing.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
export const MEASUREMENT_VERSION = 2;

const BE_MODULES = ['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool'];
/** 스캔에서 제외한다 — 자동 산출물·의존성·빌드 결과는 최적화 대상이 아니다. */
const SKIP_DIRS = new Set(['build', 'node_modules', '.git', '.next', '.gradle', 'coverage', 'test-results', 'playwright-report']);
const normalize = (path) => path.split(sep).join('/');
const isTest = (path) => /(?:^|\/)(?:__tests__|test|test-utils|mocks)\//.test(normalize(path))
  || /\.(?:test|spec|stories|story)\.[cm]?[jt]sx?$/.test(path);

// 이름만 generated-*인 수작성 transport는 제외하지 않는다.
function isGenerated(path, source) {
  if (/\/types\/generated-[^/]+$/.test(normalize(path))) return true;
  const content = path.endsWith('.java') ? source.replace(/^\s*package [\w.]+;\s*/, '') : source;
  const header = content.match(/^\s*(?:(?:\/\/[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)\s*)+/)?.[0] ?? '';
  return /\bGenerated (?:by|from)\b|@generated\b|AUTO[- ]GENERATED/i.test(header);
}
const linesOf = (source) => source === '' ? [] : source.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');

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
const isTsx = (p) => p.endsWith('.ts') || p.endsWith('.tsx');

/** Only a standalone string in the initial directive prologue is a client directive. */
export function hasUseClientDirective(source) {
  let index = source.charCodeAt(0) === 0xFEFF ? 1 : 0;
  const skipTrivia = () => {
    while (index < source.length) {
      if (/\s/.test(source[index])) index += 1;
      else if (source.startsWith('//', index)) index = skipLineComment(source, index);
      else if (source.startsWith('/*', index)) {
        const end = skipBlockComment(source, index);
        if (end < 0) { index = source.length; return; }
        index = end;
      } else return;
    }
  };
  while (index < source.length) {
    skipTrivia();
    const quote = source[index];
    if (quote !== "'" && quote !== '"') return false;
    const start = ++index;
    // Skip escapes in preceding directives; only the literal spelling marks this file.
    while (index < source.length && source[index] !== quote) {
      if (/[\r\n\u2028\u2029]/.test(source[index])) return false;
      if (source[index] === '\\') {
        index += source[index + 1] === '\r' && source[index + 2] === '\n' ? 3 : 2;
      } else index += 1;
    }
    if (index >= source.length) return false;
    const value = source.slice(start, index++);
    const end = index;
    skipTrivia();
    if (source[index] === ';') index += 1;
    else if (index < source.length) {
      // A newline does not terminate a string followed by a call/member/operator.
      if (!/[\r\n\u2028\u2029]/.test(source.slice(end, index))
        || (!/^(?:\+\+|--)/.test(source.slice(index)) && /^[([.`+*/%?&|^<>=,:-]/.test(source.slice(index)))
        || /^(?:in|instanceof)\b/.test(source.slice(index))) return false;
    }
    if (value === 'use client') return true;
  }
  return false;
}

/** 주석·빈 줄을 분리해 센다. 주석 총량은 감축 목표가 아니라 관측 지표다. */
function classify(files) {
  let total = 0, comment = 0, blank = 0;
  for (const f of files) {
    for (const line of linesOf(readFileSync(f, 'utf8'))) {
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

export function census(root = ROOT) {
  const beAll = BE_MODULES.flatMap((m) => walk(join(root, m, 'src', 'main'), isJava));
  const beGenerated = beAll.filter((f) => isGenerated(f, readFileSync(f, 'utf8')));
  const generatedBackend = new Set(beGenerated);
  const beMain = beAll.filter((f) => !generatedBackend.has(f));
  const beTest = BE_MODULES.flatMap((m) => [
    ...walk(join(root, m, 'src', 'test'), isJava),
    ...walk(join(root, m, 'src', 'testFixtures'), isJava),
  ]);
  const feAll = walk(join(root, 'frontend', 'src'), isTsx);
  // 분류는 저장소 기준 상대 경로로 한다 — 절대 경로로 보면 저장소 상위 디렉터리 이름(test·mocks 등)이 모든 파일을
  // 테스트로 만든다.
  const isTestFile = (f) => isTest(relative(root, f));
  const feTest = feAll.filter(isTestFile);
  const feGenerated = feAll.filter((f) => !isTestFile(f) && isGenerated(f, readFileSync(f, 'utf8')));
  const nonProduction = new Set([...feTest, ...feGenerated]);
  const feMain = feAll.filter((f) => !nonProduction.has(f));
  const feClient = feMain.filter((f) => hasUseClientDirective(readFileSync(f, 'utf8')));

  const beMainC = classify(beMain);
  const beTestC = classify(beTest);
  const feC = classify(feMain);
  const feClientLoc = classify(feClient).loc;

  // 큰 파일은 검토 후보일 뿐, 길이 자체가 결함이나 성능을 뜻하지 않는다.
  const oversized = (files) => files
    .map((f) => ({ file: normalize(relative(root, f)), loc: linesOf(readFileSync(f, 'utf8')).length }))
    .filter((x) => x.loc > 600)
    .sort((a, b) => b.loc - a.loc);

  const scale = {
    beMain: beMainC,
    beTest: beTestC,
    beGenerated: classify(beGenerated),
    frontend: { ...feC, clientFiles: feClient.length, clientLoc: feClientLoc },
    frontendTest: classify(feTest),
    frontendGenerated: classify(feGenerated),
  };
  return {
    measurementVersion: MEASUREMENT_VERSION,
    definitions: {
      lines: 'Physical lines including comments and blanks; final newline does not add a line.',
      frontend: 'TS/TSX excluding tests, stories, mocks, test-utils and generated sources.',
      generated: 'types/generated-* or a Generated by/from, @generated, AUTO-GENERATED header.',
      clientRatio: 'Direct client-directive file LOC / production TS/TSX LOC; not bundle or runtime cost.',
      duplication: 'Overlapping normalized 8-line windows across production files; not duplicate LOC.',
    },
    scale: { ...scale, totalLoc: Object.values(scale).reduce((sum, group) => sum + group.loc, 0) },
    targets: {
      oversizedFe: oversized(feMain).length,
      oversizedBe: oversized(beMain).length,
      clientRatio: feC.loc ? +(feClientLoc / feC.loc * 100).toFixed(1) : 0,
      dupFe: duplication(feMain),
      dupBeMain: duplication(beMain),
      dupBeTest: duplication(beTest),
    },
    oversizedFiles: [...oversized(feMain), ...oversized(beMain)],
  };
}

function table(c) {
  const { scale, targets } = c;
  const pct = (n, d) => `${(d ? n / d * 100 : 0).toFixed(1)}%`;
  console.log('\n=== 규모 ===');
  console.log(`BE main    : ${scale.beMain.files} 파일  ${scale.beMain.loc} LOC  (주석 ${pct(scale.beMain.comment, scale.beMain.loc)})`);
  console.log(`BE test    : ${scale.beTest.files} 파일  ${scale.beTest.loc} LOC  (주석 ${pct(scale.beTest.comment, scale.beTest.loc)})`);
  console.log(`BE 생성    : ${scale.beGenerated.files} 파일  ${scale.beGenerated.loc} LOC`);
  console.log(`FE 운영    : ${scale.frontend.files} 파일  ${scale.frontend.loc} LOC  (주석 ${pct(scale.frontend.comment, scale.frontend.loc)})`);
  console.log(`FE 테스트  : ${scale.frontendTest.files} 파일  ${scale.frontendTest.loc} LOC (테스트 지원 코드 포함)`);
  console.log(`FE 생성    : ${scale.frontendGenerated.files} 파일  ${scale.frontendGenerated.loc} LOC`);
  console.log(`합계       : ${scale.totalLoc} LOC`);
  console.log(`\n=== 관측 지표 (측정 정의 v${c.measurementVersion}; 품질 판정 아님) ===`);
  console.log(`운영 600줄 초과 파일 : FE ${targets.oversizedFe} / BE ${targets.oversizedBe}`);
  console.log(`client directive LOC : ${targets.clientRatio}%  (${scale.frontend.clientFiles} 파일; 번들 비율 아님)`);
  console.log(`교차 중복 8줄 윈도우 : FE ${targets.dupFe.windows} / BE main ${targets.dupBeMain.windows} / BE test ${targets.dupBeTest.windows}`);
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

export function comparison(base, current) {
  if (base.measurementVersion !== current.measurementVersion
    || JSON.stringify(base.definitions) !== JSON.stringify(current.definitions)) {
    throw new Error('측정 정의가 다른 snapshot은 비교할 수 없습니다. 이전 결과를 보존하고 새 기준을 별도로 만드세요.');
  }
  const before = flatten(base);
  const now = flatten(current);
  if (Object.keys(before).length !== Object.keys(now).length
    || Object.keys(now).some((key) => !Number.isFinite(before[key]) || !Number.isFinite(now[key]))) {
    throw new Error('측정 항목이 누락되었거나 유효한 수치가 아닌 snapshot은 비교할 수 없습니다.');
  }
  return Object.keys(now).filter((key) => key !== 'measurementVersion')
    .map((key) => ({ key, before: before[key], after: now[key], delta: now[key] - before[key] }))
    .filter(({ delta }) => delta !== 0);
}

function runCli(args) {
  const [mode, snapshot] = args;
  if (mode && !['--baseline', '--diff', '--json'].includes(mode)) throw new Error(`Unknown option: ${mode}`);
  if ((mode === '--baseline' || mode === '--diff') && (!snapshot || snapshot.startsWith('--'))) {
    throw new Error(`${mode}에는 비교용 파일 경로가 필요합니다.`);
  }
  if (args.length > (mode === '--baseline' || mode === '--diff' ? 2 : 1)) throw new Error('Unexpected arguments');
  const result = census();
  if (mode === '--baseline') {
    writeFileSync(resolve(snapshot), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(`비교 snapshot 저장: ${snapshot}`);
    table(result);
  } else if (mode === '--diff') {
    const delta = comparison(JSON.parse(readFileSync(resolve(snapshot), 'utf8')), result);
    console.log('\n=== 기준선 대비 델타 ===');
    for (const { key, before, after, delta: change } of delta) {
      console.log(`  ${change > 0 ? '+' : ''}${change}\t${key}  (${before} → ${after})`);
    }
  } else if (mode === '--json') console.log(JSON.stringify(result, null, 2));
  else table(result);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

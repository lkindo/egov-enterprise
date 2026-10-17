#!/usr/bin/env node
/**
 * 하네스 기준선 매니페스트를 Gradle 하네스 실행 없이 다시 계산한다(게이트가 아니라 개발 도구다).
 *
 * 사용법:
 *   node scripts/harness-baseline-manifest.mjs --check          # 계산값과 매니페스트를 키 단위로 대조한다(다르면 종료 코드 1)
 *   node scripts/harness-baseline-manifest.mjs --write          # 계산값으로 다시 쓰고 바뀐 키를 보인다
 *   node scripts/harness-baseline-manifest.mjs --keys <키…>     # 그 키의 계산값만 보인다(쓰지 않는다)
 *   npm run harness:baseline -- --write
 *
 * 계산은 소스 투영 생성기가 쓰는 메타 게이트의 거울(computeHarnessBaselineEntries)이다. 권위는 그대로 JVM 메타 게이트다 —
 * 이 값이 JVM 계산과 다르면 그 게이트가 CI 에서 red 이고, 거울 계약이 이 도구의 출력과 커밋본이 바이트까지 같은지 본다.
 *
 * `--keys` 는 병합에서 같은 키가 충돌했을 때 쓴다. 오케스트레이션 프로토콜 §6.4 는 충돌한 키의 값만 옮기고 그 입력 변경이
 * 양쪽 모두 정당한지 사람이 확인하게 한다(H2). 그래서 충돌 표기가 남은 매니페스트에는 `--write` 를 거부한다 — 통째로 다시
 * 쓰면 그 확인 지점이 조용히 사라진다.
 *
 * 쓰기 형식은 JVM 산출 파일과 같다. 머리 주석은 기존 파일의 것을 그대로 두고(없으면 JVM 산출 파일의 2줄), 키는 Java TreeMap 과
 * 같은 UTF-16 코드 단위 순서다(localeCompare 는 `_`·대소문자 순서가 달라 파일 전체가 뒤섞인다). 줄 끝은 LF 이고 마지막 줄 뒤에도
 * LF 를 둔다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { computeHarnessBaselineEntries } from './reusable-source-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MANIFEST_PATH = 'api-server/src/test/resources/harness/baseline-manifest.properties';
export const CLASSES_KEY = '__harness.classes';
export const DEFAULT_HEADER = Object.freeze([
  '# 자동 산출 — HarnessBaselineIntegrityTest 실행 결과(실제 소스 기준).',
  '# 정당한 변경일 때만 baseline-manifest.properties 로 복사하고 사유를 기록할 것.',
]);

const CONFLICT_MARKER = /^(?:<{7}|\|{7}|={7}|>{7})(?: |$)/m;

/** 메타 게이트가 읽는 것과 같은 `키=값` 맵. 주석·빈 줄·`=` 없는 줄은 건너뛴다. */
export function parseManifest(text) {
  const entries = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const separator = line.indexOf('=');
    if (separator < 0) continue;
    entries.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return entries;
}

/** 파일 맨 앞의 연속된 주석 줄(머리 주석). 없으면 JVM 산출 파일의 머리 주석이다. */
export function manifestHeader(text) {
  const header = [];
  for (const line of (text ?? '').split(/\r?\n/)) {
    if (!line.startsWith('#') && !line.startsWith('!')) break;
    header.push(line);
  }
  return header.length ? header : [...DEFAULT_HEADER];
}

export function hasConflictMarkers(text) {
  return CONFLICT_MARKER.test(text);
}

const byCodeUnit = ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0);

export function renderHarnessBaselineManifest(entries, header = DEFAULT_HEADER) {
  const body = [...entries.entries()].sort(byCodeUnit).map(([key, value]) => `${key}=${value}`);
  return `${[...header, ...body].join('\n')}\n`;
}

/** 키 단위 차이. `__harness.classes` 는 값이 클래스 목록이라 클래스 단위로 나눈다. */
export function diffHarnessBaseline(expected, actual) {
  const classesOf = map => new Set((map.get(CLASSES_KEY) ?? '').split(',').map(name => name.trim()).filter(Boolean));
  const [before, after] = [classesOf(expected), classesOf(actual)];
  const keys = map => [...map.keys()].filter(key => key !== CLASSES_KEY);
  return {
    changed: keys(expected).filter(key => actual.has(key) && actual.get(key) !== expected.get(key)).sort()
      .map(key => ({ key, from: expected.get(key), to: actual.get(key) })),
    added: keys(actual).filter(key => !expected.has(key)).sort().map(key => ({ key, to: actual.get(key) })),
    removed: keys(expected).filter(key => !actual.has(key)).sort().map(key => ({ key, from: expected.get(key) })),
    classesAdded: [...after].filter(name => !before.has(name)).sort(),
    classesRemoved: [...before].filter(name => !after.has(name)).sort(),
  };
}

export function formatHarnessBaselineDiff(diff) {
  const lines = [];
  for (const { key, from, to } of diff.changed) lines.push(`  변경 ${key}: ${from} → ${to}`);
  for (const { key, to } of diff.added) lines.push(`  신설 ${key}=${to}`);
  for (const { key, from } of diff.removed) lines.push(`  소멸 ${key} (매니페스트 값 ${from})`);
  for (const name of diff.classesAdded) lines.push(`  클래스 신설 ${name}`);
  for (const name of diff.classesRemoved) lines.push(`  클래스 소멸 ${name}`);
  return lines.join('\n');
}

const USAGE = '사용법: node scripts/harness-baseline-manifest.mjs --check | --write | --keys <키…>';

/** CLI 본체. 반환값이 종료 코드다. 시험은 `compute`·`log`·`error` 를 바꿔 넘긴다. */
export function main(argv, { root = repoRoot, compute = computeHarnessBaselineEntries, log = console.log, error = console.error } = {}) {
  const modes = ['--check', '--write', '--keys'].filter(mode => argv.includes(mode));
  if (modes.length !== 1) { error(USAGE); return 2; }
  const manifestFile = path.join(root, ...MANIFEST_PATH.split('/'));
  const text = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, 'utf8') : undefined;
  const actual = compute(root);

  if (modes[0] === '--keys') {
    const keys = argv.slice(argv.indexOf('--keys') + 1).filter(arg => !arg.startsWith('--'));
    if (!keys.length) { error(USAGE); return 2; }
    log(`# node 계산값(${MANIFEST_PATH}). 충돌한 키의 값만 옮기고, 그 입력 변경이 양쪽 모두 정당한지 확인한다(§6.4·H2).`);
    for (const key of keys) {
      log(actual.has(key) ? `${key}=${actual.get(key)}` : `# ${key}: 계산에 없는 키다 — 매니페스트에서 지운다`);
    }
    return 0;
  }

  if (text !== undefined && hasConflictMarkers(text)) {
    error(`${MANIFEST_PATH} 에 충돌 표기가 남아 있다. 통째로 다시 쓰지 않는다 — --keys <충돌한 키…> 로 그 값만 옮긴다(§6.4).`);
    return 1;
  }
  const expected = text === undefined ? new Map() : parseManifest(text);
  const diff = diffHarnessBaseline(expected, actual);
  const report = formatHarnessBaselineDiff(diff);
  if (modes[0] === '--check') {
    if (!report) { log(`${MANIFEST_PATH} 는 계산값과 같다(${actual.size}개 키).`); return 0; }
    error(`${MANIFEST_PATH} 가 계산값과 다르다. 정당한 변경이면 --write 로 다시 쓰고 사유를 커밋에 남긴다.\n${report}`);
    return 1;
  }
  const rendered = renderHarnessBaselineManifest(actual, manifestHeader(text));
  if (text !== undefined && text.replaceAll('\r\n', '\n') === rendered) {
    log(`${MANIFEST_PATH} 는 이미 계산값과 같다 — 쓰지 않았다.`);
    return 0;
  }
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, rendered, 'utf8');
  log(`${MANIFEST_PATH} 를 다시 썼다(${actual.size}개 키). 바뀐 키가 모두 정당한지 diff 로 확인한다.${report ? `\n${report}` : ''}`);
  return 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (failure) {
    console.error(failure.message);
    process.exitCode = 1;
  }
}

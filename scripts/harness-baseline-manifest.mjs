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
 * 경로와 쓰기 형식(머리 주석·Java TreeMap 과 같은 코드 단위 순서·LF)은 형식 모듈(harness-baseline-manifest-format.mjs)이 정한다.
 * 이 도구는 기존 파일의 머리 주석을 그대로 두고(없으면 JVM 산출 파일의 2줄) 그 모듈의 렌더 함수로 쓴다. 재사용 투영 생성기도 같은
 * 렌더 함수를 써서 생성물에서 처음 `--write` 해도 줄 순서가 바뀌지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DEFAULT_HEADER, MANIFEST_PATH, hasConflictMarkers, manifestHeader, parseManifest, renderHarnessBaselineManifest,
} from './harness-baseline-manifest-format.mjs';
import { REGISTERED_ABSENT_PREFIX, UNREGISTERED_CLASS_PREFIX, computeHarnessBaselineEntries } from './reusable-source-harness.mjs';

export { DEFAULT_HEADER, MANIFEST_PATH, hasConflictMarkers, manifestHeader, parseManifest, renderHarnessBaselineManifest };
export { REGISTERED_ABSENT_PREFIX, UNREGISTERED_CLASS_PREFIX };

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 키 단위 차이. 게이트 클래스 키(registry 밖의 미등록 클래스·registry 에 있는데 census 에 없는 등록 클래스)는 한 줄에 클래스 하나라
 * 다른 키와 같은 방식으로 나누고, 보일 때만 클래스 이름으로 바꿔 말한다(메타 게이트의 누락·소멸 감지와 같은 뜻).
 */
export function diffHarnessBaseline(expected, actual) {
  const isClassKey = key => key.startsWith(UNREGISTERED_CLASS_PREFIX) || key.startsWith(REGISTERED_ABSENT_PREFIX);
  const keys = map => [...map.keys()].filter(key => !isClassKey(key));
  const classKeys = map => [...map.keys()].filter(isClassKey);
  const name = key => key.slice((key.startsWith(UNREGISTERED_CLASS_PREFIX) ? UNREGISTERED_CLASS_PREFIX : REGISTERED_ABSENT_PREFIX).length);
  return {
    changed: [...keys(expected), ...classKeys(expected)].filter(key => actual.has(key) && actual.get(key) !== expected.get(key)).sort()
      .map(key => ({ key, from: expected.get(key), to: actual.get(key) })),
    added: keys(actual).filter(key => !expected.has(key)).sort().map(key => ({ key, to: actual.get(key) })),
    removed: keys(expected).filter(key => !actual.has(key)).sort().map(key => ({ key, from: expected.get(key) })),
    classesAdded: classKeys(actual).filter(key => !expected.has(key) && key.startsWith(UNREGISTERED_CLASS_PREFIX)).map(name).sort(),
    classesRemoved: classKeys(expected).filter(key => !actual.has(key) && key.startsWith(UNREGISTERED_CLASS_PREFIX)).map(name).sort(),
    registeredAbsent: classKeys(actual).filter(key => !expected.has(key) && key.startsWith(REGISTERED_ABSENT_PREFIX)).map(name).sort(),
    registeredPresent: classKeys(expected).filter(key => !actual.has(key) && key.startsWith(REGISTERED_ABSENT_PREFIX)).map(name).sort(),
  };
}

export function formatHarnessBaselineDiff(diff) {
  const lines = [];
  for (const { key, from, to } of diff.changed) lines.push(`  변경 ${key}: ${from} → ${to}`);
  for (const { key, to } of diff.added) lines.push(`  신설 ${key}=${to}`);
  for (const { key, from } of diff.removed) lines.push(`  소멸 ${key} (매니페스트 값 ${from})`);
  for (const name of diff.classesAdded) lines.push(`  클래스 신설 ${name} (gates.json registry 밖)`);
  for (const name of diff.classesRemoved) lines.push(`  클래스 소멸 ${name} (registry 로 옮겼거나 지웠다)`);
  for (const name of diff.registeredAbsent) lines.push(`  등록 게이트 소멸 ${name} (gates.json 에 있으나 census 에 없다)`);
  for (const name of diff.registeredPresent) lines.push(`  등록 게이트 복귀 ${name} (매니페스트가 부재로 적었다)`);
  return lines.join('\n');
}

const USAGE = '사용법: node scripts/harness-baseline-manifest.mjs --check | --write | --keys <키…>';

/** 파일이 없으면 undefined. 존재를 먼저 확인하고 읽지 않는다 — 확인과 사용 사이의 경합(TOCTOU)을 만들지 않는다. */
function readOptional(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (failure) {
    if (failure.code === 'ENOENT') return undefined;
    throw failure;
  }
}

/** CLI 본체. 반환값이 종료 코드다. 시험은 `compute`·`log`·`error` 를 바꿔 넘긴다. */
export function main(argv, { root = repoRoot, compute = computeHarnessBaselineEntries, log = console.log, error = console.error } = {}) {
  const modes = ['--check', '--write', '--keys'].filter(mode => argv.includes(mode));
  if (modes.length !== 1) { error(USAGE); return 2; }
  const manifestFile = path.join(root, ...MANIFEST_PATH.split('/'));
  const text = readOptional(manifestFile);
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

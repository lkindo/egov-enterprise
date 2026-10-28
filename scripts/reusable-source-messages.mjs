/**
 * 오류 메시지 번들을 투영과 맞춘다(Phase 2 D6) — 메시지 번들 계약(MessageBundleContractTest)이 생성물에서도 원본과 같은
 * 강도로 돌게 한다. 두 가지를 한다.
 *
 * 1. **지운 ErrorCode 가 소유한 키를 걷는다.** 응답은 `ErrorCode.getCode()` 로 번들을 찾으므로 enum 이 사라지면 그 키를 읽는
 *    경로도 사라진다. 번들은 foundation 하나라 기능이 빠져도 남아, 계약의 고아 키 검사가 생성물에서 처음부터 붉었다
 *    (core 실측: B001~B006). 남는 enum 이 같은 코드를 정의하면 걷지 않는다.
 * 2. **계약의 스캔 붕괴 하한을 생성기가 지운 몫만큼 내린다.** 하한은 원본 실측에 맞춰져 있어(ErrorCode 39 · Bean Validation
 *    참조 10) core 생성물(36 · 7)에서 처음부터 붉었다. 원본 하한을 낮추면 원본의 신호가 약해지므로 원본은 그대로 두고,
 *    생성물에서만 지운 코드 수·지운 참조 수를 빼 원본과 같은 여유 폭을 남긴다. 무엇을 바꿨는지는 lock 에 남는다.
 *
 * 3. **지운 소스만 참조하던 Bean Validation 키를 걷는다(2026-10-29).** `message = "{키}"` 는 소유 enum 이 없어 종전에는 걷지 않았다.
 *    그런데 키를 참조하던 소스가 모두 한 기능에 있으면(ADR-0043 뒤 `validation.pattern` 은 게시판 DTO 만 쓴다) 그 기능이 빠진
 *    생성물에서 계약의 고아 키 검사가 붉었다(T2 2026-10-27~). 지운 스캔 대상 소스가 참조했고, 남는 스캔 대상 소스(투영 뒤 원문,
 *    주석 제거)·남는 ErrorCode 코드·GlobalExceptionHandler 의 `resolve("…")` 키 어느 것도 참조하지 않는 키만 걷는다 — 계약이 세는
 *    세 해석 경로와 같은 판정이다. 원본에서 이미 고아인 키와 생성물에서 새로 생긴 고아 키는 계속 붉다.
 *
 * 코드·참조를 찾는 정규식과 스캔 범위(네 모듈의 `src/main/java`)는 계약과 같다 — 시험이 Java 원문과 정확히 비교한다.
 * 그래도 갈라지면 덜 걷은 쪽은 고아 키 검사가, 더 걷은 쪽은 "번들에 없는 ErrorCode"·"번들에 없음" 검사가, 하한을 너무 내리거나
 * 덜 내린 쪽은 하한 자체가 생성물에서 붉어진다. handler 키는 GlobalExceptionHandler 하나가 읽고 그 파일은 늘 남아 걷지 않는다.
 */
import { writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readTextIfPresent } from './reusable-source-tree.mjs';

export const MESSAGE_BUNDLES = Object.freeze([
  'foundation/src/main/resources/egovframework/message/messages_ko.properties',
  'foundation/src/main/resources/egovframework/message/messages_en.properties',
]);
export const MESSAGE_CONTRACT = 'foundation/src/test/java/nuri/foundation/core/config/MessageBundleContractTest.java';
/** 계약의 `MODULES` 와 같다. 이 모듈들의 `src/main/java` 만 센다. */
export const MESSAGE_SCAN_MODULES = Object.freeze(['foundation', 'business-core', 'business-app', 'api-server']);
/** 계약의 `Pattern.compile(...)` 원문과 같아야 한다 — 시험이 Java 문자열을 풀어 정확히 비교한다. */
export const ERROR_CODE_PATTERN = String.raw`"([A-Z]{1,3}\d{2,3})"\s*,\s*"`;
export const BEAN_VALIDATION_PATTERN = String.raw`message\s*=\s*"\{([^}"]+)\}"`;
export const HANDLER_KEY_PATTERN = String.raw`resolve\(\s*"([a-z][a-z0-9_.]*)"`;
/** 계약의 `handlerKeys()` 가 읽는 파일 — handler 키의 해석 경로는 이 파일 하나다. */
export const MESSAGE_HANDLER_SOURCE = 'foundation/src/main/java/nuri/foundation/core/exception/GlobalExceptionHandler.java';
const ERROR_CODE = new RegExp(ERROR_CODE_PATTERN, 'g');
const BEAN_VALIDATION = new RegExp(BEAN_VALIDATION_PATTERN, 'g');
const HANDLER_KEY = new RegExp(HANDLER_KEY_PATTERN, 'g');

/** 저장소 기준 경로(`/` 구분)가 계약이 스캔하는 생산 소스인지. */
export const isScannedSource = rel => MESSAGE_SCAN_MODULES.some(module => rel.startsWith(`${module}/src/main/java/`));
export const isErrorCodeSource = rel => isScannedSource(rel) && rel.endsWith('ErrorCode.java');

export function errorCodesIn(source) {
  return [...source.matchAll(ERROR_CODE)].map(match => match[1]);
}
/** 주석을 걷은 소스를 받는다(계약도 주석을 걷고 센다). */
export function beanValidationRefsIn(strippedSource) {
  return [...strippedSource.matchAll(BEAN_VALIDATION)].length;
}
/** 주석을 걷은 소스가 참조하는 Bean Validation 키(계약의 `beanValidationKeys()` 와 같은 판정). */
export function beanValidationKeysIn(strippedSource) {
  return [...strippedSource.matchAll(BEAN_VALIDATION)].map(match => match[1]);
}
/** GlobalExceptionHandler 원문이 `resolve("…")` 로 읽는 키(계약의 `handlerKeys()` 와 같다 — 주석을 걷지 않는다). */
export function handlerKeysIn(source) {
  return [...source.matchAll(HANDLER_KEY)].map(match => match[1]);
}

/**
 * 지운 스캔 대상 소스만 참조하던 Bean Validation 키를 고른다. 남는 스캔 대상 소스가 참조하거나, 남는 ErrorCode 코드나 handler 키와
 * 같은 키는 다른 해석 경로가 읽으므로 남긴다. `removedStripped`·`survivingStripped` 는 주석을 걷은 원문 목록이다.
 */
export function orphanedValidationKeys(removedStripped, survivingStripped, { errorCodes = [], handlerKeys = [] } = {}) {
  const kept = new Set([...survivingStripped.flatMap(beanValidationKeysIn), ...errorCodes, ...handlerKeys]);
  return [...new Set(removedStripped.flatMap(beanValidationKeysIn))].filter(key => !kept.has(key)).sort();
}

/**
 * 걷을 Bean Validation 키. handler 키는 후보를 줄이기만 하므로 후보가 없으면 handler 를 읽지 않는다 — 번들·handler 가 없는 합성
 * 저장소(생성기 시험)도 그대로 투영된다. 후보가 있는데 handler 원문이 없으면 계약이 읽는 경로가 바뀐 것이라 조용히 넘기지 않는다.
 * `readHandler` 는 handler 원문을 돌려주고, 없으면 undefined 다.
 */
export function validationKeysToPrune(removedStripped, survivingStripped, { errorCodes = [], readHandler }) {
  if (!orphanedValidationKeys(removedStripped, survivingStripped, { errorCodes }).length) return [];
  const handlerSource = readHandler();
  if (handlerSource === undefined) throw new Error(`메시지 해석 경로(handler) 소스가 없다: ${MESSAGE_HANDLER_SOURCE}`);
  return orphanedValidationKeys(removedStripped, survivingStripped, { errorCodes, handlerKeys: handlerKeysIn(handlerSource) });
}

/**
 * 지울 ErrorCode 소스의 코드에서 남는 ErrorCode 소스의 코드를 뺀 키와, 그 enum 이름의 머리 주석을 고른다.
 * `removedSources`·`survivingSources` 는 `{ path, source }` 목록이다.
 */
export function ownedMessageKeys(removedSources, survivingSources) {
  const surviving = new Set(survivingSources.flatMap(({ source }) => errorCodesIn(source)));
  const keys = new Set();
  const owners = new Set();
  for (const { path, source } of removedSources) {
    const codes = errorCodesIn(source).filter(code => !surviving.has(code));
    if (!codes.length) continue;
    codes.forEach(code => keys.add(code));
    owners.add(basename(path, '.java'));
  }
  return { keys: [...keys].sort(), owners: [...owners].sort() };
}

/**
 * 키 줄과 `# <enum 이름> (` 로 시작하는 머리 주석 줄만 지운다. 줄 끝 형식은 그대로 둔다.
 * 키는 Java Properties 처럼 앞 공백을 무시하고, 파일 첫머리의 BOM 도 키의 일부로 보지 않는다.
 */
export function pruneBundleText(text, { keys, owners }) {
  const keySet = new Set(keys);
  const lines = text.split(/(?<=\n)/);
  const kept = lines.filter((line, index) => {
    const content = (index === 0 ? line.replace(/^\uFEFF/, '') : line).replace(/\r?\n$/, '').trimStart();
    const key = /^([^#!=:\s][^=:\s]*)\s*[=:]/.exec(content)?.[1];
    if (key && keySet.has(key)) return false;
    return !owners.some(owner => content.startsWith(`# ${owner} (`));
  });
  const pruned = kept.join('');
  // 첫 줄을 지웠으면 BOM 을 다음 첫 줄 앞에 되살린다.
  return text.startsWith('\uFEFF') && !pruned.startsWith('\uFEFF') ? `\uFEFF${pruned}` : pruned;
}

/** 생성물의 번들 두 개에서 소유 키를 걷고, 걷은 키를 돌려준다. 번들이 없으면 실패한다(경로가 바뀐 것이다). */
export function pruneOwnedMessageKeys(output, owned) {
  if (!owned.keys.length) return [];
  for (const bundle of MESSAGE_BUNDLES) {
    const path = join(output, bundle);
    // 확인하고 읽지 않는다(js/file-system-race) — 읽기를 시도하고 부재만 실패로 바꾼다.
    const text = readTextIfPresent(path);
    if (text === undefined) throw new Error(`메시지 번들이 없다: ${bundle}`);
    const pruned = pruneBundleText(text, owned);
    if (pruned !== text) writeFileSync(path, pruned, 'utf8');
  }
  return owned.keys;
}

const FLOORS = Object.freeze({ errorCodes: 'MIN_ERROR_CODES', beanValidationRefs: 'MIN_BEAN_VALIDATION_REFS' });

/**
 * 계약의 하한 상수를 지운 몫만큼 내린 원문을 돌려준다. 상수가 정확히 한 번 있어야 하고, 내린 값이 1 보다 작으면 실패한다
 * (원본 실측이 하한보다 크므로 그 아래로 내려가면 셈이 틀린 것이다).
 */
export function lowerContractFloors(source, removed) {
  const changes = {};
  let next = source;
  for (const [measure, constant] of Object.entries(FLOORS)) {
    const count = removed[measure] ?? 0;
    if (!count) continue;
    const pattern = new RegExp(`(private static final int ${constant} = )(\\d+);`, 'g');
    const matches = [...next.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`메시지 번들 계약의 하한 상수를 찾지 못했다: ${constant}`);
    const from = Number(matches[0][2]);
    const to = from - count;
    if (to < 1) throw new Error(`메시지 번들 계약의 하한이 1 아래로 내려간다: ${constant} ${from} - ${count}`);
    next = next.replace(pattern, (_, prefix) => `${prefix}${to};`);
    changes[constant] = [from, to];
  }
  return { source: next, changes };
}

/** 생성물의 계약 파일에서 하한을 내리고 바꾼 값을 돌려준다. 바꿀 것이 있는데 계약이 없으면 실패한다. */
export function lowerMessageContractFloors(output, removed) {
  if (!Object.keys(FLOORS).some(measure => removed[measure])) return {};
  const path = join(output, MESSAGE_CONTRACT);
  const source = readTextIfPresent(path);
  if (source === undefined) throw new Error(`메시지 번들 계약이 없다: ${MESSAGE_CONTRACT}`);
  const lowered = lowerContractFloors(source, removed);
  if (lowered.source !== source) writeFileSync(path, lowered.source, 'utf8');
  return lowered.changes;
}

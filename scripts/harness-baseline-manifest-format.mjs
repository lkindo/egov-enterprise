/**
 * 하네스 기준선 매니페스트의 경로와 줄 형식. 매니페스트를 읽고 쓰는 node 코드(계산 도구·재사용 투영 생성기·main 병합 도구)가
 * 같은 정의를 쓴다 — 경로나 줄 해석을 한쪽만 고쳐 병합 도구가 충돌 키를 잘못 뽑거나, 생성기와 도구가 다른 순서로 쓰지 않게 한다.
 *
 * node 내장 밖의 import 를 두지 않는다. main 병합 도구는 병합 중인 작업 트리에서 이 모듈만 읽는다 — 재사용 투영 모듈을 정적으로
 * 끌어오면 그 그래프의 어느 파일에 충돌 표기가 남았을 때 모듈 적재 단계에서 죽어 충돌 목록과 안내를 보이지 못한다.
 *
 * 쓰기 형식은 JVM 메타 게이트가 쓰는 산출 파일과 같다. 머리 주석은 호출자가 넘기고(기본은 JVM 산출 파일의 2줄), 키는 Java TreeMap 과
 * 같은 UTF-16 코드 단위 순서다(localeCompare 는 `_`·대소문자 순서가 달라 줄이 뒤섞인다). 줄 끝은 LF 이고 마지막 줄 뒤에도 LF 를 둔다.
 */

export const MANIFEST_PATH = 'api-server/src/test/resources/harness/baseline-manifest.properties';
export const DEFAULT_HEADER = Object.freeze([
  '# 자동 산출 — HarnessBaselineIntegrityTest 실행 결과(실제 소스 기준).',
  '# 정당한 변경일 때만 baseline-manifest.properties 로 복사하고 사유를 기록할 것.',
]);

const CONFLICT_MARKER = /^(?:<{7}|\|{7}|={7}|>{7})(?: |$)/m;

/** 메타 게이트가 읽는 것과 같은 `키=값` 맵. 주석·빈 줄·`=` 없는 줄은 건너뛰고, 같은 키는 뒤 줄이 앞 줄을 덮는다. */
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

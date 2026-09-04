import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/*
  [2026-09-04] PD-UX-002 Q1 결정의 회귀 방지 계약.

  owner 판단으로 "현재 URL 에 실리는 검색어를 전부 유지한다" 가 결정됐고, 그 결과 저장소에는
  **의도된 비대칭**이 남는다:

    · 로그 5화면은 검색어를 주소창(URL 쿼리)에 싣지 않는다 — 로그 검색은 사번·이름 조회가
      일상이라 그 화면만 노출을 피한다는 판단이다.
    · 같은 화면의 '전체 결과 내보내기' 는 같은 검색어를 다운로드 URL 에 싣는다 — 경계가
      주소창으로 정의됐고, 이 값은 화면 상태가 아니라 다운로드 내비게이션이기 때문이다.

  이 비대칭은 **"일관성 없음" 으로 읽히기 쉽다.** 실제로 이번 감사에서 그렇게 읽혔다.
  누군가 한쪽에 맞추면 두 방향 다 승인된 결정을 되돌린다:

    · 로그 화면 검색어를 URL 에 넣으면 → 그 화면이 피하기로 한 노출이 생긴다.
    · export 의 searchKeyword 를 빼면 → POST + Blob 전환과 binary GET 계약(DEC-OPS-016)
      영향 확인 없이 기능이 축소된다.

  그래서 두 방향을 모두 red 로 잡는다. 결정을 바꾸려면 이 계약을 **사유와 함께** 고쳐야 하고,
  그 편집이 diff 에 의도를 남긴다.
*/

const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');

const LOG_URL_STATE = 'frontend/src/app/admin/system/logs/use-log-url-state.ts';
const EXPORT_HELPER = 'frontend/src/app/components/patterns/full-result-export.ts';

/** 로그 목록 상태 훅이 URL 과 동기화하는 파라미터 이름. 검색어 계열은 여기 없어야 한다. */
const SEARCH_PARAM_NAMES = ['searchKeyword', 'searchWrd', 'keyword', 'q'];

test('로그 목록 상태 훅은 검색어를 URL 파라미터로 동기화하지 않는다', () => {
  const source = read(LOG_URL_STATE);

  // 훅이 실제로 URL 을 만지는 파일이라는 것부터 확인한다(vacuity 가드) —
  // 파일이 통째로 바뀌어 아무 것도 안 하게 되면 아래 부재 단언이 공허하게 통과한다.
  assert.match(source, /useSearchParams/u, `${LOG_URL_STATE} 이 더 이상 URL 을 읽지 않습니다 — 계약 전제가 깨졌습니다.`);
  assert.match(source, /router\.replace/u, `${LOG_URL_STATE} 이 더 이상 URL 을 쓰지 않습니다 — 계약 전제가 깨졌습니다.`);

  const offenders = SEARCH_PARAM_NAMES.filter((name) => {
    // 주석은 이 결정을 설명하느라 이름을 언급한다 — 실제 파라미터 사용만 본다.
    const asParam = new RegExp(`['"\`]${name}['"\`]`, 'u');
    return source
      .split(/\r?\n/u)
      .filter((line) => !/^\s*(\*|\/\/)/u.test(line))
      .some((line) => asParam.test(line));
  });

  assert.deepEqual(
    offenders,
    [],
    '로그 화면이 검색어를 URL 에 싣기 시작했습니다. 2026-09-04 owner 결정은 이 화면의 현행(주소창 미노출) 유지입니다.',
  );
});

test('전체 결과 내보내기는 검색어를 다운로드 쿼리에 계속 싣는다', () => {
  const source = read(EXPORT_HELPER);

  assert.match(
    source,
    /query\.searchKeyword\s*=\s*searchKeyword/u,
    'export 의 searchKeyword 전달이 사라졌습니다. 2026-09-04 owner 결정은 유지이며, 제거하려면 POST + Blob 전환과 DEC-OPS-016 영향 확인이 선행입니다.',
  );

  // 결정 근거가 소스에 남아 있어야 다음 사람이 "왜 비대칭인가" 를 코드에서 읽는다.
  assert.match(
    source,
    /PD-UX-002/u,
    'export 경로에서 결정 근거 주석이 사라졌습니다 — 비대칭의 사유가 코드에서 사라지면 다음 감사가 같은 오독을 반복합니다.',
  );
});

test('비대칭의 사유가 로그 훅 주석에 남아 있다', () => {
  const source = read(LOG_URL_STATE);

  assert.match(source, /PD-UX-002/u, '로그 훅에서 결정 참조가 사라졌습니다.');
  assert.match(
    source,
    /경계\s*=\s*주소창|경계는 주소창/u,
    '경계 정의(주소창)가 주석에서 사라졌습니다 — 이 문장이 없으면 export 와의 비대칭이 다시 결함으로 읽힙니다.',
  );
});

test('결정을 되돌리는 편집은 재현 가능한 red 다', () => {
  // 합성 픽스처로 양방향을 증명한다 — 실제 소스를 훼손하지 않기 위해서다.
  const logHookWithSearch = [
    "const searchParams = useSearchParams();",
    "params.set('searchKeyword', keyword);",
    "router.replace(`${pathname}?${params}`);",
  ].join('\n');
  const offenders = SEARCH_PARAM_NAMES.filter((name) => new RegExp(`['"\`]${name}['"\`]`, 'u').test(logHookWithSearch));
  assert.deepEqual(offenders, ['searchKeyword'], '로그 훅에 검색어가 들어오면 잡혀야 합니다.');

  const exportWithoutKeyword = 'const query = {};\nnavigateToDownload(operation, query);';
  assert.equal(/query\.searchKeyword\s*=\s*searchKeyword/u.test(exportWithoutKeyword), false);
});

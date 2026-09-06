import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/*
  [2026-09-05] ADR-0009 및 DEC-OPS-029 Q1 결정의 회귀 방지 계약.

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
const LOG_EXPORT_OPERATION_IDS = [
  'exportLoginLogs',
  'exportPrivacyLogs',
  'exportSystemLogs',
  'exportUserLogs',
  'exportWebLogs',
];

test('로그 목록 상태 훅은 검색어를 URL 파라미터로 동기화하지 않는다', () => {
  const source = read(LOG_URL_STATE);

  // 훅이 실제로 URL 을 만지는 파일이라는 것부터 확인한다(vacuity 가드) —
  // 파일이 통째로 바뀌어 아무 것도 안 하게 되면 아래 부재 단언이 공허하게 통과한다.
  assert.match(source, /useSearchParams/u, `${LOG_URL_STATE} 이 더 이상 URL 을 읽지 않습니다 — 계약 전제가 깨졌습니다.`);
  assert.match(source, /router\.replace/u, `${LOG_URL_STATE} 이 더 이상 URL 을 쓰지 않습니다 — 계약 전제가 깨졌습니다.`);
  assert.doesNotMatch(
    source,
    /new URLSearchParams\(searchParams\.toString\(\)\)/u,
    `${LOG_URL_STATE} 이 들어온 query를 통째로 복사하면 수동 주입된 검색어도 다시 전파됩니다.`,
  );

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
    '로그 화면이 검색어를 URL 에 싣기 시작했습니다. ADR-0009는 허용을 의무화하지 않으며 이 화면은 주소창 미노출을 유지합니다.',
  );
});

test('전체 결과 내보내기는 검색어를 다운로드 쿼리에 계속 싣는다', () => {
  const source = read(EXPORT_HELPER);

  assert.match(
    source,
    /query\.searchKeyword\s*=\s*searchKeyword/u,
    'export 의 searchKeyword 전달이 사라졌습니다. ADR-0009 §Decision 3을 바꾸려면 POST + Blob 전환과 DEC-OPS-016 영향 확인이 선행입니다.',
  );

  // 결정 근거가 소스에 남아 있어야 다음 사람이 "왜 비대칭인가" 를 코드에서 읽는다.
  assert.match(
    source,
    /ADR-0009/u,
    'export 경로에서 결정 근거 주석이 사라졌습니다 — 비대칭의 사유가 코드에서 사라지면 다음 감사가 같은 오독을 반복합니다.',
  );
});

test('비대칭의 사유가 로그 훅 주석에 남아 있다', () => {
  const source = read(LOG_URL_STATE);

  assert.match(source, /ADR-0009/u, '로그 훅에서 현재 규범인 ADR-0009 참조가 사라졌습니다.');
  assert.match(
    source,
    /경계\s*=\s*주소창|경계는 주소창/u,
    '경계 정의(주소창)가 주석에서 사라졌습니다 — 이 문장이 없으면 export 와의 비대칭이 다시 결함으로 읽힙니다.',
  );
});

test('검색어를 받는 binary GET은 승인된 로그 export 5종에만 한정된다', () => {
  const source = read(EXPORT_HELPER);
  const union = source.match(/type LogExportOperationId\s*=([\s\S]*?);\s*type LogExportOperation/u);
  assert.ok(union, '로그 export operation의 닫힌 타입 집합이 사라졌습니다.');
  const ids = [...union[1].matchAll(/'([^']+)'/gu)].map((match) => match[1]).sort();
  assert.deepEqual(ids, LOG_EXPORT_OPERATION_IDS, 'searchKeyword download URL의 operation 범위가 조용히 변했습니다.');
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

/*
  [2026-09-05] ADR-0009 및 DEC-OPS-029 Q2 — 게시판 목록의 copy-all 캐리어 제거를 고정한다.

  Q1 이 "URL 에 실리는 검색어를 전부 유지" 로 결정되면서, 이 화면의
  `searchCnd=2`(작성자) + `searchWrd` 조합은 URL 에 사람 이름을 싣는 것이 승인된 상태가 됐다.
  그 상태에서 `new URLSearchParams(searchParams.toString())` 관용구는 **모르는 파라미터까지
  조회할 때마다 재발행하는 증폭기**다. allowlist 재조립으로 바꿨고, 되돌아가면 red 다.

  `bbsId` 를 함께 고정하는 이유: 그 값은 화면이 만든 것이 아니라 DB 메뉴(`modern_route`)가
  지목하는 라우팅 키다. allowlist 에서 빠지면 목록이 기본 게시판으로 튀고 사이드바 활성 판정이
  흔들리는데, 조회는 여전히 성공하므로 **조용히 틀린다**.
*/
const BOARD_LIST_CLIENT = 'frontend/src/app/admin/community/boards/select-board-list/BoardListClient.tsx';

/**
 * 주석을 지우고 실행 코드만 남긴다.
 *
 * 줄 접두사 필터로는 부족하다 — 이 저장소의 블록 주석은 본문 줄이 `*` 로 시작하지 않는 형태가
 * 흔하고(`/* ... 여러 줄 ... *\/`), 그 본문이 종전 관용구를 **그대로 인용**한다.
 * 그래서 블록·라인 주석을 실제로 제거한다. 문자열 안의 `//` 는 이 파일이 검사하는 패턴에
 * 등장하지 않으므로 단순 제거로 충분하다.
 */
function executableLines(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .split(/\r?\n/u)
    .map((line) => line.replace(/\/\/.*$/u, ''))
    .join('\n');
}

test('게시판 목록 조회는 들어온 쿼리를 통째로 복사하지 않는다', () => {
  const source = read(BOARD_LIST_CLIENT);
  const code = executableLines(source);

  // vacuity 가드 — 이 화면이 여전히 URL 을 쓰는지부터 확인한다.
  assert.match(code, /const handleSearch/u, `${BOARD_LIST_CLIENT} 의 조회 핸들러가 사라졌습니다 — 계약 전제가 깨졌습니다.`);
  assert.match(code, /const buildListParams/u, 'allowlist 헬퍼가 사라졌습니다 — 네 곳이 각자 조립하던 상태로 돌아갔을 수 있습니다.');

  assert.equal(
    /new URLSearchParams\(\s*searchParams(\.toString\(\))?\s*\)/u.test(code),
    false,
    'copy-all 관용구가 돌아왔습니다. 들어온 쿼리를 이름을 묻지 않고 재발행하면 URL 에 실린 사람 이름이 이동마다 보존됩니다(ADR-0009).',
  );
  assert.match(code, /new URLSearchParams\(\)/u, 'allowlist 재조립(빈 URLSearchParams)이 사라졌습니다.');
});

test('게시판 목록 allowlist 는 이 라우트가 읽는 키 전수를 담는다', () => {
  const code = executableLines(read(BOARD_LIST_CLIENT));
  const declared = code.match(/const LIST_PARAM_KEYS = \[([^\]]*)\]/u);
  assert.ok(declared, 'LIST_PARAM_KEYS 선언이 사라졌습니다 — allowlist 의 단일 원본입니다.');

  const keys = declared[1].split(',').map((entry) => entry.trim().replace(/^'|'$/gu, '')).filter(Boolean);

  // 클라이언트(`searchParams.get`)와 서버 컴포넌트가 읽는 키가 전부 들어 있어야 한다.
  // 빠진 키는 조회·페이지 이동 때 조용히 사라진다 — 화면은 성공하고 조건만 없어진다.
  for (const required of ['bbsId', 'searchWrd', 'searchCnd', 'orderBy', 'startDate', 'endDate', 'page']) {
    assert.ok(
      keys.includes(required),
      `allowlist 에서 '${required}' 가 빠졌습니다. 이 라우트가 읽는 키라, 빠지면 조회·이동 시 조용히 사라집니다.`
      + (required === 'bbsId'
        ? ' 특히 bbsId 는 DB 메뉴(modern_route)가 지목하는 라우팅 키라 목록이 기본 게시판으로 튀고 사이드바 활성 판정도 흔들립니다.'
        : ''),
    );
  }

  // 조회는 화면 상태의 bbsId 를 명시적으로 실어야 한다(URL 에 없을 때 initialParams 로 떨어지는 경로).
  assert.match(code, /buildListParams\(\{[\s\S]{0,400}?bbsId/u, '조회가 bbsId 를 명시적으로 싣지 않습니다.');
});

test('게시판 목록의 조건 변경은 히스토리를 쌓지 않는다', () => {
  const code = executableLines(read(BOARD_LIST_CLIENT));

  // 이 client의 모든 URL 변경은 같은 게시판 목록의 조회·두 초기화·페이지·월 이동이다.
  // `?bbsId=${bbsId}` 리터럴도 empty-result 필터 초기화이므로 새 화면 이동이 아니다.
  assert.equal(
    /router\.push\(/u.test(code),
    false,
    '조건 변경이 router.push 로 되돌아갔습니다. 조작마다 히스토리 항목이 쌓이고 Q1 결정으로 그 항목마다 사람 이름이 남습니다.',
  );
  assert.match(
    code,
    /aria-label="필터 초기화"[\s\S]{0,500}?router\.replace\(`\$\{pathname\}\?bbsId=\$\{bbsId\}`\)|router\.replace\(`\$\{pathname\}\?bbsId=\$\{bbsId\}`\)[\s\S]{0,500}?aria-label="필터 초기화"/u,
    'empty-result 필터 초기화가 same-view replace를 사용해야 합니다.',
  );

  const replaces = code.match(/router\.replace\(/gu) ?? [];
  assert.equal(
    replaces.length,
    6,
    `조건 변경 경로가 replace 를 쓰지 않습니다(현재 ${replaces.length}곳). 조회·두 초기화·페이지·이전달·다음달이 대상입니다.`,
  );
});

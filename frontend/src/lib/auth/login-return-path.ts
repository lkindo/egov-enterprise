/**
 * 다시 로그인한 뒤 돌아갈 자리(2026-10-01 결정 17).
 *
 * 종전에는 경로만 넘겨, 게시글을 읽다 세션이 끊기면 게시판 목록 첫 화면으로 돌아왔다 — 어느 게시판·어느 글·
 * 몇 쪽이었는지가 사라졌다. 그렇다고 쿼리를 통째로 넘기면 검색어(사람 이름 등 자유 입력)가 인증 경계를 넘어
 * `/login` URL 에 실린다(admin/error.tsx 의 2026-08 정정 사유). 그래서 **자리를 가리키는 구조 키만**, 값의
 * 형식까지 맞을 때만 넘긴다. 자유 입력은 어떤 키로도 넘어가지 않는다.
 */
const RESTORABLE_KEYS: Readonly<Record<string, RegExp>> = {
  bbsId: /^[A-Za-z0-9_-]{1,20}$/,
  pstSn: /^[0-9]{1,19}$/,
  tab: /^[A-Za-z0-9_-]{1,40}$/,
  page: /^[1-9][0-9]{0,4}$/,
};

/** 쿼리에서 복원할 구조 키만 남긴다. 형식이 틀리거나 같은 키가 여러 번 오면 그 키는 버린다. */
export function restorableQuery(search: string | URLSearchParams | null | undefined): string {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search ?? '');
  const kept = new URLSearchParams();
  for (const [key, pattern] of Object.entries(RESTORABLE_KEYS)) {
    const values = params.getAll(key);
    if (values.length === 1 && pattern.test(values[0])) kept.set(key, values[0]);
  }
  const query = kept.toString();
  return query ? `?${query}` : '';
}

/** 지금 자리를 `redirect` 값으로 만든다 — 경로와 구조 키만. */
export function loginReturnPath(pathname: string, search: string | null | undefined): string {
  return `${pathname}${restorableQuery(search)}`;
}

/**
 * 오류를 로그에 남길 때 **요청 파라미터가 함께 새지 않도록** 요약한다.
 *
 * ⚠ 왜 필요한가 — `console.error('...', error)` 로 axios 오류를 통째로 넘기면 그 객체의
 *   `config.params` 가 그대로 출력된다. 이 저장소에는 그 params 에 **사용자가 타이핑한
 *   검색어**가 실리는 경로가 있다.
 *
 *   · 게시판 목록 — `searchCnd=2`(작성자) + `searchWrd` 조합이면 **사람 이름**이다
 *   · 사용자 선택기 — `searchAssignableUsers(keyword)` 는 임직원 성명 부분일치 조회다
 *   · 주소록 목록 — 클라이언트 로컬 검색어
 *
 *   운영에서 Next 서버 프로세스 로그는 컨테이너 stdout 이라, 그 검색어가 로그 수집기까지
 *   따라간다. ADR-0009가 검색어의 제한된 URL 사용을 허용해도 로그·분석 복제는 계속 금지한다.
 *   이 함수는 **저장소 안의 같은 유출 경로를 차단한다**(2026-09-05 실측).
 *
 * ⚠ 이 함수는 값을 **가리는 것이 아니라 애초에 담지 않는다.** 마스킹은 형식이 바뀌면
 *   뚫리지만, 담지 않은 것은 뚫릴 수 없다.
 */
export interface SafeErrorSummary {
  message: string;
  /** HTTP 상태. axios 오류가 아니거나 응답이 없으면 생략된다. */
  status?: number;
  /** 서버가 준 오류 코드. 진단에 필요한 최소치만 옮긴다. */
  code?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 진단에 필요한 최소 정보만 뽑는다 — 메시지·상태·오류 코드.
 * `config`(params·headers·url 포함)와 `request`·`response.data` 원문은 **의도적으로 제외**한다.
 */
export function summarizeError(error: unknown): SafeErrorSummary {
  /*
    ⚠ `error instanceof Error` 만 보면 안 된다. axios 오류는 서버 컴포넌트·클라이언트 사이를
      오가며 **평범한 객체로 직렬화된 상태**로 잡히는 경우가 있고, 그때 String(error) 는
      `[object Object]` 가 되어 진단 정보가 통째로 사라진다(계약이 이것을 잡았다).
      Error 여부와 무관하게 `message` 속성을 먼저 본다.
  */
  const rawMessage = isRecord(error) && typeof error.message === 'string'
    ? error.message
    : error instanceof Error ? error.message : String(error);

  const summary: SafeErrorSummary = { message: rawMessage };

  if (!isRecord(error)) return summary;

  const response = isRecord(error.response) ? error.response : null;
  if (typeof response?.status === 'number') summary.status = response.status;

  const data = response && isRecord(response.data) ? response.data : null;
  const code = data?.code ?? (error as { code?: unknown }).code;
  if (typeof code === 'string') summary.code = code;

  return summary;
}

/**
 * `console.error(message, error)` 의 안전한 대체.
 *
 * ⚠ 두 번째 인자로 원본 오류를 넘기지 마라 — 그것이 이 함수가 막으려는 것이다.
 */
export function logErrorSafely(message: string, error: unknown): void {
  console.error(message, summarizeError(error));
}

/**
 * 사용자에게 보여 줄 수 있는 오류 문장만 돌려준다. 보여 줄 문장이 없으면 undefined 다 —
 * 호출부가 과업에 맞는 기본 안내를 쓴다. 오류 패널·Server Action·토스트가 이 규칙 하나를 쓴다.
 *
 * ⚠ axios 오류의 `message` 는 서버 문구가 아니라 transport 원문(`Network Error`·
 *   `timeout of 15000ms exceeded`·`Request failed with status code 500`)이다. 사용자가 무엇을 해야
 *   하는지 말하지 않고 콘텐츠 가이드 §5 가 노출을 금지하므로 버린다. 서버가 준 문구
 *   (`response.data.message`)만 쓴다. 직렬화돼 평범한 객체가 된 axios 오류도 `isAxiosError` 로 가린다.
 */
export function userFacingErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'string') return userSentence(error);
  if (!isRecord(error)) return undefined;

  const response = isRecord(error.response) ? error.response : null;
  const data = response && isRecord(response.data) ? response.data : null;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim();

  if (error.isAxiosError === true) return undefined;
  return typeof error.message === 'string' ? userSentence(error.message) : undefined;
}

// [2026-09-15 DEC-OPS-100] axios 가 만드는 전송 오류 문구다. 호출부가 error.message 를 문자열로 넘겨도
//   사용자 문장으로 쓰지 않는다(server-error mustNotImply).
const TRANSPORT_MESSAGE = /^(?:Request failed with status code \d{3}|Network Error|timeout of \d+ms exceeded|canceled|Unknown Network\/System Error)$/;

function userSentence(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed && !TRANSPORT_MESSAGE.test(trimmed) ? trimmed : undefined;
}

/**
 * 취소된 요청인가 — 호출부가 스스로 끊었거나(AbortController: axios `ERR_CANCELED`) 인증 상태가
 * 바뀌어 이전 결과를 버린 경우(`CanceledError`, authorization-state)다.
 *
 * <p>취소는 실패가 아니다. 이것을 `console.error` 로 남기면 e2e 오류 감지기가 진짜 오류와
 * 구분하지 못한다 — 2026-09-16 main e2e 실측에서 배너·팝업 취소 2건이 flaky 를 만들어
 * Playwright result 계약이 red 였다(재시도 통과는 green 이 아니다).
 */
export function isCanceledRequest(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return error.code === 'ERR_CANCELED' || error.name === 'CanceledError';
}

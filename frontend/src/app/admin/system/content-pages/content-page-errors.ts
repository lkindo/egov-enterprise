import { summarizeError } from '@/lib/safe-error-log';

/**
 * 콘텐츠 페이지 쓰기의 409 를 오류 코드로 가른다(ADR-0042). 같은 409 라도 C008 은 이미 쓰는 주소(DUPLICATE_RESOURCE)라 주소 칸을
 * 고치면 되고, C013 은 다른 사람이 먼저 바꾼 것(CONCURRENT_MODIFICATION)이라 최신 내용을 고르게 해야 한다. 상태만 보고 한쪽으로
 * 몰면 맞는 주소를 고치게 하거나, 주소 중복을 동시 수정으로 알린다. 코드가 없거나 다른 409 는 어느 쪽도 아니다(null).
 * 결재 화면의 같은 판정(ApprovalSavedLinesPanel 의 responseError)과 같은 방식이다 — 기능 경계를 넘지 않게 따로 둔다.
 */
export type CmsConflict = 'duplicate-path' | 'concurrent';

export function cmsConflict(error: unknown): CmsConflict | null {
  const { status, code } = summarizeError(error);
  if (status !== 409) return null;
  if (code === 'C008') return 'duplicate-path';
  if (code === 'C013') return 'concurrent';
  return null;
}

/** 이미 쓰는 주소(409 C008)의 주소 칸 오류. 새 페이지 대화상자와 같은 문구다. */
export const DUPLICATE_PATH_MESSAGE = '이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.';

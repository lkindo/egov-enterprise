import type { Popup } from '@/types/foundation/banner';

/**
 * 팝업의 실제 게시 상태.
 *
 * [2026-09-26 DIP V9] 관리 목록은 게시 여부(ntceYn)만 보고 '게시 중' 이라 말했다. 그런데 사용자 화면의
 * 활성 팝업 조회는 게시 기간까지 본다 — 기간이 지났거나 시작 전인 팝업도 관리자에게는 '게시 중' 으로
 * 보여, 관리자는 팝업이 떠 있다고 믿었다.
 */
export type PopupPostingState = 'live' | 'scheduled' | 'ended' | 'off' | 'unknown';

export const POPUP_POSTING_LABEL: Record<PopupPostingState, string> = {
  live: '게시 중',
  scheduled: '게시 예정',
  ended: '게시 종료',
  off: '대기 중',
  unknown: '확인 중',
};

/** 'yyyy-MM-dd' 또는 'yyyyMMdd' 를 비교용 'yyyyMMdd' 로. 형식이 아니면 null. */
function toYmd(value: string | undefined | null): string | null {
  if (!value) return null;
  const digits = value.replace(/-/g, '');
  return /^\d{8}$/.test(digits) ? digits : null;
}

/**
 * @param todayYmd 오늘('yyyyMMdd'). 서버 렌더 단계처럼 모르면 빈 문자열이며, 그때는 게시 중이라 단정하지 않는다.
 */
export function popupPostingState(
  popup: Pick<Popup, 'ntceYn' | 'ntceBgnde' | 'ntceEndde'>,
  todayYmd: string,
): PopupPostingState {
  if (popup.ntceYn !== 'Y') return 'off';
  if (!todayYmd) return 'unknown';
  const begin = toYmd(popup.ntceBgnde);
  const end = toYmd(popup.ntceEndde);
  if (begin && todayYmd < begin) return 'scheduled';
  if (end && todayYmd > end) return 'ended';
  return 'live';
}

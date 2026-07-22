/**
 * 설문/여론조사 진행 상태 판정 단일 관문 (SSOT)
 *
 * 배경: 저장 포맷은 'yyyyMMdd' 8자(varchar(8) 컬럼)인데 화면마다 판정 방식이 달라
 * 전부 오판정이었다.
 *   - `new Date('20260722')` → Invalid Date → 비교가 항상 false → 전건 '종료'
 *   - `format(new Date(),'yyyy-MM-dd')`(10자, 구분자 '-')와 8자 저장값('yyyyMMdd')의
 *     문자열 비교는 5번째 문자에서 '-'(ASCII 45) 대 숫자(48~57)를 비교하게 되어
 *     날짜와 무관하게 today 쪽이 항상 작다고 나온다 → 상태가 통째로 뒤집힌다.
 * 8자 저장 포맷끼리는 **사전식 문자열 비교 = 시간순 비교**가 성립하므로
 * Date 로 변환하지 않고 문자열로만 비교한다.
 *
 * 손상 데이터 방어: 라이브 tb_onln_poll_manage 에는 10자 전송이 varchar(8) 에 잘려
 * 들어간 '2026-05-' 같은 값이 실재한다. 그런 값은 예외 없이 'unknown'(알 수 없음)
 * 으로 판정하고, 절대 '진행중'으로 열지 않는다(투표 개방 오류 방지).
 */

import { isStorageYmd, todayStorageYmd } from '@/lib/format-date';

export type PollStatus = 'scheduled' | 'active' | 'closed' | 'suspended' | 'unknown';

/** 상태별 한국어 라벨 */
export const POLL_STATUS_LABEL: Record<PollStatus, string> = {
  scheduled: '예정',
  active: '진행중',
  closed: '종료',
  suspended: '중지',
  unknown: '알 수 없음',
};

export interface PollPeriod {
  pollBgngYmd?: string | null;
  pollEndYmd?: string | null;
  /** 'Y' 이면 사용 중지(폐기) — 기간과 무관하게 참여 불가 */
  pollDsuseYn?: string | null;
}

/**
 * 설문 상태를 판정한다.
 *
 * @param poll  시작일/종료일/사용중지 플래그
 * @param today 기준일('yyyyMMdd'). 생략 시 로컬 오늘.
 *              SSR/CSR 하이드레이션 불일치를 피하려면 호출부에서 useEffect 로
 *              고정한 값을 넘긴다.
 * @returns 'suspended' | 'unknown' | 'scheduled' | 'active' | 'closed'
 */
export function getPollStatus(poll: PollPeriod, today?: string): PollStatus {
  if (poll?.pollDsuseYn === 'Y') return 'suspended';

  const bgng = poll?.pollBgngYmd;
  const end = poll?.pollEndYmd;
  if (!isStorageYmd(bgng) || !isStorageYmd(end)) return 'unknown';

  const base = isStorageYmd(today) ? today : todayStorageYmd();

  if (base < bgng) return 'scheduled';
  if (base > end) return 'closed';
  return 'active'; // 시작일·종료일 당일 포함
}

/**
 * 설문이 오늘 참여 가능한 상태인지.
 * 손상 값('2026-05-')·미상 값은 **false**(닫힘)로 처리한다 — 판정 불가를
 * 개방으로 해석하지 않는다.
 */
export function isPollActive(
  bgngYmd: string | null | undefined,
  endYmd: string | null | undefined,
  today?: string,
  dsuseYn?: string | null
): boolean {
  return (
    getPollStatus({ pollBgngYmd: bgngYmd, pollEndYmd: endYmd, pollDsuseYn: dsuseYn }, today) ===
    'active'
  );
}

/** 상태 라벨 문자열 헬퍼 */
export function getPollStatusLabel(poll: PollPeriod, today?: string): string {
  return POLL_STATUS_LABEL[getPollStatus(poll, today)];
}

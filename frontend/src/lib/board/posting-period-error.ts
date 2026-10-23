/**
 * 게시 기간 규칙의 서버 사유를 그 날짜 칸에 붙인다(2026-10-23 ADR-0040 결정 3·D-11).
 *
 * 예약 설정·공개 뒤 시작일 변경·오늘보다 이른 종료일·기간 순서는 서버가 오늘(Asia/Seoul) 기준으로 판정하고 필드 없이 사유만 돌려준다
 * (BoardPolicySupport). 화면은 오늘을 계산하지 않으므로(DEC-OPS-140) 사유가 말하는 날짜로 칸을 고른다. 종료일을 먼저 본다 — '종료일은
 * 시작일보다 빠를 수 없습니다' 는 종료일 칸의 문제다. 날짜를 말하지 않는 사유는 칸에 붙이지 않는다(호출부가 알림으로 보인다).
 */
export function postingPeriodErrorField(message: string | null | undefined): 'pstBgngYmd' | 'pstEndYmd' | undefined {
  if (!message) return undefined;
  if (message.includes('종료일')) return 'pstEndYmd';
  if (message.includes('시작일')) return 'pstBgngYmd';
  return undefined;
}

/**
 * 지정 시간대의 현재 날짜를 저장소 표준 yyyyMMdd로 만든다.
 *
 * <p>서버가 이 값을 Client Component prop으로 내려 첫 렌더의 날짜 기준을 고정한다. Client
 * Component 렌더 안에서 {@code new Date()}를 만들면 서버와 브라우저의 시각·시간대 차이로 월 경계에서
 * 하이드레이션 마크업이 달라질 수 있다.</p>
 */
export function getTodayYmd(now: Date = new Date(), timeZone = 'Asia/Seoul'): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get('year');
  const month = byType.get('month');
  const day = byType.get('day');
  if (!year || !month || !day) {
    throw new Error(`날짜 포맷 결과에 필수 필드가 없습니다: ${timeZone}`);
  }
  return `${year}${month}${day}`;
}

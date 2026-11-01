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

const SEOUL_DATE_TIME_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** 순간을 한국 시각의 연·월·일·시·분·초 조각으로 나눈다. 브라우저 시간대와 무관하다. */
export function seoulDateTimeParts(date: Date): Map<string, string> {
  return new Map(SEOUL_DATE_TIME_PARTS.formatToParts(date).map((part) => [part.type, part.value]));
}

/**
 * 한국의 오늘을 같은 연·월·일을 가진 로컬 Date 로 돌려준다. 달력과 기간 계산은 Date 의 로컬 필드로 하므로 이 값을 쓰면 브라우저 시간대를
 * 타지 않는다. 일광 절약 전환은 자정 무렵에 일어나 그 시각의 로컬 Date 는 다른 날로 밀릴 수 있어 정오로 둔다. 순간 값이 아니므로 서버로
 * 보내거나 epoch 로 비교하지 않는다.
 */
export function koreanToday(now: Date = new Date()): Date {
  const ymd = getTodayYmd(now);
  return new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)), 12);
}

/** 오늘부터 며칠 뒤의 한국 날짜. {@link koreanToday} 와 같은 로컬 Date 다. */
export function koreanDaysFromNow(days: number, now: Date = new Date()): Date {
  const date = koreanToday(now);
  date.setDate(date.getDate() + days);
  return date;
}

/** 다음 한국 자정의 순간(epoch 밀리초). 한국 표준시는 일광 절약이 없어 UTC+9 로 고정이다. */
export function nextKoreanMidnight(now: Date = new Date()): number {
  const ymd = getTodayYmd(now);
  return Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)) + 1, -9);
}

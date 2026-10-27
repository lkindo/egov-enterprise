import { getTodayYmd } from '../../src/lib/date/today-ymd';

/**
 * 화면과 같은 기준의 날짜. 앱의 오늘은 getTodayYmd(Asia/Seoul 고정)가 정하고 CI 러너는 UTC 다 — 러너 시간으로 만든
 * 날짜(`toISOString().slice(0, 10)`·`getMonth()`)는 한국 시각 자정~09시에 하루, 월초면 한 달이 갈린다(2026-09-01 일정 픽스처).
 * 화면·API 와 대조하는 날짜는 여기서만 만든다 — e2e-harness-hygiene 계약이 다른 방식을 막는다.
 */
const DAY_MS = 86_400_000;

/** 화면의 오늘에서 offsetDays 만큼 떨어진 날의 'YYYYMMDD'. */
export function screenYmd(offsetDays = 0): string {
  return getTodayYmd(new Date(Date.now() + offsetDays * DAY_MS));
}

/** 같은 날의 'YYYY-MM-DD'(date 입력·하이픈 형식 API). */
export function screenDate(offsetDays = 0): string {
  const ymd = screenYmd(offsetDays);
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6)}`;
}

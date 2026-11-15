import { describe, expect, it, vi } from 'vitest';
import { SCHEDULE_HOME_ROOT, SCHEDULE_LIST_ROOT, invalidateSchedules, scheduleHomeKey } from '../schedule-query-keys';

/*
 * [2026-11-14] 일정 화면과 업무 홈의 '오늘 일정' 카드는 같은 일정 API 를 읽는다. 일정을 쓴 뒤 둘 다 낡은 것으로 표시해야 홈으로 돌아갔을 때
 * 카드가 바꾸기 전 일정을 보이지 않는다.
 */
describe('일정 조회 키', () => {
  it('쓰기 뒤에는 월 목록과 홈 카드를 함께 무효화한다', async () => {
    const queryClient = { invalidateQueries: vi.fn().mockResolvedValue(undefined) };
    await invalidateSchedules(queryClient as never);
    expect(queryClient.invalidateQueries.mock.calls.map(([filter]) => filter.queryKey)).toEqual([['work-schedules'], ['home', 'schedule-today']]);
  });

  it('홈 카드 키는 홈 접두 아래에 사용자·달을 담는다 — 무효화 접두가 카드를 덮는다', () => {
    const key = scheduleHomeKey('U1', '202611');
    expect(key).toEqual(['home', 'schedule-today', 'U1', '202611']);
    expect(key.slice(0, SCHEDULE_HOME_ROOT.length)).toEqual([...SCHEDULE_HOME_ROOT]);
    expect(scheduleHomeKey('U2', '202611')).not.toEqual(key);
    expect(SCHEDULE_LIST_ROOT).toEqual(['work-schedules']);
  });
});

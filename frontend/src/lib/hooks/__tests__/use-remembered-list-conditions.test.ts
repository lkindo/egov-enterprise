import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { presetToPeriod } from '@/app/components/patterns/period-filter';
import { useRememberedListConditions } from '../use-remembered-list-conditions';

/** [2026-09-26 DIP B5 F3] 화면별로 마지막 기간 프리셋과 페이지당 건수를 기억한다. */
const OPTIONS = { defaultPageSize: 10, pageSizeOptions: [10, 20, 50, 100] } as const;
const KEY = 'egov.list-conditions.v1:logs-login';

describe('useRememberedListConditions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 26, 10, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('처음에는 기본값이고, 고른 값은 다음 방문에 되살아난다', async () => {
    const first = renderHook(() => useRememberedListConditions('logs-login', OPTIONS));
    expect(first.result.current.pageSize).toBe(10);
    expect(first.result.current.period).toEqual({ from: '', to: '' });

    act(() => {
      first.result.current.setPageSize(50);
      first.result.current.setPeriod(presetToPeriod('1w', new Date()));
    });
    first.unmount();

    const second = renderHook(() => useRememberedListConditions('logs-login', OPTIONS));
    await waitFor(() => expect(second.result.current.pageSize).toBe(50));
    expect(second.result.current.period).toEqual(presetToPeriod('1w', new Date()));
  });

  it('기간은 날짜가 아니라 프리셋 이름으로 남는다 — 다음 날에는 그날 기준 최근 1주다', async () => {
    const first = renderHook(() => useRememberedListConditions('logs-login', OPTIONS));
    act(() => first.result.current.setPeriod(presetToPeriod('1w', new Date())));
    first.unmount();
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? '{}')).toEqual({ periodPreset: '1w' });

    vi.setSystemTime(new Date(2026, 8, 30, 9, 0, 0));
    const next = renderHook(() => useRememberedListConditions('logs-login', OPTIONS));
    await waitFor(() => expect(next.result.current.period).toEqual({ from: '2026-09-24', to: '2026-09-30' }));
  });

  it('직접 입력한 기간과 전체·기본 건수는 남기지 않는다', () => {
    const hook = renderHook(() => useRememberedListConditions('logs-login', OPTIONS));
    act(() => hook.result.current.setPeriod({ from: '2026-01-01', to: '2026-01-31' }));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    act(() => {
      hook.result.current.setPageSize(20);
      hook.result.current.setPageSize(10);
      hook.result.current.setPeriod({ from: '', to: '' });
    });
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('화면마다 따로 남는다', async () => {
    const login = renderHook(() => useRememberedListConditions('logs-login', OPTIONS));
    act(() => login.result.current.setPageSize(100));
    const web = renderHook(() => useRememberedListConditions('logs-web', OPTIONS));
    await Promise.resolve();
    expect(web.result.current.pageSize).toBe(10);
  });

  it('어휘 밖이거나 손상된 값은 무시하고, 저장소를 쓸 수 없어도 동작한다', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ pageSize: 37, periodPreset: 'forever' }));
    const odd = renderHook(() => useRememberedListConditions('logs-login', OPTIONS));
    await Promise.resolve();
    expect(odd.result.current.pageSize).toBe(10);
    expect(odd.result.current.period).toEqual({ from: '', to: '' });
    odd.unmount();

    window.localStorage.setItem(KEY, '{broken');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    const broken = renderHook(() => useRememberedListConditions('logs-login', OPTIONS));
    act(() => broken.result.current.setPageSize(50));
    expect(broken.result.current.pageSize).toBe(50);
  });
});

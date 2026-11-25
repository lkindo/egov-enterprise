import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  registerBeforeSignOut,
  registerOnSessionLost,
  rememberSignOutNotice,
  runBeforeSignOut,
  runOnSessionLost,
  takeSignOutNotices,
} from '../before-sign-out';

/** 로그아웃 직전·세션 상실 때 끝낼 일 — 로그아웃은 표지를 세우기 전에 등록된 일을 상한 시간까지 기다린다(2026-11-25). */
describe('before-sign-out', () => {
  const unregister: Array<() => void> = [];
  afterEach(() => {
    unregister.splice(0).forEach((release) => release());
    takeSignOutNotices();
    vi.useRealTimers();
  });

  it('등록된 일을 모두 끝날 때까지 기다리고, 하나의 실패가 로그아웃을 막지 않는다', async () => {
    const order: string[] = [];
    unregister.push(registerBeforeSignOut('slow', async () => {
      await Promise.resolve();
      order.push('slow');
    }));
    unregister.push(registerBeforeSignOut('boom', () => { throw new Error('boom'); }));
    unregister.push(registerBeforeSignOut('sync', () => { order.push('sync'); }));

    await expect(runBeforeSignOut()).resolves.toEqual({ timedOut: false });
    expect(order.sort()).toEqual(['slow', 'sync']);
  });

  it('끝나지 않는 일은 상한 시간까지만 기다리고 상한을 넘겼다고 알린다', async () => {
    vi.useFakeTimers();
    unregister.push(registerBeforeSignOut('never', () => new Promise(() => {})));
    let result: { timedOut: boolean } | undefined;
    const running = runBeforeSignOut(1_000).then((value) => { result = value; });

    await vi.advanceTimersByTimeAsync(999);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await running;
    expect(result).toEqual({ timedOut: true });
  });

  it('같은 키로 다시 등록하면 하나만 남는다 — 모듈이 다시 평가돼도(HMR) 두 번 부르지 않는다', async () => {
    const first = vi.fn();
    const second = vi.fn();
    unregister.push(registerBeforeSignOut('feature', first));
    unregister.push(registerBeforeSignOut('feature', second));

    await runBeforeSignOut();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('등록을 풀면 더는 부르지 않는다', async () => {
    const task = vi.fn();
    const release = registerBeforeSignOut('released', task);
    release();
    await runBeforeSignOut();
    expect(task).not.toHaveBeenCalled();
  });

  it('세션 상실 정리는 하나의 실패가 나머지를 막지 않고, 남긴 안내는 한 번만 읽힌다', () => {
    const later = vi.fn();
    unregister.push(registerOnSessionLost('broken', () => { throw new Error('broken'); }));
    unregister.push(registerOnSessionLost('later', () => {
      later();
      rememberSignOutNotice('보내지 못한 일이 있습니다.');
      rememberSignOutNotice('보내지 못한 일이 있습니다.');
    }));

    runOnSessionLost();

    expect(later).toHaveBeenCalledTimes(1);
    expect(takeSignOutNotices()).toEqual(['보내지 못한 일이 있습니다.']);
    expect(takeSignOutNotices()).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerBeforeSignOut, runBeforeSignOut } from '../before-sign-out';

/** 로그아웃 직전에 끝낼 일 — 로그아웃은 표지를 세우기 전에 등록된 일을 상한 시간까지 기다린다(2026-11-25). */
describe('before-sign-out', () => {
  const unregister: Array<() => void> = [];
  afterEach(() => {
    unregister.splice(0).forEach((release) => release());
    vi.useRealTimers();
  });

  it('등록된 일을 모두 끝날 때까지 기다리고, 하나의 실패가 로그아웃을 막지 않는다', async () => {
    const order: string[] = [];
    unregister.push(registerBeforeSignOut(async () => {
      await Promise.resolve();
      order.push('slow');
    }));
    unregister.push(registerBeforeSignOut(() => { throw new Error('boom'); }));
    unregister.push(registerBeforeSignOut(() => { order.push('sync'); }));

    await expect(runBeforeSignOut()).resolves.toBeUndefined();
    expect(order.sort()).toEqual(['slow', 'sync']);
  });

  it('끝나지 않는 일은 상한 시간까지만 기다린다 — 서버가 느려도 로그아웃이 멈추지 않는다', async () => {
    vi.useFakeTimers();
    unregister.push(registerBeforeSignOut(() => new Promise(() => {})));
    let done = false;
    const running = runBeforeSignOut(1_000).then(() => { done = true; });

    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await running;
    expect(done).toBe(true);
  });

  it('등록을 풀면 더는 부르지 않는다', async () => {
    const task = vi.fn();
    const release = registerBeforeSignOut(task);
    release();
    await runBeforeSignOut();
    expect(task).not.toHaveBeenCalled();
  });
});

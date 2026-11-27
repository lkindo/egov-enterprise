/**
 * 한 번에 하나만 도는 쓰기 동작 훅 시험(2026-11-27 신설).
 *
 * 이 훅이 지키는 것은 **같은 쓰기가 두 번 나가지 않는 것**과 **실패 뒤 단추가 영영 잠기지 않는 것**이다. 둘 다 예외 없이 조용히
 * 어긋나서 타입 검사·빌드로는 잡히지 않는다.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSingleFlight } from '../use-single-flight';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('useSingleFlight', () => {
  it('같은 틱의 두 번째 실행은 task 를 부르지 않고, 끝나면 다시 실행할 수 있다', async () => {
    const { result } = renderHook(() => useSingleFlight());
    const gate = deferred<string>();
    let calls = 0;
    const task = () => { calls += 1; return gate.promise; };

    let first: Promise<string | undefined> = Promise.resolve(undefined);
    let second: Promise<string | undefined> = Promise.resolve(undefined);
    act(() => {
      first = result.current.run(task);
      second = result.current.run(task);
    });
    expect(calls).toBe(1);
    expect(result.current.isRunning()).toBe(true);
    expect(result.current.pending).toBe(true);
    await expect(second).resolves.toBeUndefined();

    await act(async () => { gate.resolve('done'); await first; });
    await expect(first).resolves.toBe('done');
    expect(result.current.pending).toBe(false);
    expect(result.current.isRunning()).toBe(false);

    await act(async () => { await result.current.run(async () => 'again'); });
    expect(calls).toBe(1);
  });

  it('task 가 실패해도 잠금과 처리 중 상태를 풀고 실패를 그대로 던진다', async () => {
    const { result } = renderHook(() => useSingleFlight());
    const failure = new Error('write failed');
    let thrown: unknown;
    await act(async () => {
      try { await result.current.run(() => Promise.reject(failure)); } catch (error) { thrown = error; }
    });
    expect(thrown).toBe(failure);
    expect(result.current.pending).toBe(false);
    expect(result.current.isRunning()).toBe(false);
    let ran = false;
    await act(async () => { await result.current.run(async () => { ran = true; }); });
    expect(ran).toBe(true);
  });

  it('runFor 는 진행 중인 대상을 pendingKey 로 알리고, 다른 대상의 실행도 막는다', async () => {
    const { result } = renderHook(() => useSingleFlight<number>());
    const gate = deferred<void>();
    let started: number[] = [];
    let running: Promise<void | undefined> = Promise.resolve(undefined);
    act(() => {
      running = result.current.runFor(7, () => { started = [...started, 7]; return gate.promise; });
    });
    expect(result.current.pendingKey).toBe(7);
    expect(result.current.pending).toBe(true);

    await act(async () => { await result.current.runFor(8, async () => { started = [...started, 8]; }); });
    expect(started).toEqual([7]);

    await act(async () => { gate.reject(new Error('row failed')); await running.catch(() => undefined); });
    expect(result.current.pendingKey).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it('인스턴스마다 잠금이 따로다 — 한 동작의 진행이 다른 동작을 막지 않는다', async () => {
    const { result } = renderHook(() => ({ save: useSingleFlight(), remove: useSingleFlight() }));
    const gate = deferred<void>();
    let saving: Promise<void | undefined> = Promise.resolve(undefined);
    act(() => { saving = result.current.save.run(() => gate.promise); });
    let removed = false;
    await act(async () => { await result.current.remove.run(async () => { removed = true; }); });
    expect(removed).toBe(true);
    expect(result.current.save.pending).toBe(true);
    expect(result.current.remove.pending).toBe(false);
    await act(async () => { gate.resolve(); await saving; });
  });
});

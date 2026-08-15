import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '../use-debounced-value';

/**
 * useDebouncedValue 계약 테스트.
 *
 * [존재 이유 — 2026-08-15 신설] 이 훅에는 테스트가 없었는데, 실측상 **화면 24곳**이 검색어를
 * 이 훅에 통과시켜 서버 요청 파라미터로 쓴다. 여기가 틀어지면 증상은 화면마다 제각각으로
 * 나타난다 — "검색이 한 박자 늦다", "타이핑마다 요청이 나간다", "마지막 글자가 빠진다".
 *
 * 특히 고정해야 할 두 가지:
 *   ① 디바운스가 실제로 **마지막 값만** 통과시키는가 (중간 입력마다 요청이 나가면 안 된다)
 *   ② delay<=0 일 때 **이펙트 왕복 없이** 즉시 반영되는가
 *      — 종전 구현은 이펙트 본문에서 setState 를 호출했고(set-state-in-effect),
 *        그 왕복이 PPR 하이드레이션 불일치의 통로다. 지금은 렌더 중 파생으로 바꿨다.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('초기값은 지연 없이 그대로 반환한다', () => {
    const { result } = renderHook(() => useDebouncedValue('first', 300));
    expect(result.current).toBe('first');
  });

  it('지연 시간이 지나기 전에는 이전 값을 유지한다', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
  });

  it('지연 시간이 지나면 최신 값을 반영한다', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('b');
  });

  it('연속 입력 중에는 마지막 값만 통과시킨다 — 중간 값은 방출하지 않는다', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: '' },
    });

    // 타이핑 시뮬레이션: 각 글자 사이 간격이 지연보다 짧다.
    for (const keyword of ['n', 'nu', 'nur', 'nuri']) {
      rerender({ v: keyword });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      // 아직 어떤 중간값도 통과하지 않았다.
      expect(result.current).toBe('');
    }

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('nuri');
  });

  it('delay 가 0 이하면 이펙트를 거치지 않고 즉시 반영한다', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 0), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    // 타이머를 전혀 진행시키지 않아도 최신값이어야 한다 — 렌더 중 파생이기 때문이다.
    expect(result.current).toBe('b');

    rerender({ v: 'c' });
    expect(result.current).toBe('c');
  });

  it('언마운트 시 대기 중인 타이머를 정리한다', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { rerender, unmount } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });

    rerender({ v: 'b' });
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('문자열이 아닌 값(객체)도 참조를 유지한 채 통과시킨다', () => {
    const first = { page: 1 };
    const second = { page: 2 };
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: first },
    });

    rerender({ v: second });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(second);
  });
});

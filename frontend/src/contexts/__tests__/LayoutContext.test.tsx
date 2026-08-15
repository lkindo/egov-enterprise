import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { LayoutProvider, useLayout } from '../LayoutContext';

/**
 * LayoutContext 계약 테스트.
 *
 * [존재 이유 — 2026-08-15 신설] 이 Provider 에는 회귀 탐지기가 **하나도 없었다**.
 *   · 단위 테스트 부재: contexts/__tests__/ 에는 AuthContext·websocket-context 만 있었다.
 *   · E2E 도 덮지 않음: 01-core-base 의 사이드바 스텝은 링크 가시성만 보고,
 *     모바일 토글·네비 후 닫힘을 단언하지 않는다.
 *
 * 그런데 이 Provider 는 앱 전체를 감싼다(providers.tsx). 여기서 무한 렌더가 나면 전 화면이 죽는다.
 *
 * 2026-08-15 에 "경로 이동 시 사이드바 닫기" 를 이펙트에서 **렌더 중 조정**으로 바꾸면서
 * 이 테스트를 함께 넣는다. 고정하는 명제는 셋이다:
 *   ① 경로가 바뀌면 사이드바가 닫힌다 (기능 자체)
 *   ② 쿼리스트링만 바뀌는 경우는 닫지 않는다 — usePathname 은 쿼리를 포함하지 않으므로
 *      같은 pathname 이면 사용자가 연 사이드바를 빼앗지 않아야 한다
 *   ③ 같은 경로로 재렌더해도 상태가 유지되고 무한 루프가 없다 (가드가 살아 있는가)
 */

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const mockedPathname = vi.mocked(usePathname);

function wrapper({ children }: { children: React.ReactNode }) {
  return <LayoutProvider>{children}</LayoutProvider>;
}

beforeEach(() => {
  mockedPathname.mockReset();
  mockedPathname.mockReturnValue('/admin/work-hub');
});

describe('LayoutContext', () => {
  it('사이드바 초기 상태는 닫힘이다', () => {
    const { result } = renderHook(() => useLayout(), { wrapper });
    expect(result.current.isSidebarOpen).toBe(false);
  });

  it('toggleSidebar 로 열고 닫을 수 있다', () => {
    const { result } = renderHook(() => useLayout(), { wrapper });

    act(() => result.current.toggleSidebar());
    expect(result.current.isSidebarOpen).toBe(true);

    act(() => result.current.toggleSidebar());
    expect(result.current.isSidebarOpen).toBe(false);
  });

  it('경로가 바뀌면 열려 있던 사이드바를 닫는다', () => {
    const { result, rerender } = renderHook(() => useLayout(), { wrapper });

    act(() => result.current.setSidebarOpen(true));
    expect(result.current.isSidebarOpen).toBe(true);

    // 프로그램적 라우팅(router.push · 뒤로가기)을 흉내낸다.
    mockedPathname.mockReturnValue('/admin/community/boards');
    rerender();

    expect(result.current.isSidebarOpen).toBe(false);
  });

  it('같은 경로로 다시 렌더해도 사용자가 연 사이드바를 빼앗지 않는다', () => {
    const { result, rerender } = renderHook(() => useLayout(), { wrapper });

    act(() => result.current.setSidebarOpen(true));

    // 경로는 그대로 — 부모 리렌더나 쿼리스트링 변경(usePathname 은 쿼리를 포함하지 않는다) 상황.
    rerender();
    rerender();

    expect(result.current.isSidebarOpen).toBe(true);
  });

  it('경로가 연속으로 바뀌어도 매번 닫고 무한 루프에 빠지지 않는다', () => {
    let renderCount = 0;
    const { result, rerender } = renderHook(
      () => {
        renderCount += 1;
        return useLayout();
      },
      { wrapper }
    );

    const baseline = renderCount;

    for (const path of ['/admin/a', '/admin/b', '/admin/c']) {
      act(() => result.current.setSidebarOpen(true));
      mockedPathname.mockReturnValue(path);
      rerender();
      expect(result.current.isSidebarOpen).toBe(false);
    }

    // 가드가 사라지면 렌더가 발산한다. 경로 3회 전환에 대해 상수배 이내여야 한다.
    expect(renderCount - baseline).toBeLessThan(30);
  });

  it('activeMenuNo 는 경로 변경과 무관하게 유지된다 (사이드바만 닫는다)', () => {
    const { result, rerender } = renderHook(() => useLayout(), { wrapper });

    act(() => result.current.setActiveMenuNo(42));
    mockedPathname.mockReturnValue('/admin/other');
    rerender();

    expect(result.current.activeMenuNo).toBe(42);
    expect(result.current.isSidebarOpen).toBe(false);
  });

  it('Provider 밖에서 useLayout 을 쓰면 명확히 실패한다', () => {
    expect(() => renderHook(() => useLayout())).toThrow(/LayoutProvider/);
  });
});

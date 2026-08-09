vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrollToTop } from '../scroll-to-top';

// Mock next/navigation
vi.mock('next/navigation', () => ({
 usePathname: () => '/',
 useSearchParams: () => new URLSearchParams(),
}));

/**
 * ScrollToTop 계약 테스트.
 *
 * 종전 이 테스트는 "ScrollToTop 이 제거되어 비활성화"라는 사유로 it.skip 되어 있었으나,
 * 컴포넌트 파일(../scroll-to-top.tsx)은 그대로 살아 있다. 제거된 것은 컴포넌트가 아니라
 * **내부의 스크롤 강제 이동 effect** 다(파일 내 주석 처리됨). 즉 스킵 사유가 사실과 달랐고,
 * 그 결과 이 파일은 아무것도 실행하지 않는 고아 스킵으로 남아 있었다.
 *
 * 종전 단언(`window.scrollTo` 가 (0,0) 으로 호출된다)은 지금은 **틀린 기대**다. 현재 의도는
 * Next.js/브라우저의 기본 스크롤 복원에 맡기는 것이므로, 그 의도 자체를 회귀 방어한다.
 * 누군가 effect 를 되살리면 이 테스트가 깨지고, 그때 "정말 되살릴 것인가"를 의식적으로
 * 판단하게 된다.
 *
 * ⚠ 별건 보고: ScrollToTop 은 현재 앱 어디에서도 렌더되지 않는다(이 테스트가 유일한 참조).
 *   컴포넌트 자체의 존치/삭제는 제품 결정이라 여기서 건드리지 않는다.
 */
describe('Layout Components', () => {
 beforeEach(() => {
 vi.useFakeTimers();
 });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ScrollToTop 은 DOM 을 렌더하지 않는다', () => {
    const { container } = render(<ScrollToTop />);

    expect(container).toBeEmptyDOMElement();
  });

  it('[의도된 계약] ScrollToTop 은 스크롤을 가로채지 않는다 — 브라우저 기본 복원에 위임', () => {
    window.scrollTo = vi.fn();

    render(<ScrollToTop />);

    // 종전 구현은 10ms 지연 후 scrollTo(0, 0) 을 호출했다. 타이머를 모두 흘려도
    // 호출이 없어야 "스크롤 하이재킹이 실제로 꺼져 있다"가 증명된다.
    act(() => {
      vi.runAllTimers();
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

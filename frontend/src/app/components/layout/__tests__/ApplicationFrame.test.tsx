import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationFrame } from '../ApplicationFrame';
const route = vi.hoisted(() => ({ path: '/login' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.path }));

describe('public and application layouts', () => {
  it.each(['/login', '/login/recovery'])('does not mount application navigation at %s', (path) => {
    route.path = path;
    const header = vi.fn(() => <header>업무 헤더</header>);
    const Header = header;
    render(<ApplicationFrame header={<Header />} sidebar={<aside>업무 메뉴</aside>} footer={<footer>도움말</footer>}><h1>로그인</h1></ApplicationFrame>);
    expect(header).not.toHaveBeenCalled();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading'));
    expect(screen.getByText('도움말')).toBeVisible();
    expect(screen.getByRole('link', { name: '본문 바로가기' })).toHaveAttribute('href', '#main-content');
  });
  it('mounts one application shell and reserves sidebar width for an authenticated route', () => {
    route.path = '/admin/work-hub';
    render(<ApplicationFrame header={<header>업무 헤더</header>} sidebar={<aside>업무 메뉴</aside>} footer={<footer>도움말</footer>}><h1>업무 관리</h1></ApplicationFrame>);
    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('complementary')).toBeVisible();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    // [2026-10-05] 사이드바 자리는 --app-sidebar-inset 으로 비워 둔다. 기본값은 사이드바 폭(--app-sidebar-width)과 같고,
    //   넓은 화면에서 사이드바를 접으면 globals.css 가 0 으로 돌린다 — 폭 토큰을 직접 쓰면 접어도 빈 자리가 남는다.
    expect(screen.getByRole('main')).toHaveClass('lg:pl-[var(--app-sidebar-inset)]');
    expect(screen.getByRole('main')).not.toHaveClass('lg:pl-[var(--app-sidebar-width)]');
  });

  it('keeps the body minimum height formula on the shared footer reserve token used by the fill shell', () => {
    // fill 셸 높이(--work-fill-height)는 이 최소 높이에서 lg 패딩만 뺀 값이다. 두 식이 같은 푸터 몫을 써야 페이지 스크롤이 0 이다.
    route.path = '/admin/work-hub';
    render(<ApplicationFrame header={<header>업무 헤더</header>} sidebar={<aside>업무 메뉴</aside>} footer={<footer>도움말</footer>}><h1>업무 관리</h1></ApplicationFrame>);
    const body = screen.getByRole('heading', { name: '업무 관리' }).parentElement?.parentElement;
    expect(body).toHaveClass('min-h-[calc(100dvh-var(--app-header-height)-var(--app-footer-reserve))]', 'lg:p-[var(--page-pad-lg)]');
  });

  it.each(['/admin/system/menus', '/login'])('always renders the footer inside the footer slot marker at %s (fill screens hide it with CSS only)', (path) => {
    // [2026-10-05] fill 셸이 있는 화면은 work-fill 조건에서 globals.css 가 [data-app-footer] 를 숨긴다(:has). 프레임은 경로나 화면
    //   크기로 푸터를 빼지 않는다 — 렌더를 가르면 서버 HTML 과 첫 렌더가 달라지고(ADR-0006) 조건 밖의 푸터까지 사라질 수 있다.
    route.path = path;
    render(<ApplicationFrame header={<header>업무 헤더</header>} sidebar={<aside>업무 메뉴</aside>} footer={<footer>도움말</footer>}><h1>화면</h1></ApplicationFrame>);
    const footer = screen.getByText('도움말');
    const slot = footer.parentElement;
    expect(slot).toHaveAttribute('data-app-footer', '');
    expect(slot?.childElementCount).toBe(1);
    expect(screen.getByRole('main')).toContainElement(slot);
    // 본문 상자 다음, main 의 마지막 자리다(푸터 몫은 이 자리 하나를 위해 남겨 둔다).
    expect(screen.getByRole('main').lastElementChild).toBe(slot);
  });
});

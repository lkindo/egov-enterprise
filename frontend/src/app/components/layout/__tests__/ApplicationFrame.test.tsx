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
    expect(screen.getByRole('main')).toHaveClass('lg:pl-[var(--app-sidebar-width)]');
  });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommonCodeHubClient from '../CommonCodeHubClient';

const mocks = vi.hoisted(() => ({
  activeTab: 'STANDARD',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/system/common-code',
  useSearchParams: () => new URLSearchParams(`tab=${mocks.activeTab}`),
}));

vi.mock('../CommonCodeClient', () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <section>
      {!embedded && <nav aria-label="현재 위치" />}
      {embedded ? <h2>공통 코드 관리</h2> : <h1>공통 코드 관리</h1>}
      <button type="button">표준 코드 작업</button>
    </section>
  ),
}));
vi.mock('../../codes/administ/AdministCodeClient', () => ({ default: ({ embedded }: { embedded?: boolean }) => (
  <section>{!embedded && <nav aria-label="현재 위치" />}{embedded ? <h2>행정 구역 코드 관리</h2> : <h1>행정 구역 코드 관리</h1>}<div>행정 표준 목록</div></section>
) }));
vi.mock('../../codes/institution/InstitutionCodeClient', () => ({ default: ({ embedded }: { embedded?: boolean }) => (
  <section>{!embedded && <nav aria-label="현재 위치" />}{embedded ? <h2>공공기관 코드 관리</h2> : <h1>공공기관 코드 관리</h1>}<div>기관 노드 목록</div></section>
) }));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title, animateEntrance }: { title: string; animateEntrance?: boolean }) => (
    <header data-testid="common-code-page-header" data-entry-motion={animateEntrance ? 'enabled' : 'disabled'}>
      <nav aria-label="현재 위치" /><h1>{title}</h1>
    </header>
  ),
}));

function renderHub() {
  const props = {
    clCodes: [],
    groups: [],
    details: [],
    selectedGroupId: null,
  };
  const view = render(<CommonCodeHubClient {...props} />);
  return {
    ...view,
    rerenderHub: () => view.rerender(<CommonCodeHubClient {...props} />),
  };
}

describe('CommonCodeHubClient tabs', () => {
  beforeEach(() => {
    mocks.activeTab = 'STANDARD';
    mocks.replace.mockReset();
    mocks.replace.mockImplementation((url: string) => {
      const nextUrl = new URL(url, 'http://localhost');
      mocks.activeTab = nextUrl.searchParams.get('tab') ?? 'STANDARD';
    });
  });

  it('uses roving tab focus and restores focus across STANDARD and A1 branch remounts', async () => {
    const view = renderHub();
    const standard = screen.getByRole('tab', { name: '표준 코드' });
    const administ = screen.getByRole('tab', { name: '행정 표준' });
    const institution = screen.getByRole('tab', { name: '기관 노드' });

    expect(standard).toHaveAttribute('aria-selected', 'true');
    expect(standard).toHaveAttribute('tabindex', '0');
    expect(administ).toHaveAttribute('tabindex', '-1');
    expect(institution).toHaveAttribute('tabindex', '-1');
    const tabList = screen.getByRole('tablist', { name: '코드 유형 전환' });
    const standardPanel = screen.getByRole('tabpanel');
    const pageHeading = screen.getByRole('heading', { level: 1, name: '코드 관리' });
    expect(screen.getByTestId('common-code-page-header')).toHaveAttribute('data-entry-motion', 'disabled');
    expect(pageHeading.compareDocumentPosition(tabList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tabList.compareDocumentPosition(standardPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(standardPanel).toHaveAttribute('aria-labelledby', 'code-hub-tab-standard');
    expect(within(standardPanel).getByRole('heading', { level: 2, name: '공통 코드 관리' })).toBeVisible();
    expect(within(standardPanel).queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    expect(within(standardPanel).queryAllByRole('navigation', { name: '현재 위치' })).toHaveLength(0);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('navigation', { name: '현재 위치' })).toHaveLength(1);
    expect(within(standardPanel).queryByText('행정 표준 목록')).not.toBeInTheDocument();
    expect(within(standardPanel).queryByText('기관 노드 목록')).not.toBeInTheDocument();

    standard.focus();
    fireEvent.keyDown(standard, { key: 'ArrowRight' });
    expect(mocks.replace).toHaveBeenLastCalledWith(
      '/admin/system/common-code?tab=ADMINIST',
      { scroll: false },
    );
    view.rerenderHub();

    await waitFor(() => expect(screen.getByRole('tab', { name: '행정 표준' })).toHaveFocus());
    expect(screen.getByRole('tab', { name: '행정 표준' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'code-hub-tab-administ');
    expect(within(screen.getByRole('tabpanel')).getByText('행정 표준 목록')).toBeVisible();
    expect(within(screen.getByRole('tabpanel')).getByRole('heading', { level: 2, name: '행정 구역 코드 관리' })).toBeVisible();
    expect(within(screen.getByRole('tabpanel')).queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    expect(within(screen.getByRole('tabpanel')).queryAllByRole('navigation', { name: '현재 위치' })).toHaveLength(0);
    expect(within(screen.getByRole('tabpanel')).queryByText('기관 노드 목록')).not.toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).queryByText('표준 코드 작업')).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('tab', { name: '행정 표준' }), { key: 'End' });
    view.rerenderHub();
    await waitFor(() => expect(screen.getByRole('tab', { name: '기관 노드' })).toHaveFocus());
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'code-hub-tab-institution');
    expect(within(screen.getByRole('tabpanel')).getByText('기관 노드 목록')).toBeVisible();
    expect(within(screen.getByRole('tabpanel')).getByRole('heading', { level: 2, name: '공공기관 코드 관리' })).toBeVisible();
    expect(within(screen.getByRole('tabpanel')).queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    expect(within(screen.getByRole('tabpanel')).queryAllByRole('navigation', { name: '현재 위치' })).toHaveLength(0);
    expect(within(screen.getByRole('tabpanel')).queryByText('행정 표준 목록')).not.toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).queryByText('표준 코드 작업')).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('tab', { name: '기관 노드' }), { key: 'Home' });
    view.rerenderHub();
    await waitFor(() => expect(screen.getByRole('tab', { name: '표준 코드' })).toHaveFocus());
    expect(within(screen.getByRole('tabpanel')).getByRole('heading', { level: 2, name: '공통 코드 관리' })).toBeVisible();
  });
});

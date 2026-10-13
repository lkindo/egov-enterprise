import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 나의 업무 탭 줄 도우미(core, 업무 허브 분해 W1)의 계약. 레지스트리를 대역으로 바꿔 기여 구성마다 본다.
 *
 * - 기여 탭이 없으면 탭 줄을 그리지 않고 tabpanel 로 감싸지도 않는다(core·collaboration 구성의 업무 관리 목록).
 * - 탭은 core 탭(업무 관리)이 먼저, 기여 탭은 order 순이다. 지금 화면의 경로가 선택 탭이고, 누르면 그 탭의 화면 경로로 간다.
 * - 탭 줄은 work-hub 배치만, 업무 보고 머리 링크는 work-report 배치만 읽는다. 노출은 기여의 visibleWhen(목적지 진입 권한)을 따른다.
 * /admin 목적지 예시는 core 화면(메뉴 관리, MENU_READ)이다 — 생성물은 화면·권한 목록을 구성으로 줄이므로(Phase 2 10단계 10b) 메모 보고
 * 같은 기능 화면을 쓰면 그 기능이 빠진 구성에서 진입 판정이 늘 거짓이다.
 */
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  permissions: [] as string[],
  shellLinks: [] as unknown[],
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { role: 'ROLE_USER', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/extensions/generated-shell-links', () => ({
  get shellLinks() {
    return mocks.shellLinks;
  },
}));

import { useWorkHubTabStrip, useWorkReportLinks } from '../work-hub-tabs';

const tab = (id: string, order: number, href: string, label: string) => ({
  id, placement: 'work-hub', order, href, label, visibleWhen: { page: href },
});
const REPORT = tab('report', 20, '/smart-toolkit/work-report', '업무 보고');
const CALENDAR = tab('calendar', 30, '/smart-toolkit/schedule', '일정');
const MEMO_LINK = {
  id: 'menu-manage', placement: 'work-report', order: 10, href: '/admin/system/menus', label: '메뉴 관리',
  description: '메뉴를 고치려면 메뉴 관리로 가세요.', visibleWhen: { page: '/admin/system/menus' },
};
const HEADER_LINK = { id: 'help', placement: 'header', order: 10, href: '/help', label: '도움말', visibleWhen: { page: '/help' } };

function Harness({ activeHref }: { activeHref: string }) {
  const tabs = useWorkHubTabStrip(activeHref);
  const links = useWorkReportLinks();
  return (
    <div>
      <div data-testid="actions">{tabs.strip}</div>
      {tabs.panel(<p>목록</p>)}
      <ul aria-label="머리 링크">
        {links.map(link => <li key={link.id}>{link.label}</li>)}
      </ul>
    </div>
  );
}

const tabState = () => within(screen.getByRole('tablist', { name: '업무 영역 선택' })).getAllByRole('tab')
  .map(element => [element.textContent, element.getAttribute('aria-selected'), element.id]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = [];
  mocks.shellLinks = [];
});

describe('나의 업무 탭 줄', () => {
  it('기여 탭이 없으면 탭 줄도 tabpanel 도 없고 내용만 그린다', () => {
    mocks.shellLinks = [[HEADER_LINK]];
    render(<Harness activeHref="/smart-toolkit/dept-job" />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(screen.getByText('목록')).toBeInTheDocument();
  });

  it('core 탭이 먼저이고 기여 탭은 order 순이다. 지금 화면의 경로가 선택 탭이다', () => {
    // 레지스트리 순서(owner 코드 포인트)와 order 가 다르게 둔다 — 순서는 order 가 정한다.
    mocks.shellLinks = [[CALENDAR], [REPORT]];
    render(<Harness activeHref="/smart-toolkit/schedule" />);
    expect(tabState()).toEqual([
      ['업무 관리', 'false', 'work-hub-tab-job'],
      ['업무 보고', 'false', 'work-hub-tab-report'],
      ['일정', 'true', 'work-hub-tab-calendar'],
    ]);
    for (const element of screen.getAllByRole('tab')) expect(element).toHaveAttribute('aria-controls', 'work-hub-tabpanel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'work-hub-tabpanel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'work-hub-tab-calendar');
  });

  it('탭을 누르면 그 탭의 화면 경로로 간다(스크롤 유지)', () => {
    mocks.shellLinks = [[REPORT]];
    render(<Harness activeHref="/smart-toolkit/dept-job" />);
    fireEvent.click(screen.getByRole('tab', { name: '업무 보고' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/smart-toolkit/work-report', { scroll: false });
    fireEvent.click(screen.getByRole('tab', { name: '업무 관리' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/smart-toolkit/dept-job', { scroll: false });
  });

  it('탭 줄은 work-hub 배치만 읽는다 — 머리글·업무 보고 머리 링크는 탭이 아니다', () => {
    mocks.permissions = ['MENU_READ'];
    mocks.shellLinks = [[HEADER_LINK], [MEMO_LINK], [REPORT]];
    render(<Harness activeHref="/smart-toolkit/work-report" />);
    expect(tabState().map(([label]) => label)).toEqual(['업무 관리', '업무 보고']);
  });

  it('/admin 목적지 탭은 그 화면에 들어갈 수 있을 때만 보인다(노출 술어)', () => {
    const gated = tab('menus', 40, '/admin/system/menus', '메뉴');
    mocks.shellLinks = [[REPORT, gated]];
    const first = render(<Harness activeHref="/smart-toolkit/dept-job" />);
    expect(tabState().map(([label]) => label)).toEqual(['업무 관리', '업무 보고']);
    first.unmount();
    mocks.permissions = ['MENU_READ'];
    render(<Harness activeHref="/smart-toolkit/dept-job" />);
    expect(tabState().map(([label]) => label)).toEqual(['업무 관리', '업무 보고', '메뉴']);
  });
});

describe('업무 보고 머리 링크', () => {
  it('work-report 배치만 돌려주고, 목적지에 들어갈 수 없으면 비운다', () => {
    mocks.shellLinks = [[HEADER_LINK], [MEMO_LINK], [REPORT]];
    const first = render(<Harness activeHref="/smart-toolkit/work-report" />);
    expect(within(screen.getByRole('list', { name: '머리 링크' })).queryAllByRole('listitem')).toHaveLength(0);
    first.unmount();
    mocks.permissions = ['MENU_READ'];
    render(<Harness activeHref="/smart-toolkit/work-report" />);
    expect(within(screen.getByRole('list', { name: '머리 링크' })).getAllByRole('listitem').map(item => item.textContent))
      .toEqual(['메뉴 관리']);
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollaborationHubFrame } from '../collaboration-hub-frame';

/**
 * 협업 허브 core 셸의 호스트 계약(허브 분해 H1). 셸은 기능 코드를 모르고 hub-tabs-collaboration·shell-links 레지스트리만 읽는다 — 여기서는 두
 * 레지스트리를 가짜 기여로 바꿔 셸이 하는 일만 본다. 실제 쪽지·스크랩 탭은 각 기능의 시험이 실제 레지스트리로 본다.
 * 가짜 기여의 권한·목적지는 core 의 것(사용자 관리·메뉴 관리, USER_READ·MENU_READ)이다 — 생성물은 권한 목록과 화면을 구성으로 줄이므로
 * (Phase 2 10단계 10b) 기능의 화면·권한을 쓰면 그 기능이 빠진 구성에서 셸 규칙이 아니라 대역이 깨진다.
 */

const USER = { id: 'u', permissions: ['USER_READ', 'MENU_READ'], authorizationVersion: 'v1' };
const mocks = vi.hoisted(() => ({
  query: '', replace: vi.fn(), tabs: [] as unknown[], links: [] as unknown[],
  auth: { user: null as unknown, loading: false },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mocks.replace }),
  usePathname: () => '/admin/collaboration',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth, useOptionalAuth: () => mocks.auth }));
vi.mock('@/extensions/generated-hub-tabs-collaboration', () => ({ hubTabsCollaboration: [mocks.tabs] }));
vi.mock('@/extensions/generated-shell-links', () => ({ shellLinks: [mocks.links] }));

import CollaborationHubClient from '../CollaborationHubClient';
import { metadata } from '../page';

const view = (text: string) => function FakeTab() {
  return <CollaborationHubFrame description={`${text} 설명`}><p>{text} 본문</p></CollaborationHubFrame>;
};
const tab = (id: string, order: number, label: string) =>
  ({ id, order, label, view: { Component: view(label) }, visibleWhen: { always: '시험' } });
const tabNames = () => within(screen.getByRole('tablist', { name: '협업 데이터 구분' })).getAllByRole('tab')
  .map((element) => [element.textContent, element.getAttribute('aria-selected')]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query = '';
  mocks.auth = { user: USER, loading: false };
  // 순서는 order 가 정한다(레지스트리 순서가 아니다). 대역 모듈이 같은 배열을 들고 있어 제자리에서 바꾼다. 레지스트리는 협업 허브
  //   전용이라(GAP-SLOT-001) 다른 허브의 탭이 섞일 수 없다 — 경계 계약이 허브 탭 기여의 슬롯과 탭 해석 모듈을 대조한다.
  mocks.tabs.splice(0, Infinity, tab('SCRAPS', 20, '스크랩'), tab('MESSAGES', 10, '쪽지'));
  mocks.links.splice(0, Infinity,
    { id: 'menus', placement: 'collaboration-hub', order: 20, href: '/admin/system/menus', label: '메뉴 관리', visibleWhen: { page: '/admin/system/menus' } },
    { id: 'help', placement: 'header', order: 10, href: '/help', label: '도움말', visibleWhen: { page: '/help' } },
    { id: 'users', placement: 'collaboration-hub', order: 10, href: '/admin/user/manage', label: '사용자 관리', visibleWhen: { page: '/admin/user/manage' } },
  );
});

describe('협업 허브 core 셸', () => {
  it('자기 허브의 탭만 order 순으로 그리고, 페이지 기본 탭을 연다', () => {
    render(<CollaborationHubClient defaultTab="SCRAPS" />);
    expect(tabNames()).toEqual([['쪽지', 'false'], ['스크랩', 'true']]);
    expect(screen.getByText('스크랩 본문')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'collab-tab-SCRAPS');
  });

  it('`?tab=` 은 대소문자를 가리지 않고, 이 구성에 없는 탭이면 기본 탭, 기본 탭도 없으면 첫 탭이다', () => {
    mocks.query = 'tab=messages';
    const first = render(<CollaborationHubClient defaultTab="SCRAPS" />);
    expect(tabNames()).toEqual([['쪽지', 'true'], ['스크랩', 'false']]);
    first.unmount();
    mocks.query = 'tab=COMMUNITY';
    render(<CollaborationHubClient defaultTab="NOPE" />);
    expect(tabNames()).toEqual([['쪽지', 'true'], ['스크랩', 'false']]);
  });

  it('탭 전환은 `tab` 하나만 남긴다', () => {
    mocks.query = 'tab=MESSAGES&q=x';
    render(<CollaborationHubClient />);
    fireEvent.click(screen.getByRole('tab', { name: '스크랩' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/collaboration?tab=SCRAPS', { scroll: false });
  });

  it('머리 링크는 collaboration-hub 배치만 order 순으로 그린다', () => {
    render(<CollaborationHubClient />);
    const actions = screen.getAllByRole('link').filter((link) => /^\/admin\/(?:system|user)\//.test(link.getAttribute('href') ?? ''))
      .map((link) => [link.textContent, link.getAttribute('href')]);
    expect(actions).toEqual([
      ['사용자 관리', '/admin/user/manage'],
      ['메뉴 관리', '/admin/system/menus'],
    ]);
  });

  it('탭이 하나도 없는 구성에서는 빈 상태를 말하고 탭 목록·탭 패널을 그리지 않는다', () => {
    mocks.tabs.splice(0, Infinity);
    mocks.links.splice(0, Infinity);
    render(<CollaborationHubClient />);
    expect(screen.getByRole('heading', { level: 1, name: '협업 및 네트워크 허브' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('이 구성에서 볼 수 있는 협업 목록이 없습니다.');
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tabpanel')).toBeNull();
    // 셸은 core 다 — 빈 구성에서 설명·문서 제목이 이 구성에 없는 기능(쪽지·스크랩)을 말하지 않는다.
    expect(screen.getByText('구성에 포함된 협업 기능의 목록을 탭으로 모아 봅니다.')).toBeInTheDocument();
    expect(screen.queryByText(/쪽지|스크랩/)).toBeNull();
    expect(String(metadata.title)).toBe('협업 목록 | eGov Enterprise');
    expect(String(metadata.description)).not.toMatch(/쪽지|스크랩/);
  });

  it('탭 기여는 있는데 권한으로 모두 가려졌으면 구성이 아니라 권한 때문이라고 말한다', () => {
    mocks.tabs.splice(0, Infinity, { ...tab('MESSAGES', 10, '쪽지'), visibleWhen: { permissions: ['DEPT_READ'] } });
    render(<CollaborationHubClient />);
    expect(screen.getByRole('status')).toHaveTextContent('협업 목록 조회 권한이 없습니다. 필요하면 시스템 관리자에게 문의해 주세요.');
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('권한 상태를 아직 모르는 동안에는 빈 상태를 말하지 않는다', () => {
    mocks.tabs.splice(0, Infinity, { ...tab('MESSAGES', 10, '쪽지'), visibleWhen: { permissions: ['USER_READ'] } });
    mocks.auth = { user: null, loading: true };
    const { container } = render(<CollaborationHubClient />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});

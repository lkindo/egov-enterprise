import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeSection, SlotContributions } from '@/extensions/slots';

/**
 * 업무 홈 셸(core, Phase 2 9단계). 셸은 home-sections 레지스트리의 보이는 항목을 배치마다 순서대로 그리기만 한다 — 이 시험은 레지스트리를
 * 대역으로 바꿔 셸의 규칙만 본다. 기능 조각의 내용은 각 기능 시험과 업무 홈 동등성 그물(WorkHome.equivalence)이 본다.
 *
 * - 등록된 기여가 하나라도 있으면 DASHBOARD_READ 로 진입을 판정한다(없으면 종전 문구로 접근 불가). '보이는 기여' 로 판정하지 않는다 —
 *   그러면 DASHBOARD_READ 도 다른 권한도 없는 사용자가 접근 불가 대신 빈 홈을 본다.
 * - 등록된 기여가 없는 구성(core 프리셋)은 판정 없이 제목·인사와 core 셸의 카드(부서 업무)만 보인다.
 * - 부제는 요약 카드가 있을 때만, 머리 단추 줄과 카드 줄은 항목이 있을 때만 그린다.
 * - [2026-10-20] 늘 비어 있던 활동 구역은 걷었다. core 의 부서 업무 카드는 셸이 직접 그리고, 그 목록 API 의 권한(DEPT_JOB_READ)이
 *   있을 때만 기여 카드와 같은 order 축(28)에 끼운다.
 * 대역 기여의 노출 권한은 core 코드(USER_READ·DEPT_READ)다 — 생성물은 권한 목록을 구성 코드로 줄이므로(Phase 2 10단계 10b) 기능의
 * 코드를 쓰면 그 기능이 빠진 구성에서 타입 검사가 깨진다.
 */
vi.mock('@/app/components/dashboard/DeptJobHomeCard', () => ({ DeptJobHomeCard: () => <li>dept-jobs</li> }));
const session = vi.hoisted(() => ({
  user: { id: 'user', name: '사용자', permissions: [] as string[], authorizationVersion: 'v1' } as
    { id: string; name: string; permissions: string[]; authorizationVersion: string } | null,
  mfaPending: false,
  replace: vi.fn(),
  registry: [] as SlotContributions<'home-sections'>[],
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: session.replace, push: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: session.user, loading: false, mfaPending: session.mfaPending });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/app/components/dashboard/DashboardSkeleton', () => ({ DashboardSkeleton: () => null }));
vi.mock('@/extensions/generated-home-sections', () => ({
  get homeSections() {
    return session.registry;
  },
}));

const { default: UnifiedDashboardClient } = await import('../UnifiedDashboardClient');
const { HOME_SECTION_PERMISSIONS } = await import('@/__tests__/cross-stack/home-section-permissions');
/** 셸이 그리는 core 카드의 노출 권한 — 서버 바인딩 대조(home-section-permission-bindings)와 같은 기대값이다. */
const DEPT_JOB_PERMISSION = HOME_SECTION_PERMISSIONS.core.sections[0].permission;

const section = (id: string, placement: HomeSection['placement'], order: number, extra: Partial<HomeSection> = {}): HomeSection => ({
  id,
  placement,
  order,
  Component: () => (placement === 'cards' ? <li>{id}</li> : <div>{id}</div>),
  visibleWhen: { permissions: ['DASHBOARD_READ'] },
  ...extra,
});

async function renderShell() {
  await act(async () => {
    render(<UnifiedDashboardClient />);
  });
}

describe('업무 홈 셸', () => {
  beforeEach(() => {
    session.user = { id: 'user', name: '사용자', permissions: ['DASHBOARD_READ', 'USER_READ'], authorizationVersion: 'v1' };
    session.mfaPending = false;
    session.replace.mockClear();
    session.registry = [];
  });

  it('등록된 기여가 없으면(core) 판정 없이 제목·인사만 그리고, 활동 구역은 두지 않는다', async () => {
    session.user = { id: 'user', name: '사용자', permissions: [], authorizationVersion: 'v1' };
    await renderShell();

    expect(screen.getByRole('heading', { level: 1, name: '업무 홈' })).toBeInTheDocument();
    expect(screen.getByText(/^안녕하세요, 사용자님\.$/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(document.body.textContent).not.toMatch(/최근 활동/);
  });

  it('core 의 부서 업무 카드는 그 목록 API 권한이 있으면 기여가 없는 구성에서도 판정 없이 보이고 부제를 연다', async () => {
    expect(DEPT_JOB_PERMISSION).toBe('DEPT_JOB_READ');
    session.user = { id: 'user', name: '사용자', permissions: [DEPT_JOB_PERMISSION], authorizationVersion: 'v1' };
    await renderShell();

    expect([...screen.getByRole('list').children].map(item => item.textContent)).toEqual(['dept-jobs']);
    expect(screen.getByText(/^안녕하세요, 사용자님\. 확인할 일과 업무 현황입니다\.$/)).toBeInTheDocument();
  });

  it('🚨 부서 업무 조회 권한이 없으면 core 카드도 그리지 않는다', async () => {
    session.registry = [[section('pending', 'cards', 10)]];
    await renderShell();

    expect([...screen.getByRole('list').children].map(item => item.textContent)).toEqual(['pending']);
    expect(screen.queryByText('dept-jobs')).toBeNull();
  });

  it('🚨 등록된 기여가 있으면 DASHBOARD_READ 가 없을 때 종전 문구로 접근 불가를 알린다', async () => {
    session.registry = [[section('notes', 'cards', 20, { visibleWhen: { permissions: ['USER_READ'] } })]];
    session.user = { id: 'user', name: '사용자', permissions: ['USER_READ'], authorizationVersion: 'v1' };
    await renderShell();

    expect(screen.getByRole('status')).toHaveTextContent('업무 홈 대시보드에 접근할 권한이 없습니다.');
    expect(screen.queryByText('notes')).toBeNull();
  });

  it('🚨 보이는 기여가 하나도 없어도 등록돼 있으면 빈 홈이 아니라 접근 불가다', async () => {
    session.registry = [[section('notes', 'cards', 20, { visibleWhen: { permissions: ['USER_READ'] } })]];
    session.user = { id: 'user', name: '사용자', permissions: [], authorizationVersion: 'v1' };
    await renderShell();

    expect(screen.getByRole('status')).toHaveTextContent('업무 홈 대시보드에 접근할 권한이 없습니다.');
  });

  it('배치마다 순서대로 그리고, 카드가 있을 때만 부제를, core 카드를 order 축에 끼운다', async () => {
    session.user = { id: 'user', name: '사용자', permissions: ['DASHBOARD_READ', 'USER_READ', DEPT_JOB_PERMISSION], authorizationVersion: 'v1' };
    session.registry = [
      [section('lists', 'main', 10), section('task', 'cards', 30), section('new', 'actions', 10)],
      [section('realtime', 'status', 10), section('banner', 'bottom', 10), section('popup', 'overlay', 10)],
      [section('pending', 'cards', 10), section('open', 'actions', 20), section('hidden', 'cards', 5, { visibleWhen: { permissions: ['DEPT_READ'] } })],
      [section('tied', 'cards', 28), section('intro', 'hero', 10)],
    ];
    await renderShell();

    expect(screen.getByText(/^안녕하세요, 사용자님\. 확인할 일과 업무 현황입니다\.$/)).toBeInTheDocument();
    const header = screen.getByRole('heading', { level: 1 }).closest('header') as HTMLElement;
    expect([...header.querySelectorAll('div > div')].map(node => node.textContent)).toEqual(['new', 'open']);
    // 같은 order(28)면 기여 카드가 core 카드 앞이다.
    expect([...screen.getByRole('list').children].map(item => item.textContent)).toEqual(['pending', 'tied', 'dept-jobs', 'task']);
    expect(screen.queryByText('hidden')).toBeNull();
    const order = ['popup', '업무 홈', 'intro', 'pending', 'lists', 'realtime', 'banner'].map(text => screen.getByText(text));
    for (const [index, node] of order.slice(1).entries()) {
      expect(order[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(document.body.textContent).not.toMatch(/최근 활동/);
  });

  it('요약 카드가 없으면 확인할 일을 약속하지 않고 단추·카드 줄을 그리지 않는다', async () => {
    session.registry = [[section('realtime', 'status', 10)]];
    await renderShell();

    expect(screen.getByText(/^안녕하세요, 사용자님\.$/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('realtime')).toBeInTheDocument();
  });

  it.each([false, true])('일반 세션이 없으면 업무 데이터는 숨기고 MFA 대기(%s) 동안만 자동 이동을 유예한다', async (mfaPending) => {
    session.registry = [[section('task', 'cards', 30)]];
    session.user = null;
    session.mfaPending = mfaPending;
    await renderShell();

    expect(screen.queryByText('task')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: '업무 홈을 불러오는 중' })).toBeInTheDocument();
    if (mfaPending) expect(session.replace).not.toHaveBeenCalled();
    else expect(session.replace).toHaveBeenCalledWith('/login');
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// 로더(collaboration pack)를 타입으로 참조한다 — core 투영에서 로더가 걷히면 이 테스트도 함께 빠진다.
// 업무 홈의 dataPromise 속성은 collaboration 블록 안에 있어 core 에는 없다.
import type { loadDashboardData } from '../dashboard-data';

/**
 * [2026-09-26 DIP V1] 업무 홈의 게시판 카드·목록이 사실을 말하는지.
 *
 * - 카드는 목록 길이(최근 5건이라 늘 5 이하)가 아니라 서버가 준 게시판 전체 글 수를 보여 준다.
 * - 전체 글 수가 null 이면(조회 실패) '0건'·'글이 없습니다' 라고 말하지 않는다.
 * - 목록 날짜는 서버가 실제로 싣는 작성 일시(crtDt)에서 온다 — 로더 계약은 page.test.tsx 가 본다.
 */
vi.mock('next/dynamic', () => ({
  default: () => function DynamicStub() {
    return null;
  },
}));
const session = vi.hoisted(() => ({
  user: { id: 'user', userNm: '사용자', role: 'ROLE_USER' } as { id: string; userNm: string; role: string } | null,
  mfaPending: false,
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: session.replace, push: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: session.user, loading: false, mfaPending: session.mfaPending }),
}));
vi.mock('@/app/components/dashboard/DashboardSkeleton', () => ({ DashboardSkeleton: () => null }));

const { default: UnifiedDashboardClient } = await import('../UnifiedDashboardClient');

type DashboardData = NonNullable<Awaited<ReturnType<typeof loadDashboardData>>>;

async function renderHome(data: Partial<DashboardData> | null) {
  const dataPromise = Promise.resolve(data === null ? null : {
    initialNotiList: [],
    initialTaskList: [],
    notiListTotal: 0,
    taskListTotal: 0,
    pendingApprovalCount: 0,
    ...data,
  } as DashboardData);
  await act(async () => {
    // 업무 홈의 '안 읽은 쪽지' 카드가 쿼리를 쓰므로 앱과 같이 QueryClient 안에서 그린다(2026-10-01).
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Suspense fallback={null}>
          <UnifiedDashboardClient dataPromise={dataPromise} />
        </Suspense>
      </QueryClientProvider>,
    );
    await dataPromise;
  });
}

describe('업무 홈 게시판 카드·목록 (DIP V1)', () => {
  beforeEach(() => {
    session.user = { id: 'user', userNm: '사용자', role: 'ROLE_USER' };
    session.mfaPending = false;
    session.replace.mockClear();
  });

  it.each([false, true])('일반 세션이 없으면 업무 데이터는 숨기고 MFA 대기(%s) 동안만 자동 이동을 유예한다', async (mfaPending) => {
    session.user = null;
    session.mfaPending = mfaPending;
    await renderHome({ initialTaskList: [{ id: 'private', title: '세션 전용 업무', date: '', isNew: false }] });
    expect(screen.queryByText('세션 전용 업무')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '새 게시글 작성' })).not.toBeInTheDocument();
    if (mfaPending) expect(session.replace).not.toHaveBeenCalled();
    else expect(session.replace).toHaveBeenCalledWith('/login');
  });

  it('접근불가 홈은 이유와 다음 행동을 알리고 0건 목록이나 업무 링크로 위장하지 않는다', async () => {
    await renderHome(null);

    expect(screen.getByRole('heading', { name: '업무 홈', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('업무 홈 대시보드에 접근할 권한이 없습니다.');
    expect(screen.getByRole('status')).toHaveTextContent('메뉴에서 이용 가능한 업무를 선택해 주세요.');
    expect(screen.queryByText('0건')).toBeNull();
    expect(screen.queryByText('새 공지사항이 없습니다.')).toBeNull();
    expect(screen.queryByText('업무게시판에 등록된 글이 없습니다.')).toBeNull();
    expect(screen.queryByRole('link', { name: '새 게시글 작성' })).toBeNull();
    expect(screen.queryByRole('link', { name: '결재함 열기' })).toBeNull();
  });

  it('🚨 카드는 목록 길이가 아니라 게시판 전체 글 수를 보여 준다', async () => {
    await renderHome({
      initialTaskList: [{ id: '1', title: '최근 글', date: '2026-09-26', isNew: false }],
      taskListTotal: 37,
      notiListTotal: 12,
    });

    const taskCard = screen.getByText('업무게시판 글').closest('li')!;
    const noticeCard = screen.getByText('공지사항').closest('li')!;
    expect(taskCard).toHaveTextContent('37건');
    expect(noticeCard).toHaveTextContent('12건');
  });

  it('🚨 조회에 실패하면(전체 글 수 null) 0건·글 없음이라고 말하지 않는다', async () => {
    await renderHome({ taskListTotal: null, notiListTotal: 3 });

    expect(screen.getByText('업무게시판 글').closest('li')).toHaveTextContent('조회 실패');
    expect(screen.getByText('목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('업무게시판에 등록된 글이 없습니다.')).toBeNull();
    // 조회에 성공한 공지 목록은 종전대로 비어 있음을 말한다.
    expect(screen.getByText('새 공지사항이 없습니다.')).toBeInTheDocument();
  });

  it('목록 날짜를 그대로 보여 준다', async () => {
    await renderHome({
      initialNotiList: [{ id: '5', title: '공지', date: '2026-09-25', isNew: false }],
      notiListTotal: 1,
    });

    expect(screen.getByText('2026-09-25')).toBeInTheDocument();
  });
});

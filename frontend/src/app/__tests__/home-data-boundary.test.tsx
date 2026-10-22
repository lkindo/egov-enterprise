import { act, render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { isValidElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppQueryClient } from '@/lib/query/list-query-defaults';

/**
 * 업무 홈 서버 자식(home-data-boundary.tsx, Phase 2 9단계). 기여가 적은 조회를 서버에서 미리 채우는 규칙을 본다.
 * - DASHBOARD_READ 가 없으면(셸이 접근 불가를 알린다) 아무 API 도 부르지 않는다.
 * - 보이는 기여의 조회를 한 번씩 채워 첫 렌더에 값이 있다 — 브라우저 조회가 없다.
 * - boundary 조회(게시판)의 실패는 서버에서 다시 던진다(라우트 오류 경계로 간다). section 조회(결재 대기 수)의 실패는 삼킨다.
 * - 토큰이 없으면 로그인으로 보낸다(종전 대시보드 로더와 같다).
 */
const server = vi.hoisted(() => ({
  permissions: [] as string[],
  token: 'token' as string | undefined,
  dashboard: 'ok' as 'ok' | 500,
  approvals: 'ok' as 'ok' | 503,
  calls: [] as string[],
}));

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
const ok = (data: unknown) => ({ success: true, code: 'S000', message: 'success', data });

vi.mock('@/lib/api/client', () => {
  const getRaw = async (url: string) => {
    server.calls.push(url);
    if (url === 'dashboard') {
      if (server.dashboard === 500) throw httpError(500);
      return ok({ taskList: [], notiList: [], taskListTotal: 37, notiListTotal: 12 });
    }
    if (url === 'approvals/pending') {
      if (server.approvals === 503) throw httpError(503);
      return ok({ list: [], total: 3, page: 0, size: 1, totalPage: 3 });
    }
    // 콘텐츠 페이지 소개(ADR-0039) — 지정이 없는 것이 기본이다. 응답은 늘 객체이고 page 가 비어 있다
    //   (본문 data 를 비우면 생성 응답 계약이 위반으로 읽어 모든 사용자의 업무 홈에 '불러오지 못했습니다' 가 보였다).
    if (url === 'content-home') return ok({ page: null });
    throw new Error(`가짜 서버에 없는 조회: ${url}`);
  };
  return { default: { getRaw, requestRaw: async (config: { url: string }) => getRaw(config.url) } };
});
vi.mock('@/services/foundation/auth/authService', () => ({
  authService: { getCurrentUser: async () => ({ id: 'user', name: '사용자', permissions: server.permissions, authorizationVersion: 'v1' }) },
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'accessToken' && server.token ? { value: server.token } : undefined) }),
}));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`NEXT_REDIRECT ${path}`); },
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { id: 'user', name: '사용자', permissions: server.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});

const { HomeDataBoundary } = await import('../home-data-boundary');
const { BoardTaskTotalCard } = await import('@/app/components/dashboard/BoardHome');
const { ApprovalPendingCard } = await import('@/app/components/dashboard/ApprovalHome');

const CHILD = <p>업무 홈 셸</p>;
const ALL = ['DASHBOARD_READ', 'APPROVAL_READ', 'NOTE_READ'];

async function boundary() {
  return (await HomeDataBoundary({ children: CHILD })) as ReactElement<{ state?: { queries: { queryKey: unknown }[] } }>;
}

describe('업무 홈 서버 자식', () => {
  beforeEach(() => {
    server.permissions = [...ALL];
    server.token = 'token';
    server.dashboard = 'ok';
    server.approvals = 'ok';
    server.calls = [];
  });

  it('DASHBOARD_READ 가 없으면 아무 API 도 부르지 않고 셸만 넘긴다', async () => {
    server.permissions = ['APPROVAL_READ', 'NOTE_READ'];
    const element = await boundary();

    expect(server.calls).toEqual([]);
    expect(isValidElement(element) && element.props.state).toBeFalsy();
  });

  it('보이는 기여의 조회를 한 번씩 미리 채워 첫 렌더에 값이 있고 브라우저 조회가 없다', async () => {
    const element = await boundary();
    // 게시판 기여 네 조각은 같은 조회다 — 한 번만 부른다.
    expect([...server.calls].sort()).toEqual(['approvals/pending', 'content-home', 'dashboard']);
    expect(element.props.state?.queries.map(query => query.queryKey)).toEqual(
      expect.arrayContaining([['home', 'board'], ['approvals', 'list', 'PENDING', { page: 1, size: 1 }]]),
    );

    server.calls = [];
    await act(async () => {
      render(
        <QueryClientProvider client={createAppQueryClient()}>
          {element}
          <ul><BoardTaskTotalCard /><ApprovalPendingCard /></ul>
        </QueryClientProvider>,
      );
    });
    expect(screen.getByText('업무 홈 셸')).toBeInTheDocument();
    expect(screen.getByText('업무게시판 글').closest('li')).toHaveTextContent('37건');
    expect(screen.getByText('결재 대기').closest('li')).toHaveTextContent('3건');
    expect(server.calls).toEqual([]);
  });

  it('게시판 조회 실패는 서버에서 다시 던진다 — 0건 홈이 아니라 라우트 오류 경계로 간다', async () => {
    server.dashboard = 500;
    await expect(boundary()).rejects.toMatchObject({ response: { status: 500 } });
  });

  it('결재 대기 수 조회 실패는 삼킨다 — 그 카드가 스스로 실패를 말한다', async () => {
    server.approvals = 503;
    const element = await boundary();
    const keys = element.props.state?.queries.map(query => query.queryKey);
    expect(keys).toHaveLength(2);
    expect(keys).toEqual(expect.arrayContaining([['home', 'board'], ['cms', 'home-intro']]));
  });

  it('보이지 않는 기여의 조회는 부르지 않는다', async () => {
    server.permissions = ['DASHBOARD_READ'];
    await boundary();
    // 콘텐츠 페이지 소개는 늘 보이는 기여라(로그인만 요구한다) 권한과 무관하게 부른다.
    expect([...server.calls].sort()).toEqual(['content-home', 'dashboard']);
  });

  it('토큰이 없으면 로그인으로 보낸다', async () => {
    server.token = undefined;
    await expect(boundary()).rejects.toThrow('NEXT_REDIRECT /login');
    expect(server.calls).toEqual([]);
  });
});

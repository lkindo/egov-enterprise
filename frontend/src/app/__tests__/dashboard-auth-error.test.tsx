import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * 권한 부족 되돌림 안내 (PD-UX-002 Q4).
 *
 * `proxy.ts` 는 /admin 접근이 role 로 막히면 루트로 되돌리며 `?auth_error=unauthorized` 를 붙인다
 * (443행). 그런데 그 값을 **읽는 곳이 저장소 전체에 없었다** — 사용자는 링크를 눌렀는데 아무 설명
 * 없이 홈으로 순간이동할 뿐이라, 클릭이 실패한 것인지 원래 그런 것인지 알 수 없었다.
 *
 * ⚠ 이 테스트가 red 인데 안내를 지워 통과시키는 것은 수정이 아니다. proxy 의 producer 를 함께
 *   걷어내야 '쓰고 안 읽는' 상태로 되돌아가지 않는다.
 */

// 업무 데이터를 미리 채우는 서버 자식은 이 계약의 대상이 아니다. 끝나지 않는 서버 자식으로 바꿔, 안내가 그 대기와 무관하게
// 그려지는지 본다(Phase 2 9단계 — page 본문은 searchParams 만 기다린다).
const boundary = vi.hoisted(() => ({ calls: 0 }));
vi.mock('../home-data-boundary', () => ({
  HomeDataBoundary: ({ children }: { children: unknown }) => {
    boundary.calls += 1;
    return children;
  },
}));

// 대시보드 본문은 이 계약의 대상이 아니다. 무거운 클라이언트를 실제로 띄우지 않는다.
vi.mock('next/dynamic', () => ({
  default: () => function DashboardStub() {
    return <div data-testid="dashboard-body" />;
  },
}));

vi.mock('@/app/components/dashboard/DashboardSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton" />,
}));

const { default: UnifiedDashboardPage } = await import('../page');

async function renderRoot(params: Record<string, string>) {
  const element = await UnifiedDashboardPage({ searchParams: Promise.resolve(params) });
  return render(element);
}

describe('권한 부족 되돌림 안내', () => {
  it('auth_error=unauthorized 로 되돌려지면 이유를 말한다', async () => {
    await renderRoot({ auth_error: 'unauthorized' });

    expect(screen.getByTestId('dashboard-auth-error'))
      .toHaveTextContent('접근 권한이 없어 홈으로 이동했습니다.');
  });

  it('평상시 홈 방문에는 안내하지 않는다', async () => {
    await renderRoot({});

    expect(screen.queryByTestId('dashboard-auth-error')).toBeNull();
  });

  it('다른 값은 권한 부족으로 읽지 않는다', async () => {
    // 존재만 보면 `?auth_error=` 아무 값이나 이 안내를 띄운다.
    await renderRoot({ auth_error: 'something-else' });

    expect(screen.queryByTestId('dashboard-auth-error')).toBeNull();
  });

  it('보조기술에 알리되 첫 탐색을 끊지 않는다 — status(polite) 이고 alert 가 아니다', async () => {
    await renderRoot({ auth_error: 'unauthorized' });

    const notice = screen.getByTestId('dashboard-auth-error');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice.getAttribute('role')).not.toBe('alert');
  });

  it('막힌 자원의 이름을 노출하지 않는다', async () => {
    await renderRoot({ auth_error: 'unauthorized' });

    // 되돌려졌다는 사실만 말한다. 경로를 알려 주면 존재 여부가 새어 나간다.
    expect(screen.getByTestId('dashboard-auth-error').textContent).not.toMatch(/\/admin/);
  });

  it('page 본문은 searchParams 만 기다린다 — 업무 데이터 대기는 Suspense 안의 서버 자식 몫이다', async () => {
    // page 를 부르는 것만으로는 서버 자식이 돌지 않는다(트리의 요소일 뿐이다). 본문에서 데이터를 기다리면 업무 홈 대기 동안
    // 루트 전체화면 덮개(loading.tsx)가 보이고 이 안내도 늦어진다.
    boundary.calls = 0;
    const element = await UnifiedDashboardPage({ searchParams: Promise.resolve({ auth_error: 'unauthorized' }) });
    expect(boundary.calls).toBe(0);
    render(element);
    expect(screen.getByTestId('dashboard-auth-error')).toHaveTextContent('접근 권한이 없어 홈으로 이동했습니다.');

    const source = readFileSync(join(process.cwd(), 'src', 'app', 'page.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(source.match(/\bawait\b[^;]*/g)).toEqual(['await searchParams']);
    expect(source).toMatch(/<Suspense fallback=\{<DashboardLoading \/>\}>\s*<HomeDataBoundary>/);
  });

  it('안내와 무관하게 대시보드 본문은 그대로 렌더된다', async () => {
    await renderRoot({ auth_error: 'unauthorized' });

    expect(screen.getByTestId('dashboard-body')).toBeInTheDocument();
  });
});

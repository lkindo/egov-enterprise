import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * 통계 요약(/admin/stats)의 '전체 등록 건수' 칸 — 게시판의 stats-panels 기여(허브 분해 H4).
 *
 * 칸은 게시판이 있을 때만 있다. 종전에는 요약 화면이 pack 마커로 직접 두었고, 이제 게시판 기여의 overview-card 를 셸이 그린다.
 * 셸 전용 시험(AdminStatsClient.summary-values)은 레지스트리를 빈 배열로 대역하므로, 이 칸의 값 규칙은 여기서 본다 — 조회 실패와
 * 읽을 수 없는 값을 0 으로 쓰지 않는다(DEC-OPS-100). 노출 술어가 로그인 주체를 보므로 통계 조회 권한을 가진 주체를 대역한다.
 */
const auth = vi.hoisted(() => ({ user: { permissions: ['STATS_ADMIN_READ'], authorizationVersion: 'test' } as unknown }));
vi.mock('@/contexts/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/AuthContext')>()),
  useOptionalAuth: () => ({ user: auth.user }),
}));
vi.mock('@/app/components/ui/standard-chart-wrapper', () => ({
  StandardChartWrapper: () => <div data-testid="connect-chart" />,
}));

import AdminStatsClient from '../../AdminStatsClient';

/** 요약 칸은 제목 문단과 값 문단을 한 상자에 담는다. */
function summaryCard(title: string): HTMLElement {
  return screen.getByText(title).parentElement as HTMLElement;
}

describe('통계 요약 — 게시판의 전체 등록 건수 칸', () => {
  it('셸 칸 뒤에 전체 등록 건수 칸을 두고 0 은 측정값 그대로 보인다', () => {
    render(<AdminStatsClient initialSummary={{ totalUsers: 3, todayConnects: 1, totalPosts: 0 }} initialConnectData={[]} />);

    const titles = ['누적 사용자', '금일 성공 로그인', '전체 등록 건수'];
    const order = titles.map((title) => summaryCard(title));
    expect(order[0].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(summaryCard('전체 등록 건수')).getByText('0')).toBeInTheDocument();
  });

  it('조회에 실패하면 전체 등록 건수도 0 대신 조회 실패를 말하고, 읽을 수 없는 값은 - 다', () => {
    const { unmount } = render(
      <AdminStatsClient initialSummary={null} initialConnectData={[]} loadError="통계 데이터를 불러오지 못했습니다." />,
    );
    expect(within(summaryCard('전체 등록 건수')).getByText('조회 실패')).toBeInTheDocument();
    expect(within(summaryCard('전체 등록 건수')).queryByText('0')).toBeNull();
    unmount();

    render(<AdminStatsClient initialSummary={{ totalUsers: 3, todayConnects: 1, totalPosts: null }} initialConnectData={[]} />);
    expect(within(summaryCard('전체 등록 건수')).getByText('-')).toBeInTheDocument();
  });

  it('통계 조회 권한을 모르는 주체에게는 칸을 그리지 않는다(노출 술어가 요약 API 권한과 같다)', () => {
    const saved = auth.user;
    auth.user = null;
    try {
      render(<AdminStatsClient initialSummary={{ totalUsers: 3, todayConnects: 1, totalPosts: 7 }} initialConnectData={[]} />);
      expect(screen.queryByText('전체 등록 건수')).not.toBeInTheDocument();
      expect(screen.getByText('누적 사용자')).toBeInTheDocument();
    } finally {
      auth.user = saved;
    }
  });
});

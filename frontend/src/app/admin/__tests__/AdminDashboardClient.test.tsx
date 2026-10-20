import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ADMIN_DASHBOARD_QUERY_PERMISSIONS } from '../admin-dashboard-queries';

/**
 * [2026-10-20] 관리자 홈(/admin). ① 보는 사람에게 권한이 있는 조회만 부르고 권한이 없는 카드는 그리지 않는다 — '조회 실패' 경고로
 * 권한 부족을 말하지 않는다(DEC-OPS-152·185). ② 이름은 원천과 같다 — 그 목록은 시스템 로그(4xx 이상 실패 요청)이지 보안 감사가
 * 아니고, 링크는 리다이렉트 스텁이 아니라 시스템 로그 화면이다. ③ 운영 신호는 서버가 실어 준 것만 그리고 셀 수 없으면 0건이 아니다.
 */
const api = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; permissions: string[]; authorizationVersion: string },
  getAuditLogs: vi.fn(),
  getUserList: vi.fn(),
  getAuthorList: vi.fn(),
  getOperationalSignals: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: api.user, loading: false });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/services/foundation/system/AuditAdminService', () => ({ auditAdminService: { getAuditLogs: api.getAuditLogs } }));
vi.mock('@/services/foundation/system/UserAdminService', () => ({ userAdminService: { getUserList: api.getUserList } }));
vi.mock('@/services/foundation/system/AuthorAdminService', () => ({ authorAdminService: { getAuthorList: api.getAuthorList } }));
vi.mock('@/services/foundation/system/AdminDashboardService', () => ({
  adminDashboardService: { getOperationalSignals: api.getOperationalSignals },
}));

const { default: AdminDashboardClient } = await import('../AdminDashboardClient');

/** 관리자 기본 그룹(ROLE_ADMIN) — 후속 작업 조회(DWORK_READ)는 기본 그룹에 없어 따로 준다. */
const ADMIN = ['DASHBOARD_ADMIN_READ', 'USER_READ', 'AUTHRT_READ', 'SYS_LOG_READ'];
/** 감사 담당 묶음(log-audit-viewer)의 관리자 홈 관련 권한 — 사용자·권한 조회가 없다. */
const LOG_AUDIT_VIEWER = ['DASHBOARD_ADMIN_READ', 'DWORK_READ', 'SYS_LOG_READ', 'LOGIN_LOG_READ', 'ADT_LOG_READ'];

const OBSERVED_AT = '2026-10-19T23:30:00Z';
const SYS_LOG = { sysLogSn: 9, srvcNm: 'BoardApiController', methodNm: 'getBoard', dmndUserId: 'user01', ocrnYmd: '20261020', rqesterIp: '10.0.0.1' };

function signIn(permissions: string[]) {
  api.user = { id: 'admin', name: '관리자', permissions, authorizationVersion: 'v1' };
}

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <AdminDashboardClient />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

/** 카드 제목(p)에서 카드로 — 목적지가 있으면 링크, 없으면 카드 상자다. */
const card = (title: string) => {
  const heading = screen.getByText(title, { selector: 'p' });
  return (heading.closest('a') ?? heading.closest('div.rounded-md')) as HTMLElement;
};

describe('관리자 홈 — 권한에 맞는 조회와 원천에 맞는 이름', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAuditLogs.mockResolvedValue({ list: [SYS_LOG], total: 61 });
    api.getUserList.mockResolvedValue({ list: [], total: 2 });
    api.getAuthorList.mockResolvedValue({ list: [], total: 3 });
    api.getOperationalSignals.mockResolvedValue({ observedAt: OBSERVED_AT, signals: [] });
  });

  it('관리자 기본 그룹: 세 카드·운영 신호·최근 실패 요청을 그리고 실패 요청은 시스템 로그 화면으로 잇는다', async () => {
    signIn(ADMIN);
    api.getOperationalSignals.mockResolvedValue({ observedAt: OBSERVED_AT, signals: [
      { kind: 'LOCKED_ACCOUNTS', count: 2 }, { kind: 'FAILED_REQUESTS_TODAY', count: 5 },
    ] });
    renderHome();

    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(await screen.findByText('3개 그룹')).toBeInTheDocument();
    expect(await screen.findByText('61')).toBeInTheDocument();
    const failedRequests = card('실패 요청 로그');
    expect(failedRequests).toHaveAttribute('href', '/admin/system/logs/system');
    expect(within(failedRequests).getByText('시스템 로그에 기록된 실패 요청(4xx 이상) 전체 건수')).toBeInTheDocument();

    const signals = (await screen.findByRole('heading', { level: 2, name: '운영 신호' })).closest('section') as HTMLElement;
    expect(within(signals).getByText('2건')).toBeInTheDocument();
    expect(within(signals).getByText('5건')).toBeInTheDocument();
    // 관측 시각은 한국 시각이다(서버는 UTC 로 보낸다). 시각은 <time> 이 기계용 원값을 함께 싣는다.
    expect(within(signals).getByText(/DB 에서 센 값입니다/)).toHaveTextContent('관측 시각 2026-10-20 08:30:00');
    expect(within(signals).getByText('2026-10-20 08:30:00').tagName).toBe('TIME');
    expect(card('잠긴 계정')).toHaveAttribute('href', '/admin/user/manage');
    expect(card('오늘 실패 요청')).toHaveAttribute('href', '/admin/system/logs/system');
    // 서버가 싣지 않은 신호(후속 작업 조회 권한 없음)는 그리지 않는다.
    expect(screen.queryByText('실패한 후속 작업')).toBeNull();

    expect(screen.getByRole('heading', { level: 2, name: '최근 실패 요청' })).toBeInTheDocument();
    expect(await screen.findByText('BoardApiController.getBoard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '전체 보기' })).toHaveAttribute('href', '/admin/system/logs/system');
    expect(screen.getByRole('link', { name: '실패 요청 로그' })).toHaveAttribute('href', '/admin/system/logs/system');
    // 이름은 원천과 같다 — 보안 감사가 아니고, 리다이렉트 스텁으로 가지 않는다.
    expect(document.body.textContent).not.toMatch(/보안 감사|감사 로그 건수/);
    expect(document.querySelector('a[href="/admin/system/audit"]')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('🚨 감사 담당 묶음: 사용자·권한 조회를 부르지 않고 그 카드를 그리지 않으며, 조회 실패 경고를 띄우지 않는다', async () => {
    signIn(LOG_AUDIT_VIEWER);
    api.getOperationalSignals.mockResolvedValue({ observedAt: OBSERVED_AT, signals: [
      { kind: 'FAILED_DURABLE_JOBS', count: 1 }, { kind: 'FAILED_REQUESTS_TODAY', count: 4 },
    ] });
    renderHome();

    expect(await screen.findByText('1건')).toBeInTheDocument();
    expect(card('실패한 후속 작업')).toHaveAttribute('href', '/admin/system/durable-jobs');
    expect(await screen.findByText('61')).toBeInTheDocument();
    expect(api.getUserList).not.toHaveBeenCalled();
    expect(api.getAuthorList).not.toHaveBeenCalled();
    expect(screen.queryByText('등록 사용자')).toBeNull();
    expect(screen.queryByText('권한 그룹')).toBeNull();
    expect(screen.queryByText('조회 실패')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('link', { name: '사용자 확인' })).toBeNull();
    expect(screen.queryByRole('link', { name: '권한 그룹 관리' })).toBeNull();
  });

  it('관리자 홈 권한만 있으면 아무 목록도 부르지 않고, 볼 수 있는 현황이 없다고 말한다', async () => {
    signIn(['DASHBOARD_ADMIN_READ']);
    renderHome();

    expect(await screen.findByRole('status')).toHaveTextContent('이 계정으로 볼 수 있는 관리 현황이 없습니다.');
    expect(api.getOperationalSignals).toHaveBeenCalledTimes(1);
    expect(api.getAuditLogs).not.toHaveBeenCalled();
    expect(api.getUserList).not.toHaveBeenCalled();
    expect(api.getAuthorList).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { level: 2, name: '운영 신호' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: '최근 실패 요청' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('셀 수 없는 운영 신호는 0건이 아니라 조회 실패라고 말한다', async () => {
    signIn([...ADMIN, 'DWORK_READ']);
    api.getOperationalSignals.mockResolvedValue({ observedAt: OBSERVED_AT, signals: [
      { kind: 'FAILED_DURABLE_JOBS', count: null }, { kind: 'LOCKED_ACCOUNTS', count: 0 },
    ] });
    renderHome();

    const signals = (await screen.findByRole('heading', { level: 2, name: '운영 신호' })).closest('section') as HTMLElement;
    expect(within(card('실패한 후속 작업')).getByText('조회 실패')).toBeInTheDocument();
    expect(within(signals).getByText('0건')).toBeInTheDocument();
  });

  it('부른 조회가 실패하면 그 조회만 경고에 적는다', { timeout: 15000 }, async () => {
    signIn(ADMIN);
    api.getOperationalSignals.mockRejectedValue(new Error('signals down'));
    renderHome();

    // 화면의 조회는 한 번 다시 시도한다(5초 뒤) — 그 뒤에 실패를 알린다.
    const alert = await screen.findByRole('alert', undefined, { timeout: 8000 });
    expect(alert).toHaveTextContent('운영 신호 조회에 실패했습니다.');
    expect(alert).not.toHaveTextContent('사용자 수');
    await waitFor(() => expect(screen.getByText('3개 그룹')).toBeInTheDocument());
  });

  it('서버 미리 채우기는 화면과 같은 조회 권한을 쓴다', () => {
    expect(ADMIN_DASHBOARD_QUERY_PERMISSIONS).toEqual({
      recentFailedRequests: 'SYS_LOG_READ',
      users: 'USER_READ',
      authors: 'AUTHRT_READ',
      operationalSignals: 'DASHBOARD_ADMIN_READ',
    });
  });
});

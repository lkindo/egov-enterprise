import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inProjection } from '@/test-utils/projection';

/**
 * 감시 허브 탭 동등성 그물(허브 분해 H0). 부가 탭(하네스)을 슬롯 기여로 옮기기 전의 탭 동작을 고정한다.
 *
 * 고정하는 것: 권한 집합별 탭 이름·순서(지금은 권한과 무관하게 같다), `?tab=` 해석(대소문자·옛 이름 HEALTH·퇴역 값)과
 * 페이지 기본 탭, 탭 전환의 URL(소문자 탭 값, 쪽 번호를 버린다), 탭별 제목, 상세의 샘플 고지, 반출 안내 문구.
 * 하네스·댓글 탭은 그 탭의 소스가 투영으로 빠진 생성물에서 기대 목록에서 빠진다. 하네스 탭은 시연 기능의 hub-tabs 기여다(허브 분해 H3).
 */

const harnessInProjection = inProjection('frontend/src/extensions/showcase/hub-tabs.ts');
const commentsInProjection = inProjection('frontend/src/services/business/comment/commentService.ts');
const CORE_TABS = ['시스템 로그(감사 보기)', '시스템 로그', '로그인 시도 이력', '가동 상태'];
const ALL_TABS = [...CORE_TABS, ...(harnessInProjection ? ['하네스 아틀라스'] : []), ...(commentsInProjection ? ['사용자 의견 관리'] : [])];

const mocks = vi.hoisted(() => ({
  query: '',
  pathname: '/admin/system/monitoring/hub',
  replace: vi.fn(),
  permissions: [] as string[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { id: 'u', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('next/dynamic', () => ({ default: () => function DynamicPanel() { return <div />; } }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
const page = (list: unknown[]) => ({ list, total: list.length, totalPage: 1 });
vi.mock('@/services/foundation/system/AuditAdminService', () => ({ auditAdminService: { getAuditLogs: async () => page([]) } }));
vi.mock('@/services/foundation/system/SystemLogAdminService', () => ({
  systemLogAdminService: {
    getSystemLogs: async () => page([{ sysLogSn: 22, srvcNm: 'SYSTEM', methodNm: 'healthCheck', ocrnYmd: '20260815' }]),
    getLoginLogs: async () => page([]),
  },
}));
vi.mock('@/services/foundation/system/CommentAdminService', () => ({
  commentAdminService: { getComments: async () => page([]), deleteComment: vi.fn() },
}));
vi.mock('@/services/foundation/system/MonitoringAdminService', () => ({
  monitoringAdminService: { getHealth: async () => ({ status: 'UP', components: {} }), getCpuUsage: async () => 1, getMemoryUsage: async () => 1 },
}));
vi.mock('@/services/foundation/system/AttachmentIntegrityService', () => ({ attachmentIntegrityService: { scan: vi.fn() } }));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) =>
    (isOpen ? <section aria-label={title}>{children}</section> : null),
}));
vi.mock('@/app/components/ui/data-export-excel', () => ({ DataExportExcel: () => <button type="button">CSV 반출</button> }));

import MonitoringHubClient from '../MonitoringHubClient';

function renderHub(query: string, defaultTab?: Parameters<typeof MonitoringHubClient>[0]['defaultTab']) {
  mocks.query = query;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MonitoringHubClient defaultTab={defaultTab} /></QueryClientProvider>);
}

/** 탭 이름(아이콘 대역의 글자는 뺀다)과 선택 상태. */
const tabState = () => within(screen.getByRole('tablist', { name: '모니터링 허브 영역 선택' })).getAllByRole('tab').map(tab => {
  const label = tab.cloneNode(true) as HTMLElement;
  label.querySelectorAll('[data-testid^="icon-"]').forEach(icon => icon.remove());
  return [label.textContent, tab.getAttribute('aria-selected')];
});
const selected = (name: string, tabs = ALL_TABS) => tabs.map(label => [label, String(label === name)]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = '/admin/system/monitoring/hub';
  mocks.permissions = ['OPS_READ', 'SYS_LOG_READ', 'WEB_LOG_READ', 'LOGIN_LOG_READ'];
});

describe('감시 허브 탭 동등성(허브 분해 전)', () => {
  it.each([
    ['로그 조회 권한만', ['OPS_READ', 'SYS_LOG_READ', 'WEB_LOG_READ', 'LOGIN_LOG_READ']],
    ['+ 댓글 전체 조회', ['OPS_READ', 'SYS_LOG_READ', 'WEB_LOG_READ', 'LOGIN_LOG_READ', 'COMMENT_READ_ALL']],
    ['+ 댓글 삭제 대행', ['OPS_READ', 'SYS_LOG_READ', 'WEB_LOG_READ', 'LOGIN_LOG_READ', 'COMMENT_READ_ALL', 'COMMENT_DELETE_ALL']],
    ['댓글 권한만', ['COMMENT_READ_ALL']],
  ])('탭 목록과 순서는 권한 집합과 무관하다 — %s', (_label, permissions) => {
    mocks.permissions = permissions;
    renderHub('');
    expect(tabState()).toEqual(selected('시스템 로그(감사 보기)'));
  });

  it.each([
    ['tab=security', '시스템 로그(감사 보기)'],
    ['tab=SYSTEM', '시스템 로그'],
    ['tab=login', '로그인 시도 이력'],
    ['tab=observability', '가동 상태'],
    ['tab=health', '가동 상태'],
    ['tab=topology', '시스템 로그(감사 보기)'],
    ['tab=policy', '시스템 로그(감사 보기)'],
  ])('`?%s` 는 %s 탭을 연다', (query, label) => {
    renderHub(query);
    expect(tabState()).toEqual(selected(label));
    expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument();
  });

  if (harnessInProjection) it('`?tab=harness` 는 하네스 탭을 열고, 하네스 상세에는 샘플 고지를 붙인다', () => {
    renderHub('tab=harness');
    expect(tabState()).toEqual(selected('하네스 아틀라스'));
    fireEvent.click(screen.getByRole('button', { name: /Deep Context Mapper 엔진 상세 보기/ }));
    const detail = screen.getByRole('region', { name: '선택 항목 상세' });
    expect(within(detail).getByText(/샘플 데이터/)).toBeInTheDocument();
  });

  if (commentsInProjection) it('`?tab=comments` 와 댓글 화면의 기본 탭은 의견 탭이다', () => {
    const first = renderHub('tab=comments');
    expect(tabState()).toEqual(selected('사용자 의견 관리'));
    first.unmount();
    mocks.pathname = '/admin/system/comments';
    renderHub('', 'COMMENTS');
    expect(tabState()).toEqual(selected('사용자 의견 관리'));
  });

  it('실제 로그 상세에는 샘플 고지가 없다', async () => {
    renderHub('tab=system');
    fireEvent.click((await screen.findAllByRole('button', { name: /상세 열기/ }))[0]);
    const detail = await screen.findByRole('region', { name: '선택 항목 상세' });
    expect(within(detail).queryByText(/샘플 데이터/)).toBeNull();
  });

  it('탭 전환은 소문자 탭 값만 남기고 쪽 번호와 다른 쿼리를 버린다', () => {
    renderHub('tab=system&page=3&q=x');
    act(() => fireEvent.click(screen.getByRole('tab', { name: '로그인 시도 이력' })));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/system/monitoring/hub?tab=login', { scroll: false });
  });

  it('목록이 없는 탭의 반출 안내 문구', () => {
    renderHub('tab=observability');
    fireEvent.click(screen.getByRole('button', { name: /리포트 스냅샷/ }));
    const modal = screen.getByRole('region', { name: '현재 조회 결과 반출' });
    expect(within(modal).getByText('현재 탭은 목록 데이터가 없어 반출할 수 없습니다. 시스템 로그(감사 보기)·시스템 로그·로그인 시도 이력·서비스 피드백 탭에서 실행해 주세요.'))
      .toBeInTheDocument();
  });
});

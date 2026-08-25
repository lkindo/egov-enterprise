import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MonitoringHubClient from '../MonitoringHubClient';

const mocks = vi.hoisted(() => ({
  query: '',
  replace: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  audit: vi.fn(),
  system: vi.fn(),
  login: vi.fn(),
  comments: vi.fn(),
  deleteComment: vi.fn(),
  health: vi.fn(),
  cpu: vi.fn(),
  memory: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/system/monitoring',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));

vi.mock('next/dynamic', () => ({
  default: () => function DynamicPanel() {
    return <div data-testid="dynamic-panel">동적 관측 패널</div>;
  },
}));

vi.mock('@/lib/hooks/use-debounced-value', () => ({
  useDebouncedValue: (value: string) => value,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

vi.mock('@/services/foundation/system/AuditAdminService', () => ({
  auditAdminService: { getAuditLogs: mocks.audit },
}));

vi.mock('@/services/foundation/system/SystemLogAdminService', () => ({
  systemLogAdminService: {
    getSystemLogs: mocks.system,
    getLoginLogs: mocks.login,
  },
}));

vi.mock('@/services/foundation/system/CommentAdminService', () => ({
  commentAdminService: {
    getComments: mocks.comments,
    deleteComment: mocks.deleteComment,
  },
}));

vi.mock('@/services/foundation/system/MonitoringAdminService', () => ({
  monitoringAdminService: {
    getHealth: mocks.health,
    getCpuUsage: mocks.cpu,
    getMemoryUsage: mocks.memory,
  },
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, highlight, actions }: any) => (
    <header><span>{title} {highlight}</span>{actions}</header>
  ),
}));

vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: ({ data, filename }: any) => (
    <button type="button">{filename} {data.length}건 반출</button>
  ),
}));

vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children }: any) => isOpen
    ? <section aria-label={title}>{children}</section>
    : null,
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, onRowClick, onRetry, pagination, rowActionLabel }: any) => (
    <div>
      <table>
        <tbody>
          {data.map((item: any, rowIndex: number) => {
            const actionLabel = typeof rowActionLabel === 'function'
              ? rowActionLabel(item, rowIndex)
              : rowActionLabel;
            return (
              <tr key={rowIndex}>
                {columns.map((column: any, columnIndex: number) => (
                  <td key={columnIndex}>{column.accessor(item)}</td>
                ))}
                {onRowClick && (
                  <td>
                    <button type="button" aria-label={actionLabel} onClick={() => onRowClick(item)}>
                      {actionLabel}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" onClick={onRetry}>목록 재시도</button>
      <button type="button" onClick={() => pagination.onPageChange(2)}>다음 페이지</button>
    </div>
  ),
}));

vi.mock('../components/MonitoringPanels', () => ({
  SampleDataBadge: () => <span>샘플 데이터</span>,
  NavButton: ({ label, active, onClick }: any) => (
    <button type="button" role="tab" aria-selected={active} onClick={onClick}>{label}</button>
  ),
  StatusIndicator: ({ label, status }: any) => <span>{label}: {status}</span>,
  HarnessDashboardOverview: () => <div>하네스 개요</div>,
  SkillDetailView: ({ skill }: any) => <div>스킬 상세 {skill.name}</div>,
  TestDetailView: ({ test }: any) => <div>테스트 상세 {test.testName}</div>,
}));

const auditRow = {
  sysLogSn: 11,
  srvcNm: 'AUTH',
  methodNm: 'authorize',
  ocrnYmd: '20260815',
};
const systemRow = {
  sysLogSn: 22,
  srvcNm: 'SYSTEM',
  methodNm: 'healthCheck',
  ocrnYmd: '20260815',
};
const loginRow = {
  lgnSn: 33,
  loginId: 'admin',
  loginMthd: 'PASSWORD',
  creatDt: '2026-08-15',
};
const commentRow = {
  ansSn: 44,
  ansCn: '삭제할 댓글',
  wrterId: 'writer',
};

function page(list: unknown[]) {
  return { list, total: list.length, totalPage: 2 };
}

function renderHub(query = '') {
  mocks.query = query;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MonitoringHubClient />
    </QueryClientProvider>,
  );
}

describe('MonitoringHubClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = '';
    mocks.confirm.mockResolvedValue(true);
    mocks.audit.mockResolvedValue(page([auditRow]));
    mocks.system.mockResolvedValue(page([systemRow]));
    mocks.login.mockResolvedValue(page([loginRow]));
    mocks.comments.mockResolvedValue(page([commentRow]));
    mocks.deleteComment.mockResolvedValue(undefined);
    mocks.health.mockResolvedValue({
      status: 'UP',
      components: { db: { status: 'UP' }, redis: { status: 'UP' } },
    });
    mocks.cpu.mockResolvedValue(12.34);
    mocks.memory.mockResolvedValue(45.67);
  });

  /** 조회 조건 입력의 접근 이름(KeywordFilter 의 label). */
  const LOG_SEARCH_LABEL = '서비스명 · 메서드 · 계정';

  it.each([
    ['', mocks.audit, 'authorize'],
    ['tab=system', mocks.system, 'healthCheck'],
    ['tab=login', mocks.login, 'PASSWORD'],
  ])('loads, selects, searches and pages a list tab (%s)', async (query, service, rowText) => {
    renderHub(query);

    expect(await screen.findByText(rowText)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /상세 열기/ }));
    // [2026-08-25 A1 이행] 우측 3열 패널이 표 아래 상세 섹션으로 바뀌었다.
    expect(screen.getByRole('region', { name: '선택 항목 상세' })).toBeInTheDocument();

    // 조회 시점이 타이핑 디바운스에서 `조회` 제출로 바뀌었다 — 입력만으로는 재조회되지 않는다.
    fireEvent.change(screen.getByRole('textbox', { name: LOG_SEARCH_LABEL }), {
      target: { value: 'needle' },
    });
    expect(service).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(service).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    expect(mocks.replace).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '데이터 스트림 새로고침' }));
    fireEvent.click(screen.getByRole('button', { name: '리포트 스냅샷' }));
    expect(screen.getByRole('region', { name: '현재 조회 결과 반출' }))
      .toHaveTextContent('1건 반출');
  });

  it('does not expose unsupported comment search and confirms permanent deletion', async () => {
    renderHub('tab=comments');

    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: LOG_SEARCH_LABEL })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '서비스 피드백 관리 44 상세 열기' }));
    expect(document.querySelector('button button')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '댓글 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '댓글 영구 삭제',
      variant: 'destructive',
    })));
    await waitFor(() => expect(mocks.deleteComment).toHaveBeenCalledWith(44));
    expect(mocks.toast).toHaveBeenCalledWith('댓글이 성공적으로 삭제되었습니다.', 'success');
  });

  it('shows honest actuator failure state and retries health collection', async () => {
    mocks.health.mockRejectedValueOnce(new Error('actuator unavailable'));
    renderHub('tab=observability');

    expect(await screen.findByRole('alert')).toHaveTextContent('액추에이터 지표를 가져오지 못했습니다');
    expect(screen.getByText('API Microservices: UNKNOWN')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(mocks.health).toHaveBeenCalledTimes(2));
  });

  it('selects both harness catalog item types and renders topology', async () => {
    const first = renderHub('tab=harness');
    fireEvent.click(screen.getByRole('button', { name: /Deep Context Mapper 엔진 상세 보기/ }));
    expect(screen.getByText('스킬 상세 Deep Context Mapper')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /QueryCountGuardrailIntegrationTest.*계측 상세 보기/ }));
    expect(screen.getByText(/테스트 상세 QueryCountGuardrailIntegrationTest/)).toBeInTheDocument();
    first.unmount();

    renderHub('tab=topology');
    expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument();
  });
});

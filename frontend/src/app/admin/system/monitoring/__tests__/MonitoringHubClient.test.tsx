import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  integrity: vi.fn(),
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

vi.mock('@/services/foundation/system/AttachmentIntegrityService', () => ({
  attachmentIntegrityService: { scan: mocks.integrity },
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
    mocks.integrity.mockResolvedValue({ checked: 0, missing: 0, samples: [], storageRoot: '/srv/uploads', storedFilesChecked: 0, orphanCandidates: 0, undecidable: 0, orphanSamples: [] });
  });

  /**
   * 조회 조건 입력의 접근 이름(KeywordFilter 의 label).
   *
   * [2026-08-29] 라벨이 **탭마다 다르다.** 종전에는 세 탭이 '서비스명 · 메서드 · 계정' 하나를
   * 공유했는데, 서버 술어는 탭마다 다르다 — SECURITY·SYSTEM 은 /logs/system 의
   * `srvcNm OR dmndId`, LOGIN 은 /logs/login 의 `userId OR lgnIpAddr` 다. 어느 탭에서도
   * 메서드·계정으로는 걸리지 않았고, 로그인 탭에서는 서비스명조차 축이 아니었다.
   * 라벨이 술어와 어긋나면 빈 결과가 "그 계정 기록이 없다" 로 오독된다.
   */
  const LOG_SEARCH_LABEL = '서비스명 · 요청ID';
  const LOGIN_SEARCH_LABEL = '사용자ID · 접속IP';

  it.each([
    ['', mocks.audit, 'authorize', LOG_SEARCH_LABEL],
    ['tab=system', mocks.system, 'healthCheck', LOG_SEARCH_LABEL],
    ['tab=login', mocks.login, 'PASSWORD', LOGIN_SEARCH_LABEL],
  ])('loads, selects, searches and pages a list tab (%s)', async (query, service, rowText, searchLabel) => {
    renderHub(query);

    expect(await screen.findByText(rowText)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /상세 열기/ }));
    // [2026-08-25 A1 이행] 우측 3열 패널이 표 아래 상세 섹션으로 바뀌었다.
    expect(screen.getByRole('region', { name: '선택 항목 상세' })).toBeInTheDocument();

    // 조회 시점이 타이핑 디바운스에서 `조회` 제출로 바뀌었다 — 입력만으로는 재조회되지 않는다.
    fireEvent.change(screen.getByRole('textbox', { name: searchLabel }), {
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
    expect(screen.queryByRole('textbox', { name: LOGIN_SEARCH_LABEL })).not.toBeInTheDocument();

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

  it('댓글 삭제는 confirm 전에 동기 선점하고 시작 버튼에 pending 상태를 알리며 실패 후 재시도할 수 있다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.deleteComment.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    renderHub('tab=comments');

    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '서비스 피드백 관리 44 상세 열기' }));
    const remove = screen.getByRole('button', { name: '댓글 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteComment).toHaveBeenCalledTimes(1));
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('댓글 삭제 중');

    rejectDelete(new Error('댓글 삭제 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('댓글 삭제 서버 오류', 'error'));
    expect(screen.getByText('삭제할 댓글')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
    expect(remove).not.toHaveAttribute('aria-busy');
    expect(remove).toHaveAccessibleName('댓글 삭제');
  });

  it('shows honest actuator failure state and retries health collection', async () => {
    mocks.health.mockRejectedValueOnce(new Error('actuator unavailable'));
    renderHub('tab=observability');

    expect(await screen.findByRole('alert')).toHaveTextContent('액추에이터 지표를 가져오지 못했습니다');
    expect(screen.getByText('API Microservices: UNKNOWN')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(mocks.health).toHaveBeenCalledTimes(2));
  });

  /*
   * DB↔저장소 드리프트는 정상 운영에서도 생긴다. 문제는 어긋났을 때 알 방법이 없어
   * 사용자가 깨진 이미지로 먼저 발견했다는 점이다. 이 화면이 그것을 먼저 보여준다.
   */
  it('점검을 누르기 전에는 저장소를 훑지 않는다', async () => {
    renderHub('tab=observability');
    await screen.findByRole('button', { name: '점검 실행' });

    // 전량 스캔이 배경에서 주기적으로 돌면 진단이 그 자체로 부하가 된다.
    expect(mocks.integrity).not.toHaveBeenCalled();
  });

  it('어긋난 첨부가 있으면 건수와 조치 대상을 알린다', async () => {
    mocks.integrity.mockResolvedValue({
      checked: 120,
      missing: 2,
      samples: ['atchFileSn=7 seq=1 path=general/2026/a.png'],
      storageRoot: '/srv/uploads',
      storedFilesChecked: 118,
      orphanCandidates: 0,
      undecidable: 0,
      orphanSamples: [],
    });
    renderHub('tab=observability');

    fireEvent.click(screen.getByRole('button', { name: '점검 실행' }));

    const alert = await screen.findByText(/저장소에 없습니다/);
    expect(alert).toHaveTextContent('120');
    expect(alert).toHaveTextContent('2');
    // 조치하려면 어느 파일인지 특정할 수 있어야 한다.
    expect(screen.getByText('atchFileSn=7 seq=1 path=general/2026/a.png')).toBeInTheDocument();
  });

  /**
   * [2026-08-29] 역방향(저장소 → DB) census.
   *
   * ⚠ 이 화면의 숫자는 사람이 **파일을 지우는** 근거가 된다. 그래서 두 가지를 고정한다:
   *   ① 확정이 아니라 **후보**라고 말하는가 — 커밋 전 업로드와 진짜 고아는 저장소에서 같은
   *      모습이라, 확정처럼 말하면 살아 있는 업로드를 지우게 한다.
   *   ② **어느 트리를 본 결과인지** 말하는가 — 저장소 경로 기본값이 상대 경로라 프로세스
   *      작업 디렉터리에 따라 다른 트리를 본다(실제로 이 저장소에 루트가 둘 있다).
   */
  it('고아 후보를 확정이 아니라 후보로 말하고 훑은 저장소를 밝힌다', async () => {
    mocks.integrity.mockResolvedValue({
      checked: 10,
      missing: 0,
      samples: [],
      storageRoot: '/srv/uploads',
      storedFilesChecked: 12,
      orphanCandidates: 2,
      undecidable: 1,
      orphanSamples: ['고아 후보: general/7/ghost.png', '판정 불가(구 키 형식 디렉터리): general/FILE_0001'],
    });
    renderHub('tab=observability');

    fireEvent.click(screen.getByRole('button', { name: '점검 실행' }));

    expect(await screen.findByText(/커밋되지 않은 파일일 수 있습니다/)).toBeInTheDocument();
    expect(screen.getByText('/srv/uploads')).toBeInTheDocument();
    expect(screen.getByText('고아 후보: general/7/ghost.png')).toBeInTheDocument();
    // 판정 불가를 고아로 합산해 말하면 사람이 지울 대상을 과장해서 읽는다.
    expect(screen.getByText('판정 불가(구 키 형식 디렉터리): general/FILE_0001')).toBeInTheDocument();
  });

  it('정상이면 정상이라고 말한다 — 침묵으로 대신하지 않는다', async () => {
    mocks.integrity.mockResolvedValue({ checked: 120, missing: 0, samples: [], storageRoot: '/srv/uploads', storedFilesChecked: 0, orphanCandidates: 0, undecidable: 0, orphanSamples: [] });
    renderHub('tab=observability');

    fireEvent.click(screen.getByRole('button', { name: '점검 실행' }));

    expect(await screen.findByText(/모두 저장소에 실물이 있습니다/)).toHaveTextContent('120');
  });

  it('점검 실패를 정상으로 위장하지 않는다', async () => {
    mocks.integrity.mockRejectedValue(new Error('boom'));
    renderHub('tab=observability');

    fireEvent.click(screen.getByRole('button', { name: '점검 실행' }));

    expect(await screen.findByText(/점검을 실행하지 못했습니다/)).toBeInTheDocument();
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

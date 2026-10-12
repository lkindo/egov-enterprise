import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageInProjection } from '@/test-utils/projection';

/**
 * 업무 보고 모달의 **기본 일자**와 **미저장 이탈 보호**, 그리고 화면 머리 동작 계약.
 *
 * [업무 허브 분해 W1] 이 계약들은 업무 허브 클라이언트의 시험(WorkHubClient.dirty-guard·box-manage)에 있었다. 허브가 업무 보고·일정
 * 화면으로 나뉘면서 보고 쪽이 이 파일로 옮겨 왔다.
 *
 * - 기본 보고 일자는 서버 렌더 시점의 '오늘'(initialYmd)이다. 종전에는 세 라우트가 한 컴포넌트의 상태를 공유해, 캘린더에서 다른 달로
 *   넘긴 뒤 보고를 등록하면 기본 일자가 그 달 1일이 됐다. 화면을 나눈 지금은 캘린더 상태가 이 화면에 없다 — 계약은 원천(initialYmd)만 본다.
 * - `StandardModal` 은 Esc·배경·X 세 경로를 모두 `onClose` 한 곳으로 모은다. 폼의 '취소' 만 별도 prop(`onCancel`)이라 두 배선을
 *   각각 검증한다 — 한쪽만 가드에 물려도 다른 쪽으로 샌다.
 * - '업무함 관리' 는 업무 관리 화면의 동작이다. '메모보고 관리' 는 메모 보고 기능의 링크 기여이고 목적지 진입 권한(MEMO_RPT_READ)으로만
 *   보인다 — 메모 보고가 투영으로 빠진 생성물에서는 그 시험을 등록하지 않는다.
 *
 * 보고 폼은 대역으로 바꿔 `defaultYmd` prop 을 화면에 드러낸다: 실제 폼은 그 값을 날짜 입력에 흡수해 버려 "무엇이 전달됐는가" 가
 * 간접 증거로만 남는다.
 */

const MEMO_REPORTS = '/admin/operation/memo-reports';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  push: vi.fn(),
  reportRows: [] as Array<Record<string, unknown>>,
  reportTotal: null as number | null,
  permissions: [] as string[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: () => ({
    data: { list: mocks.reportRows, totalPage: 1, total: mocks.reportTotal ?? mocks.reportRows.length },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => (
    <main>{actions}{children}</main>
  ),
}));

vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/components/patterns/empty-result-message', () => ({
  emptyResultMessage: (_keyword: string, fallback: string) => fallback,
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: { columns: Array<{ accessor: (item: Record<string, unknown>, index: number) => React.ReactNode }>; data: Array<Record<string, unknown>> }) => (
    <div data-testid="data-table">
      {data.map((item, rowIndex) => (
        <div key={rowIndex}>
          {columns.map((column, columnIndex) => <React.Fragment key={columnIndex}>{column.accessor(item, rowIndex)}</React.Fragment>)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, children, onClose, closeDisabled, title }: { isOpen: boolean; children: React.ReactNode; onClose: () => void; closeDisabled?: boolean; title: string }) => isOpen ? (
    <div role="dialog" aria-label={title}>
      <button type="button" disabled={closeDisabled} onClick={onClose}>모달 닫기</button>
      {children}
    </div>
  ) : null,
}));

// 보고 폼 대역. 전달받은 defaultYmd 를 그대로 드러내고, 입력이 생기면 실제 폼과 같은 모양으로
// 편집 상태를 부모에 올린다(실제 폼은 formState.isDirty 를 같은 시그니처로 올린다).
// 보고 폼 대역. 전달받은 defaultYmd 를 그대로 드러내고, 입력이 생기면 실제 폼과 같은 모양으로
// 편집 상태를 부모에 올린다(실제 폼은 formState.isDirty 를 같은 시그니처로 올린다).
vi.mock('@/components/business/report/ReportCreateForm', () => ({
  ReportCreateForm: ({ defaultYmd, onCancel, onEditStateChange }: {
    defaultYmd: string;
    onCancel: () => void;
    onEditStateChange?: (state: { dirty: boolean; pending: boolean }) => void;
  }) => {
    const [draft, setDraft] = React.useState('');
    return (
      <div>
        <output data-testid="report-default-ymd">{defaultYmd}</output>
        <input
          aria-label="보고 제목"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onEditStateChange?.({ dirty: event.target.value.length > 0, pending: false });
          }}
        />
        <button type="button" onClick={onCancel}>취소</button>
      </div>
    );
  },
}));

vi.mock('@/services/business/user/ReportService', () => ({
  reportService: {
    createReport: mocks.createReport,
    updateReport: mocks.updateReport,
    deleteReport: mocks.deleteReport,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { role: 'ROLE_USER', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});

import WorkReportClient from '../WorkReportClient';

/** 서버 렌더 시점의 '오늘'. */
const TODAY_YMD = '20260906';

describe('WorkReportClient 모달 기본 일자와 미저장 이탈 보호', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.createReport.mockResolvedValue(undefined);
    mocks.updateReport.mockResolvedValue(undefined);
    mocks.deleteReport.mockResolvedValue(undefined);
    mocks.reportRows = [];
    mocks.reportTotal = null;
    mocks.permissions = [];
  });

  it('보고 등록의 기본 일자는 서버 렌더 시점의 오늘(initialYmd)이다', async () => {
    const user = userEvent.setup();
    render(<WorkReportClient initialYmd={TODAY_YMD} />);
    await user.click(screen.getByRole('button', { name: /보고 등록/ }));
    const reportDialog = screen.getByRole('dialog', { name: '업무 보고 등록' });
    expect(within(reportDialog).getByTestId('report-default-ymd')).toHaveTextContent(TODAY_YMD);
  });

  it('보고 모달도 같은 가드를 쓴다 — 계속 편집은 남기고 버리기는 닫는다', async () => {
    // 두 모달이 각각 자기 dirty 상태와 가드를 갖는다. 한쪽만 배선하면 다른 쪽은 무방비다.
    mocks.confirm.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<WorkReportClient initialYmd={TODAY_YMD} />);

    await user.click(screen.getByRole('button', { name: /보고 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '업무 보고 등록' });
    const reportTitle = within(dialog).getByRole('textbox', { name: '보고 제목' });
    await user.type(reportTitle, '작성 중인 보고');

    await user.click(within(dialog).getByRole('button', { name: '모달 닫기' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog', { name: '업무 보고 등록' })).toBeVisible();
    expect(reportTitle).toHaveValue('작성 중인 보고');

    mocks.confirm.mockResolvedValue(true);
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '업무 보고 등록' })).not.toBeInTheDocument());
    expect(mocks.createReport).not.toHaveBeenCalled();
  });

  it('보고 번호는 페이지 안 순번이 아니라 전체 건수에서 거꾸로 세고, 보고 일자를 날짜 형식으로 보인다', () => {
    // [2026-09-26 DIP V9] 번호가 페이지마다 01 부터 다시 시작했고, 날짜는 저장 형식(yyyyMMdd) 그대로였다.
    mocks.reportTotal = 23;
    mocks.reportRows = [
      { rptpSn: 30, rptTtl: '셋째 보고', rptYmd: '20260915', userId: 'u1', userNm: '홍길동' },
      { rptpSn: 29, rptTtl: '둘째 보고', rptYmd: '20260914', userId: 'u1', userNm: '홍길동' },
    ];
    render(<WorkReportClient initialYmd={TODAY_YMD} />);

    const table = screen.getByTestId('data-table');
    expect(within(table).getByText('23')).toBeInTheDocument();
    expect(within(table).getByText('22')).toBeInTheDocument();
    expect(within(table).queryByText('01')).not.toBeInTheDocument();
    expect(within(table).getByText('보고 일자: 2026-09-15')).toBeInTheDocument();
    expect(within(table).queryByText(/20260915/)).not.toBeInTheDocument();
  });
});

describe('WorkReportClient 머리 동작', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reportRows = [];
    mocks.reportTotal = null;
  });

  it('업무함 관리는 업무 관리 화면의 동작이라 업무 보고 화면에는 없다', () => {
    mocks.permissions = ['DEPT_BOX_READ', 'MEMO_RPT_READ'];
    render(<WorkReportClient initialYmd={TODAY_YMD} />);
    expect(screen.queryByRole('button', { name: '업무함 관리' })).not.toBeInTheDocument();
  });

  /**
   * [2026-09-26 DIP B4 P1] '메모보고 관리' 는 목적지 라우트(D9 이후 `MEMO_RPT_READ`)와 같은 판정으로만 보인다.
   * 종전에는 업무함 권한(`DEPT_BOX_READ`)으로 보여, 누르면 라우트 게이트가 홈으로 돌려보냈다.
   */
  it('업무함 권한만으로는 메모보고 관리로 가는 길을 보이지 않는다', () => {
    mocks.permissions = ['DEPT_BOX_READ'];
    render(<WorkReportClient initialYmd={TODAY_YMD} />);
    expect(screen.queryByRole('link', { name: /메모보고 관리/ })).not.toBeInTheDocument();
  });

  if (pageInProjection(MEMO_REPORTS)) it('메모보고 관리 화면에 들어갈 수 있으면 길을 보인다', () => {
    mocks.permissions = ['MEMO_RPT_READ'];
    render(<WorkReportClient initialYmd={TODAY_YMD} />);
    expect(screen.getByRole('link', { name: /메모보고 관리/ })).toHaveAttribute('href', MEMO_REPORTS);
  });
});

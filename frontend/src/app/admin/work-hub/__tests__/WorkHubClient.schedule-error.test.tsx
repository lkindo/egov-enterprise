import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  tab: 'calendar',
  scheduleRows: [] as Array<Record<string, unknown>>,
  reportRows: [] as Array<Record<string, unknown>>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => mocks.tab }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock('lucide-react', () => ({ Plus: () => <span aria-hidden="true" /> }));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'work-schedules'
      ? mocks.scheduleRows
      : queryKey[0] === 'work-reports'
        ? { list: mocks.reportRows, totalPage: 1, total: mocks.reportRows.length }
        : { list: [], totalPage: 1, total: 0 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
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

vi.mock('@/components/ui/calendar', () => ({ Calendar: () => <div data-testid="calendar" /> }));

vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, children, onClose, closeDisabled, title }: { isOpen: boolean; children: React.ReactNode; onClose: () => void; closeDisabled?: boolean; title: string }) => isOpen ? (
    <div role="dialog" aria-label={title}>
      <button type="button" disabled={closeDisabled} onClick={onClose}>모달 닫기</button>
      {children}
    </div>
  ) : null,
}));

vi.mock('@/components/business/deptJob/DeptJobForm', () => ({ PRIORITY_LABEL: {} }));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({ deptJobUserService: {} }));
vi.mock('@/services/business/user/ReportService', () => ({
  reportService: {
    createReport: mocks.createReport,
    updateReport: mocks.updateReport,
    deleteReport: mocks.deleteReport,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: vi.fn(),
  createDeptSchedule: mocks.createSchedule,
  updateDeptSchedule: mocks.updateSchedule,
  deleteDeptSchedule: mocks.deleteSchedule,
}));

import WorkHubClient from '../WorkHubClient';

describe('WorkHubClient schedule error ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tab = 'calendar';
    mocks.confirm.mockResolvedValue(true);
    mocks.createSchedule.mockResolvedValue(undefined);
    mocks.updateSchedule.mockResolvedValue(undefined);
    mocks.deleteSchedule.mockResolvedValue(undefined);
    mocks.createReport.mockResolvedValue(undefined);
    mocks.updateReport.mockResolvedValue(undefined);
    mocks.deleteReport.mockResolvedValue(undefined);
    mocks.scheduleRows = [];
    mocks.reportRows = [];
  });

  it('ScheduleCreateForm 제출은 부모 수정 sink를 한 번만 호출하고 pending·필드 오류 뒤 모달과 값을 보존한다', async () => {
    let rejectUpdate!: (reason?: unknown) => void;
    const serverError = {
      response: { data: { errors: [{ field: 'schdlNm', message: '수정할 수 없는 일정명입니다.' }] } },
    };
    mocks.scheduleRows = [{
      schdlSn: 19,
      schdlNm: '기존 일정',
      schdlBgngYmd: '20260901',
      schdlEndYmd: '20260901',
      schdlSeCd: '2',
    }];
    mocks.updateSchedule.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectUpdate = reject;
    }));
    const user = userEvent.setup();

    render(<WorkHubClient defaultTab="calendar" initialYmd="20260901" />);
    await user.click(screen.getByRole('button', { name: '기존 일정 일정 수정' }));
    const dialog = screen.getByRole('dialog', { name: '일정 수정' });
    const scheduleName = within(dialog).getByRole('textbox', { name: /일정명/ });
    await user.clear(scheduleName);
    await user.type(scheduleName, '보존할 수정 일정');
    const submit = within(dialog).getByRole('button', { name: '일정 수정' });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.updateSchedule).toHaveBeenCalledTimes(1));
    expect(mocks.updateSchedule).toHaveBeenCalledWith(19, expect.objectContaining({
      schdlNm: '보존할 수정 일정',
      schdlBgngYmd: '20260901',
      schdlEndYmd: '20260901',
    }));
    expect(mocks.deleteSchedule).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '모달 닫기' })).toBeDisabled();

    await act(async () => rejectUpdate(serverError));

    expect(await within(dialog).findByText('수정할 수 없는 일정명입니다.')).toBeVisible();
    expect(scheduleName).toHaveValue('보존할 수정 일정');
    expect(dialog).toBeVisible();
    expect(submit).not.toBeDisabled();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('ReportCreateForm 제출은 부모 등록 sink를 한 번만 호출하고 pending·필드 오류 뒤 모달과 값을 보존한다', async () => {
    let rejectCreate!: (reason?: unknown) => void;
    const serverError = {
      response: { data: { errors: [{ field: 'rptTtl', message: '등록할 수 없는 보고 제목입니다.' }] } },
    };
    mocks.tab = 'report';
    mocks.createReport.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectCreate = reject;
    }));
    const user = userEvent.setup();

    render(<WorkHubClient defaultTab="report" initialYmd="20260901" />);
    await user.click(screen.getByRole('button', { name: /보고 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '업무 보고 등록' });
    const reportTitle = within(dialog).getByRole('textbox', { name: /보고 제목/ });
    const reportContent = within(dialog).getByRole('textbox', { name: '보고 내용' });
    await user.type(reportTitle, '보존할 서버 검증 보고');
    await user.type(reportContent, '보존할 작성 중인 내용');
    const submit = within(dialog).getByRole('button', { name: '보고 등록' });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.createReport).toHaveBeenCalledTimes(1));
    expect(mocks.createReport).toHaveBeenCalledWith(expect.objectContaining({
      rptTtl: '보존할 서버 검증 보고',
      rptYmd: '20260901',
      rptCn: '보존할 작성 중인 내용',
    }));
    expect(mocks.deleteReport).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '모달 닫기' })).toBeDisabled();

    await act(async () => rejectCreate(serverError));

    expect(await within(dialog).findByText('등록할 수 없는 보고 제목입니다.')).toBeVisible();
    expect(reportTitle).toHaveValue('보존할 서버 검증 보고');
    expect(reportContent).toHaveValue('보존할 작성 중인 내용');
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
    expect(dialog).toBeVisible();
    expect(submit).not.toBeDisabled();
  });

  it('보고 등록의 일반 오류는 폼에 안내하고 편집 중인 모달과 값을 유지한다', async () => {
    mocks.tab = 'report';
    mocks.createReport.mockRejectedValueOnce(new Error('보고 저장 서버 오류'));
    const user = userEvent.setup();
    render(<WorkHubClient defaultTab="report" initialYmd="20260901" />);
    await user.click(screen.getByRole('button', { name: /보고 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '업무 보고 등록' });
    const reportTitle = within(dialog).getByRole('textbox', { name: /보고 제목/ });
    await user.type(reportTitle, '일반 오류 보존 보고');

    await user.click(within(dialog).getByRole('button', { name: '보고 등록' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('보고 저장 서버 오류', 'error'));
    expect(reportTitle).toHaveValue('일반 오류 보존 보고');
    expect(dialog).toBeVisible();
  });

  it('보고 삭제는 confirm 전에 선점하고 실패 중 정확한 행 제어에 pending 상태를 표시한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.tab = 'report';
    mocks.reportRows = [{ rptpSn: 23, rptTtl: '삭제 대상 보고', rptYmd: '20260901', userId: 'writer' }];
    mocks.deleteReport.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    render(<WorkHubClient defaultTab="report" initialYmd="20260901" />);
    const remove = screen.getByRole('button', { name: '삭제 대상 보고 보고 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteReport).toHaveBeenCalledTimes(1));
    expect(mocks.createReport).not.toHaveBeenCalled();
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('삭제 대상 보고 보고 삭제 중');

    rejectDelete(new Error('보고 삭제 실패'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '삭제에 실패했습니다. 작성자 본인 또는 관리자만 삭제할 수 있습니다.',
      'error',
    ));
    expect(remove).not.toBeDisabled();
    expect(screen.getByText('삭제 대상 보고')).toBeInTheDocument();
  });

  it('일정 삭제는 confirm 전에 선점하고 같은 tick 중복 삭제를 막는다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.scheduleRows = [{ schdlSn: 29, schdlNm: '삭제 대상 일정', schdlBgngYmd: '20260901', schdlEndYmd: '20260901' }];
    mocks.deleteSchedule.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    render(<WorkHubClient defaultTab="calendar" initialYmd="20260901" />);
    const remove = screen.getByRole('button', { name: '삭제 대상 일정 일정 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteSchedule).toHaveBeenCalledTimes(1));
    expect(mocks.updateSchedule).not.toHaveBeenCalled();
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('삭제 대상 일정 일정 삭제 중');
    rejectDelete(new Error('일정 삭제 서버 오류'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('일정 삭제 서버 오류', 'error'));
    expect(remove).not.toBeDisabled();
    expect(screen.getByText('삭제 대상 일정')).toBeInTheDocument();
  });
});

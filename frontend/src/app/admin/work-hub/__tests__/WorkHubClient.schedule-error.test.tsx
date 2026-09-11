/**
 * 워크허브(WorkHubClient)의 **합성(composed) write 계약** 전반을 지키는 스펙.
 *
 * 이 허브는 자기 폼을 갖지 않고 자식 폼 둘(ScheduleCreateForm·ReportCreateForm)의 제출과
 * 자기 소유 삭제 액션(보고·일정)을 함께 조율한다. 폼 검증 census 는 그 경계를
 * `composed-child-form-validation` 으로 등재하면서 **한 증거 파일이 자식 계약 전부를** 증명할 것을
 * 요구한다(frontend/scripts/frontend-form-validation-census.mjs 의 evidenceProvesComposedBehavior —
 * childContracts.every). 그래서 일정 오류 소유권에서 출발한 이 파일이 두 계약의 정본 증거다.
 *
 * ⚠ [2026-09-12] 세 번째 자식이던 DeptJobForm 과 업무 삭제 액션은 core 소유
 *   `components/business/deptJob/DeptJobListSection.tsx` 로 옮겨 갔다(재사용 base 의
 *   core·collaboration 프로필에서 부서 업무 목록이 cascade 로 빠지던 문제). 그 계약의 정본 증거는
 *   `components/business/deptJob/__tests__/DeptJobListSection.test.tsx` 다.
 *
 * 계약마다 고정하는 것은 두 방향이다.
 *  ① 정방향 — 자식 제출이 부모 sink 를 정확히 한 번만 부르고, 진행 중에는 제어가
 *     disabled·aria-busy 이며, 실패해도 모달과 입력값이 남고 필드 오류는 폼에 귀속된다.
 *     그동안 형제 액션(보고·일정 삭제)은 나가지 못한다.
 *  ② 역방향 — 형제 액션이 진행 중이면 자식 제출이 아예 나가지 않는다.
 * 한 방향만 고정하면 "한쪽만 막는" 비대칭 잠금이 조용히 들어와도 아무 게이트가 알리지 않는다.
 */
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

vi.mock('lucide-react', () => ({
  Plus: () => <span aria-hidden="true" />,
  FileText: () => <span aria-hidden="true" />,
  FolderCog: () => <span aria-hidden="true" />,
}));

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

/*
  WorkHubClient 는 업무 탭에서 core 소유 DeptJobListSection 을 렌더한다. 이 스펙은 보고·일정만
  보므로 업무 탭에 들어가지 않지만, 정적 import 체인은 그대로 로드되므로 부서 업무 모듈을
  가볍게 대역으로 세워 둔다(PRIORITY_LABEL 은 그 섹션의 목록 컬럼이 직접 쓴다).
*/
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
// [2026-09-06 DEC-OPS-037] WorkHubClient 가 관리자 판정(useAuth)을 읽는다 — 이 스펙은 일정 오류 소유권만 보므로 비관리자로 고정한다.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ROLE_USER' } }) }));
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

  it('업무 보고 수정은 저장된 일자를 표시하고 변경한 yyyyMMdd 값을 전송한다', async () => {
    mocks.tab = 'report';
    mocks.reportRows = [{
      rptpSn: 23,
      rptTtl: '기존 보고',
      rptCn: null,
      rptSeCd: null,
      atchFileSn: null,
      rptYmd: '20260901',
      userId: 'writer',
    }];
    const user = userEvent.setup();

    render(<WorkHubClient defaultTab="report" initialYmd="20260906" />);
    await user.click(screen.getByRole('button', { name: '기존 보고 보고 수정' }));
    const dialog = screen.getByRole('dialog', { name: '업무 보고 수정' });
    const reportDate = within(dialog).getByLabelText(/보고 일자/);
    expect(reportDate).toHaveValue('2026-09-01');

    fireEvent.change(reportDate, { target: { value: '2026-09-02' } });
    await user.click(within(dialog).getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateReport).toHaveBeenCalledWith(23, expect.objectContaining({
      rptTtl: '기존 보고',
      rptYmd: '20260902',
    })));
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

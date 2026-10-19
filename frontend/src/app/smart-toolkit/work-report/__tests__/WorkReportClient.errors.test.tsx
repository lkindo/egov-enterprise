/**
 * 업무 보고 화면(WorkReportClient)의 **합성(composed) write 계약**을 지키는 스펙.
 *
 * 이 화면은 자기 폼을 갖지 않고 자식 폼(ReportCreateForm)의 제출과 자기 소유 삭제 액션(보고 삭제)을 함께 조율한다. 폼 검증 census 는
 * 그 경계를 `composed-child-form-validation` 으로 등재하면서 **한 증거 파일이 자식 계약 전부를** 증명할 것을 요구한다
 * (frontend/scripts/frontend-form-validation-census.mjs 의 evidenceProvesComposedBehavior — childContracts.every).
 *
 * [업무 허브 분해 W1] 이 계약들은 업무 허브 클라이언트의 시험(WorkHubClient.schedule-error.test.tsx)에 있었다. 허브가 업무 보고·일정
 * 화면으로 나뉘면서 보고 쪽 계약이 이 파일로, 일정 쪽 계약이 일정 디렉터리(ScheduleCalendarClient.errors.test.tsx)로 옮겨 왔다.
 * 상호 잠금의 상대는 같은 화면의 보고 삭제다 — 종전에도 보고 제출과 일정 삭제는 서로 다른 잠금을 썼다.
 *
 * 계약마다 고정하는 것은 두 방향이다.
 *  ① 정방향 — 자식 제출이 부모 sink 를 정확히 한 번만 부르고, 진행 중에는 제어가
 *     disabled·aria-busy 이며, 실패해도 모달과 입력값이 남고 필드 오류는 폼에 귀속된다.
 *     그동안 형제 액션(보고 삭제)은 나가지 못한다.
 *  ② 역방향 — 형제 액션이 진행 중이면 자식 제출이 아예 나가지 않는다.
 * 한 방향만 고정하면 "한쪽만 막는" 비대칭 잠금이 조용히 들어와도 아무 게이트가 알리지 않는다.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  reportRows: [] as Array<Record<string, unknown>>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: () => ({
    data: { list: mocks.reportRows, totalPage: 1, total: mocks.reportRows.length },
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

vi.mock('@/services/business/user/ReportService', () => ({
  reportService: {
    createReport: mocks.createReport,
    updateReport: mocks.updateReport,
    deleteReport: mocks.deleteReport,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
// 이 스펙은 쓰기 계약만 본다 — 메모 보고 링크는 대상이 아니므로 권한 없는 주체로 고정한다.
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { role: 'ROLE_USER', permissions: [] as string[], authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});

import WorkReportClient from '../WorkReportClient';

describe('WorkReportClient composed write contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.createReport.mockResolvedValue(undefined);
    mocks.updateReport.mockResolvedValue(undefined);
    mocks.deleteReport.mockResolvedValue(undefined);
    mocks.reportRows = [];
  });

  it('ReportCreateForm 제출은 부모 등록 sink를 한 번만 호출하고 pending·필드 오류 뒤 모달과 값을 보존한다', async () => {
    let rejectCreate!: (reason?: unknown) => void;
    const serverError = {
      response: { data: { errors: [{ field: 'rptTtl', message: '등록할 수 없는 보고 제목입니다.' }] } },
    };
    mocks.createReport.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectCreate = reject;
    }));
    const user = userEvent.setup();

    render(<WorkReportClient initialYmd="20260901" />);
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

    render(<WorkReportClient initialYmd="20260906" />);
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

  it('[2026-10-18] 수정은 창을 열 때 읽은 버전을 보내고, 409 면 서버 사유를 보이며 창·입력을 남기고 목록을 다시 읽는다', async () => {
    const conflict = '다른 사용자가 먼저 수정했습니다. 저장하지 않았으니 최신 내용을 다시 불러온 뒤 고쳐 주세요.';
    mocks.reportRows = [{ rptpSn: 31, rptTtl: '함께 고치는 보고', rptYmd: '20260901', userId: 'writer', version: 4 }];
    mocks.updateReport.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { message: conflict } } });
    const user = userEvent.setup();

    render(<WorkReportClient initialYmd="20260906" />);
    await user.click(screen.getByRole('button', { name: '함께 고치는 보고 보고 수정' }));
    const dialog = screen.getByRole('dialog', { name: '업무 보고 수정' });
    const reportTitle = within(dialog).getByRole('textbox', { name: /보고 제목/ });
    await user.clear(reportTitle);
    await user.type(reportTitle, '내가 고친 제목');
    await user.click(within(dialog).getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateReport).toHaveBeenCalledWith(31, expect.objectContaining({
      rptTtl: '내가 고친 제목',
      version: 4,
    })));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(conflict, 'error'));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['work-reports'] });
    expect(dialog).toBeVisible();
    expect(reportTitle).toHaveValue('내가 고친 제목');
  });

  it('보고 등록의 일반 오류는 폼에 안내하고 편집 중인 모달과 값을 유지한다', async () => {
    mocks.createReport.mockRejectedValueOnce(new Error('보고 저장 서버 오류'));
    const user = userEvent.setup();
    render(<WorkReportClient initialYmd="20260901" />);
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
    mocks.reportRows = [{ rptpSn: 23, rptTtl: '삭제 대상 보고', rptYmd: '20260901', userId: 'writer' }];
    mocks.deleteReport.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    render(<WorkReportClient initialYmd="20260901" />);
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
      '보고 삭제 실패',
      'error',
    ));
    expect(remove).not.toBeDisabled();
    expect(screen.getByText('삭제 대상 보고')).toBeInTheDocument();
  });

  it.each([
    [403, { response: { status: 403, data: { message: '작성자 본인 또는 관리자만 삭제할 수 있습니다.' } } }, '작성자 본인 또는 관리자만 삭제할 수 있습니다.'],
    [409, { response: { status: 409, data: { message: '보고 상태가 변경되었습니다. 다시 조회해 주세요.' } } }, '보고 상태가 변경되었습니다. 다시 조회해 주세요.'],
    [500, { isAxiosError: true, message: 'Request failed with status code 500' }, '업무 보고 삭제 중 오류가 발생했습니다.'],
    ['network', { isAxiosError: true, message: 'Network Error' }, '업무 보고 삭제 중 오류가 발생했습니다.'],
  ])('보고 삭제 오류 %s는 실제 사유를 표시하고 행·쓰기 잠금을 복구한다', async (_kind, error, message) => {
    mocks.reportRows = [{ rptpSn: 32, rptTtl: '실패 후 보존할 보고' }];
    mocks.deleteReport.mockRejectedValueOnce(error);
    const user = userEvent.setup();
    render(<WorkReportClient initialYmd="20260901" />);
    const remove = screen.getByRole('button', { name: '실패 후 보존할 보고 보고 삭제' });
    await user.click(remove);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(message, 'error'));
    expect(mocks.deleteReport).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    expect(screen.getByText('실패 후 보존할 보고')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
    expect(remove).not.toHaveAttribute('aria-busy', 'true');
  });
});

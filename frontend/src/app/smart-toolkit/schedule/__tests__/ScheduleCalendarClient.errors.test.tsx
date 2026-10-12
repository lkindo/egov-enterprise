/**
 * 일정 화면(ScheduleCalendarClient)의 **합성(composed) write 계약**을 지키는 스펙.
 *
 * 이 화면은 자기 폼을 갖지 않고 자식 폼(ScheduleCreateForm)의 제출과 자기 소유 삭제 액션(일정 삭제)을 함께 조율한다. 폼 검증 census 는
 * 그 경계를 `composed-child-form-validation` 으로 등재하면서 **한 증거 파일이 자식 계약 전부를** 증명할 것을 요구한다
 * (frontend/scripts/frontend-form-validation-census.mjs 의 evidenceProvesComposedBehavior — childContracts.every).
 *
 * [업무 허브 분해 W1] 이 계약들은 업무 허브 클라이언트의 시험(WorkHubClient.schedule-error.test.tsx)에 있었다. 허브가 업무 보고·일정
 * 화면으로 나뉘면서 일정 쪽 계약이 이 파일로 옮겨 왔다.
 *
 * 계약마다 고정하는 것은 두 방향이다.
 *  ① 정방향 — 자식 제출이 부모 sink 를 정확히 한 번만 부르고, 진행 중에는 제어가
 *     disabled·aria-busy 이며, 실패해도 모달과 입력값이 남고 필드 오류는 폼에 귀속된다.
 *     그동안 형제 액션(일정 삭제)은 나가지 못한다.
 *  ② 역방향 — 형제 액션이 진행 중이면 자식 제출이 아예 나가지 않는다.
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
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  scheduleRows: [] as Array<Record<string, unknown>>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: () => ({
    data: mocks.scheduleRows,
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

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: vi.fn(),
  createDeptSchedule: mocks.createSchedule,
  updateDeptSchedule: mocks.updateSchedule,
  deleteDeptSchedule: mocks.deleteSchedule,
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { role: 'ROLE_USER', permissions: [] as string[], authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});

import ScheduleCalendarClient from '../ScheduleCalendarClient';

describe('ScheduleCalendarClient composed write contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.createSchedule.mockResolvedValue(undefined);
    mocks.updateSchedule.mockResolvedValue(undefined);
    mocks.deleteSchedule.mockResolvedValue(undefined);
    mocks.scheduleRows = [];
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
      editable: true,
      deletable: true,
    }];
    mocks.updateSchedule.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectUpdate = reject;
    }));
    const user = userEvent.setup();

    render(<ScheduleCalendarClient initialYmd="20260901" />);
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

  it('일정 삭제는 confirm 전에 선점하고 같은 tick 중복 삭제를 막는다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.scheduleRows = [{ schdlSn: 29, schdlNm: '삭제 대상 일정', schdlBgngYmd: '20260901', schdlEndYmd: '20260901', editable: true, deletable: true }];
    mocks.deleteSchedule.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    render(<ScheduleCalendarClient initialYmd="20260901" />);
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

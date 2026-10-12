import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 일정 모달의 **기본 일자**와 **미저장 이탈 보호** 계약, 그리고 화면 머리 동작.
 *
 * [업무 허브 분해 W1] 이 계약들은 업무 허브 클라이언트의 시험(WorkHubClient.dirty-guard·box-manage)에 있었다. 허브가 업무 보고·일정
 * 화면으로 나뉘면서 일정 쪽이 이 파일로 옮겨 왔다.
 *
 * - `StandardModal` 은 `closeDisabled`(저장 중 잠금)만 보고 **미저장 입력은 보지 않는다**. `useDirtyCloseGuard` 가 그 보호를 모달에
 *   준다. Esc·배경·X 세 경로는 `onClose` 한 곳으로 모이고 폼의 '취소' 만 별도 prop(`onCancel`)이라 두 배선을 각각 검증한다.
 * - 일정 모달은 **실제 `ScheduleCreateForm`** 을 그대로 쓴다 — dirty 판정이 react-hook-form 의 `formState.isDirty` →
 *   `onEditStateChange` → 부모 state → 가드로 이어지는 전 구간이 계약이기 때문이다.
 */

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  push: vi.fn(),
  scheduleRows: [] as Array<Record<string, unknown>>,
  permissions: [] as string[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
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

// 월 이동만 흉내 낸다. react-day-picker v9 는 onMonthChange 에 **그 달의 1일**(startOfMonth)을
// 넘기므로 대역도 같은 값을 준다.
// 월 이동만 흉내 낸다. react-day-picker v9 는 onMonthChange 에 **그 달의 1일**(startOfMonth)을
// 넘기므로 대역도 같은 값을 준다 — ① 의 오염이 정확히 이 값으로 새어 나갔다.
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onMonthChange, modifiers }: { onMonthChange?: (month: Date) => void; modifiers?: { hasSchedule?: Date[] } }) => (
    <div data-testid="calendar">
      <output data-testid="calendar-marked-days">
        {(modifiers?.hasSchedule ?? []).map((date) => `${date.getMonth() + 1}/${date.getDate()}`).join(',')}
      </output>
      <button type="button" onClick={() => onMonthChange?.(new Date(2026, 11, 1))}>2026년 12월 보기</button>
    </div>
  ),
}));

// Esc·배경·X 는 실제 구현에서 onOpenChange(false) → onClose 한 곳으로 모인다. 대역의 닫기 버튼
// 하나가 그 세 출구를 대표한다.
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
  const auth = () => ({ user: { role: 'ROLE_USER', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});

import ScheduleCalendarClient from '../ScheduleCalendarClient';

/** 서버 렌더 시점의 '오늘'. 캘린더로 옮겨 갈 달(2026-12)과 일부러 다른 달로 잡는다. */
const TODAY_YMD = '20260906';

describe('ScheduleCalendarClient 모달 기본 일자와 미저장 이탈 보호', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.createSchedule.mockResolvedValue(undefined);
    mocks.updateSchedule.mockResolvedValue(undefined);
    mocks.deleteSchedule.mockResolvedValue(undefined);
    mocks.scheduleRows = [];
    mocks.permissions = [];
  });

  it('여러 날에 걸친 일정은 달력의 모든 날짜에 표시된다 (DIP C8)', () => {
    // 종전에는 시작일에만 표시를 찍어 둘째 날부터는 달력에서 비어 보였다.
    mocks.scheduleRows = [{ schdlSn: 1, schdlNm: '워크숍', schdlBgngYmd: '20260909', schdlEndYmd: '20260911' }];
    render(<ScheduleCalendarClient initialYmd={TODAY_YMD} />);
    expect(screen.getByTestId('calendar-marked-days')).toHaveTextContent('9/9,9/10,9/11');
  });

  it('일정 등록의 기본 일자는 캘린더가 보고 있는 달을 따른다', async () => {
    // 일정 모달이 캘린더 월을 따르는 것은 정상이다 — 보고의 기본 일자(오늘)와 구분한다(업무 보고 화면 시험).
    const user = userEvent.setup();
    render(<ScheduleCalendarClient initialYmd={TODAY_YMD} />);

    // 캘린더를 2026년 12월로 옮긴다(= currentDate 가 2026-12-01 이 된다).
    await user.click(screen.getByRole('button', { name: '2026년 12월 보기' }));

    await user.click(screen.getByRole('button', { name: /일정 등록/ }));
    const scheduleDialog = screen.getByRole('dialog', { name: '일정 등록' });
    expect(within(scheduleDialog).getByLabelText(/^시작일/)).toHaveValue('2026-12-01');

    // 아무것도 입력하지 않았으므로 확인 없이 닫힌다(미저장 변경이 없다).
    await user.click(within(scheduleDialog).getByRole('button', { name: '모달 닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '일정 등록' })).not.toBeInTheDocument());
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('미저장 입력이 있으면 X 로 닫아도 확인을 거치고, 계속 편집을 고르면 모달과 입력이 남는다', async () => {
    // '계속 편집' = 확인 모달의 취소. 이때 닫히면 사용자가 지키려던 입력이 그대로 사라진다.
    mocks.confirm.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<ScheduleCalendarClient initialYmd={TODAY_YMD} />);

    await user.click(screen.getByRole('button', { name: /일정 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '일정 등록' });
    const scheduleName = within(dialog).getByRole('textbox', { name: /일정명/ });
    await user.type(scheduleName, '작성 중인 일정');

    await user.click(within(dialog).getByRole('button', { name: '모달 닫기' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    // 문구는 라우터 가드와 같은 말을 써야 학습이 이전된다 — 버튼 라벨까지 계약이다.
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '저장하지 않은 변경',
      confirmText: '변경 버리고 닫기',
      cancelText: '계속 편집',
      variant: 'destructive',
    }));
    expect(screen.getByRole('dialog', { name: '일정 등록' })).toBeVisible();
    expect(scheduleName).toHaveValue('작성 중인 일정');
  });

  it('미저장 입력이 있으면 폼의 취소도 확인을 거치고, 버리기를 고르면 닫힌다', async () => {
    // 닫기 출구는 둘이다 — 모달이 소유한 onClose(Esc·배경·X)와 폼이 소유한 onCancel.
    // 한쪽만 가드에 물리면 다른 쪽으로 그대로 샌다.
    const user = userEvent.setup();
    render(<ScheduleCalendarClient initialYmd={TODAY_YMD} />);

    await user.click(screen.getByRole('button', { name: /일정 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '일정 등록' });
    await user.type(within(dialog).getByRole('textbox', { name: /일정명/ }), '버릴 일정');

    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '일정 등록' })).not.toBeInTheDocument());
    // 사용자가 스스로 버린 입력이므로 저장 요청은 나가지 않는다.
    expect(mocks.createSchedule).not.toHaveBeenCalled();
  });

  it('입력하지 않은 모달은 확인 없이 곧장 닫힌다', async () => {
    // 가드가 dirty 를 보지 않고 항상 물으면, 열었다 그냥 닫는 흔한 경로가 매번 확인을 띄운다.
    // 그런 가드는 사용자가 읽지 않고 누르게 되어 보호 자체가 무력해진다.
    const user = userEvent.setup();
    render(<ScheduleCalendarClient initialYmd={TODAY_YMD} />);

    await user.click(screen.getByRole('button', { name: /일정 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '일정 등록' });
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '일정 등록' })).not.toBeInTheDocument());
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('저장에 성공하면 미저장 입력이 있었어도 확인 없이 닫힌다', async () => {
    // 이미 저장했으므로 물어볼 미저장 변경이 없다. 저장 성공 경로가 가드를 타면
    // '변경을 버리시겠습니까' 가 저장 직후에 뜨는 거짓 경고가 된다.
    const user = userEvent.setup();
    render(<ScheduleCalendarClient initialYmd={TODAY_YMD} />);

    await user.click(screen.getByRole('button', { name: /일정 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '일정 등록' });
    await user.type(within(dialog).getByRole('textbox', { name: /일정명/ }), '저장할 일정');

    await user.click(within(dialog).getByRole('button', { name: '일정 등록' }));

    await waitFor(() => expect(mocks.createSchedule).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '일정 등록' })).not.toBeInTheDocument());
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('일정이 등록되었습니다.', 'success');
  });

  it('업무함 관리는 업무 관리 화면의 동작이라 일정 화면에는 없다', () => {
    mocks.permissions = ['DEPT_BOX_READ'];
    render(<ScheduleCalendarClient initialYmd={TODAY_YMD} />);
    expect(screen.queryByRole('button', { name: '업무함 관리' })).not.toBeInTheDocument();
  });
});

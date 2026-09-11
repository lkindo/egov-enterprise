import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 워크허브 두 모달의 **기본 일자 오염 차단**과 **미저장 이탈 보호** 계약.
 *
 * 이 파일이 막는 결함은 둘이다.
 *
 * ① [기본 보고 일자 오염] 보고 모달의 `defaultYmd` 가 **캘린더 탭이 소유한 `currentDate`** 를
 *    읽고 있었다. 그 값은 react-day-picker 의 `onMonthChange` 가 주는 startOfMonth 로 갱신되므로,
 *    캘린더에서 다른 달로 넘긴 뒤 보고를 등록하면 기본 일자가 **오늘이 아니라 그 달 1일**이었다.
 *    세 라우트(/smart-toolkit/dept-job·work-report·schedule)가 한 컴포넌트의 state 를 공유해서
 *    생긴 교차 오염이며, 화면은 그 사실을 어디에서도 말하지 않아 잘못된 일자가 조용히 저장됐다.
 *    보고의 기본값은 캘린더와 무관한 '오늘'(서버 렌더 시점 `initialYmd`)이어야 한다.
 *    ⚠ 반대로 **일정 모달이 캘린더 월을 따르는 것은 정상**이다 — 아래 대조군이 그 경계를 고정한다.
 *    둘을 구분하지 않고 "공유 state 를 끊는다" 로 일반화하면 일정 등록의 기본값이 망가진다.
 *
 * ② [미저장 이탈 보호 부재] `StandardModal` 은 `closeDisabled`(저장 중 잠금)만 보고 **미저장 입력은
 *    보지 않았다**. 그래서 Esc·배경 클릭·X·취소 어디로 닫아도 작성 중이던 입력이 경고 없이 사라졌다.
 *    같은 폼이라도 전용 페이지에 있으면 라우터 가드(UnsavedChangesContext)가 잡아 주는데 모달만
 *    무방비였던 비대칭이다. `useDirtyCloseGuard` 가 그 보호를 모달에 준다.
 *    ⚠ StandardModal 은 Esc·배경·X 세 경로를 모두 `onOpenChange(false) → onClose` 한 곳으로 모으므로
 *    (standard-modal.tsx), 여기서 `onClose` 하나를 고정하면 세 출구가 함께 고정된다. 폼의 '취소' 만
 *    별도 prop(`onCancel`)이라 두 배선을 각각 검증한다 — 한쪽만 가드에 물려도 다른 쪽으로 샌다.
 *
 * 모킹 셋업은 같은 디렉터리의 `WorkHubClient.schedule-error.test.tsx` 와 같은 축을 쓰되 둘만 다르다.
 *  - `useSearchParams` 가 tab 을 돌려주지 않는다: 값이 있으면 동기화 useEffect 가 매 렌더마다
 *    activeTab 을 그 값으로 되돌려 **탭 버튼 클릭이 먹지 않는다**. ① 은 탭을 실제로 옮겨야 한다.
 *  - `ReportCreateForm` 을 대역으로 바꿔 `defaultYmd` prop 을 화면에 드러낸다: 실제 폼은 그 값을
 *    날짜 입력에 흡수해 버려 "무엇이 전달됐는가" 가 간접 증거로만 남는다.
 * 일정 모달은 **실제 `ScheduleCreateForm`** 을 그대로 쓴다 — dirty 판정이 react-hook-form 의
 * `formState.isDirty` → `onEditStateChange` → 부모 state → 가드로 이어지는 전 구간이 계약이기 때문이다.
 */

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
  push: vi.fn(),
  scheduleRows: [] as Array<Record<string, unknown>>,
  reportRows: [] as Array<Record<string, unknown>>,
}));

// tab 쿼리는 비워 둔다(위 주석 참조). 탭 선택은 defaultTab prop 과 탭 버튼이 소유한다.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => ({ get: () => null }),
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

// 월 이동만 흉내 낸다. react-day-picker v9 는 onMonthChange 에 **그 달의 1일**(startOfMonth)을
// 넘기므로 대역도 같은 값을 준다 — ① 의 오염이 정확히 이 값으로 새어 나갔다.
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onMonthChange }: { onMonthChange?: (month: Date) => void }) => (
    <div data-testid="calendar">
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
// 이 스펙은 닫기 가드와 기본 일자만 본다 — 관리자 전용 버튼은 대상이 아니므로 비관리자로 고정한다.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ROLE_USER' } }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: vi.fn(),
  createDeptSchedule: mocks.createSchedule,
  updateDeptSchedule: mocks.updateSchedule,
  deleteDeptSchedule: mocks.deleteSchedule,
}));

import WorkHubClient from '../WorkHubClient';

/** 서버 렌더 시점의 '오늘'. 캘린더로 옮겨 갈 달(2026-12)과 일부러 다른 달로 잡는다. */
const TODAY_YMD = '20260906';

describe('WorkHubClient 모달 기본 일자와 미저장 이탈 보호', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('캘린더 월을 옮겨도 보고 기본 일자는 오늘이고, 일정 기본 일자만 옮긴 달을 따른다', async () => {
    const user = userEvent.setup();
    render(<WorkHubClient defaultTab="calendar" initialYmd={TODAY_YMD} />);

    // 캘린더를 2026년 12월로 옮긴다(= currentDate 가 2026-12-01 이 된다).
    await user.click(screen.getByRole('button', { name: '2026년 12월 보기' }));

    // [대조군] 일정 등록의 기본 일자는 캘린더가 보고 있는 달을 따르는 것이 **정상**이다.
    // 이 단언이 없으면 ① 을 고치면서 일정 쪽 기본값까지 '오늘' 로 묶어도 아무도 모른다.
    await user.click(screen.getByRole('button', { name: /일정 등록/ }));
    const scheduleDialog = screen.getByRole('dialog', { name: '일정 등록' });
    expect(within(scheduleDialog).getByLabelText(/^시작일/)).toHaveValue('2026-12-01');

    // 아무것도 입력하지 않았으므로 확인 없이 닫힌다(미저장 변경이 없다).
    await user.click(within(scheduleDialog).getByRole('button', { name: '모달 닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '일정 등록' })).not.toBeInTheDocument());
    expect(mocks.confirm).not.toHaveBeenCalled();

    // [본 계약] 보고 탭으로 옮겨 등록 모달을 열면 기본 일자는 캘린더의 12월이 아니라 '오늘' 이다.
    await user.click(screen.getByRole('tab', { name: '업무 보고' }));
    await user.click(screen.getByRole('button', { name: /보고 등록/ }));
    const reportDialog = screen.getByRole('dialog', { name: '업무 보고 등록' });
    expect(within(reportDialog).getByTestId('report-default-ymd')).toHaveTextContent(TODAY_YMD);
    // 오염된 값(옮긴 달의 1일)이 다시 새어 나오면 즉시 드러나도록 반대 방향도 못박는다.
    expect(within(reportDialog).getByTestId('report-default-ymd')).not.toHaveTextContent('20261201');
  });

  it('미저장 입력이 있으면 X 로 닫아도 확인을 거치고, 계속 편집을 고르면 모달과 입력이 남는다', async () => {
    // '계속 편집' = 확인 모달의 취소. 이때 닫히면 사용자가 지키려던 입력이 그대로 사라진다.
    mocks.confirm.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<WorkHubClient defaultTab="calendar" initialYmd={TODAY_YMD} />);

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
    render(<WorkHubClient defaultTab="calendar" initialYmd={TODAY_YMD} />);

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
    render(<WorkHubClient defaultTab="calendar" initialYmd={TODAY_YMD} />);

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
    render(<WorkHubClient defaultTab="calendar" initialYmd={TODAY_YMD} />);

    await user.click(screen.getByRole('button', { name: /일정 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '일정 등록' });
    await user.type(within(dialog).getByRole('textbox', { name: /일정명/ }), '저장할 일정');

    await user.click(within(dialog).getByRole('button', { name: '일정 등록' }));

    await waitFor(() => expect(mocks.createSchedule).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '일정 등록' })).not.toBeInTheDocument());
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('일정이 등록되었습니다.', 'success');
  });

  it('보고 모달도 같은 가드를 쓴다 — 계속 편집은 남기고 버리기는 닫는다', async () => {
    // 두 모달이 각각 자기 dirty 상태와 가드를 갖는다. 한쪽만 배선하면 다른 쪽은 무방비다.
    mocks.confirm.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<WorkHubClient defaultTab="report" initialYmd={TODAY_YMD} />);

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
});

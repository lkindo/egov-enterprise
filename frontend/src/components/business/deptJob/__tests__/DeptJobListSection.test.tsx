/**
 * 부서 업무 목록 섹션(`DeptJobListSection`)의 **합성(composed) write 계약**과 슬롯 계약.
 *
 * [이 파일이 생긴 경위] 이 계약들은 원래 `app/admin/work-hub/__tests__/WorkHubClient.schedule-error.test.tsx`
 * 에 있었다. 부서 업무 목록이 core 소유 컴포넌트로 분리되면서(재사용 base 의 core·collaboration
 * 프로필에서 `/smart-toolkit/dept-job` 이 cascade 로 빠지던 문제) 계약의 소유자도 함께 옮겨 온다.
 * 폼 검증 census 는 합성 경계마다 **한 증거 파일이 자식 계약 전부를** 증명할 것을 요구하므로
 * (evidenceProvesComposedBehavior — childContracts.every), 경계가 옮겨 가면 증거도 옮겨 가야 한다.
 *
 * ⚠ **잠금의 범위가 달라졌다.** 종전 워크허브에서는 업무 등록이 보고·일정 삭제까지 함께 막았다
 * (세 탭이 한 컴포넌트의 state 를 공유했기 때문이다). 분리 후 이 섹션이 무효화하는 캐시는
 * `['work-jobs']` 하나뿐이고 보고·일정은 다른 컴포넌트가 소유하므로, 상호 잠금의 상대는
 * **같은 섹션의 업무 삭제**다. 계약의 형태(정방향 + 역방향 양쪽 고정)는 그대로 유지한다.
 *
 * 계약마다 고정하는 것은 두 방향이다.
 *  ① 정방향 — 자식 제출이 부모 sink 를 정확히 한 번만 부르고, 진행 중에는 제어가
 *     disabled·aria-busy 이며 형제 삭제가 나가지 못하고, 실패해도 모달과 입력값이 남고
 *     필드 오류는 폼에 귀속된다.
 *  ② 역방향 — 형제 삭제가 진행 중이면 자식 제출이 아예 나가지 않는다.
 * 한 방향만 고정하면 "한쪽만 막는" 비대칭 잠금이 조용히 들어와도 아무 게이트가 알리지 않는다.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createDeptJob: vi.fn(),
  deleteDeptJob: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  push: vi.fn(),
  role: 'ROLE_USER' as string,
  permissions: [] as string[],
  jobRows: [] as Array<Record<string, unknown>>,
  dialogRenders: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span aria-hidden="true" />,
  FolderCog: () => <span aria-hidden="true" />,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'work-jobs'
      ? { list: mocks.jobRows, totalPage: 1, total: mocks.jobRows.length }
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

vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, children, onClose, closeDisabled, title }: { isOpen: boolean; children: React.ReactNode; onClose: () => void; closeDisabled?: boolean; title: string }) => isOpen ? (
    <div role="dialog" aria-label={title}>
      <button type="button" disabled={closeDisabled} onClick={onClose}>모달 닫기</button>
      {children}
    </div>
  ) : null,
}));

/*
  실물 폼(DeptJobForm)은 useAppForm·담당자 검색 피커·업무함 조회를 함께 끌고 오므로, 계약이 실제로
  보는 지점만 남긴 최소 대역(band)으로 세운다 — 부모가 내려준 pending 의 제어 반영(disabled·aria-busy),
  부모가 되던진 구조화 필드 오류의 귀속과 값 보존, dirty 통지. 버튼 라벨·pending 문구는 실물과 같다.

  PRIORITY_LABEL 은 섹션의 업무 목록 컬럼이 직접 쓰므로 계속 내보내야 한다.
*/
vi.mock('@/components/business/deptJob/DeptJobForm', () => ({
  PRIORITY_LABEL: {},
  DeptJobForm: ({ onSubmit, onCancel, onEditStateChange, isPending = false }: {
    onSubmit: (values: { deptTaskNm: string }) => Promise<void>;
    onCancel: () => void;
    onEditStateChange?: (state: { dirty: boolean; pending: boolean }) => void;
    isPending?: boolean;
  }) => {
    const [deptTaskNm, setDeptTaskNm] = React.useState('');
    const [fieldError, setFieldError] = React.useState<string | null>(null);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFieldError(null);
          // 실물 폼이 useAppForm 으로 하는 일 중 이 계약이 보는 것만 흉내낸다 —
          // 부모(handleSubmitJob)가 toast 로 삼키지 않고 **되던진** 필드 오류를 폼이 귀속한다.
          void onSubmit({ deptTaskNm }).catch((error: unknown) => {
            const errors = (error as { response?: { data?: { errors?: Array<{ message?: string }> } } })
              ?.response?.data?.errors;
            setFieldError(errors?.[0]?.message ?? '업무를 등록하지 못했습니다.');
          });
        }}
      >
        {/* htmlFor↔id 대신 aria-label 로 이름을 붙인다 — jsx-a11y/control-has-associated-label 은
            형제 <label> 의 htmlFor 를 해석하지 않아 lint error 가 된다(경고 상한에 여유가 없다). */}
        <input
          aria-label="업무명"
          value={deptTaskNm}
          onChange={(event) => {
            setDeptTaskNm(event.target.value);
            onEditStateChange?.({ dirty: true, pending: false });
          }}
        />
        {fieldError ? <p>{fieldError}</p> : null}
        <button type="button" onClick={onCancel} disabled={isPending}>취소</button>
        <button type="submit" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? '저장 중…' : '업무 등록'}
        </button>
      </form>
    );
  },
}));

vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: {
    createDeptJob: mocks.createDeptJob,
    deleteDeptJob: mocks.deleteDeptJob,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: mocks.role, permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/components/business/deptJob/DeptJobBoxManageDialog', () => ({
  DeptJobBoxManageDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    mocks.dialogRenders(isOpen);
    return isOpen ? (
      <div role="dialog" aria-label="업무함 관리">
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    ) : null;
  },
}));

import { DeptJobListSection } from '../DeptJobListSection';
import { DeptJobSectionSlotProvider } from '../dept-job-section-slot';

describe('DeptJobListSection composed write contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.createDeptJob.mockResolvedValue(undefined);
    mocks.deleteDeptJob.mockResolvedValue(undefined);
    mocks.role = 'ROLE_USER';
    mocks.permissions = [];
    mocks.jobRows = [];
  });

  /*
    [DeptJobForm 계약 — 정방향] 업무 등록 제출이 등록 sink 를 정확히 한 번 부르고, 진행 중에는
    폼 제어와 모달 닫기가 잠기며, **형제 삭제 액션이 나가지 못한다**. 마지막으로 서버 필드 오류는
    toast 로 삼키지 않고 폼에 귀속되어 사용자가 쓴 값이 남는다.

    ⚠ 진행 중 형제 삭제가 막히는 것은 두 겹이다 — 행 제어가 `disabled` 라 사용자가 누를 수 없고
    (이 블록이 보는 것), 눌렸더라도 `handleDeleteJob` 이 `jobActionPendingRef` 를 보고 되돌아간다.
    ref 층은 아래 역방향 블록이 실제로 증명한다(그쪽은 제출 버튼이 disabled 가 아니라서 ref 가
    유일한 방어선이다).
  */
  it('업무 등록 제출은 등록 sink를 한 번만 호출하고 진행 중 형제 삭제를 막으며 필드 오류 뒤 값을 보존한다', async () => {
    let rejectCreateJob!: (reason?: unknown) => void;
    const serverError = {
      response: { data: { errors: [{ field: 'deptTaskNm', message: '등록할 수 없는 업무명입니다.' }] } },
    };
    mocks.jobRows = [{
      deptTaskSn: 41,
      deptTaskNm: '잠금 확인용 업무',
      deptTaskBoxNm: null,
      picNm: null,
      prrtyRnk: '2',
    }];
    mocks.createDeptJob.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectCreateJob = reject;
    }));
    const user = userEvent.setup();

    render(<DeptJobListSection />);
    await user.click(screen.getByRole('button', { name: /업무 등록/ }));
    const dialog = screen.getByRole('dialog', { name: '부서 업무 등록' });
    const jobName = within(dialog).getByRole('textbox', { name: '업무명' });
    await user.type(jobName, '보존할 부서 업무');
    const submit = within(dialog).getByRole('button', { name: '업무 등록' });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.createDeptJob).toHaveBeenCalledTimes(1));
    expect(mocks.createDeptJob).toHaveBeenCalledWith(expect.objectContaining({
      deptTaskNm: '보존할 부서 업무',
    }));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '모달 닫기' })).toBeDisabled();

    // 등록이 진행 중인 동안 행 삭제는 눌릴 수 없고 어떤 경로로도 나가지 않는다(상호 잠금).
    const remove = screen.getByTestId('job-delete');
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.deleteDeptJob).not.toHaveBeenCalled();

    await act(async () => rejectCreateJob(serverError));

    expect(await within(dialog).findByText('등록할 수 없는 업무명입니다.')).toBeVisible();
    expect(jobName).toHaveValue('보존할 부서 업무');
    expect(dialog).toBeVisible();
    expect(submit).not.toBeDisabled();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });

  /*
    [DeptJobForm 계약 — 역방향] 형제 삭제가 진행 중이면 업무 등록 제출이 **아예 나가지 않는다**
    (handleSubmitJob 이 jobActionPendingRef 를 본다). 이 방향에서는 제출 버튼이 disabled 가
    아니므로 — `isPending` 은 `jobAction?.type === 'save'` 만 본다 — ref 가 유일한 방어선이다.
    정방향만 고정하면 한쪽만 막는 비대칭 잠금이 들어와도 게이트가 알리지 못한다.
  */
  it('업무 삭제가 진행 중이면 업무 등록 제출이 나가지 않는다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.jobRows = [{
      deptTaskSn: 43,
      deptTaskNm: '선행 삭제 업무',
      deptTaskBoxNm: null,
      picNm: null,
      prrtyRnk: '2',
    }];
    mocks.deleteDeptJob.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    const user = userEvent.setup();

    render(<DeptJobListSection />);
    // 모달을 먼저 열어 둔다 — 목록 밖에 마운트되므로 행 액션이 진행 중이어도 열린 채 남는다.
    await user.click(screen.getByRole('button', { name: /업무 등록/ }));

    const remove = screen.getByTestId('job-delete');
    await user.click(remove);
    await waitFor(() => expect(mocks.deleteDeptJob).toHaveBeenCalledTimes(1));
    expect(remove).toBeDisabled();

    const dialog = screen.getByRole('dialog', { name: '부서 업무 등록' });
    const submit = within(dialog).getByRole('button', { name: '업무 등록' });
    // 제출 버튼은 잠기지 않는다 — 그래서 이 단언이 ref 가드를 실제로 통과시킨다.
    expect(submit).not.toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: '업무명' }), '잠금 중 등록 시도');
    await user.click(submit);

    expect(mocks.createDeptJob).not.toHaveBeenCalled();
    expect(dialog).toBeVisible();

    rejectDelete(new Error('업무 삭제 실패'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '삭제에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.',
      'error',
    ));
    expect(remove).not.toBeDisabled();
  });

  /*
    [handleDeleteJob 계약 — 행 단위 삭제] 행의 삭제는 census 에 secondary-action 으로 등재돼
    ① 같은 tick 중복 클릭 차단 ② 진행 중 **그 행 제어**의 disabled·aria-busy ③ 실패의 가시적
    피드백을 한 블록에서 증명해야 한다
    (frontend/scripts/frontend-form-validation-census.mjs — evidenceProvesActionBehavior).

    같은 행의 '상세' 도 함께 잠그는지 본다 — 삭제가 진행 중인 업무로 이동하면 사용자는
    방금 사라질 화면으로 들어간다.
  */
  it('업무 삭제는 confirm 전에 선점하고 실패 중 해당 행 제어에 pending 상태를 표시한다', async () => {
    let rejectDeleteJob!: (reason?: unknown) => void;
    mocks.jobRows = [{
      deptTaskSn: 77,
      deptTaskNm: '삭제 대상 업무',
      deptTaskBoxNm: null,
      picNm: null,
      prrtyRnk: '2',
    }];
    // handleDeleteJob 이 부르는 sink 를 붙잡아 둔다 — 해소 전까지 pending 상태를 관찰한다.
    mocks.deleteDeptJob.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDeleteJob = reject;
    }));
    render(<DeptJobListSection />);
    const remove = screen.getByTestId('job-delete');

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteDeptJob).toHaveBeenCalledTimes(1));
    expect(mocks.deleteDeptJob).toHaveBeenCalledWith(77);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('삭제 대상 업무 삭제 중');
    expect(screen.getByRole('button', { name: '삭제 대상 업무 상세 보기' })).toBeDisabled();

    rejectDeleteJob(new Error('업무 삭제 서버 오류'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '삭제에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.',
      'error',
    ));
    expect(remove).not.toBeDisabled();
    expect(screen.getByText('삭제 대상 업무')).toBeInTheDocument();
  });
});

/**
 * 슬롯 계약 — 이 섹션이 **core 프로필에서 단독으로 성립**하는지를 고정한다.
 *
 * 워크허브 탭 스트립은 보고·일정 라우트를 가리키는데 그 둘은 demo pack 소유라 core 프로필에는
 * 존재하지 않는다. 그래서 탭은 import 가 아니라 슬롯으로만 들어오고, 슬롯이 비면 섹션은 탭도
 * tabpanel 도 그리지 않는다 — 가리키는 탭이 없는 tabpanel 을 남기지 않기 위해서다.
 */
describe('DeptJobListSection 탭 스트립 슬롯', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.role = 'ROLE_USER';
    mocks.permissions = [];
    mocks.jobRows = [];
  });

  it('슬롯이 없으면 탭도 tabpanel 도 그리지 않는다(core 프로필)', () => {
    render(<DeptJobListSection />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
    // 목록 자체는 그대로 있다 — 탭이 없다고 화면이 비지 않는다.
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('provider 가 준 탭 스트립을 액션 영역에 그리고 tabpanel 로 받는다(demo 레이아웃)', () => {
    render(
      <DeptJobSectionSlotProvider
        value={<div role="tablist" aria-label="워크허브 영역 선택"><button type="button" role="tab" id="work-hub-tab-job" aria-selected aria-controls="work-hub-tabpanel">업무 관리</button></div>}
      >
        <DeptJobListSection />
      </DeptJobSectionSlotProvider>,
    );
    expect(screen.getByRole('tablist', { name: '워크허브 영역 선택' })).toBeInTheDocument();
    // 탭이 aria-controls 로 가리키는 패널이 실제로 존재해야 한다.
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'work-hub-tabpanel');
  });

  it('prop 이 있으면 prop 이 이긴다(워크허브가 직접 내려주는 경로)', () => {
    render(
      <DeptJobSectionSlotProvider value={<span>context-tabs</span>}>
        <DeptJobListSection leadingActions={<span>prop-tabs</span>} />
      </DeptJobSectionSlotProvider>,
    );
    expect(screen.getByText('prop-tabs')).toBeInTheDocument();
    expect(screen.queryByText('context-tabs')).not.toBeInTheDocument();
  });

  it('관리자에게만 업무함 관리 버튼을 그리고, 누르면 다이얼로그를 마운트한다', async () => {
    mocks.role = 'ROLE_ADMIN';
    mocks.permissions = ['DEPT_BOX_READ'];
    const user = userEvent.setup();
    render(<DeptJobListSection />);
    // 열기 전에는 다이얼로그 자체를 마운트하지 않는다(조회 훅이 목록 렌더에 끼지 않는다).
    expect(mocks.dialogRenders).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '업무함 관리' }));
    expect(screen.getByRole('dialog', { name: '업무함 관리' })).toBeInTheDocument();
  });

  it('비관리자에게는 업무함 관리 버튼을 그리지 않는다(죽은 버튼 금지)', () => {
    render(<DeptJobListSection />);
    expect(screen.queryByRole('button', { name: '업무함 관리' })).not.toBeInTheDocument();
    expect(mocks.dialogRenders).not.toHaveBeenCalled();
  });
});

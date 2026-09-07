/**
 * 🚪 부재(자리비움) 배선 계약 — /admin/user/absences (ABSENCES 탭).
 *
 * [2026-09-07] 백엔드 3본(GET 목록·GET 상세·PUT)은 완비돼 있었는데 프런트 호출부가 0 이라
 * 이 탭은 전체 사용자를 그린 뒤 "부재 정보는 아직 이 화면에 연동되지 않았습니다" 라고 고지만
 * 했다. operation-consumer-census 가 그 부채 3건을 `unwired` 로 드러냈고 이 계약이 배선을 고정한다.
 *
 * 검증 축:
 *   1) 조인 축이 esntlId 다 — tb_user_absn.user_id 는 이름과 달리 로그인 ID 가 아니라 사용자 PK 이고
 *      FK 도 tb_user_info(esntl_id) 를 가리킨다(V2_14). 반면 허브의 selectedItemId 는 userId 다.
 *      loginId 로 맞추면 어떤 행도 매칭되지 않은 채 **조용히 전원 정상**으로 보인다.
 *   2) '기록 없음' 과 'N' 은 둘 다 정상이고, **조회 실패는 정상이 아니라 '알 수 없음'** 이다.
 *   3) 토글은 반대 값으로 한 번만 부르고, pending 동안 잠기며(disabled·aria-busy), 실패는 드러난다.
 */
import React, { Suspense } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserOrgHubClient from '../UserOrgHubClient';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { userAbsenceAdminService } from '@/services/foundation/system/UserAbsenceAdminService';

const { mockToast, mockConfirm } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/user/absences',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('framer-motion', () => {
  const passthrough = (tag: string) =>
    function MotionMock({ children, initial: _i, animate: _a, exit: _e, transition: _t, layoutId: _l, ...props }: any) {
      return React.createElement(tag, props, children);
    };
  const cache = new Map<string, ReturnType<typeof passthrough>>();
  return {
    motion: new Proxy({}, {
      get: (_t, key) => {
        const tag = typeof key === 'string' ? key : 'div';
        if (!cache.has(tag)) cache.set(tag, passthrough(tag));
        return cache.get(tag);
      },
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <>{children}</>,
  DragOverlay: () => null,
  KeyboardSensor: function KeyboardSensor() {},
  PointerSensor: function PointerSensor() {},
  useSensor: () => ({}),
  useSensors: () => [],
  closestCenter: vi.fn(),
  defaultDropAnimationSideEffects: () => ({}),
  MeasuringStrategy: { Always: 'always' },
}));
vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items: any[]) => items,
  SortableContext: ({ children }: any) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: undefined, isDragging: false }),
}));
vi.mock('@dnd-kit/utilities', () => ({ CSS: { Translate: { toString: () => '' } } }));

vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type: _t, variant: _v, size: _s, className: _c, ...rest }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: () => null,
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title, actions }: any) => <div><h1>{title}</h1>{actions}</div>,
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ children }: any) => <section>{children}</section>,
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mockConfirm }));
vi.mock('@/app/components/ui/status-displays', () => ({
  ErrorStateDisplay: ({ error }: any) => <div role="alert">{String(error)}</div>,
}));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: any) => value }));
vi.mock('@/app/components/ui/standard-modal', () => ({ StandardModal: () => null }));

// 부재 상태·조치는 표의 열 accessor 안에 산다 — 열을 실제로 렌더하는 표 mock 이어야 보인다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: any) => (
    <table>
      <tbody>
        {(data ?? []).map((item: any, rowIndex: number) => (
          <tr key={item.userId ?? rowIndex}>
            {(columns ?? []).map((column: any, columnIndex: number) => (
              <td key={columnIndex}>
                {typeof column.accessor === 'function'
                  ? column.accessor(item, rowIndex)
                  : String(item[column.accessor] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('@/components/admin/user/UserManageForm', () => ({ UserManageForm: () => null }));
vi.mock('@/components/admin/user/DepartmentForm', () => ({ DepartmentForm: () => null }));
vi.mock('@/components/admin/user/AdminPasswordResetForm', () => ({ AdminPasswordResetForm: () => null }));
vi.mock('@/app/actions/deptActions', () => ({ saveDeptHierarchyAction: vi.fn() }));
vi.mock('@/app/actions/userActions', () => ({
  bulkUpdateUserStatusAction: vi.fn(),
  bulkMoveUserDeptAction: vi.fn(),
  bulkDeleteUsersAction: vi.fn(),
  bulkUpdateUserRoleAction: vi.fn(),
}));
vi.mock('@/services/foundation/system/UserAdminService', () => ({
  userAdminService: { getUserList: vi.fn(), getUser: vi.fn() },
}));
vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: { getDeptList: vi.fn() },
}));
vi.mock('@/services/foundation/system/UserAbsenceAdminService', async (importOriginal) => {
  // ABSENT/PRESENT 상수는 실제 모듈 값을 그대로 쓴다 — 테스트가 어휘를 따로 지어내면
  // 서버 계약이 바뀌어도 이 테스트만 green 으로 남는다.
  const actual = await importOriginal<typeof import('@/services/foundation/system/UserAbsenceAdminService')>();
  return {
    ...actual,
    userAbsenceAdminService: { getAbsences: vi.fn(), getAbsence: vi.fn(), updateAbsence: vi.fn() },
  };
});

import { deptAdminService } from '@/services/foundation/system/DeptAdminService';

/** 목록 projection 은 esntlId 를 싣는다(UserRepositoryImpl Projections.constructor). */
const ABSENT_USER = { userId: 'kim01', userNm: '김부재', esntlId: 'E-ABSENT' };
const RETURNED_USER = { userId: 'lee02', userNm: '이복귀', esntlId: 'E-RETURNED' };
const NORECORD_USER = { userId: 'park03', userNm: '박무기록', esntlId: 'E-NONE' };

const listPage = {
  list: [ABSENT_USER, RETURNED_USER, NORECORD_USER],
  total: 3, page: 1, size: 10, totalPage: 1,
};

function resolvedThenable<T>(value: T): Promise<T> {
  const thenable = Promise.resolve(value) as Promise<T> & { status?: string; value?: T };
  thenable.status = 'fulfilled';
  thenable.value = value;
  return thenable;
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => { resolve = next; reject = fail; });
  return { promise, resolve, reject };
}

function renderAbsenceTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>loading</div>}>
        <UserOrgHubClient
          defaultTab="ABSENCES"
          usersPromise={resolvedThenable(null)}
          deptsPromise={resolvedThenable(null)}
        />
      </Suspense>
    </QueryClientProvider>,
  );
}

function rowOf(name: string) {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

/**
 * 사용자 목록과 부재 목록은 서로 다른 쿼리다 — getAbsences 호출만 기다리면 표가 아직 비어 있다.
 * 행이 실제로 그려진 시점을 동기화 지점으로 삼는다.
 */
async function waitForRows() {
  await screen.findByText('김부재');
  await waitFor(() => expect(userAbsenceAdminService.getAbsences).toHaveBeenCalledTimes(1));
}

describe('UserOrgHubClient 부재 관리 배선', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userAdminService.getUserList).mockResolvedValue(listPage as never);
    vi.mocked(userAdminService.getUser).mockResolvedValue(ABSENT_USER as never);
    vi.mocked(deptAdminService.getDeptList).mockResolvedValue({ list: [], total: 0, page: 1, size: 10, totalPage: 0 } as never);
    // 서버는 '기록이 있는 사용자' 만 돌려준다 — 박무기록은 아예 없다.
    vi.mocked(userAbsenceAdminService.getAbsences).mockResolvedValue([
      { userId: 'E-ABSENT', userAbsnYn: 'Y' },
      { userId: 'E-RETURNED', userAbsnYn: 'N' },
    ] as never);
    vi.mocked(userAbsenceAdminService.updateAbsence).mockResolvedValue(undefined as never);
  });

  it('부재 상태를 esntlId 로 조인한다 — 기록 없음과 N 은 모두 정상이다', async () => {
    renderAbsenceTab();

    await waitForRows();

    expect(within(rowOf('김부재')).getByText('부재')).toBeInTheDocument();
    expect(within(rowOf('이복귀')).getByText('정상')).toBeInTheDocument();
    expect(within(rowOf('박무기록')).getByText('정상')).toBeInTheDocument();
  });

  it('로그인 ID 로 조인하지 않는다 — 같은 값이 loginId 축에 있어도 부재로 읽히면 안 된다', async () => {
    // 서버가 loginId 를 담아 보내는 상황을 흉내 낸다. esntlId 축으로만 읽으므로 아무도 부재가 아니어야 한다.
    vi.mocked(userAbsenceAdminService.getAbsences).mockResolvedValue([
      { userId: 'kim01', userAbsnYn: 'Y' },
    ] as never);
    renderAbsenceTab();

    await waitForRows();
    // 상태 셀과 조치 버튼을 함께 본다 — 아무도 부재가 아니면 모든 버튼이 '부재 처리'(복귀가 아니다)다.
    for (const name of ['김부재', '이복귀', '박무기록']) {
      expect(within(rowOf(name)).getByText('정상')).toBeInTheDocument();
      expect(within(rowOf(name)).getByRole('button', { name: `${name} 부재 처리` })).toBeInTheDocument();
    }
  });

  it('조회가 실패하면 전원 정상으로 위장하지 않고 알 수 없음으로 드러낸다', async () => {
    vi.mocked(userAbsenceAdminService.getAbsences).mockRejectedValue(new Error('절단'));
    renderAbsenceTab();

    await screen.findByText('김부재');
    expect(await screen.findByRole('alert')).toHaveTextContent(/부재 상태를 불러오지 못했습니다/);
    expect(within(rowOf('김부재')).getByText('알 수 없음')).toBeInTheDocument();
    // 조치 버튼도 내지 않는다 — 무엇으로 바꿀지 모르는 상태에서 토글을 열면 값을 지어내게 된다.
    expect(within(rowOf('김부재')).queryByRole('button')).toBeNull();
  });

  it('부재 표시는 반대 값으로 한 번만 부르고, pending 동안 잠기며(aria-busy), 실패는 토스트로 드러낸다', async () => {
    const user = userEvent.setup();
    const gate = deferred<void>();
    vi.mocked(userAbsenceAdminService.updateAbsence).mockReturnValue(gate.promise as never);
    renderAbsenceTab();

    await waitForRows();
    const toggle = within(rowOf('박무기록')).getByRole('button', { name: '박무기록 부재 처리' });

    await user.click(toggle);
    await waitFor(() => expect(userAbsenceAdminService.updateAbsence).toHaveBeenCalledTimes(1));
    // 기록이 없던 사용자를 부재(Y)로 — esntlId 로 보낸다.
    expect(userAbsenceAdminService.updateAbsence).toHaveBeenCalledWith('E-NONE', 'Y');

    const busy = within(rowOf('박무기록')).getByRole('button', { name: '박무기록 부재 처리 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    // 잠금 중 다른 행의 버튼도 함께 잠긴다 — 동시 변경으로 목록이 어긋나지 않게 한다.
    expect(within(rowOf('김부재')).getByRole('button')).toBeDisabled();

    await user.click(busy);
    expect(userAbsenceAdminService.updateAbsence).toHaveBeenCalledTimes(1);

    gate.reject(new Error('부재 서버 오류'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('부재 서버 오류', 'error'));
  });

  it('이미 부재인 사용자는 복귀(N)로 되돌린다', async () => {
    const user = userEvent.setup();
    renderAbsenceTab();

    await waitForRows();
    await user.click(within(rowOf('김부재')).getByRole('button', { name: '김부재 복귀 처리' }));

    await waitFor(() => expect(userAbsenceAdminService.updateAbsence).toHaveBeenCalledTimes(1));
    expect(userAbsenceAdminService.updateAbsence).toHaveBeenCalledWith('E-ABSENT', 'N');
    expect(mockToast).toHaveBeenCalledWith('김부재님을 복귀 처리했습니다.', 'success');
  });

  it('"연동되지 않았습니다" 고지는 사라지고, 목록이 전체 사용자라는 사실은 계속 말한다', async () => {
    renderAbsenceTab();

    await waitForRows();
    expect(screen.queryByText(/아직 이 화면에 연동되지 않았습니다/)).toBeNull();
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(/전체 사용자/);
    expect(note).toHaveTextContent(/부재로 표시된 사용자는 1명/);
  });

  it('사용자 탭에는 부재 열을 만들지 않는다 — 탭별 열 구성이 섞이지 않는다', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>loading</div>}>
          <UserOrgHubClient
            defaultTab="USERS"
            usersPromise={resolvedThenable(null)}
            deptsPromise={resolvedThenable(null)}
          />
        </Suspense>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('김부재')).toBeInTheDocument();
    expect(screen.queryByText('부재')).toBeNull();
    expect(screen.queryByText('정상')).toBeNull();
    expect(userAbsenceAdminService.getAbsences).not.toHaveBeenCalled();
  });
});

/**
 * 🧭 사용자 목록 조건·열·부서 소속 인원 계약 — /admin/user/manage (DIP B5 F4, 2026-09-26).
 *
 * 검증 축:
 *   1) 사용자 탭은 계정 상태·소속 부서·로그인 잠금 열을 보이고, 서버가 싣는 값을 그대로 말한다.
 *   2) 세 조건은 서버 쿼리 이름 그대로 나가며, 조건이 바뀌면 1페이지(page 0)로 돌아가고 초기화는 조건을 모두 푼다.
 *   3) 조건 결과가 없으면 '데이터 없음' 이 아니라 '조건에 맞는 사용자가 없습니다' 다(G15).
 *   4) 부재 탭은 전체 사용자를 판정하므로 조건이 없다.
 *   5) 부서 상세는 직속 소속 인원 수와 앞 20명의 이름을 보이고, 나머지는 '외 N명' 으로 말한다.
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

// 다른 관리 화면으로 가는 길은 라우트와 같은 판정(canOpenPage)으로 보인다 — 목적지 권한을 가진 관리자로 렌더한다.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['AUTHRT_READ', 'LOGIN_POL_READ', 'POLICY_READ'], authorizationVersion: 'v1' } }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/user/manage',
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
  StandardDataTable: ({ columns, data, emptyMessage }: any) => (
    <table>
      <thead>
        <tr>{(columns ?? []).map((column: any, index: number) => <th key={index}>{column.header}</th>)}</tr>
      </thead>
      <tbody>
        {(data ?? []).length === 0 && <tr><td>{emptyMessage}</td></tr>}
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

const LOCKED_PENDING = { userId: 'kim01', userNm: '김대기', esntlId: 'E-1', userSttsCd: 'A', ognzId: 'ORG_B', lckYn: 'Y' };
const ACTIVE_NO_DEPT = { userId: 'lee02', userNm: '이정상', esntlId: 'E-2', userSttsCd: 'P', lckYn: 'N' };
const listPage = { list: [LOCKED_PENDING, ACTIVE_NO_DEPT], total: 2, page: 1, size: 10, totalPage: 1 };
const DEPTS = { list: [{ ognzId: 'ORG_B', ognzNm: '기획팀', upOgnzId: null }], total: 1 };

function resolvedThenable<T>(value: T): Promise<T> {
  const thenable = Promise.resolve(value) as Promise<T> & { status?: string; value?: T };
  thenable.status = 'fulfilled';
  thenable.value = value;
  return thenable;
}

function renderHub(defaultTab: 'USERS' | 'DEPTS' | 'ABSENCES' = 'USERS') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>loading</div>}>
        <UserOrgHubClient
          defaultTab={defaultTab}
          usersPromise={resolvedThenable(null)}
          deptsPromise={resolvedThenable(null)}
        />
      </Suspense>
    </QueryClientProvider>,
  );
}

function lastListQuery() {
  const calls = vi.mocked(userAdminService.getUserList).mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe('UserOrgHubClient — 사용자 목록 조건·열·부서 소속 인원 (DIP B5 F4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userAdminService.getUserList).mockResolvedValue(listPage as any);
    vi.mocked(deptAdminService.getDeptList).mockResolvedValue(DEPTS as any);
    vi.mocked(userAbsenceAdminService.getAbsences).mockResolvedValue([] as any);
  });

  it('사용자 탭은 계정 상태·부서·잠금 열을 서버 값대로 보인다', async () => {
    renderHub();

    const lockedRow = (await screen.findByText('김대기')).closest('tr') as HTMLElement;
    await waitFor(() => expect(within(lockedRow).getByText('기획팀 (ORG_B)')).toBeInTheDocument());
    expect(within(lockedRow).getByText('승인 대기')).toBeInTheDocument();
    expect(within(lockedRow).getByText('로그인 잠김')).toBeInTheDocument();

    const activeRow = screen.getByText('이정상').closest('tr') as HTMLElement;
    expect(within(activeRow).getByText('정상')).toBeInTheDocument();
    expect(within(activeRow).getByText('미지정')).toBeInTheDocument();
    expect(within(activeRow).queryByText('로그인 잠김')).toBeNull();
  });

  it('조건은 서버 쿼리 이름 그대로 나가고 1페이지로 돌아가며, 초기화는 조건을 모두 푼다', async () => {
    const user = userEvent.setup();
    renderHub();
    await screen.findByText('김대기');
    await waitFor(() => expect(screen.getByRole('option', { name: '기획팀' })).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText('계정 상태'), 'A');
    await waitFor(() => expect(lastListQuery()).toMatchObject({ page: 0, userSttsCd: 'A' }));

    await user.selectOptions(screen.getByLabelText('소속 부서'), 'ORG_B');
    await user.selectOptions(screen.getByLabelText('로그인 잠금'), 'Y');
    await waitFor(() => expect(lastListQuery()).toMatchObject({ page: 0, userSttsCd: 'A', ognzId: 'ORG_B', lckYn: 'Y' }));

    await user.click(screen.getByRole('button', { name: '초기화' }));
    await waitFor(() => {
      const query = lastListQuery() as Record<string, unknown>;
      expect(query).not.toHaveProperty('userSttsCd');
      expect(query).not.toHaveProperty('ognzId');
      expect(query).not.toHaveProperty('lckYn');
    });
    expect(screen.getByLabelText('계정 상태')).toHaveValue('');
  });

  it('조건 결과가 없으면 데이터가 없다고 말하지 않는다(G15)', async () => {
    const user = userEvent.setup();
    renderHub();
    await screen.findByText('김대기');
    vi.mocked(userAdminService.getUserList).mockResolvedValue({ list: [], total: 0, page: 1, size: 10, totalPage: 0 } as any);

    await user.selectOptions(screen.getByLabelText('로그인 잠금'), 'Y');

    expect(await screen.findByText('조건에 맞는 사용자가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText('데이터가 존재하지 않습니다.')).toBeNull();
  });

  it('부재 탭은 전체 사용자를 판정하므로 조건을 두지 않는다', async () => {
    renderHub('ABSENCES');
    await screen.findByText('김대기');

    expect(screen.queryByLabelText('계정 상태')).toBeNull();
    expect(screen.queryByLabelText('로그인 잠금')).toBeNull();
  });

  it('부서 상세는 직속 소속 인원 수와 앞 20명의 이름을 보이고 나머지를 외 N명으로 말한다', async () => {
    const members = Array.from({ length: 20 }, (_, index) => ({ userId: 'm' + (index + 1), userNm: '구성원' + (index + 1) }));
    vi.mocked(userAdminService.getUserList).mockImplementation(async (params: any) => (
      params?.ognzId === 'ORG_B'
        ? { list: members, total: 22, page: 1, size: 20, totalPage: 2 }
        : listPage
    ) as any);
    const user = userEvent.setup();
    renderHub('DEPTS');

    const deptButton = (await screen.findByText('기획팀')).closest('button') as HTMLElement;
    await user.click(deptButton);

    await waitFor(() => expect(userAdminService.getUserList).toHaveBeenCalledWith({ page: 0, size: 20, ognzId: 'ORG_B' }));
    expect(await screen.findByText(/^22명 — 구성원1, .*구성원20 외 2명$/)).toBeInTheDocument();
  });

  it('소속 인원이 없으면 없음, 조회에 실패하면 불러오지 못했다고 말한다', async () => {
    vi.mocked(userAdminService.getUserList).mockImplementation(async (params: any) => (
      params?.ognzId === 'ORG_B' ? { list: [], total: 0, page: 1, size: 20, totalPage: 0 } : listPage
    ) as any);
    const user = userEvent.setup();
    const view = renderHub('DEPTS');
    await user.click((await screen.findByText('기획팀')).closest('button') as HTMLElement);
    expect(await screen.findByText('없음')).toBeInTheDocument();
    view.unmount();

    vi.mocked(userAdminService.getUserList).mockImplementation(async (params: any) => {
      if (params?.ognzId === 'ORG_B') throw new Error('boom');
      return listPage as any;
    });
    renderHub('DEPTS');
    await user.click((await screen.findByText('기획팀')).closest('button') as HTMLElement);
    expect(await screen.findByText('불러오지 못했습니다')).toBeInTheDocument();
  });
});

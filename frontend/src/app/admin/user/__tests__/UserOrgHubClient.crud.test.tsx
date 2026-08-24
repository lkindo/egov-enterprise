/**
 * /admin/user/manage 허브(UserOrgHubClient)의 CRUD 배선 계약 테스트 (m-2).
 *
 * 백엔드 census(UserApiController · authorization-policies.json)와 정확히 짝을 이룬다:
 *   - GET  /admin/system/users        — searchKeyword + Spring Pageable(page/size, 0-based)만 읽는다.
 *   - GET  /admin/system/users/{id}   — 전체 UserDto(ognzId·userSttsCd 포함). 목록 projection 에는 둘 다 없다.
 *   - POST/PUT/DELETE, PATCH /status  — 전부 ADMIN_OR_SYSTEM 경로 게이트.
 *
 * 검증 축:
 *   1) 목록 조회가 서버가 실제로 읽는 파라미터(page/size)로 나가는지 — 종전 {pageNo}는 무시되어
 *      몇 페이지를 눌러도 항상 첫 페이지가 왔다(死 페이저).
 *   2) 등록·수정·삭제·상태 일괄 변경이 서비스/액션에 실제 배선되는지.
 *   3) 인가 실패(403 등) 시 서버 메시지가 그대로 사용자에게 표시되는지 — 일반 문구로 뭉개지 않는다.
 *   4) 수정 폼·상세 패널이 상세 API 의 전체 레코드를 쓰는지 — 목록 행만 쓰면 ognzId='' 왕복으로
 *      부분수정 계약("" = 지움)에 따라 실제 소속 부서가 지워진다(UserService.updateUser 주석 참조).
 */
import React, { Suspense } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserOrgHubClient from '../UserOrgHubClient';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { bulkUpdateUserStatusAction } from '@/app/actions/userActions';
import { saveDeptHierarchyAction } from '@/app/actions/deptActions';

const { mockToast, mockConfirm } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/user/manage',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('framer-motion', () => {
  const passthrough = (tag: string) =>
    function MotionMock({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, layoutId: _layoutId, ...props }: any) {
      return React.createElement(tag, props, children);
    };
  // 접근할 때마다 새 컴포넌트를 만들면 리렌더마다 서브트리가 재마운트돼
  // 이미 찾아둔 DOM 노드가 분리된다 — 태그별로 캐시해 identity 를 고정한다.
  const componentCache = new Map<string, ReturnType<typeof passthrough>>();
  return {
    motion: new Proxy({}, {
      get: (_target, key) => {
        const tag = typeof key === 'string' ? key : 'div';
        if (!componentCache.has(tag)) componentCache.set(tag, passthrough(tag));
        return componentCache.get(tag);
      },
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragEnd }: any) => (
    <>
      <button type="button" onClick={() => onDragStart?.({ active: { id: 'D-100' } })}>test-drag-start</button>
      <button type="button" onClick={() => onDragEnd?.({ active: { id: 'D-100' }, over: { id: 'D-100' } })}>test-drag-end</button>
      {children}
    </>
  ),
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
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));
vi.mock('@dnd-kit/utilities', () => ({ CSS: { Translate: { toString: () => '' } } }));

vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type: _type, variant: _variant, size: _size, className: _className, ...rest }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: () => null,
}));
vi.mock('@/app/components/layout/page-header', () => ({ PageHeader: ({ title }: any) => <h1>{title}</h1> }));
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ actions }: any) => <div data-testid="hub-header">{actions}</div>,
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
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: (props: any) => (
    <div data-testid="standard-data-table">
      {(props.data ?? []).map((item: any) => (
        <button key={item.userId} type="button" onClick={() => props.onRowClick?.(item)}>
          {`row-${item.userId}`}
        </button>
      ))}
      {(props.bulkActions ?? []).map((action: any) => (
        <button key={action.label} type="button" onClick={() => action.onClick(props.data ?? [])}>
          {`bulk-${action.label}`}
        </button>
      ))}
      <button type="button" onClick={() => props.pagination?.onPageChange(2)}>go-page-2</button>
    </div>
  ),
}));
vi.mock('@/components/admin/user/UserManageForm', () => ({
  UserManageForm: ({ mode, initialData, onSubmit }: any) => (
    <div>
      <div data-testid="user-form-mode">{mode}</div>
      <div data-testid="user-form-initial">{JSON.stringify(initialData ?? null)}</div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            userId: initialData?.userId ?? 'newuser1',
            userNm: initialData?.userNm ?? '신규사용자',
            emlAddr: initialData?.emlAddr ?? '',
            mblTelno: initialData?.mblTelno ?? '',
            // 실제 폼과 동일한 왕복 계약: 시드에 없으면 '' 로 나간다("" = 지움).
            ognzId: initialData?.ognzId ?? '',
            pswd: mode === 'create' ? 'Password1!' : '',
          })
        }
      >
        form-submit
      </button>
    </div>
  ),
}));
vi.mock('@/components/admin/user/DepartmentForm', () => ({ DepartmentForm: () => null }));
vi.mock('@/app/actions/deptActions', () => ({ saveDeptHierarchyAction: vi.fn() }));
vi.mock('@/app/actions/userActions', () => ({
  bulkUpdateUserStatusAction: vi.fn(),
  bulkMoveUserDeptAction: vi.fn(),
  bulkDeleteUsersAction: vi.fn(),
  bulkUpdateUserRoleAction: vi.fn(),
}));
vi.mock('@/services/foundation/system/UserAdminService', () => ({
  userAdminService: {
    getUserList: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));
vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: {
    getDeptList: vi.fn(),
    createDept: vi.fn(),
    updateDept: vi.fn(),
    deleteDept: vi.fn(),
  },
}));

import { deptAdminService } from '@/services/foundation/system/DeptAdminService';

/** 목록 API projection(UserRepositoryImpl 10필드)에는 ognzId·userSttsCd 가 없다 — 실제 응답 그대로. */
const listRow = {
  userId: 'user1',
  userNm: '홍길동',
  esntlId: 'E1',
  emlAddr: 'u1@test.com',
  mblTelno: '01011112222',
};

/** 상세 API(GET /admin/system/users/{id})만 전체 레코드를 돌려준다. */
const detailRecord = {
  ...listRow,
  ognzId: 'D-100',
  userSttsCd: 'P',
  emplNo: 'EMP-7',
};

const listPage = { list: [listRow], total: 1, page: 1, size: 10, totalPage: 3 };

/**
 * React `use()` 가 suspend 없이 동기적으로 읽을 수 있는 fulfilled thenable.
 * (테스트 act 환경에서 일반 Promise 는 fallback 에 갇힌다 — React 의 instrumented thenable fast-path 사용)
 */
function resolvedThenable<T>(value: T): Promise<T> {
  const thenable = Promise.resolve(value) as Promise<T> & { status?: string; value?: T };
  thenable.status = 'fulfilled';
  thenable.value = value;
  return thenable;
}

function renderHub(defaultTab: 'USERS' | 'DEPTS' = 'USERS') {
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

async function selectFirstRow() {
  renderHub();
  fireEvent.click(await screen.findByText('row-user1'));
}

describe('UserOrgHubClient CRUD 배선 (m-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userAdminService.getUserList).mockResolvedValue(listPage as any);
    vi.mocked(userAdminService.getUser).mockResolvedValue(detailRecord as any);
    vi.mocked(deptAdminService.getDeptList).mockResolvedValue({
      list: [
        { ognzId: 'D-100', ognzNm: '기획부', upOgnzId: null },
        { ognzId: 'D-200', ognzNm: '개발부', upOgnzId: null },
      ],
      total: 2,
    } as any);
  });

  it('부서 route에만 A2 선택·방향키·상세 진입 계약을 적용한다', async () => {
    renderHub('DEPTS');

    const layout = await screen.findByTestId('master-detail-incremental-layout');
    expect(screen.getByRole('heading', { level: 1, name: '부서 관리' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '부서 조직 구조' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('왼쪽 조직 구조에서 확인하거나 편집할 부서를 선택하세요.');

    const saveButton = screen.getByRole('button', { name: '조직 계층 저장' });
    expect(saveButton).toBeDisabled();
    fireEvent.keyDown(layout, { key: 's', ctrlKey: true });
    expect(saveDeptHierarchyAction).not.toHaveBeenCalled();

    const planningButton = (await screen.findByText('기획부')).closest('button');
    const developmentButton = screen.getByText('개발부').closest('button');
    expect(planningButton).not.toBeNull();
    expect(developmentButton).not.toBeNull();
    expect(planningButton).toHaveAttribute('data-a2-master-item');
    expect(planningButton).toHaveAttribute('tabindex', '0');
    const dragHandle = screen.getByRole('button', { name: '기획부 (D-100) 순서 이동 핸들' });
    dragHandle.focus();
    fireEvent.keyDown(dragHandle, { key: 'ArrowDown' });
    expect(document.querySelector('[data-a2-master-item][aria-current="true"]')).toBeNull();
    expect(dragHandle).toHaveFocus();

    fireEvent.click(planningButton!);
    expect(planningButton).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2, name: '기획부' })).toBeInTheDocument();

    fireEvent.keyDown(planningButton!, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(developmentButton).toHaveAttribute('aria-current', 'true');
      expect(planningButton).not.toHaveAttribute('aria-current');
    });

    fireEvent.keyDown(developmentButton!, { key: 'Tab' });
    expect(screen.getByRole('button', { name: '정보 수정' })).toHaveFocus();
    expect(screen.getByRole('button', { name: '부서 삭제' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '권한 설정 열기' })).toBeNull();
  });

  it('부서 DnD가 선택과 변경을 만든 뒤 화면 버튼과 같은 저장 동작을 Ctrl+S로 실행한다', async () => {
    vi.mocked(saveDeptHierarchyAction).mockResolvedValue({ success: true, message: '조직 계층을 저장했습니다.' });
    renderHub('DEPTS');

    const layout = await screen.findByTestId('master-detail-incremental-layout');
    await screen.findByText('기획부');
    fireEvent.click(screen.getByRole('button', { name: 'test-drag-start' }));
    fireEvent.click(screen.getByRole('button', { name: 'test-drag-end' }));

    const saveButton = screen.getByRole('button', { name: '조직 계층 저장' });
    await waitFor(() => expect(saveButton).toBeEnabled());

    fireEvent.keyDown(layout, { key: 's', ctrlKey: true });
    await waitFor(() => {
      expect(saveDeptHierarchyAction).toHaveBeenCalledTimes(1);
    });
    expect(mockToast).toHaveBeenCalledWith('조직 계층을 저장했습니다.', 'success');
  });

  it('목록 조회를 서버가 실제로 읽는 Spring Pageable 계약(page/size, 0-based)으로 호출한다', async () => {
    renderHub();
    await screen.findByText('row-user1');
    expect(userAdminService.getUserList).toHaveBeenCalledWith({ page: 0, size: 10, searchKeyword: '' });

    fireEvent.click(screen.getByText('go-page-2'));
    await waitFor(() => {
      expect(userAdminService.getUserList).toHaveBeenCalledWith({ page: 1, size: 10, searchKeyword: '' });
    });
  });

  it('사용자 등록 버튼 → 폼 제출이 createUser 에 배선된다', async () => {
    vi.mocked(userAdminService.createUser).mockResolvedValue(undefined as any);
    renderHub();
    await screen.findByText('row-user1');

    fireEvent.click(screen.getByRole('button', { name: /사용자 등록/ }));
    await screen.findByText('신규 사용자 등록');
    expect(screen.getByTestId('user-form-mode').textContent).toBe('create');

    fireEvent.click(screen.getByText('form-submit'));
    await waitFor(() => {
      expect(userAdminService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'newuser1', pswd: 'Password1!' }),
      );
    });
    expect(mockToast).toHaveBeenCalledWith('사용자가 성공적으로 등록되었습니다.', 'success');
  });

  it('등록 인가 실패(403) 시 서버 메시지를 그대로 표시한다', async () => {
    vi.mocked(userAdminService.createUser).mockRejectedValue(new Error('접근 권한이 없습니다.'));
    renderHub();
    await screen.findByText('row-user1');

    fireEvent.click(screen.getByRole('button', { name: /사용자 등록/ }));
    await screen.findByText('신규 사용자 등록');
    fireEvent.click(screen.getByText('form-submit'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('접근 권한이 없습니다.', 'error');
    });
  });

  it('상세 패널의 소속·상태는 상세 API 의 실데이터로 표시한다', async () => {
    await selectFirstRow();

    await waitFor(() => {
      expect(userAdminService.getUser).toHaveBeenCalledWith('user1');
    });
    await screen.findByText('D-100');
    await screen.findByText('정상');
  });

  it('수정 폼은 상세 API 전체 레코드를 시드로 받아 소속 부서를 보존한 채 updateUser 를 호출한다', async () => {
    vi.mocked(userAdminService.updateUser).mockResolvedValue(undefined as any);
    await selectFirstRow();

    // 상세가 도착한 뒤 수정 모달을 연다(실사용 순서와 동일).
    await screen.findByText('D-100');
    fireEvent.click(screen.getAllByRole('button', { name: /정보 수정/ })[0]);
    await screen.findByText('사용자 정보 수정');
    expect(screen.getByTestId('user-form-mode').textContent).toBe('edit');
    expect(screen.getByTestId('user-form-initial').textContent).toContain('"ognzId":"D-100"');

    fireEvent.click(screen.getByText('form-submit'));
    await waitFor(() => {
      expect(userAdminService.updateUser).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({ ognzId: 'D-100' }),
      );
    });
    expect(mockToast).toHaveBeenCalledWith('사용자 정보가 수정되었습니다.', 'success');
  });

  it('수정 인가 실패(403) 시 서버 메시지를 그대로 표시한다', async () => {
    vi.mocked(userAdminService.updateUser).mockRejectedValue(new Error('접근 권한이 없습니다.'));
    await selectFirstRow();

    await screen.findByText('D-100');
    fireEvent.click(screen.getAllByRole('button', { name: /정보 수정/ })[0]);
    await screen.findByText('사용자 정보 수정');
    fireEvent.click(screen.getByText('form-submit'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('접근 권한이 없습니다.', 'error');
    });
  });

  it('사용자 삭제는 확인 승인 후에만 deleteUser 를 호출한다', async () => {
    mockConfirm.mockResolvedValue(true);
    vi.mocked(userAdminService.deleteUser).mockResolvedValue(undefined as any);
    await selectFirstRow();

    fireEvent.click(await screen.findByRole('button', { name: '사용자 삭제' }));
    await waitFor(() => {
      expect(userAdminService.deleteUser).toHaveBeenCalledWith('user1');
    });
    expect(mockToast).toHaveBeenCalledWith("'홍길동' 사용자를 삭제했습니다.", 'success');
  });

  it('삭제 확인을 거부하면 deleteUser 를 호출하지 않는다', async () => {
    mockConfirm.mockResolvedValue(false);
    await selectFirstRow();

    fireEvent.click(await screen.findByRole('button', { name: '사용자 삭제' }));
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });
    expect(userAdminService.deleteUser).not.toHaveBeenCalled();
  });

  it('삭제 인가 실패(403) 시 서버 메시지를 그대로 표시한다', async () => {
    mockConfirm.mockResolvedValue(true);
    vi.mocked(userAdminService.deleteUser).mockRejectedValue(new Error('접근 권한이 없습니다.'));
    await selectFirstRow();

    fireEvent.click(await screen.findByRole('button', { name: '사용자 삭제' }));
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('접근 권한이 없습니다.', 'error');
    });
  });

  it('상태 일괄 변경 모달이 bulkUpdateUserStatusAction 에 배선된다', async () => {
    vi.mocked(bulkUpdateUserStatusAction).mockResolvedValue({
      success: true,
      message: '1명의 사용자 상태가 변경되었습니다.',
    });
    renderHub();
    await screen.findByText('row-user1');

    fireEvent.click(screen.getByText('bulk-상태 변경'));
    await screen.findByText('사용자 상태 일괄 변경');
    fireEvent.click(screen.getByRole('button', { name: '상태 일괄 적용' }));

    await waitFor(() => {
      expect(bulkUpdateUserStatusAction).toHaveBeenCalledWith(['user1'], 'P');
    });
    expect(mockToast).toHaveBeenCalledWith('1명의 사용자 상태가 변경되었습니다.', 'success');
  });

  it('상태 일괄 변경 인가 실패 시 액션 실패 메시지를 error 로 표시한다', async () => {
    vi.mocked(bulkUpdateUserStatusAction).mockResolvedValue({
      success: false,
      message: '관리자 권한이 필요합니다.',
    });
    renderHub();
    await screen.findByText('row-user1');

    fireEvent.click(screen.getByText('bulk-상태 변경'));
    await screen.findByText('사용자 상태 일괄 변경');
    fireEvent.click(screen.getByRole('button', { name: '상태 일괄 적용' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('관리자 권한이 필요합니다.', 'error');
    });
  });
});

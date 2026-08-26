import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

const navigation = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  deleteMenu: vi.fn(),
  saveMenu: vi.fn(),
  toast: vi.fn(),
  updateOrders: vi.fn(),
}));

// 1. Mock Next.js config
vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

// 2. Mock Lucide Icons - EXPLICITLY AND MANUALLY FOR EVERY ICON IN THIS FILE
vi.mock('lucide-react', () => {
    const R = require('react');
    const Icon = (name: string) => {
        const C = (props: any) => R.createElement('span', { ...props, 'data-testid': `icon-${name.toLowerCase()}` }, name);
        C.displayName = name;
        return C;
    };
    return {
        Plus: Icon('Plus'),
        ChevronRight: Icon('ChevronRight'),
        Settings: Icon('Settings'),
        Trash2: Icon('Trash2'),
        FolderTree: Icon('FolderTree'),
        FileCode: Icon('FileCode'),
        Save: Icon('Save'),
        Layers: Icon('Layers'),
        Link: Icon('Link'),
        ChevronsDownUp: Icon('ChevronsDownUp'),
        ChevronsUpDown: Icon('ChevronsUpDown'),
        Search: Icon('Search'),
        SearchCode: Icon('SearchCode'),
        AlertTriangle: Icon('AlertTriangle'),
        RefreshCcw: Icon('RefreshCcw'),
        Unlink: Icon('Unlink'),
        Network: Icon('Network'),
        Database: Icon('Database'),
        GripVertical: Icon('GripVertical'),
        Home: Icon('Home'),
        Loader2: Icon('Loader2'),
    };
});

// 3. Mock Next.js Navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/system/menus',
  useSearchParams: () => navigation.searchParams,
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/app/actions/menuActions', () => ({
  saveMenuAction: mocks.saveMenu,
  updateMenuOrdersAction: mocks.updateOrders,
  deleteMenuAction: mocks.deleteMenu,
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

// 4. Mock DND Kit (Nullify for unit tests)
vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children, onDragStart, onDragEnd }: any) => (
      <div>
        {children}
        <button type="button" onClick={() => onDragStart?.({ active: { id: 1 } })}>테스트 메뉴 드래그 시작</button>
        <button type="button" onClick={() => onDragEnd?.({ active: { id: 1 }, over: { id: 1 } })}>테스트 메뉴 드래그 완료</button>
      </div>
    ),
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
    useSensor: vi.fn(),
    useSensors: vi.fn(),
    DragOverlay: ({ children }: any) => <div>{children}</div>,
    closestCenter: vi.fn(),
    MeasuringStrategy: { Always: 1 },
    defaultDropAnimationSideEffects: vi.fn(),
}));
vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: any) => <div>{children}</div>,
    verticalListSortingStrategy: {},
    useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: null, isDragging: false }),
    arrayMove: (array: any) => array,
    sortableKeyboardCoordinates: vi.fn(),
}));
vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Translate: { toString: () => '' } }
}));

// 5. Mock heavy UI components directly
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: any) => <div data-testid="hub-header"><h2>{title}</h2>{actions}</div>
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children, action }: any) => <div data-testid="section-card"><h3>{title}</h3>{action}{children}</div>
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: any) => <div data-testid="page-header"><h1>{title}</h1></div>
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ children, footer, isOpen, title, onClose }: any) => isOpen ? (
    <div data-testid="standard-modal">
      <h2>{title}</h2>
      <button type="button" onClick={onClose}>모달 닫기 요청</button>
      {children}
      {footer}
    </div>
  ) : null
}));

import MenuAdminClient from '../MenuAdminClient';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe('MenuAdminClient Component', () => {
    const mockInitialMenus = [
      { menuNo: 1, menuNm: 'Main Menu', upperMenuNo: 0, upperMenuId: 0, menuOrdr: 1, progrmFileNm: 'prog1' },
    ] as any;
    const mockPrograms = [{ prgrmFileNm: 'prog1', prgrmKornNm: 'Program 1' }];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteMenu.mockResolvedValue({ success: true, message: '삭제되었습니다.' });
    mocks.saveMenu.mockResolvedValue({ success: true, message: '메뉴가 등록되었습니다.' });
    mocks.updateOrders.mockResolvedValue({ success: true, message: '순서가 저장되었습니다.' });
  });

  it('renders correctly', async () => {
    const menusPromise = Promise.resolve({ data: mockInitialMenus, error: null });
    const programsPromise = Promise.resolve({ data: mockPrograms, error: null });
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>
      );
    });
    expect(await screen.findByText('Main Menu')).toBeInTheDocument();
  });

  it('opens create modal on "신규 메뉴 등록" click', async () => {
    const menusPromise = Promise.resolve({ data: mockInitialMenus, error: null });
    const programsPromise = Promise.resolve({ data: mockPrograms, error: null });
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>
      );
    });
    const btn = await screen.findByRole('button', { name: '신규 메뉴 등록' });
    fireEvent.click(btn);
    expect(await screen.findByText(/신규 메뉴 정의/i)).toBeInTheDocument();
  });

  it('selects a menu with aria-current and shows its detail actions', async () => {
    const menusPromise = Promise.resolve({ data: mockInitialMenus, error: null });
    const programsPromise = Promise.resolve({ data: mockPrograms, error: null });
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>
      );
    });

    expect(screen.getByText('메뉴를 선택하세요')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '메뉴 수정' })).toBeNull();
    expect(screen.getByRole('button', { name: '구조 저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Main Menu 순서 이동 핸들' })).toBeInTheDocument();

    const menuButton = screen.getByRole('button', { name: /Main Menu.*ID: 1/i });
    expect(menuButton).toHaveAttribute('tabindex', '0');
    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Main Menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '메뉴 수정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '메뉴 삭제' })).toBeInTheDocument();
  });

  it('검색으로 선택 행이 숨으면 상세 선택도 해제한다', async () => {
    const menusPromise = Promise.resolve({
      data: [
        ...mockInitialMenus,
        { menuNo: 2, menuNm: 'Audit Menu', upperMenuNo: 0, upperMenuId: 0, menuOrdr: 2 },
      ] as any,
      error: null,
    });
    const programsPromise = Promise.resolve({ data: mockPrograms, error: null });
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Main Menu.*ID: 1/i }));
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 검색' }), { target: { value: 'Audit' } });

    expect(screen.queryByRole('button', { name: /Main Menu.*ID: 1/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Audit Menu.*ID: 2/i })).toBeInTheDocument();
    expect(await screen.findByText('메뉴를 선택하세요')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Main Menu' })).toBeNull();
    expect(screen.queryByRole('button', { name: '메뉴 수정' })).toBeNull();
  });

  async function openCreateForm() {
    const menusPromise = Promise.resolve({ data: mockInitialMenus, error: null });
    const programsPromise = Promise.resolve({ data: mockPrograms, error: null });
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>
      );
    });
    await userEvent.click(await screen.findByRole('button', { name: '신규 메뉴 등록' }));
    const modal = await screen.findByTestId('standard-modal');
    const scope = within(modal);
    const submit = scope.getByRole('button', { name: /등록 완료/ });
    return {
      modal,
      name: scope.getByRole('textbox', { name: /메뉴 명칭/ }),
      route: scope.getByRole('textbox', { name: '연결 라우트' }),
      order: scope.getByRole('spinbutton', { name: /정렬 순서/ }),
      cancel: scope.getByRole('button', { name: '취소' }),
      closeRequest: scope.getByRole('button', { name: '모달 닫기 요청' }),
      form: scope.getByRole('textbox', { name: /메뉴 명칭/ }).closest('form')!,
      submit,
    };
  }

  it('공백 메뉴 명칭을 write sink로 보내지 않고 summary와 첫 오류 이동을 제공한다', async () => {
    const fields = await openCreateForm();
    await userEvent.type(fields.name, '   ');

    fireEvent.click(fields.submit);

    expect(mocks.saveMenu).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/메뉴 명칭.*입력/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('메뉴 명칭 max+1을 차단하고 해당 입력으로 이동한다', async () => {
    const fields = await openCreateForm();
    fireEvent.change(fields.name, { target: { value: '가'.repeat(101) } });

    fireEvent.click(fields.submit);

    expect(mocks.saveMenu).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/100/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('정렬 순서가 정수가 아니면 write sink를 차단한다', async () => {
    const fields = await openCreateForm();
    await userEvent.type(fields.name, '정수 순서 메뉴');
    fireEvent.change(fields.order, { target: { value: '1.5' } });

    fireEvent.click(fields.submit);

    expect(mocks.saveMenu).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/정수/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.order).toHaveFocus());
  });

  it('저장 pending 중 닫기를 막고 rejected 서버 필드 오류 뒤 modal·입력·summary를 보존한다', async () => {
    const pending = deferred<{ success: boolean; message: string }>();
    mocks.saveMenu.mockReturnValueOnce(pending.promise);
    const fields = await openCreateForm();
    await userEvent.type(fields.name, '보존할 메뉴');
    await userEvent.type(fields.route, '/admin/preserved');

    expect(fields.submit).toHaveAttribute('type', 'submit');
    expect(fields.submit).toHaveAttribute('form', fields.form.id);
    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.saveMenu).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).toHaveAttribute('aria-busy', 'true');
    expect(fields.submit).toHaveAccessibleName('등록 중...');
    expect(fields.cancel).toBeDisabled();
    fireEvent.click(fields.cancel);
    fireEvent.click(fields.closeRequest);
    expect(screen.getByTestId('standard-modal')).toBeVisible();

    await act(async () => pending.reject({
      response: {
        data: { errors: [{ field: 'menuNm', message: '이미 사용 중인 메뉴 명칭입니다.' }] },
      },
    }));

    expect(await screen.findAllByText('이미 사용 중인 메뉴 명칭입니다.')).not.toHaveLength(0);
    expect(fields.name).toHaveValue('보존할 메뉴');
    expect(fields.route).toHaveValue('/admin/preserved');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('이미 사용 중인 메뉴 명칭입니다.');
    expect(screen.getByTestId('standard-modal')).toBeVisible();
    expect(fields.cancel).toBeEnabled();
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('일반 서버 오류는 메시지를 안내하고 값을 보존한다', async () => {
    mocks.saveMenu.mockResolvedValueOnce({ success: false, message: '메뉴 저장 서버에 연결할 수 없습니다.' });
    const fields = await openCreateForm();
    await userEvent.type(fields.name, '보존할 메뉴');

    fireEvent.click(fields.submit);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('메뉴 저장 서버에 연결할 수 없습니다.', 'error'));
    expect(fields.name).toHaveValue('보존할 메뉴');
  });

  it('저장 pending 중 동기 재제출해도 write sink를 한 번만 호출한다', async () => {
    let resolveSave!: (value: { success: boolean; message: string }) => void;
    mocks.saveMenu.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    const fields = await openCreateForm();
    await userEvent.type(fields.name, '중복 방지 메뉴');

    act(() => {
      fireEvent.click(fields.submit);
      fireEvent.click(fields.submit);
    });

    await waitFor(() => expect(mocks.saveMenu).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    resolveSave({ success: true, message: '메뉴가 등록되었습니다.' });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('메뉴가 등록되었습니다.', 'success'));
  });

  it('구조 저장은 같은 tick 중복 실행을 막고 pending·실패를 안내한다', async () => {
    const pending = deferred<{ success: boolean; message: string }>();
    mocks.updateOrders.mockReturnValueOnce(pending.promise);
    const menusPromise = Promise.resolve({ data: mockInitialMenus, error: null });
    const programsPromise = Promise.resolve({ data: mockPrograms, error: null });
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>,
      );
    });
    fireEvent.click(screen.getByRole('button', { name: '테스트 메뉴 드래그 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 메뉴 드래그 완료' }));
    const saveButton = screen.getByRole('button', { name: '구조 저장' });
    expect(saveButton).toBeEnabled();

    act(() => {
      saveButton.click();
      saveButton.click();
    });

    await waitFor(() => expect(mocks.updateOrders).toHaveBeenCalledTimes(1));
    const pendingButton = screen.getByRole('button', { name: '구조 저장 중…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Main Menu 순서 이동 핸들' })).toBeDisabled();
    const deleteButton = screen.getByRole('button', { name: '메뉴 삭제' });
    expect(deleteButton).toBeDisabled();
    fireEvent.click(deleteButton);
    expect(mocks.deleteMenu).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '테스트 메뉴 드래그 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 메뉴 드래그 완료' }));
    expect(mocks.toast.mock.calls.filter(
      ([message, type]) => message === '구조가 업데이트되었습니다.' && type === 'info',
    )).toHaveLength(1);
    await act(async () => pending.reject(new Error('orders unavailable')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('저장 중 오류 발생', 'error'));
  });

  it('메뉴 삭제는 같은 tick 중복 실행을 막고 rejected 오류를 안내한다', async () => {
    const pending = deferred<{ success: boolean; message: string }>();
    mocks.deleteMenu.mockReturnValueOnce(pending.promise);
    const menusPromise = Promise.resolve({ data: mockInitialMenus, error: null });
    const programsPromise = Promise.resolve({ data: mockPrograms, error: null });
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MenuAdminClient menusPromise={menusPromise} programsPromise={programsPromise} />
        </React.Suspense>,
      );
    });
    fireEvent.click(screen.getByRole('button', { name: /Main Menu.*ID: 1/i }));
    const deleteButton = screen.getByRole('button', { name: '메뉴 삭제' });

    act(() => {
      deleteButton.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteMenu).toHaveBeenCalledTimes(1));
    const pendingButton = screen.getByRole('button', { name: '메뉴 삭제 중…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    await act(async () => pending.reject(new Error('delete unavailable')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('메뉴 삭제 중 오류가 발생했습니다.', 'error'));
  });
});

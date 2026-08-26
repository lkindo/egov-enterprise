import { Suspense } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityHubClient from '../SecurityHubClient';

const mocks = vi.hoisted(() => ({
  query: '',
  replace: vi.fn(),
  toast: vi.fn(),
  authorFormError: vi.fn(),
  confirm: vi.fn(),
  getAuthors: vi.fn(),
  createAuthor: vi.fn(),
  updateAuthor: vi.fn(),
  deleteAuthor: vi.fn(),
  getAuthorMenus: vi.fn(),
  getUsers: vi.fn(),
  saveUsers: vi.fn(),
  deleteUsers: vi.fn(),
  getMenus: vi.fn(),
  saveMenus: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/security/authority',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

vi.mock('@/services/foundation/system/AuthorAdminService', () => ({
  authorAdminService: {
    getAuthorList: mocks.getAuthors,
    createAuthor: mocks.createAuthor,
    updateAuthor: mocks.updateAuthor,
    deleteAuthor: mocks.deleteAuthor,
    getAuthorMenus: mocks.getAuthorMenus,
  },
}));
vi.mock('@/services/foundation/system/UserAuthorityAdminService', () => ({
  userAuthorityAdminService: {
    getUserAuthorityList: mocks.getUsers,
    saveUserAuthorities: mocks.saveUsers,
    deleteUserAuthorities: mocks.deleteUsers,
  },
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: {
    getAllMenus: mocks.getMenus,
    saveMenuCreation: mocks.saveMenus,
  },
}));

// [2026-08-26] 중복 헤더(HubHeader)를 걷고 주요 액션을 PageHeader 로 올렸다. 목이 title 만
// 렌더하면 **실제로는 있는 액션이 테스트에서만 사라진다** — 목도 actions 를 렌더한다.
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title, actions }: any) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: any) => <header>{title}{actions}</header>,
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, action, children }: any) => <section><h2>{title}</h2>{action}{children}</section>,
}));
vi.mock('@/components/ui/hub/HubMetrics', () => ({
  HubMetricGrid: ({ children }: any) => <div>{children}</div>,
  HubMetricCard: ({ title, value }: any) => <span>{title}: {value}</span>,
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, onClose, title, children }: any) => isOpen
    ? <section aria-label={title}><button type="button" onClick={onClose}>모달 닫기</button>{children}</section>
    : null,
}));
vi.mock('@/components/admin/security/AuthorForm', () => ({
  AuthorForm: ({ mode, initialData, onSubmit, onCancel, isDisabled, isPending }: any) => (
    <div>
      <span>폼 대상 {initialData?.authrtCd || 'NEW'}</span>
      <button
        type="button"
        aria-busy={isPending || undefined}
        disabled={isDisabled || isPending}
        onClick={() => {
          void onSubmit({
            authrtCd: mode === 'edit' ? initialData.authrtCd : 'ROLE_NEW',
            authrtNm: '신규 역할',
          }).catch(mocks.authorFormError);
        }}
      >
        {isPending ? '역할 폼 저장 중…' : '역할 폼 저장'}
      </button>
      <button type="button" disabled={isDisabled || isPending} onClick={onCancel}>역할 폼 취소</button>
    </div>
  ),
}));
vi.mock('../components/SecurityMatrixVisualizer', () => ({
  SecurityMatrixVisualizer: ({ authors, mappings, onToggle, onSave, isSaving, isDisabled }: any) => (
    <div>
      <span>매트릭스 역할 {authors.length}, 매핑 {mappings.size}</span>
      <button type="button" onClick={() => onToggle('ROLE_ADMIN', 2)}>전역 메뉴 토글</button>
      <button
        type="button"
        aria-busy={isSaving || undefined}
        disabled={isSaving || isDisabled}
        onClick={onSave}
      >
        {isSaving ? '전역 정책 저장 중…' : '전역 정책 저장'}
      </button>
    </div>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, onRowClick, onRetry, pagination, keyField, rowActionLabel }: any) => (
    <div data-testid={`table-${keyField}`}>
      <table>
        <tbody>
          {data.map((item: any, rowIndex: number) => {
            const actionLabel = typeof rowActionLabel === 'function'
              ? rowActionLabel(item, rowIndex)
              : rowActionLabel;
            return (
              <tr key={rowIndex}>
                {columns.map((column: any, index: number) => <td key={index}>{column.accessor(item)}</td>)}
                {onRowClick && (
                  <td>
                    <button type="button" aria-label={actionLabel} onClick={() => onRowClick(item)}>
                      {actionLabel}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" onClick={onRetry}>{keyField} 재시도</button>
      <button type="button" onClick={() => pagination.onPageChange(2)}>{keyField} 다음</button>
    </div>
  ),
}));

const authorities = [
  { authrtCd: 'ROLE_ADMIN', authrtNm: '관리자' },
  { authrtCd: 'ROLE_USER', authrtNm: '사용자' },
];
const users = [
  { scrtyDcsnTrgtId: 'U1', userId: 'admin', userNm: '관리자 계정', regYn: 'Y', mbrTypeCd: 'USR' },
  { scrtyDcsnTrgtId: 'U2', userId: 'user', userNm: '일반 계정', regYn: 'N', mbrTypeCd: 'USR' },
];
const menus = [
  { menuNo: 1, menuNm: '시스템', upMenuSn: 0 },
  { menuNo: 2, menuNm: '사용자 관리', upMenuSn: 1 },
];
const initialPage = { list: authorities, total: 2, totalPage: 2 };

function renderClient(query = '') {
  mocks.query = query;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // React 19 `use()`가 서버에서 이미 해결된 프리페치 Promise처럼 즉시 읽도록 표시한다.
  const authoritiesPromise = Object.assign(Promise.resolve(initialPage), {
    status: 'fulfilled',
    value: initialPage,
  });
  const clientElement = () => (
    <QueryClientProvider client={client}>
      <Suspense fallback={<span>권한 로딩</span>}>
        <SecurityHubClient authoritiesPromise={authoritiesPromise as any} />
      </Suspense>
    </QueryClientProvider>
  );
  const rendered = render(clientElement());
  return Object.assign(rendered, {
    rerenderClient(nextQuery: string) {
      mocks.query = nextQuery;
      rendered.rerender(clientElement());
    },
  });
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

describe('SecurityHubClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = '';
    mocks.confirm.mockResolvedValue(true);
    mocks.getAuthors.mockResolvedValue(initialPage);
    mocks.createAuthor.mockResolvedValue(undefined);
    mocks.updateAuthor.mockResolvedValue(undefined);
    mocks.deleteAuthor.mockResolvedValue(undefined);
    mocks.getUsers.mockResolvedValue({ list: users, total: 2, totalPage: 1 });
    mocks.getMenus.mockResolvedValue(menus);
    mocks.getAuthorMenus.mockResolvedValue([{ menuNo: 1 }]);
    mocks.saveUsers.mockResolvedValue(undefined);
    mocks.deleteUsers.mockResolvedValue(undefined);
    mocks.saveMenus.mockResolvedValue(undefined);
  });

  it('selects a role and persists explicit user revocation and menu grants', async () => {
    renderClient();
    expect(await screen.findByText('관리자')).toBeInTheDocument();
    expect(document.querySelector('button button')).toBeNull();

    fireEvent.click(within(screen.getByTestId('table-authrtCd')).getByRole('button', { name: '관리자 역할 선택' }));
    expect(await screen.findByText('관리자 계정')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '사용자 관리 메뉴 접근 권한 부여' })).toBeInTheDocument();

    fireEvent.click(within(screen.getByTestId('table-scrtyDcsnTrgtId')).getByRole('button', { name: '관리자 계정 사용자 할당 해제' }));
    fireEvent.click(screen.getByRole('button', { name: /사용자 할당 저장/ }));
    await waitFor(() => expect(mocks.deleteUsers).toHaveBeenCalledWith(['U1']));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));

    fireEvent.click(screen.getByRole('button', { name: '사용자 관리 메뉴 접근 권한 부여' }));
    fireEvent.click(screen.getByRole('button', { name: /메뉴 권한 저장/ }));
    await waitFor(() => expect(mocks.saveMenus).toHaveBeenCalledWith('ROLE_ADMIN', [1, 2]));
  });

  it('사용자 매핑 저장은 같은 tick 중복 요청을 막고 pending·실패 상태를 안내한다', async () => {
    const pending = deferred<void>();
    mocks.deleteUsers.mockReturnValueOnce(pending.promise);
    renderClient();
    expect(await screen.findByText('관리자')).toBeInTheDocument();

    fireEvent.click(within(screen.getByTestId('table-authrtCd')).getByRole('button', { name: '관리자 역할 선택' }));
    fireEvent.click(await within(screen.getByTestId('table-scrtyDcsnTrgtId')).findByRole('button', {
      name: '관리자 계정 사용자 할당 해제',
    }));
    const submit = screen.getByRole('button', { name: '사용자 할당 저장' });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteUsers).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '사용자 할당 저장 중…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    const remove = screen.getByRole('button', { name: '관리자 역할 삭제' });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(mocks.deleteAuthor).not.toHaveBeenCalled();

    await act(async () => pending.reject(new Error('사용자 매핑 저장 장애')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '권한 할당 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      'error',
    ));
  });

  it('메뉴 매핑 저장은 같은 tick 중복 요청을 막고 pending·실패 상태를 안내한다', async () => {
    const pending = deferred<void>();
    mocks.saveMenus.mockReturnValueOnce(pending.promise);
    renderClient();
    expect(await screen.findByText('관리자')).toBeInTheDocument();

    fireEvent.click(within(screen.getByTestId('table-authrtCd')).getByRole('button', { name: '관리자 역할 선택' }));
    fireEvent.click(await screen.findByRole('button', { name: '사용자 관리 메뉴 접근 권한 부여' }));
    const submit = screen.getByRole('button', { name: '메뉴 권한 저장' });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.saveMenus).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '메뉴 권한 저장 중…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    const remove = screen.getByRole('button', { name: '관리자 역할 삭제' });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(mocks.deleteAuthor).not.toHaveBeenCalled();

    await act(async () => pending.reject(new Error('메뉴 매핑 저장 장애')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '메뉴 접근 권한 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      'error',
    ));
  });

  it('creates, edits and deletes the exact role selected by each action', async () => {
    renderClient();
    expect(await screen.findByText('관리자')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /신규 보안 아키텍처 설정/ }));
    expect(screen.getByRole('region', { name: '신규 권한 등록' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '역할 폼 저장' }));
    await waitFor(() => expect(mocks.createAuthor).toHaveBeenCalledWith(expect.objectContaining({ authrtCd: 'ROLE_NEW' })));

    fireEvent.click(screen.getByRole('button', { name: '사용자 역할 수정' }));
    expect(screen.getByText('폼 대상 ROLE_USER')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '역할 폼 저장' }));
    await waitFor(() => expect(mocks.updateAuthor).toHaveBeenCalledWith('ROLE_USER', expect.anything()));

    fireEvent.click(screen.getByRole('button', { name: '사용자 역할 삭제' }));
    await waitFor(() => expect(mocks.deleteAuthor).toHaveBeenCalledWith('ROLE_USER'));
  });

  it('권한 삭제를 동기 잠금하고 세 매핑 저장을 차단하며 실패 시 선택 상태를 복구한다', async () => {
    const pending = deferred<void>();
    mocks.deleteAuthor.mockReturnValueOnce(pending.promise);
    const rendered = renderClient();
    expect(await screen.findByText('관리자')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('table-authrtCd')).getByRole('button', { name: '관리자 역할 선택' }));
    await screen.findByText('관리자 계정');
    fireEvent.click(screen.getByRole('button', { name: '관리자 역할 수정' }));
    const authorForm = screen.getByRole('region', { name: '보안 역할 아키텍처 상세 수정' });
    const authorSubmit = within(authorForm).getByRole('button', { name: '역할 폼 저장' });
    const authorCancel = within(authorForm).getByRole('button', { name: '역할 폼 취소' });
    const remove = screen.getByRole('button', { name: '관리자 역할 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocks.deleteAuthor).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '관리자 역할 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '사용자 할당 저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '메뉴 권한 저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /신규 보안 아키텍처 설정/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '관리자 역할 수정' })).toBeDisabled();
    expect(authorSubmit).toBeDisabled();
    expect(authorCancel).toBeDisabled();
    act(() => {
      authorSubmit.click();
      authorCancel.click();
      within(authorForm).getByRole('button', { name: '모달 닫기' }).click();
    });
    expect(mocks.updateAuthor).not.toHaveBeenCalled();
    expect(authorForm).toBeInTheDocument();

    rendered.rerenderClient('view=matrix');
    await screen.findByText(/매트릭스 역할 2/);
    fireEvent.click(screen.getByRole('button', { name: '전역 메뉴 토글' }));
    const globalSave = screen.getByRole('button', { name: '전역 정책 저장' });
    expect(globalSave).toBeDisabled();
    fireEvent.click(globalSave);
    expect(mocks.saveMenus).not.toHaveBeenCalled();

    await act(async () => pending.reject(new Error('권한 삭제 API 장애')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 중 오류가 발생했습니다.', 'error'));
    expect(globalSave).toBeEnabled();
    rendered.rerenderClient('');
    expect(await screen.findByText('관리자')).toBeVisible();
    expect(screen.getByRole('button', { name: '관리자 역할 삭제' })).toBeEnabled();
  });

  it('권한 저장 pending은 delete와 취소를 막고 서버 필드 오류 뒤 폼 상태를 복구한다', async () => {
    const serverError = {
      response: {
        data: {
          errors: [{ field: 'authrtNm', message: '이미 사용 중인 역할 명칭입니다.' }],
        },
      },
    };
    const pending = deferred<void>();
    mocks.createAuthor.mockReturnValueOnce(pending.promise);
    renderClient();
    expect(await screen.findByText('관리자')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /신규 보안 아키텍처 설정/ }));
    const authorForm = screen.getByRole('region', { name: '신규 권한 등록' });
    const submit = within(authorForm).getByRole('button', { name: '역할 폼 저장' });
    const cancel = within(authorForm).getByRole('button', { name: '역할 폼 취소' });
    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.createAuthor).toHaveBeenCalledTimes(1));
    const busy = within(authorForm).getByRole('button', { name: '역할 폼 저장 중…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(cancel).toBeDisabled();
    expect(screen.getByRole('button', { name: /신규 보안 아키텍처 설정/ })).toBeDisabled();
    const remove = screen.getByRole('button', { name: '관리자 역할 삭제' });
    expect(remove).toBeDisabled();
    act(() => {
      remove.click();
      cancel.click();
      within(authorForm).getByRole('button', { name: '모달 닫기' }).click();
    });
    expect(mocks.deleteAuthor).not.toHaveBeenCalled();
    expect(authorForm).toBeInTheDocument();

    await act(async () => pending.reject(serverError));

    await waitFor(() => expect(mocks.authorFormError).toHaveBeenCalledWith(serverError));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
    expect(authorForm).toBeInTheDocument();
    expect(within(authorForm).getByRole('button', { name: '역할 폼 저장' })).toBeEnabled();
    expect(cancel).toBeEnabled();
    expect(remove).toBeEnabled();
  });

  it('syncs role search, paging and view changes to the URL', async () => {
    renderClient('page=2');
    expect(await screen.findByText('관리자')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: '역할 검색(ID, 명칭)' }), {
      target: { value: 'admin' },
    });
    await waitFor(() => expect(mocks.getAuthors).toHaveBeenCalledWith({ pageIndex: 2, searchKeyword: 'admin' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/security/authority', { scroll: false });

    fireEvent.click(screen.getByRole('button', { name: 'authrtCd 다음' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/security/authority?page=2', { scroll: false });
    fireEvent.click(screen.getByRole('tab', { name: '권한 매트릭스' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/security/authority?page=2&view=matrix', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: '보안 정책 정보 새로고침' }));
  });

  it('loads and saves the global matrix reached by a deep link', async () => {
    renderClient('view=matrix');
    expect(await screen.findByText(/매트릭스 역할 2/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.getAuthorMenus).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: '전역 메뉴 토글' }));
    fireEvent.click(screen.getByRole('button', { name: '전역 정책 저장' }));
    await waitFor(() => expect(mocks.saveMenus).toHaveBeenCalled());

    // [2026-08-24 A5] 저장은 **변경된 역할만** 쓴다. 종전에는 로드된 모든 역할을 다시 써서
    //   손대지 않은 역할의 동시 편집분을 조용히 덮었고, "변경 셀 수와 저장 결과 건수 일치"
    //   (카탈로그 §5 A5 합격 기준)도 성립하지 않았다.
    expect(mocks.saveMenus).toHaveBeenCalledTimes(1);
    expect(mocks.saveMenus).toHaveBeenCalledWith('ROLE_ADMIN', expect.arrayContaining([2]));
    expect(mocks.toast).toHaveBeenCalledWith('권한 1건의 메뉴 접근 정책을 저장했습니다.', 'success');
  });

  it('handleSaveGlobal 전역 매핑 저장은 같은 tick 중복 요청을 막고 pending·실패 상태를 안내한다', async () => {
    const pending = deferred<void>();
    mocks.saveMenus.mockReturnValueOnce(pending.promise);
    const rendered = renderClient('view=matrix');
    expect(await screen.findByText(/매트릭스 역할 2/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.getAuthorMenus).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: '전역 메뉴 토글' }));
    const submit = screen.getByRole('button', { name: '전역 정책 저장' });
    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.saveMenus).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '전역 정책 저장 중…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    rendered.rerenderClient('');
    expect(await screen.findByText('관리자')).toBeVisible();
    const remove = screen.getByRole('button', { name: '관리자 역할 삭제' });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(mocks.deleteAuthor).not.toHaveBeenCalled();

    await act(async () => pending.reject(new Error('전역 매핑 저장 장애')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('글로벌 정책 저장 중 오류가 발생했습니다.', 'error'));
    expect(remove).toBeEnabled();
  });

  it('변경이 없으면 전역 매트릭스를 저장하지 않는다', async () => {
    renderClient('view=matrix');
    expect(await screen.findByText(/매트릭스 역할 2/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.getAuthorMenus).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: '전역 정책 저장' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('변경된 권한이 없습니다.', 'info'));
    expect(mocks.saveMenus).not.toHaveBeenCalled();
  });
});

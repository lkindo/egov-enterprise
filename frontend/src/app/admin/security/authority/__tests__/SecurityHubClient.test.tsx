import { Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityHubClient from '../SecurityHubClient';

const mocks = vi.hoisted(() => ({
  query: '',
  replace: vi.fn(),
  toast: vi.fn(),
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

vi.mock('@/app/components/layout/page-header', () => ({ PageHeader: ({ title }: any) => <h1>{title}</h1> }));
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
  StandardModal: ({ isOpen, title, children }: any) => isOpen
    ? <section aria-label={title}>{children}</section>
    : null,
}));
vi.mock('@/components/admin/security/AuthorForm', () => ({
  AuthorForm: ({ mode, initialData, onSubmit, onCancel }: any) => (
    <div>
      <span>폼 대상 {initialData?.authrtCd || 'NEW'}</span>
      <button type="button" onClick={() => onSubmit({ authrtCd: mode === 'edit' ? initialData.authrtCd : 'ROLE_NEW', authrtNm: '신규 역할' })}>역할 폼 저장</button>
      <button type="button" onClick={onCancel}>역할 폼 취소</button>
    </div>
  ),
}));
vi.mock('../components/SecurityMatrixVisualizer', () => ({
  SecurityMatrixVisualizer: ({ authors, mappings, onToggle, onSave }: any) => (
    <div>
      <span>매트릭스 역할 {authors.length}, 매핑 {mappings.size}</span>
      <button type="button" onClick={() => onToggle('ROLE_ADMIN', 2)}>전역 메뉴 토글</button>
      <button type="button" onClick={onSave}>전역 정책 저장</button>
    </div>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, onRowClick, onRetry, pagination, keyField }: any) => (
    <div data-testid={`table-${keyField}`}>
      {data.map((item: any, rowIndex: number) => (
        <button type="button" key={rowIndex} onClick={() => onRowClick(item)}>
          {columns.map((column: any, index: number) => <span key={index}>{column.accessor(item)}</span>)}
        </button>
      ))}
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
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<span>권한 로딩</span>}>
        <SecurityHubClient authoritiesPromise={authoritiesPromise as any} />
      </Suspense>
    </QueryClientProvider>,
  );
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

    fireEvent.click(screen.getByText('관리자').closest('button')!);
    expect(await screen.findByText('관리자 계정')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '사용자 관리 메뉴 접근 권한 부여' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('관리자 계정').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /사용자 할당 저장/ }));
    await waitFor(() => expect(mocks.deleteUsers).toHaveBeenCalledWith(['U1']));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));

    fireEvent.click(screen.getByRole('button', { name: '사용자 관리 메뉴 접근 권한 부여' }));
    fireEvent.click(screen.getByRole('button', { name: /메뉴 권한 저장/ }));
    await waitFor(() => expect(mocks.saveMenus).toHaveBeenCalledWith('ROLE_ADMIN', [1, 2]));
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
    expect(mocks.toast).toHaveBeenCalledWith('글로벌 보안 정책이 전사적으로 동기화되었습니다.', 'success');
  });
});

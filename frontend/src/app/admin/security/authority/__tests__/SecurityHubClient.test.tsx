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
/*
 * [2026-08-29] 픽스처에 authrtId 를 넣는다.
 *
 * 서버는 regYn='Y' 인 행에 언제나 그 사용자의 authrtId 를 함께 내려준다
 * (UserAuthorityRepositoryImpl:36 — Projections 에 authrtId 포함). 종전 픽스처는 그 필드를
 * 빼고 있어서, "다른 역할 보유자가 선택 역할에 할당된 것처럼 보인다" 는 실제 결함을
 * 이 스펙이 재현할 수 없었다.
 *
 * U3 가 그 축이다 — 권한은 있지만(ROLE_USER) 지금 선택한 역할(ROLE_ADMIN)은 아니다.
 */
const users = [
  { scrtyDcsnTrgtId: 'U1', userId: 'admin', userNm: '관리자 계정', regYn: 'Y', authrtId: 'ROLE_ADMIN', mbrTypeCd: 'USR' },
  { scrtyDcsnTrgtId: 'U2', userId: 'user', userNm: '일반 계정', regYn: 'N', mbrTypeCd: 'USR' },
  { scrtyDcsnTrgtId: 'U3', userId: 'other', userNm: '타역할 계정', regYn: 'Y', authrtId: 'ROLE_USER', mbrTypeCd: 'USR' },
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
    /*
     * [2026-08-29] 픽스처를 **서버가 실제로 주는 모양**으로 바로잡는다.
     *
     * 이 엔드포인트(MenuCreateDto)에는 menuNo 가 없다 — menuSn 과 할당 플래그 chkYeoBu 만
     * 있고, 응답은 '할당된 메뉴' 가 아니라 '메뉴 전체 + 플래그' 다
     * (MenuAuthorityRepositoryImpl 의 from(menu) leftJoin(menuAuthority)).
     * 종전 픽스처가 menuNo 를 넣고 있어, 화면이 존재하지 않는 필드를 읽어 기준선이
     * Set([undefined]) 가 되던 결함을 이 스펙이 **재현할 수 없었다.**
     */
    mocks.getAuthorMenus.mockResolvedValue([
      { menuSn: 1, authrtNm: '시스템', chkYeoBu: 1 },
      { menuSn: 2, authrtNm: '사용자 관리', chkYeoBu: 0 },
    ]);
    mocks.saveUsers.mockResolvedValue(undefined);
    mocks.deleteUsers.mockResolvedValue(undefined);
    mocks.saveMenus.mockResolvedValue(undefined);
  });

  /**
   * [2026-08-29] 다른 역할을 가진 사용자를 선택 역할 보유자로 표시하지 않는다.
   *
   * 서버의 `regYn` 은 "선택한 역할을 가졌다" 가 아니라 "아무 권한이나 있다" 다 —
   * UserAuthorityRepositoryImpl:42 의 left join 에 authrtId 조건이 없고, regYn 은 join 행
   * 존재 여부로만 계산된다. tb_user_authrt_map 의 PK 는 scrty_dcsn_trgt_id 단일이라
   * 사용자당 권한 행은 하나이므로, 종전 화면은 **다른 역할 보유자를 전부 체크된 상태로**
   * 그렸다.
   *
   * 그 표시는 그대로 저장의 입력이 된다. 체크를 남기면 upsert 로 그 사용자의 역할이 선택
   * 역할로 바뀌고, 체크를 풀면 delete 로 원래 역할이 회수된다 — 어느 쪽이든 화면이 틀린
   * 것을 보여 준 뒤 그 화면을 근거로 권한을 바꾼다.
   */
  it('다른 역할 보유자를 선택 역할에 할당된 것으로 표시하지 않고, 회수 대상에도 넣지 않는다', async () => {
    renderClient();
    expect(await screen.findByText('관리자')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('table-authrtCd')).getByRole('button', { name: '관리자 역할 선택' }));

    // 선택 역할(ROLE_ADMIN) 보유자만 '해제'(= 체크됨)로 보인다.
    expect(await screen.findByRole('button', { name: '관리자 계정 사용자 할당 해제' })).toBeInTheDocument();
    // ROLE_USER 보유자는 '추가'(= 체크 안 됨)여야 한다 — 종전에는 '해제' 로 보였다.
    expect(screen.getByRole('button', { name: '타역할 계정 사용자 할당 추가' })).toBeInTheDocument();

    // 아무것도 건드리지 않고 저장해도 다른 역할 보유자의 권한을 회수하지 않는다.
    fireEvent.click(screen.getByRole('button', { name: /사용자 할당 저장/ }));
    await waitFor(() => expect(mocks.saveUsers).toHaveBeenCalled());
    expect(mocks.deleteUsers).not.toHaveBeenCalled();
  });

  /**
   * [2026-08-29] 이미 부여된 메뉴가 저장으로 사라지지 않는다.
   *
   * 메뉴 저장은 **전체 교체**다 — MenuService.insertMenuCreatList 가 deleteByIdAuthrtCd 로
   * 그 권한의 매핑을 전부 지운 뒤 받은 목록만 다시 넣는다. 그러므로 화면이 들고 있는
   * 기준선이 곧 "살아남을 목록" 이다.
   *
   * 종전에는 그 기준선이 응답에 없는 필드(menuNo)를 읽어 Set([undefined]) 였다. 즉 모든
   * 메뉴가 '미부여' 로 보였고, 관리자가 메뉴 하나를 켜고 저장하면 **보지도 못한 기존 권한이
   * 통째로 지워졌다.** 서비스 반환 타입이 잘못 선언돼 tsc 도, 이 스펙의 픽스처도 그 사실을
   * 드러내지 못했다.
   */
  it('메뉴 저장이 이미 부여된 메뉴를 유지한다 — 전체 교체라 기준선이 곧 살아남을 목록이다', async () => {
    renderClient();
    expect(await screen.findByText('관리자')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('table-authrtCd')).getByRole('button', { name: '관리자 역할 선택' }));

    // 이미 부여된 '시스템'(menuSn 1)은 '해제' 로, 미부여 '사용자 관리'(2)는 '부여' 로 보인다.
    expect(await screen.findByRole('button', { name: '시스템 메뉴 접근 권한 해제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '사용자 관리 메뉴 접근 권한 부여' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '사용자 관리 메뉴 접근 권한 부여' }));
    fireEvent.click(screen.getByRole('button', { name: /메뉴 권한 저장/ }));

    await waitFor(() => expect(mocks.saveMenus).toHaveBeenCalled());
    const [, savedMenuNos] = mocks.saveMenus.mock.calls.at(-1) as [string, number[]];
    expect(savedMenuNos, '기존 부여분이 빠지면 저장이 그 권한을 지운다').toEqual(
      expect.arrayContaining([1, 2]),
    );
    expect(savedMenuNos, 'undefined 가 섞이면 서버 payload 가 오염된다')
      .not.toContain(undefined);
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

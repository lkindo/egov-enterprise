import type { ReactElement } from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAppQueryClient } from '@/lib/query/list-query-defaults';
import { SCREEN_ALIASES, SCREEN_REGISTRY } from '@/types/generated-screen-registry';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  deleteProgram: vi.fn(),
  getMenuStructure: vi.fn(),
  getProgramList: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

// 1. Mock Next.js config
vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

// 3. Mock Next.js Navigation
// useSearchParams 는 렌더마다 같은 객체여야 한다 — 브레드크럼은 [pathname, searchParams] 가 바뀔 때마다 메뉴를 다시
// 조회해 상태를 바꾸므로, 렌더마다 새 객체를 주면 끝없는 재렌더가 되고 async act 가 끝나지 않는다(2026-10-02 실측).
const navigation = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => navigation.searchParams,
  // [2026-08-24 A1 이행] WorkListPage 의 브레드크럼이 현재 경로를 읽는다.
  usePathname: () => '/admin/system/programs',
}));

// 브레드크럼은 메뉴 SSOT 를 조회한다 — 이 테스트의 대상이 아니므로 응답을 고정한다.
vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

// 4. Mock UI components directly
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: any) => <div data-testid="hub-header"><h2>{title}</h2>{actions}</div>
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: any) => <div data-testid="section-card"><h3>{title}</h3>{children}</div>
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: any) => <div data-testid="page-header"><h1>{title}</h1></div>
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ children, isOpen, title, footer }: any) => isOpen ? (
    <div data-testid="standard-modal">
      <h2>{title}</h2>
      {children}
      <div data-testid="modal-footer">{footer}</div>
    </div>
  ) : null
}));
// 행 액션(수정·삭제·메뉴에 추가)의 표시 판정과 연결 메뉴 칸을 보려면 컬럼 accessor 를 실제로 렌더해야 한다.
// 표마다 이름(accessibleLabel)을 붙이고, 빈 문구와 쪽 이동을 그대로 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data, columns, keyField, accessibleLabel, emptyMessage, pagination }: any) => (
    <div data-testid="data-table" data-table-label={accessibleLabel}>
      <span data-testid={`${accessibleLabel}-count`}>{data?.length || 0} items</span>
      {(data || []).length === 0 && <p>{emptyMessage}</p>}
      {(data || []).map((row: any) => (
        <div key={row[keyField]} data-row={row[keyField]}>
          {columns.map((column: any) => <span key={column.header} data-column={column.header}>{column.accessor(row)}</span>)}
        </div>
      ))}
      {pagination && (
        <>
          <span data-testid={`${accessibleLabel}-page`}>{`${pagination.currentPage}/${pagination.totalPages}`}</span>
          <button type="button" onClick={() => pagination.onPageChange(pagination.currentPage + 1)}>{`${accessibleLabel} 다음 쪽`}</button>
        </>
      )}
    </div>
  )
}));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: () => null,
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast, error: mocks.toastError, success: mocks.toastSuccess }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/ProgramAdminService', () => ({
  programAdminService: {
    deleteProgram: (...args: unknown[]) => mocks.deleteProgram(...args),
    getProgramList: (...args: unknown[]) => mocks.getProgramList(...args),
  },
}));
// [2026-10-02 D3] 연결 메뉴는 화면이 MENU_READ 를 확인한 뒤 메뉴 구조 조회 한 번으로 잇는다(두 탭이 나눠 쓴다).
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { getMenuStructure: (...args: unknown[]) => mocks.getMenuStructure(...args) },
}));

// 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 기본은 모든 쓰기 권한을 가진 관리자이고, 표시 판정 테스트만 권한을 줄인다.
// 메뉴 조회 권한(MENU_READ)은 연결 메뉴 열 테스트만 더한다.
const FULL_PERMISSIONS = ['PROGRAM_READ', 'PROGRAM_CREATE', 'PROGRAM_UPDATE', 'PROGRAM_DELETE'];
const MENU_MANAGER = ['MENU_READ', 'MENU_CREATE', 'MENU_UPDATE'];
const auth = vi.hoisted(() => ({ permissions: [] as string[], signedIn: true, loading: false }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: auth.signedIn ? { id: 'admin', permissions: auth.permissions, authorizationVersion: 'v1' } : null,
    loading: auth.loading,
  }),
}));

import ProgramAdminClient from '../ProgramAdminClient';

/** 앱과 같은 QueryClient 로 렌더한다 — 메뉴 조회 실패가 화면 전체 오류로 올라가지 않는지도 같은 규칙으로 본다. */
function renderClient(node: ReactElement) {
  return render(<QueryClientProvider client={createAppQueryClient()}>{node}</QueryClientProvider>);
}

/** 메뉴 구조 한 줄(서버 응답을 서비스가 정리한 모양). */
function structureMenu(menuNo: number, menuNm: string, fields: { modernRoute?: string | null; prgrmFileNm?: string | null; useYn?: 'Y' | 'N' } = {}) {
  return {
    menuNo,
    menuNm,
    upMenuSn: null,
    menuOrdr: menuNo,
    modernRoute: fields.modernRoute ?? null,
    menuExpln: null,
    useYn: fields.useYn ?? 'Y',
    prgrmFileNm: fields.prgrmFileNm ?? null,
  };
}

function structure(menus: ReturnType<typeof structureMenu>[]) {
  return { version: 'v-structure', menus };
}

function row(key: string): HTMLElement {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-row]')).find((element) => element.getAttribute('data-row') === key);
  if (!found) throw new Error(`row ${key} not rendered`);
  return found;
}

function cell(key: string, column: string): HTMLElement {
  const found = row(key).querySelector<HTMLElement>(`[data-column="${column}"]`);
  if (!found) throw new Error(`${column} 칸이 없다`);
  return found;
}

function linkCell(prgrmFileNm: string): HTMLElement {
  return cell(prgrmFileNm, '연결 메뉴');
}

/** '이전 프로그램' 탭으로 간다(1단계 표·폼). 탭 전환은 화면 안 상태라 주소를 바꾸지 않는다. */
function openProgramsTab() {
  fireEvent.click(screen.getByRole('tab', { name: '이전 프로그램' }));
  expect(screen.getByRole('tab', { name: '이전 프로그램' })).toHaveAttribute('aria-selected', 'true');
}

function searchScreens(keyword: string) {
  fireEvent.change(screen.getByRole('textbox', { name: '화면 이름 · 경로' }), { target: { value: keyword } });
  fireEvent.click(screen.getByRole('button', { name: '조회' }));
}

describe('ProgramAdminClient Component', () => {
  const mockInitialData = {
    list: [
      { prgrmFileNm: 'PROG_1', prgrmKornNm: '프로그램_하나', url: '/url/1', prgrmStrgPath: '/path/1', prgrmExpln: 'Desc 1' },
    ],
    total: 1
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks 는 '한 번만' 응답(mock*Once)을 지우지 않는다 — 실패한 테스트가 남긴 응답이 다음 테스트로 새지 않게 비운다.
    Object.values(mocks).forEach((mock) => mock.mockReset());
    auth.permissions = FULL_PERMISSIONS;
    auth.signedIn = true;
    auth.loading = false;
    mocks.confirm.mockResolvedValue(true);
    mocks.getMenuStructure.mockResolvedValue(structure([]));
    mocks.getProgramList.mockResolvedValue({ list: [], total: 0, page: 1, size: 10, totalPage: 1 });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    // [2026-08-24 A1 이행] HubHeader 대신 WorkListPage 셸이 제목과 결과 툴바를 소유한다.
    // [2026-10-02 D3] 메뉴명이 '화면 관리' 로 바뀌었다(사용자 사전 승인). h1 은 셸 하나다 — 탭마다 다시 그리지 않는다.
    expect(screen.getByRole('heading', { level: 1, name: '화면 관리' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId('work-list-toolbar')).toBeInTheDocument();
    openProgramsTab();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  /*
   * [2026-10-02 D3] 화면 관리는 '화면 목록'(기본)과 '이전 프로그램' 두 탭이다. 탭 상태는 화면 안 상태라 주소에 싣지 않는다.
   */
  describe('탭', () => {
    it('기본 탭은 화면 목록이고 패널이 활성 탭을 가리킨다', () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      const screensTab = screen.getByRole('tab', { name: '화면 목록' });
      expect(screensTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: '이전 프로그램' })).toHaveAttribute('aria-selected', 'false');
      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', screensTab.id);
      expect(screensTab).toHaveAttribute('aria-controls', panel.id);
      expect(within(panel).getByTestId('data-table')).toHaveAttribute('data-table-label', '화면 목록');
      // 이전 프로그램의 쓰기 버튼은 그 탭에서만 보인다.
      expect(screen.queryByRole('button', { name: /프로그램 등록/ })).not.toBeInTheDocument();
    });

    it('방향키로 탭을 옮기고, 탭을 바꿔도 주소는 그대로다', () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      const before = window.location.href;
      const screensTab = screen.getByRole('tab', { name: '화면 목록' });
      screensTab.focus();
      fireEvent.keyDown(screensTab, { key: 'ArrowRight' });

      const programsTab = screen.getByRole('tab', { name: '이전 프로그램' });
      expect(programsTab).toHaveAttribute('aria-selected', 'true');
      expect(programsTab).toHaveFocus();
      expect(programsTab).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('tab', { name: '화면 목록' })).toHaveAttribute('tabindex', '-1');
      expect(within(screen.getByRole('tabpanel')).getByTestId('data-table')).toHaveAttribute('data-table-label', '이전 프로그램 목록');
      expect(window.location.href).toBe(before);

      fireEvent.keyDown(programsTab, { key: 'Home' });
      expect(screen.getByRole('tab', { name: '화면 목록' })).toHaveAttribute('aria-selected', 'true');
    });

    /*
     * `?page=` 는 이전 프로그램 탭의 목록만 쓴다(공유·새로고침 복원). 화면 목록의 쪽 이동과 탭 상태는 주소에 싣지 않는다.
     */
    it('쪽 번호는 이전 프로그램 탭에서만 주소에 싣는다', async () => {
      window.history.replaceState(null, '', '/admin/system/programs');
      mocks.getProgramList.mockResolvedValue({ list: [], total: 30, page: 2, size: 10, totalPage: 3 });
      try {
        renderClient(<ProgramAdminClient initialData={{ ...mockInitialData, total: 30, totalPage: 3 }} searchWrd="" />);
        fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
        expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(/^2\//);
        expect(window.location.search).toBe('');

        openProgramsTab();
        fireEvent.click(screen.getByRole('button', { name: '이전 프로그램 목록 다음 쪽' }));
        await waitFor(() => expect(mocks.getProgramList).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })));
        await waitFor(() => expect(window.location.search).toBe('?page=2'));

        // 화면 목록으로 돌아가 쪽을 넘겨도 이전 프로그램의 쪽 번호를 바꾸지 않는다.
        fireEvent.click(screen.getByRole('tab', { name: '화면 목록' }));
        fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
        expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(/^3\//);
        expect(window.location.search).toBe('?page=2');
      } finally {
        window.history.replaceState(null, '', '/admin/system/programs');
      }
    });

    it('탭을 오가도 이전 프로그램의 검색어는 남고, 두 탭의 검색 입력은 섞이지 않는다', async () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      fireEvent.change(screen.getByRole('textbox', { name: '화면 이름 · 경로' }), { target: { value: '입력만 한 화면 검색어' } });
      openProgramsTab();
      expect(screen.getByRole('textbox', { name: '프로그램명 · 파일명' })).toHaveValue('');
      fireEvent.change(screen.getByRole('textbox', { name: '프로그램명 · 파일명' }), { target: { value: 'PROG' } });
      fireEvent.click(screen.getByRole('button', { name: '조회' }));
      await waitFor(() => expect(mocks.getProgramList).toHaveBeenCalledWith(expect.objectContaining({ searchKeyword: 'PROG', page: 0 })));

      fireEvent.click(screen.getByRole('tab', { name: '화면 목록' }));
      openProgramsTab();
      expect(screen.getByRole('textbox', { name: '프로그램명 · 파일명' })).toHaveValue('PROG');
    });
  });

  /*
   * [2026-10-02 D3] 화면 목록 — 생성된 화면 목록 중 라우트 게이트가 아는 화면. 열: 화면 이름·경로·진입 권한·연결 메뉴·구분.
   */
  describe('화면 목록', () => {
    const LISTED = SCREEN_REGISTRY.length;

    it('화면 목록 전체를 세고 첫 쪽을 보인다(진입 권한은 이름과 열리는 조건으로)', () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${LISTED.toLocaleString()}건`);
      expect(screen.getByTestId('화면 목록-count')).toHaveTextContent('20 items');
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(`1/${Math.ceil(LISTED / 20)}`);

      searchScreens('/admin/system/programs');
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건');
      expect(cell('/admin/system/programs', '화면 이름')).toHaveTextContent('화면 관리');
      expect(cell('/admin/system/programs', '진입 권한')).toHaveTextContent('프로그램 · 조회(PROGRAM_READ)');
    });

    it('검색어는 이름·경로로 거르고, 결과가 없으면 검색 결과가 없다고 말한다(G15)', () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      searchScreens('없는-화면-검색어');
      expect(screen.getByTestId('화면 목록-count')).toHaveTextContent('0 items');
      expect(screen.getByText('"없는-화면-검색어"에 대한 검색 결과가 없습니다.')).toBeInTheDocument();
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 0건');

      fireEvent.click(screen.getByRole('button', { name: '초기화' }));
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${LISTED.toLocaleString()}건`);
    });

    it('조회하면 첫 쪽으로 돌아간다', () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(`2/${Math.ceil(LISTED / 20)}`);
      searchScreens('admin');
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(/^1\//);
    });

    it('구분으로 동적 경로·로그인만 하면 열리는 화면을 거르고 배지로 말한다', () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      fireEvent.change(screen.getByRole('combobox', { name: '구분' }), { target: { value: 'dynamic' } });
      const dynamic = SCREEN_REGISTRY.filter((entry) => entry.dynamic);
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${dynamic.length}건`);
      expect(within(cell('/smart-toolkit/dept-job/[id]', '구분')).getByText('동적 경로')).toBeInTheDocument();
      // 이름이 없는 화면은 지어내지 않는다.
      expect(cell('/smart-toolkit/dept-job/[id]', '화면 이름')).toHaveTextContent('이름 미확인');

      fireEvent.change(screen.getByRole('combobox', { name: '구분' }), { target: { value: 'login-only' } });
      const loginOnly = SCREEN_REGISTRY.filter((entry) => entry.entry.permissions.length === 0 && entry.shellAccess !== 'public');
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${loginOnly.length}건`);
    });

    it('메뉴 조회 권한이 없으면 연결 메뉴를 묻지 않고, 메뉴에 없는 화면으로 거를 수 없다고 말한다', async () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      searchScreens('/admin/system/programs');
      expect(cell('/admin/system/programs', '연결 메뉴')).toHaveTextContent('메뉴 조회 권한 없음');
      // '메뉴 없음' 배지는 메뉴 구조를 알 때만 붙는다.
      expect(cell('/admin/system/programs', '구분')).not.toHaveTextContent('메뉴 없음');
      const kind = screen.getByRole('combobox', { name: '구분' });
      expect(within(kind).getByRole('option', { name: '메뉴에 없는 화면' })).toBeDisabled();
      expect(kind).toHaveAccessibleDescription('메뉴 조회 권한이 없어 메뉴에 없는 화면으로 거를 수 없습니다.');
      await act(async () => { await Promise.resolve(); });
      expect(mocks.getMenuStructure).not.toHaveBeenCalled();
    });

    it('메뉴 경로가 여는 화면으로 연결 메뉴를 세고, 별칭을 가리키는 메뉴는 넘어간 화면으로 센다', async () => {
      auth.permissions = [...FULL_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValue(structure([
        structureMenu(30, '화면 관리', { modernRoute: '/admin/system/programs' }),
        structureMenu(31, '옛 화면 관리', { modernRoute: '/admin/system/programs?tab=x', useYn: 'N' }),
        structureMenu(40, '주소록', { modernRoute: '/admin/collaboration/address-book' }),
      ]));
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      searchScreens('/admin/system/programs');

      const links = cell('/admin/system/programs', '연결 메뉴');
      expect(await within(links).findByText('연결 메뉴 2개')).toBeInTheDocument();
      expect(within(links).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        '옛 화면 관리(ID: 31)· 사용 안 함',
        '화면 관리(ID: 30)',
      ]);
      expect(mocks.getMenuStructure).toHaveBeenCalledTimes(1);
      expect(mocks.getMenuStructure).toHaveBeenCalledWith({ suppressErrorToast: true });

      searchScreens('select-address-book-list');
      const addressBook = cell('/admin/collaboration/address-book/select-address-book-list', '연결 메뉴');
      expect(within(addressBook).getByText('연결 메뉴 1개')).toBeInTheDocument();
      expect(addressBook).toHaveTextContent('/admin/collaboration/address-book 경유');
      expect(cell('/admin/collaboration/address-book/select-address-book-list', '구분')).not.toHaveTextContent('메뉴 없음');
    });

    it('메뉴에 없는 화면으로 거르면 연결 메뉴가 없는 화면만 남고 메뉴 없음 배지가 붙는다(동적 경로 화면은 들지 않는다)', async () => {
      auth.permissions = [...FULL_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValue(structure(
        SCREEN_REGISTRY.filter((entry) => entry.route !== '/admin/system/menus' && !entry.dynamic)
          .map((entry, index) => structureMenu(index + 1, `메뉴 ${index + 1}`, { modernRoute: entry.route })),
      ));
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      const kind = screen.getByRole('combobox', { name: '구분' });
      await waitFor(() => expect(within(kind).getByRole('option', { name: '메뉴에 없는 화면' })).toBeEnabled());
      // 메뉴 구조를 불러왔으면 선택지를 막지 않으니 안내도 없다.
      expect(kind).not.toHaveAttribute('aria-describedby');
      fireEvent.change(kind, { target: { value: 'no-menu' } });

      // 동적 경로 화면은 어떤 메뉴도 열지 않지만 메뉴에 둘 수 없는 화면이라 세지 않는다.
      expect(SCREEN_REGISTRY.some((entry) => entry.dynamic)).toBe(true);
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건');
      expect(within(cell('/admin/system/menus', '구분')).getByText('메뉴 없음')).toBeInTheDocument();
      expect(cell('/admin/system/menus', '연결 메뉴')).toHaveTextContent('연결 없음');

      fireEvent.change(kind, { target: { value: 'dynamic' } });
      expect(cell('/smart-toolkit/dept-job/[id]', '연결 메뉴')).toHaveTextContent('연결 없음');
      expect(cell('/smart-toolkit/dept-job/[id]', '구분')).not.toHaveTextContent('메뉴 없음');
    });

    /*
     * '메뉴에 없는 화면' 은 권한 작업대와 같은 공용 판정이다 — 사용 중인 메뉴로 열리지 않는 화면. 사용 안 함 메뉴만 가리키는
     * 화면은 연결 칸에 그 메뉴를 보이되 메뉴 없음으로 센다(사이드바에 보이지 않는다).
     */
    it('사용 안 함 메뉴만 가리키는 화면은 연결을 보이되 메뉴에 없는 화면으로 센다', async () => {
      auth.permissions = [...FULL_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValue(structure(
        SCREEN_REGISTRY.filter((entry) => entry.route !== '/admin/system/menus' && !entry.dynamic)
          .map((entry, index) => structureMenu(index + 1, `메뉴 ${index + 1}`, {
            modernRoute: entry.route,
            useYn: entry.route === '/admin/system/programs' ? 'N' : 'Y',
          })),
      ));
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      const kind = screen.getByRole('combobox', { name: '구분' });
      await waitFor(() => expect(within(kind).getByRole('option', { name: '메뉴에 없는 화면' })).toBeEnabled());
      fireEvent.change(kind, { target: { value: 'no-menu' } });

      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 2건');
      expect(within(cell('/admin/system/programs', '구분')).getByText('메뉴 없음')).toBeInTheDocument();
      expect(cell('/admin/system/programs', '연결 메뉴')).toHaveTextContent('연결 메뉴 1개(모두 사용 안 함)');
      expect(cell('/admin/system/programs', '연결 메뉴')).toHaveTextContent('사용 안 함');
      expect(within(cell('/admin/system/menus', '구분')).getByText('메뉴 없음')).toBeInTheDocument();
    });

    it('메뉴 구조를 불러오는 동안 메뉴에 없는 화면 선택지를 막고 그 이유를 말한다(G10)', async () => {
      auth.permissions = [...FULL_PERMISSIONS, 'MENU_READ'];
      let resolveMenus!: (value: unknown) => void;
      mocks.getMenuStructure.mockReturnValueOnce(new Promise((resolve) => { resolveMenus = resolve; }));
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      const kind = screen.getByRole('combobox', { name: '구분' });
      expect(within(kind).getByRole('option', { name: '메뉴에 없는 화면' })).toBeDisabled();
      expect(kind).toHaveAccessibleDescription('메뉴 구조를 불러오는 중이라 아직 메뉴에 없는 화면으로 거를 수 없습니다.');

      await act(async () => resolveMenus(structure([])));
      await waitFor(() => expect(within(kind).getByRole('option', { name: '메뉴에 없는 화면' })).toBeEnabled());
      expect(kind).not.toHaveAttribute('aria-describedby');
    });

    it('메뉴 구조를 불러오지 못하면 0건으로 위장하지 않고 실패를 말하며 다시 불러올 수 있다', async () => {
      auth.permissions = [...FULL_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockRejectedValueOnce({ response: { status: 500 } });
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      searchScreens('/admin/system/programs');

      const failed = await within(cell('/admin/system/programs', '연결 메뉴')).findByText('메뉴를 불러오지 못함');
      expect(failed).toHaveClass('text-destructive-emphasis');
      expect(screen.getByText('화면 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.')).toBeInTheDocument();

      mocks.getMenuStructure.mockResolvedValueOnce(structure([structureMenu(30, '화면 관리', { modernRoute: '/admin/system/programs' })]));
      fireEvent.click(screen.getByRole('button', { name: '연결 메뉴 다시 불러오기' }));
      expect(await within(cell('/admin/system/programs', '연결 메뉴')).findByText('연결 메뉴 1개')).toBeInTheDocument();
      expect(mocks.getMenuStructure).toHaveBeenCalledTimes(2);
    });

    it('메뉴에 없는 화면을 고른 채 메뉴 구조를 모르게 되면 전체를 메뉴 없음으로 말하지 않고 그 이유를 빈 상태로 말한다', async () => {
      auth.permissions = [...FULL_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValueOnce(structure([])).mockRejectedValueOnce({ response: { status: 500 } });
      const client = createAppQueryClient();
      render(<QueryClientProvider client={client}><ProgramAdminClient initialData={mockInitialData} searchWrd="" /></QueryClientProvider>);
      const kind = screen.getByRole('combobox', { name: '구분' });
      await waitFor(() => expect(within(kind).getByRole('option', { name: '메뉴에 없는 화면' })).toBeEnabled());
      fireEvent.change(kind, { target: { value: 'no-menu' } });
      // 메뉴가 하나도 없으면 동적 경로가 아닌 모든 화면이 메뉴에 없다.
      const staticScreens = SCREEN_REGISTRY.filter((entry) => !entry.dynamic);
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${staticScreens.length.toLocaleString()}건`);

      // 백그라운드 재조회가 실패하면 어떤 화면이 메뉴에 없는지 모른다.
      await act(async () => { await client.refetchQueries(); });
      expect(await screen.findByText('메뉴 구조를 불러오지 못해 메뉴에 없는 화면을 거를 수 없습니다. 연결 메뉴를 다시 불러와 주세요.')).toBeInTheDocument();
      // 모르는 것을 0건이라고 말하지 않는다.
      expect(screen.getByTestId('work-list-toolbar')).not.toHaveTextContent('총');
      // 고른 구분은 그대로 둔다(선택지를 숨겨 값이 사라지지 않게).
      expect(kind).toHaveValue('no-menu');
    });

    it('거른 결과가 지금 쪽보다 짧아지면 마지막 쪽을 보인다(빈 쪽에 갇히지 않는다)', async () => {
      auth.permissions = [...FULL_PERMISSIONS, 'MENU_READ'];
      const covered = SCREEN_REGISTRY.slice(2).map((entry, index) => structureMenu(index + 1, `메뉴 ${index + 1}`, { modernRoute: entry.route }));
      mocks.getMenuStructure.mockResolvedValueOnce(structure([])).mockResolvedValueOnce(structure(covered));
      const client = createAppQueryClient();
      render(<QueryClientProvider client={client}><ProgramAdminClient initialData={mockInitialData} searchWrd="" /></QueryClientProvider>);
      const kind = screen.getByRole('combobox', { name: '구분' });
      await waitFor(() => expect(within(kind).getByRole('option', { name: '메뉴에 없는 화면' })).toBeEnabled());
      fireEvent.change(kind, { target: { value: 'no-menu' } });
      fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
      fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(/^3\//);

      // 메뉴 구조가 바뀌어 메뉴에 없는 화면이 두 개만 남는다.
      await act(async () => { await client.refetchQueries(); });
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 2건'));
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent('1/1');
      expect(screen.getByTestId('화면 목록-count')).toHaveTextContent('2 items');
    });

    it('다른 화면으로 넘어가는 경로는 링크하지 않고 목적지와 넘기는 곳만 보인다', () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      const aliases = screen.getByRole('region', { name: `다른 화면으로 넘어가는 경로 ${SCREEN_ALIASES.length}개` });
      expect(within(aliases).getAllByRole('listitem')).toHaveLength(SCREEN_ALIASES.length);
      expect(within(aliases).queryAllByRole('link')).toHaveLength(0);
      expect(within(aliases).getByText('/admin/system/ism').closest('li')).toHaveTextContent('/approvals');
      // 넘겨받는 동적 값은 생성 목록의 자리표시자(${id})가 아니라 화면 경로와 같은 표기로 보인다.
      const community = within(aliases).getByText('/admin/community/[id]').closest('li');
      expect(community).toHaveTextContent('/cop/cmy/selectCommunityDetail/[id]');
      expect(within(aliases).queryByText(/\$\{/)).not.toBeInTheDocument();

      searchScreens('approvals');
      expect(screen.getByRole('region', { name: /다른 화면으로 넘어가는 경로 \d+ \/ \d+개/ })).toBeInTheDocument();
      expect(within(screen.getByRole('region', { name: /다른 화면으로 넘어가는 경로/ })).getAllByRole('listitem').length)
        .toBeLessThan(SCREEN_ALIASES.length);
    });
  });

  /*
   * [2026-10-02 D3] 행 동작 '메뉴에 추가' — 메뉴를 만들고(MENU_CREATE) 구조를 저장할 수 있고(MENU_UPDATE) 메뉴 관리에
   * 들어갈 수 있는(라우트 게이트와 같은 판정) 사람에게만 보인다. 화면 인계(이 탭의 sessionStorage, URL 비노출) 뒤 이동한다.
   */
  describe('메뉴에 추가', () => {
    const HANDOFF_KEY = 'egov.screen-handoff.v1:menu-add-screen';

    it('메뉴를 만들 수 있으면 동적이 아닌 화면에만 보이고, 누르면 화면을 넘긴 뒤 메뉴 관리로 간다', () => {
      auth.permissions = [...FULL_PERMISSIONS, ...MENU_MANAGER];
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      searchScreens('/smart-toolkit/dept-job');
      expect(within(cell('/smart-toolkit/dept-job/[id]', '관리')).queryByRole('button')).not.toBeInTheDocument();

      searchScreens('/admin/system/programs');
      fireEvent.click(within(cell('/admin/system/programs', '관리')).getByRole('button', { name: '메뉴에 추가: 화면 관리 (/admin/system/programs)' }));

      const stored = JSON.parse(window.sessionStorage.getItem(HANDOFF_KEY) ?? 'null');
      expect(stored).toMatchObject({ route: '/admin/system/programs', label: '화면 관리' });
      expect(typeof stored.at).toBe('number');
      expect(mocks.push).toHaveBeenCalledTimes(1);
      expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus');
      // 화면·탭 상태는 주소에 싣지 않는다.
      expect(window.location.search).toBe('');
    });

    it('이름이 없는 화면은 이름 없이 넘긴다(메뉴 관리가 이름을 묻는다)', () => {
      auth.permissions = [...FULL_PERMISSIONS, ...MENU_MANAGER];
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      const unnamed = SCREEN_REGISTRY.find((entry) => entry.label === null && !entry.dynamic);
      expect(unnamed).toBeDefined();
      searchScreens(unnamed!.route);
      fireEvent.click(within(cell(unnamed!.route, '관리')).getByRole('button', { name: `메뉴에 추가: 이름 미확인 (${unnamed!.route})` }));
      expect(JSON.parse(window.sessionStorage.getItem(HANDOFF_KEY) ?? 'null')).toMatchObject({ route: unnamed!.route, label: null });
    });

    it('화면을 넘기지 못하면 이동하지 않고 그 사실을 알린다', () => {
      auth.permissions = [...FULL_PERMISSIONS, ...MENU_MANAGER];
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      searchScreens('/admin/system/programs');
      fireEvent.click(within(cell('/admin/system/programs', '관리')).getByRole('button', { name: /메뉴에 추가/ }));

      expect(mocks.push).not.toHaveBeenCalled();
      expect(mocks.toast).toHaveBeenCalledWith('화면을 메뉴 관리로 넘기지 못했습니다. 메뉴 관리에서 화면을 직접 추가해 주세요.', 'error');
    });

    it.each([
      ['메뉴 등록 권한이 없으면', ['MENU_READ', 'MENU_UPDATE']],
      ['구조 저장 권한이 없으면', ['MENU_READ', 'MENU_CREATE']],
      ['메뉴 관리에 들어갈 수 없으면(MENU_READ 없음)', ['MENU_CREATE', 'MENU_UPDATE']],
    ])('%s 메뉴에 추가를 보이지 않는다', (_label, menuPermissions) => {
      auth.permissions = [...FULL_PERMISSIONS, ...menuPermissions];
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      searchScreens('/admin/system/programs');
      expect(screen.queryByRole('button', { name: /메뉴에 추가/ })).not.toBeInTheDocument();
      expect(row('/admin/system/programs').querySelector('[data-column="관리"]')).toBeNull();
    });
  });

  describe('이전 프로그램', () => {
    it('opens registration modal', async () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      openProgramsTab();
      fireEvent.click(screen.getByRole('button', { name: /프로그램 등록/ }));

      await waitFor(() => {
        expect(screen.getByTestId('standard-modal')).toBeInTheDocument();
        expect(screen.getByText(/신규 프로그램 등록/i)).toBeInTheDocument();
      });
    });

    it('목록이 비면 이전 프로그램이 없고 메뉴는 화면 경로로 연결한다고 말한다', () => {
      renderClient(<ProgramAdminClient initialData={{ list: [], total: 0 } as any} searchWrd="" />);
      openProgramsTab();
      expect(screen.getByText('등록된 이전 프로그램이 없습니다. 메뉴는 화면 목록의 경로로 연결합니다.')).toBeInTheDocument();
    });

    /*
     * [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다.
     * 이 화면은 PROGRAM_READ 만으로 들어올 수 있어, 종전에는 조회만 맡은 담당자에게도 등록·수정·삭제가 모두 보였다.
     */
    it('모든 쓰기 권한이 있으면 프로그램 등록과 행의 수정·삭제가 보인다', () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      openProgramsTab();
      expect(screen.getByRole('button', { name: /프로그램 등록/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '프로그램_하나 프로그램 수정' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '프로그램_하나 프로그램 삭제' })).toBeInTheDocument();
    });

    it('조회 권한만 있으면 프로그램 등록·수정·삭제를 보이지 않는다', () => {
      auth.permissions = ['PROGRAM_READ'];
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      openProgramsTab();

      // 목록은 그대로 읽힌다 — 가리는 것은 쓰기 동작뿐이다.
      expect(screen.getByText('프로그램_하나')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /프로그램 등록/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '프로그램_하나 프로그램 수정' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '프로그램_하나 프로그램 삭제' })).not.toBeInTheDocument();
    });

    it('수정 권한만 있으면 수정 폼 안의 삭제 버튼도 보이지 않는다', async () => {
      auth.permissions = ['PROGRAM_READ', 'PROGRAM_UPDATE'];
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      openProgramsTab();
      expect(screen.queryByRole('button', { name: '프로그램_하나 프로그램 삭제' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '프로그램_하나 프로그램 수정' }));
      expect(await screen.findByText('프로그램 정보 수정')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /프로그램 저장/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '프로그램 삭제' })).not.toBeInTheDocument();
    });

    it('삭제 권한까지 있으면 수정 폼에 삭제 버튼이 보인다', async () => {
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      openProgramsTab();
      fireEvent.click(screen.getByRole('button', { name: '프로그램_하나 프로그램 수정' }));
      expect(await screen.findByRole('button', { name: '프로그램 삭제' })).toBeInTheDocument();
    });

    /*
     * [2026-10-02] 연결 메뉴 열 — 서버 API 를 바꾸지 않고 메뉴 구조 조회의 prgrmFileNm 과 잇는다(화면 목록과 같은 조회 한 번).
     * 세는 규칙은 서버 삭제 거부(409)와 같다: 사용 안 함 메뉴도 센다. 메뉴를 불러오는 중이거나 조회가 거부·실패하면
     * 0건('연결 없음')으로 위장하지 않는다. MENU_READ 가 없으면 조회를 보내지 않는다(서버에 403 거부 기록을 남기지 않는다).
     */
    describe('연결 메뉴 열', () => {
      const LINKED_MENUS = structure([
        structureMenu(30, '프로그램 목록', { prgrmFileNm: 'PROG_1' }),
        structureMenu(31, '옛 프로그램 목록', { prgrmFileNm: 'PROG_1', useYn: 'N' }),
        structureMenu(40, '다른 화면', { prgrmFileNm: 'PROG_2' }),
        structureMenu(1, '시스템관리', { prgrmFileNm: '' }),
      ]);

      beforeEach(() => {
        auth.permissions = [...FULL_PERMISSIONS, 'MENU_READ'];
      });

      it('이 프로그램을 연결한 메뉴 수와 이름을 보이고, 사용 안 함 메뉴도 센다', async () => {
        mocks.getMenuStructure.mockResolvedValue(LINKED_MENUS);
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();

        const linked = linkCell('PROG_1');
        expect(await within(linked).findByText('연결 메뉴 2개')).toBeInTheDocument();
        const items = within(linked).getAllByRole('listitem');
        expect(items.map((item) => item.textContent)).toEqual([
          '옛 프로그램 목록(ID: 31)· 사용 안 함',
          '프로그램 목록(ID: 30)',
        ]);
        expect(within(linked).queryByText('다른 화면')).not.toBeInTheDocument();
        // 실패는 칸이 알린다 — 전역 실패 토스트까지 띄우지 않도록 조용한 요청으로 보낸다. 두 탭이 같은 조회 한 번을 쓴다.
        expect(mocks.getMenuStructure).toHaveBeenCalledTimes(1);
        expect(mocks.getMenuStructure).toHaveBeenCalledWith({ suppressErrorToast: true });
      });

      it('연결한 메뉴가 없으면 연결 없음이다', async () => {
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();
        expect(await within(linkCell('PROG_1')).findByText('연결 없음')).toBeInTheDocument();
      });

      it('메뉴를 불러오는 동안은 연결 없음이 아니라 불러오는 중이다', async () => {
        let resolveMenus!: (value: unknown) => void;
        mocks.getMenuStructure.mockReturnValueOnce(new Promise((resolve) => { resolveMenus = resolve; }));
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();

        const loading = within(linkCell('PROG_1')).getByText('연결 메뉴를 불러오는 중…');
        expect(loading).toHaveAttribute('aria-busy', 'true');
        expect(within(linkCell('PROG_1')).queryByText('연결 없음')).not.toBeInTheDocument();

        await act(async () => resolveMenus(LINKED_MENUS));
        expect(await within(linkCell('PROG_1')).findByText('연결 메뉴 2개')).toBeInTheDocument();
      });

      it('메뉴 조회 권한(MENU_READ)이 없으면 조회를 보내지 않고 권한 없음을 말한다', async () => {
        auth.permissions = FULL_PERMISSIONS;
        mocks.getMenuStructure.mockResolvedValue(LINKED_MENUS);
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();

        const linked = linkCell('PROG_1');
        expect(within(linked).getByText('메뉴 조회 권한 없음')).toBeInTheDocument();
        expect(within(linked).queryByText('연결 없음')).not.toBeInTheDocument();
        await act(async () => { await Promise.resolve(); });
        expect(mocks.getMenuStructure).not.toHaveBeenCalled();
      });

      it('로그인 정보를 확인하는 중이면 권한 없음으로 단정하지 않는다', () => {
        auth.signedIn = false;
        auth.loading = true;
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();

        expect(within(linkCell('PROG_1')).getByText('연결 메뉴를 불러오는 중…')).toBeInTheDocument();
        expect(within(linkCell('PROG_1')).queryByText('메뉴 조회 권한 없음')).not.toBeInTheDocument();
        expect(mocks.getMenuStructure).not.toHaveBeenCalled();
      });

      it('메뉴 조회가 403 이면 0건으로 위장하지 않고 권한 없음을 말한다', async () => {
        mocks.getMenuStructure.mockRejectedValue({ response: { status: 403, data: { message: '권한이 없습니다.' } } });
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();

        const linked = linkCell('PROG_1');
        expect(await within(linked).findByText('메뉴 조회 권한 없음')).toBeInTheDocument();
        expect(within(linked).queryByText('연결 없음')).not.toBeInTheDocument();
        // 권한 없음은 다시 불러와도 같은 답이다 — 다시 불러오기를 두지 않는다.
        expect(screen.queryByRole('button', { name: '연결 메뉴 다시 불러오기' })).not.toBeInTheDocument();
      });

      it('메뉴를 불러오지 못하면 목록은 그대로 두고 실패를 말하며 다시 불러올 수 있다', async () => {
        mocks.getMenuStructure.mockRejectedValueOnce({ response: { status: 500 } });
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();

        const failed = await within(linkCell('PROG_1')).findByText('메뉴를 불러오지 못함');
        // 실패 문구는 전경 전용 토큰이다 — 배경용 destructive 는 다크에서 대비가 1.8:1 이다.
        expect(failed).toHaveClass('text-destructive-emphasis');
        expect(failed).not.toHaveClass('text-destructive');
        expect(within(linkCell('PROG_1')).queryByText('연결 없음')).not.toBeInTheDocument();
        // 화면 전체 오류로 올라가지 않는다 — 프로그램 목록은 그대로 읽힌다.
        expect(screen.getByText('프로그램_하나')).toBeInTheDocument();
        expect(screen.getByText('프로그램 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.')).toBeInTheDocument();
        expect(mocks.getMenuStructure).toHaveBeenCalledTimes(1);

        mocks.getMenuStructure.mockResolvedValueOnce(LINKED_MENUS);
        fireEvent.click(screen.getByRole('button', { name: '연결 메뉴 다시 불러오기' }));

        expect(await within(linkCell('PROG_1')).findByText('연결 메뉴 2개')).toBeInTheDocument();
        expect(mocks.getMenuStructure).toHaveBeenCalledTimes(2);
        expect(screen.queryByText('프로그램 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.')).not.toBeInTheDocument();
      });

      it('프로그램 목록도 실패했으면 "목록은 표시했지만" 이라고 말하지 않는다', async () => {
        mocks.getMenuStructure.mockRejectedValueOnce({ response: { status: 500 } });
        // 표 모형은 오류와 무관하게 행을 그린다 — 연결 칸이 실패로 바뀐 것을 확인한 뒤 안내가 없는지 본다.
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" initialError="프로그램 목록을 불러오지 못했습니다." />);
        openProgramsTab();

        expect(await within(linkCell('PROG_1')).findByText('메뉴를 불러오지 못함')).toBeInTheDocument();
        expect(screen.queryByText('프로그램 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '연결 메뉴 다시 불러오기' })).not.toBeInTheDocument();
      });

      /*
       * 카탈로그 G10 — 명령은 레코드 상태를 반영한다. 연결이 확인된 행의 삭제는 서버가 409 로 거부할 것을 화면이 이미
       * 안다. 버튼은 막지 않되(화면을 연 시점의 메뉴 구조다) 확인 문구가 연결 메뉴 수·이름을 밝힌다.
       */
      it('연결이 확인된 행의 삭제 확인은 연결 메뉴 수와 이름을 밝힌다', async () => {
        mocks.getMenuStructure.mockResolvedValue(LINKED_MENUS);
        mocks.confirm.mockResolvedValueOnce(false);
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();
        await within(linkCell('PROG_1')).findByText('연결 메뉴 2개');

        fireEvent.click(screen.getByRole('button', { name: '프로그램_하나 프로그램 삭제' }));

        await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
        expect(mocks.confirm.mock.calls[0][0].message).toContain('메뉴 2개(옛 프로그램 목록, 프로그램 목록)가 이 프로그램을 연결하고 있습니다.');
        expect(mocks.deleteProgram).not.toHaveBeenCalled();
      });

      it('수정 폼의 삭제 확인도 같은 연결 안내를 싣는다', async () => {
        mocks.getMenuStructure.mockResolvedValue(LINKED_MENUS);
        mocks.confirm.mockResolvedValueOnce(false);
        renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        openProgramsTab();
        await within(linkCell('PROG_1')).findByText('연결 메뉴 2개');

        fireEvent.click(screen.getByRole('button', { name: '프로그램_하나 프로그램 수정' }));
        fireEvent.click(await screen.findByRole('button', { name: '프로그램 삭제' }));

        await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
        expect(mocks.confirm.mock.calls[0][0].message).toContain('메뉴 2개(옛 프로그램 목록, 프로그램 목록)가 이 프로그램을 연결하고 있습니다.');
        expect(mocks.deleteProgram).not.toHaveBeenCalled();
      });
    });

    it('행 삭제는 같은 tick 중복 실행을 막고 pending·서버 거부 사유를 안내한다', async () => {
      let rejectDelete!: (reason?: unknown) => void;
      mocks.deleteProgram.mockReturnValueOnce(new Promise((_, reject) => { rejectDelete = reject; }));
      renderClient(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
      openProgramsTab();
      const deleteButton = screen.getByRole('button', { name: '프로그램_하나 프로그램 삭제' });

      act(() => {
        deleteButton.click();
        deleteButton.click();
      });

      await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
      expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '프로그램 삭제' }));
      await waitFor(() => expect(mocks.deleteProgram).toHaveBeenCalledTimes(1));
      expect(mocks.deleteProgram).toHaveBeenCalledWith('PROG_1');
      const pendingButton = screen.getByRole('button', { name: '프로그램_하나 프로그램 삭제 중…' });
      expect(pendingButton).toBeDisabled();
      expect(pendingButton).toHaveAttribute('aria-busy', 'true');

      // 연결 메뉴가 있으면 서버가 409 로 거부한다 — 그 사유가 사용자에게 그대로 닿아야 한다.
      await act(async () => rejectDelete({
        response: { status: 409, data: { message: '이 프로그램을 연결한 메뉴가 있어 삭제할 수 없습니다: PROG_1' } },
      }));
      await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
        '이 프로그램을 연결한 메뉴가 있어 삭제할 수 없습니다: PROG_1',
        'error',
      ));
      expect(screen.getByRole('button', { name: '프로그램_하나 프로그램 삭제' })).toBeEnabled();
      expect(mocks.getProgramList).not.toHaveBeenCalled();
    });
  });
});

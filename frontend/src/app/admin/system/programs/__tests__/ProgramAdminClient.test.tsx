import type { ReactElement } from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAppQueryClient } from '@/lib/query/list-query-defaults';
import { SCREEN_ALIASES, SCREEN_REGISTRY } from '@/types/generated-screen-registry';

const mocks = vi.hoisted(() => ({
  getMenuStructure: vi.fn(),
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
// 행 동작(메뉴에 추가)의 표시 판정과 연결 메뉴 칸을 보려면 컬럼 accessor 를 실제로 렌더해야 한다.
// 표마다 이름(accessibleLabel)을 붙이고, 빈 문구·불러오는 중·쪽 이동·페이지당 건수·밀도 prop 을 그대로 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data, columns, keyField, accessibleLabel, emptyMessage, pagination, loading, rowDensity, fillHeight }: any) => (
    <div
      data-testid="data-table"
      data-table-label={accessibleLabel}
      data-row-density={rowDensity}
      data-fill-height={fillHeight ? 'true' : undefined}
      data-loading={loading ? 'true' : undefined}
    >
      <span data-testid={`${accessibleLabel}-count`}>{data?.length || 0} items</span>
      {(data || []).length === 0 && (loading ? <p>{`${accessibleLabel}을(를) 불러오는 중…`}</p> : <p>{emptyMessage}</p>)}
      {(data || []).map((row: any) => (
        <div key={row[keyField]} data-row={row[keyField]}>
          {columns.map((column: any) => (
            <span key={column.header} data-column={column.header} data-sortable={column.sortKey ? 'true' : undefined}>
              {column.accessor(row)}
            </span>
          ))}
        </div>
      ))}
      {pagination && (
        <>
          <span data-testid={`${accessibleLabel}-page`}>{`${pagination.currentPage}/${pagination.totalPages}`}</span>
          <span data-testid={`${accessibleLabel}-page-size`}>{pagination.pageSize}</span>
          <button type="button" onClick={() => pagination.onPageChange(pagination.currentPage + 1)}>{`${accessibleLabel} 다음 쪽`}</button>
          {pagination.onPageSizeChange && (
            <button type="button" onClick={() => pagination.onPageSizeChange(20)}>{`${accessibleLabel} 20개씩`}</button>
          )}
        </>
      )}
    </div>
  )
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast, error: mocks.toastError, success: mocks.toastSuccess }),
}));
// [2026-10-02 D3] 연결 메뉴는 화면이 MENU_READ 를 확인한 뒤 메뉴 구조 조회 한 번으로 잇는다.
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { getMenuStructure: (...args: unknown[]) => mocks.getMenuStructure(...args) },
}));

// [2026-10-04 프로그램 목록 퇴역] 이 화면의 진입 권한은 MENU_READ 다. 그래도 연결 메뉴 칸이 '메뉴 조회 권한 없음' 을 말하는
// 분기(useMenuStructureSource)를 그대로 고정하려고 기본은 메뉴 조회 권한이 없는 상태로 렌더하고, 연결 메뉴 테스트만 더한다.
const BASE_PERMISSIONS: string[] = [];
const MENU_MANAGER = ['MENU_READ', 'MENU_CREATE', 'MENU_UPDATE'];
const auth = vi.hoisted(() => ({ permissions: [] as string[], signedIn: true, loading: false, version: 'v1' }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: auth.signedIn ? { id: 'admin', permissions: auth.permissions, authorizationVersion: auth.version } : null,
    loading: auth.loading,
  }),
}));

import ProgramAdminClient from '../ProgramAdminClient';

/** 앱과 같은 QueryClient 로 렌더한다 — 메뉴 조회 실패가 화면 전체 오류로 올라가지 않는지도 같은 규칙으로 본다. */
function renderClient(node: ReactElement) {
  return render(<QueryClientProvider client={createAppQueryClient()}>{node}</QueryClientProvider>);
}

/** 메뉴 구조 한 줄(서버 응답을 서비스가 정리한 모양). */
function structureMenu(menuNo: number, menuNm: string, fields: { modernRoute?: string | null; useYn?: 'Y' | 'N' } = {}) {
  return {
    menuNo,
    menuNm,
    upMenuSn: null,
    menuOrdr: menuNo,
    modernRoute: fields.modernRoute ?? null,
    menuExpln: null,
    useYn: fields.useYn ?? 'Y',
  };
}

function structure(menus: ReturnType<typeof structureMenu>[]) {
  return { version: 'v-structure', menus };
}

/** 동적 경로가 아닌 화면 중 except 를 뺀 모두를 사용 중인 메뉴에 건다. */
function structureCoveringAllBut(...except: string[]) {
  return structure(
    SCREEN_REGISTRY.filter((entry) => !except.includes(entry.route) && !entry.dynamic)
      .map((entry, index) => structureMenu(index + 1, `메뉴 ${index + 1}`, { modernRoute: entry.route })),
  );
}

const STATIC_SCREENS = SCREEN_REGISTRY.filter((entry) => !entry.dynamic);

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

/** 검색어 칸 — 라벨은 보기마다 실제로 거르는 칸을 말하므로(화면 이름 · 경로 / 경로 · 넘어가는 곳) 조회 조건 폼으로 찾는다. */
function searchBox(): HTMLElement {
  return within(screen.getByRole('search')).getByRole('textbox');
}

function searchScreens(keyword: string) {
  fireEvent.change(searchBox(), { target: { value: keyword } });
  fireEvent.click(screen.getByRole('button', { name: '조회' }));
}

/** 보기 단추(결과 도구 줄). 접근 이름은 '이름 건수' 다. */
function chip(label: string): HTMLElement {
  const group = screen.getByRole('group', { name: '화면 목록 보기' });
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return within(group).getByRole('button', { name: new RegExp(`^${escaped} `) });
}

function table(): HTMLElement {
  return screen.getByTestId('data-table');
}

describe('ProgramAdminClient Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks 는 '한 번만' 응답(mock*Once)을 지우지 않는다 — 실패한 테스트가 남긴 응답이 다음 테스트로 새지 않게 비운다.
    Object.values(mocks).forEach((mock) => mock.mockReset());
    auth.permissions = BASE_PERMISSIONS;
    auth.signedIn = true;
    auth.loading = false;
    auth.version = 'v1';
    mocks.getMenuStructure.mockResolvedValue(structure([]));
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    renderClient(<ProgramAdminClient />);
    // [2026-08-24 A1 이행] HubHeader 대신 WorkListPage 셸이 제목과 결과 툴바를 소유한다.
    // [2026-10-02 D3] 메뉴명이 '화면 관리' 로 바뀌었다(사용자 사전 승인). h1 은 셸 하나다.
    expect(screen.getByRole('heading', { level: 1, name: '화면 관리' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId('work-list-toolbar')).toBeInTheDocument();
  });

  /*
   * [2026-10-05 한 화면 압축] fill 셸 — 페이지는 스크롤하지 않고 표 하나가 남은 높이를 채운다. 행은 업무 표 행 토큰(밀도 계약의
   * 허용 목록에 등재)이다. 표 위 세 문장 설명은 걷고 제목 옆 '집계 기준' 도움말(키보드·터치로 열리는 펼침)로 옮겼다.
   */
  it('fill 셸과 업무 표 밀도로 그리고, 설명은 제목 옆 집계 기준 도움말 하나다', async () => {
    renderClient(<ProgramAdminClient />);
    expect(screen.getByTestId('work-list-page')).toHaveAttribute('data-work-fill');
    expect(table()).toHaveAttribute('data-row-density', 'work');
    expect(table()).toHaveAttribute('data-fill-height', 'true');
    // 표 위 설명 문단은 없다.
    expect(screen.queryByText(/앱에 있는 화면과 그 화면에 들어가는 데 필요한 권한/)).not.toBeInTheDocument();
    // 도움말 단추는 제목과 같은 머리(header) 안에 있다 — 조회 조건·결과 위에 줄을 더 쓰지 않는다.
    const trigger = screen.getByRole('button', { name: '집계 기준' });
    expect(trigger.closest('header')).not.toBeNull();
    // 닫혀 있으면 내용이 없다(겹쳐 뜨는 상자다).
    expect(screen.queryByRole('dialog', { name: '집계 기준' })).not.toBeInTheDocument();
    // [2026-10-05 반박 리뷰 — 통합 단계에서 테스트를 구현에 맞췄다] 처음 구현은 네이티브 details 라 요약을 다시 누를 때만
    //   닫혀 겹친 상자가 조회·보기 단추를 가렸다(WCAG 2.4.11). 지금은 공용 Popover 다 — 누르면 열리고 Esc 로 닫히며 포커스가
    //   단추로 돌아온다. details 로 되돌리면 이 단언이 실패한다.
    fireEvent.click(trigger);
    const help = await screen.findByRole('dialog', { name: '집계 기준' });
    expect(help).toHaveTextContent('메뉴에 없는 화면은 사용 중인 메뉴로 열리지 않는 화면입니다');
    expect(help).toHaveTextContent('‘모두’는 적힌 권한이 모두 있어야');
    expect(help).toHaveTextContent('화면이 아니므로 메뉴에 추가하지 않습니다');
    expect(help).toHaveTextContent('메뉴 ID 와 함께 봅니다');
    fireEvent.keyDown(help, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '집계 기준' })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  /*
   * [2026-10-04 프로그램 목록 퇴역] '이전 프로그램' 탭·표·등록 폼과 그 탭의 `?page=` 주소 동기화를 걷었다. 화면 관리는
   * 화면 목록 하나다 — 탭 목록도 탭 패널도 없고, 쪽을 넘겨도 주소를 바꾸지 않는다. 탭을 되살리면 이 테스트가 실패한다.
   * [2026-10-05] 기본 페이지당 건수가 100 이라 화면 목록 전체가 한 쪽이다 — 쪽을 넘기려면 건수를 줄인다.
   */
  it('탭 없이 화면 목록 하나만 보이고, 쪽을 넘겨도 주소는 그대로다', () => {
    window.history.replaceState(null, '', '/admin/system/programs');
    renderClient(<ProgramAdminClient />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('data-table').map((element) => element.getAttribute('data-table-label'))).toEqual(['화면 목록']);
    expect(screen.queryByText(/이전 프로그램/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /프로그램 등록/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '화면 목록 20개씩' }));
    fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
    expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(/^2\//);
    expect(window.location.search).toBe('');
  });

  /*
   * [2026-10-02 D3] 화면 목록 — 생성된 화면 목록 중 라우트 게이트가 아는 화면. 열: 화면 이름·경로·진입 권한·연결 메뉴·구분.
   */
  describe('화면 목록', () => {
    const LISTED = SCREEN_REGISTRY.length;

    it('화면 목록 전체를 한 쪽에 세고(기본 100개씩), 진입 권한은 이름 칩과 코드로 보인다', () => {
      renderClient(<ProgramAdminClient />);
      // 메뉴 조회 권한이 없으면 처음 보기는 전체다.
      expect(chip('전체')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${LISTED.toLocaleString()}건`);
      expect(LISTED).toBeLessThanOrEqual(100);
      expect(screen.getByTestId('화면 목록-count')).toHaveTextContent(`${LISTED} items`);
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent('1/1');
      expect(screen.getByTestId('화면 목록-page-size')).toHaveTextContent('100');

      searchScreens('/admin/system/programs');
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건');
      expect(cell('/admin/system/programs', '화면 이름')).toHaveTextContent('화면 관리');
      // [2026-10-04 프로그램 목록 퇴역] 진입 권한이 PROGRAM_READ 에서 MENU_READ 로 바뀌었다.
      // [2026-10-05 한 줄 행] 칩에는 이름이, 코드는 보조기술용 글자로 있다.
      // [2026-10-05 반박 리뷰] 코드는 이 화면에서 생략하는 내부 표기라 hover 전용 title 을 두지 않는다(헌법 제16조 3항 — 포커스를
      //   받지 않는 칩의 title 은 키보드·터치 사용자에게 같은 길이 없다). 이름이 코드와 일대일인 것은 screenList.test 가 고정한다.
      const entryChip = cell('/admin/system/programs', '진입 권한').querySelector('[data-permission-code="MENU_READ"]');
      expect(entryChip).not.toHaveAttribute('title');
      expect(cell('/admin/system/programs', '진입 권한').querySelector('[title]')).toBeNull();
      expect(entryChip).toHaveTextContent('메뉴 · 조회 (MENU_READ)');
      expect(within(entryChip as HTMLElement).getByText('(MENU_READ)', { exact: false })).toHaveClass('sr-only');
      // 경로는 생략하지 않는다(헌법 제16조 2항) — 이름·경로 열은 정렬할 수 있다(G5).
      expect(cell('/admin/system/programs', '경로')).toHaveTextContent('/admin/system/programs');
      expect(cell('/admin/system/programs', '경로')).toHaveAttribute('data-sortable', 'true');
      expect(cell('/admin/system/programs', '화면 이름')).toHaveAttribute('data-sortable', 'true');
    });

    it('진입 권한이 둘 이상이면 모두·하나 표지를 칩 앞에 두고 그 뜻을 보조기술에 말한다', () => {
      renderClient(<ProgramAdminClient />);
      searchScreens('/admin/security/authority');
      const any = cell('/admin/security/authority', '진입 권한');
      expect(within(any).getByText('하나라도 있으면 열림:')).toHaveClass('sr-only');
      expect(within(any).getByText('하나')).toHaveAttribute('aria-hidden', 'true');
      expect(within(any).getByText('하나').parentElement).toHaveAttribute('title', '하나라도 있으면 열림');
      /*
       * [2026-10-05 반박 리뷰 — 통합 단계에서 테스트를 구현에 맞췄다] 권한이 둘 이상인 칸은 칩을 늘어놓지 않고 '표지 · 첫 칩 ·
       * 외 N개' 한 줄 요약과 펼침이다 — 칩을 늘어놓으면 권한 넷인 화면이 칸 안에서 두세 줄로 접혔다. 나머지 권한은 hover 전용
       * title 이 아니라 펼침(키보드·터치로 열린다)에 이름과 코드로 있다(헌법 제16조 2항). 칩을 다시 늘어놓으면 칩 수 단언이,
       * 펼침을 걷으면 목록 단언이 실패한다.
       */
      expect(any.querySelectorAll('[data-permission-code]')).toHaveLength(1);
      const details = any.querySelector<HTMLDetailsElement>('details[data-entry-details]');
      expect(details).not.toBeNull();
      expect(details!.querySelector('summary')).toHaveTextContent('외 1개');
      expect(Array.from(details!.querySelectorAll('[data-entry-permission]')).map((item) => item.getAttribute('data-entry-permission')))
        .toEqual(['AUTHRT_READ', 'AUTHRT_AUDIT']);
      expect(details!.querySelector('[data-entry-permission="AUTHRT_AUDIT"]')).toHaveTextContent('(AUTHRT_AUDIT)');

      searchScreens('/admin/survey/polls/manage');
      const all = cell('/admin/survey/polls/manage', '진입 권한');
      expect(within(all).getByText('모두')).toBeInTheDocument();
      expect(within(all).getByText('모두 있어야 열림:')).toHaveClass('sr-only');
    });

    it('검색어는 이름·경로로 거르고, 결과가 없으면 검색 결과가 없다고 말한다(G15)', () => {
      renderClient(<ProgramAdminClient />);
      searchScreens('없는-화면-검색어');
      expect(screen.getByTestId('화면 목록-count')).toHaveTextContent('0 items');
      expect(screen.getByText('"없는-화면-검색어"에 대한 검색 결과가 없습니다.')).toBeInTheDocument();
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 0건');
      // 단추 건수도 검색어를 적용한 수다.
      expect(chip('전체')).toHaveAccessibleName('전체 0');

      fireEvent.click(screen.getByRole('button', { name: '초기화' }));
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${LISTED.toLocaleString()}건`);
    });

    it('조회하면 첫 쪽으로 돌아간다', () => {
      renderClient(<ProgramAdminClient />);
      fireEvent.click(screen.getByRole('button', { name: '화면 목록 20개씩' }));
      fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(`2/${Math.ceil(LISTED / 20)}`);
      searchScreens('admin');
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(/^1\//);
    });

    it('단추로 동적 경로·로그인만 하면 열리는 화면을 거르고 단추에 그 건수를 붙인다', () => {
      renderClient(<ProgramAdminClient />);
      const dynamic = SCREEN_REGISTRY.filter((entry) => entry.dynamic);
      expect(chip('동적 경로')).toHaveAccessibleName(`동적 경로 ${dynamic.length}`);
      fireEvent.click(chip('동적 경로'));
      expect(chip('동적 경로')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('전체')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${dynamic.length}건`);
      expect(within(cell('/smart-toolkit/dept-job/[id]', '구분')).getByText('동적 경로')).toBeInTheDocument();
      // 동적 경로도 등록된 이름으로 보인다(라우트 원장의 페이지 제목). 이름이 없으면 지어내지 않고 '이름 미확인' 으로 보이는
      // 규칙은 screenList.test 가 합성 화면으로 고정한다(2026-10-03 실제 생성물의 이름 미확인 화면은 0개가 됐다).
      expect(cell('/smart-toolkit/dept-job/[id]', '화면 이름')).toHaveTextContent('부서 업무 상세');

      const loginOnly = SCREEN_REGISTRY.filter((entry) => entry.entry.permissions.length === 0 && entry.shellAccess !== 'public');
      expect(chip('로그인만 하면 열리는 화면')).toHaveAccessibleName(`로그인만 하면 열리는 화면 ${loginOnly.length}`);
      fireEvent.click(chip('로그인만 하면 열리는 화면'));
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${loginOnly.length}건`);
    });

    it('메뉴 조회 권한이 없으면 연결 메뉴를 묻지 않고, 메뉴 관련 단추는 건수 대신 그 이유를 말한다', async () => {
      renderClient(<ProgramAdminClient />);
      searchScreens('/admin/system/programs');
      expect(cell('/admin/system/programs', '연결 메뉴')).toHaveTextContent('메뉴 조회 권한 없음');
      // '메뉴 없음' 배지는 메뉴 구조를 알 때만 붙는다.
      expect(cell('/admin/system/programs', '구분')).not.toHaveTextContent('메뉴 없음');
      for (const label of ['메뉴에 없는 화면', '메뉴에 연결된 화면']) {
        const blocked = chip(label);
        expect(blocked).toHaveAccessibleName(`${label} 건수 모름`);
        expect(blocked).toHaveAttribute('aria-disabled', 'true');
        expect(blocked).toHaveAccessibleDescription('메뉴 조회 권한이 없어 메뉴에 연결된 화면과 메뉴에 없는 화면을 셀 수 없습니다.');
        // 막힌 단추는 눌러도 보기를 바꾸지 않는다.
        fireEvent.click(blocked);
        expect(blocked).toHaveAttribute('aria-pressed', 'false');
      }
      // 권한 없음은 화면에 보이는 문장으로도 말한다.
      expect(screen.getByText('메뉴 조회 권한이 없어 메뉴에 연결된 화면과 메뉴에 없는 화면을 셀 수 없습니다.')).not.toHaveClass('sr-only');
      expect(chip('전체')).toHaveAttribute('aria-pressed', 'true');
      await act(async () => { await Promise.resolve(); });
      expect(mocks.getMenuStructure).not.toHaveBeenCalled();
    });

    /*
     * [2026-10-05] 처음 보기는 메뉴 구조를 불러오면 '메뉴에 없는 화면' 이다. 불러오는 동안 빈 표를 그리지 않는다 — 빈 표는
     * '메뉴에 없는 화면이 없다' 로 읽힌다. 표는 불러오는 중이고 건수는 아직 말하지 않으며, 다른 보기는 바로 고를 수 있다.
     */
    it('메뉴 구조를 불러오는 동안 빈 표 대신 불러오는 중을 보이고, 불러오면 메뉴에 없는 화면으로 시작한다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      let resolveMenus!: (value: unknown) => void;
      mocks.getMenuStructure.mockReturnValueOnce(new Promise((resolve) => { resolveMenus = resolve; }));
      renderClient(<ProgramAdminClient />);

      expect(table()).toHaveAttribute('data-loading', 'true');
      expect(screen.getByText('화면 목록을(를) 불러오는 중…')).toBeInTheDocument();
      expect(screen.queryByText('선택한 구분에 해당하는 화면이 없습니다.')).not.toBeInTheDocument();
      expect(screen.queryByText(/거를 수 없습니다/)).not.toBeInTheDocument();
      expect(screen.getByTestId('work-list-toolbar')).not.toHaveTextContent('총');
      // [2026-10-05 반박 리뷰] 처음 보기를 정하기 전에는 어떤 단추도 눌림이 아니다 — 곧 정해질 보기를 미리 눌림으로 두면 조회가
      //   실패해 '전체' 로 정해질 때 눌림 상태가 말없이 뒤집힌다('…처음 보기는 전체' 테스트가 실패하면 그때 전체를 누른다).
      for (const option of ['전체', '메뉴에 연결된 화면', '메뉴에 없는 화면', '로그인만 하면 열리는 화면', '동적 경로', '넘어가는 경로']) {
        expect(chip(option)).toHaveAttribute('aria-pressed', 'false');
      }
      expect(chip('메뉴에 없는 화면')).toHaveAccessibleName('메뉴에 없는 화면 건수 모름');
      // 불러오는 중이라는 이유는 표가 보이므로 보조기술용으로만 둔다.
      expect(chip('메뉴에 연결된 화면')).toHaveAttribute('aria-disabled', 'true');
      expect(chip('메뉴에 연결된 화면')).toHaveAccessibleDescription('메뉴 구조를 불러오는 중이라 메뉴에 연결된 화면과 메뉴에 없는 화면을 아직 셀 수 없습니다.');
      expect(screen.getByText('메뉴 구조를 불러오는 중이라 메뉴에 연결된 화면과 메뉴에 없는 화면을 아직 셀 수 없습니다.')).toHaveClass('sr-only');

      await act(async () => resolveMenus(structureCoveringAllBut('/admin/system/menus')));
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건'));
      expect(table()).not.toHaveAttribute('data-loading');
      expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('메뉴에 없는 화면')).toHaveAccessibleName('메뉴에 없는 화면 1');
      expect(chip('메뉴에 연결된 화면')).toHaveAccessibleName(`메뉴에 연결된 화면 ${STATIC_SCREENS.length - 1}`);
      expect(chip('메뉴에 연결된 화면')).not.toHaveAttribute('aria-disabled');
      expect(chip('메뉴에 연결된 화면')).not.toHaveAttribute('aria-describedby');
      expect(within(cell('/admin/system/menus', '구분')).getByText('메뉴 없음')).toBeInTheDocument();
    });

    it('메뉴를 불러오는 동안 다른 보기를 고르면 바로 보이고, 연결 칸은 연결 없음이 아니라 불러오는 중이다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      let resolveMenus!: (value: unknown) => void;
      mocks.getMenuStructure.mockReturnValueOnce(new Promise((resolve) => { resolveMenus = resolve; }));
      renderClient(<ProgramAdminClient />);
      fireEvent.click(chip('전체'));
      expect(table()).not.toHaveAttribute('data-loading');
      searchScreens('/admin/system/programs');

      const loading = within(cell('/admin/system/programs', '연결 메뉴')).getByText('연결 메뉴를 불러오는 중…');
      expect(loading).toHaveAttribute('aria-busy', 'true');
      expect(cell('/admin/system/programs', '연결 메뉴')).not.toHaveTextContent('연결 없음');

      await act(async () => resolveMenus(structure([structureMenu(30, '화면 관리', { modernRoute: '/admin/system/programs' })])));
      expect(await within(cell('/admin/system/programs', '연결 메뉴')).findByText('화면 관리')).toBeInTheDocument();
      // 고른 보기는 처음 보기로 바뀌지 않는다.
      expect(chip('전체')).toHaveAttribute('aria-pressed', 'true');
    });

    it('로그인 정보를 확인하는 중이면 권한 없음으로 단정하지 않는다', () => {
      auth.signedIn = false;
      auth.loading = true;
      renderClient(<ProgramAdminClient />);
      expect(table()).toHaveAttribute('data-loading', 'true');
      fireEvent.click(chip('전체'));
      searchScreens('/admin/system/programs');

      expect(within(cell('/admin/system/programs', '연결 메뉴')).getByText('연결 메뉴를 불러오는 중…')).toBeInTheDocument();
      expect(cell('/admin/system/programs', '연결 메뉴')).not.toHaveTextContent('메뉴 조회 권한 없음');
      expect(mocks.getMenuStructure).not.toHaveBeenCalled();
    });

    it('메뉴 조회가 403 이면 0건으로 위장하지 않고 권한 없음을 말하며 다시 불러오기를 두지 않는다(처음 보기는 전체)', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockRejectedValue({ response: { status: 403, data: { message: '권한이 없습니다.' } } });
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(chip('전체')).toHaveAttribute('aria-pressed', 'true'));
      searchScreens('/admin/system/programs');

      expect(await within(cell('/admin/system/programs', '연결 메뉴')).findByText('메뉴 조회 권한 없음')).toBeInTheDocument();
      expect(cell('/admin/system/programs', '연결 메뉴')).not.toHaveTextContent('연결 없음');
      // 권한 없음은 다시 불러와도 같은 답이다 — 다시 불러오기를 두지 않는다.
      expect(screen.queryByRole('button', { name: '연결 메뉴 다시 불러오기' })).not.toBeInTheDocument();
    });

    it('메뉴 경로가 여는 화면으로 연결 메뉴를 세고(사용 중인 메뉴 먼저 한 줄), 별칭을 가리키는 메뉴는 넘어간 화면으로 센다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValue(structure([
        structureMenu(30, '화면 관리', { modernRoute: '/admin/system/programs' }),
        structureMenu(31, '옛 화면 관리', { modernRoute: '/admin/system/programs?tab=x', useYn: 'N' }),
        structureMenu(40, '주소록', { modernRoute: '/admin/collaboration/address-book' }),
      ]));
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(chip('메뉴에 연결된 화면')).toHaveAccessibleName('메뉴에 연결된 화면 2'));
      fireEvent.click(chip('메뉴에 연결된 화면'));
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 2건');
      searchScreens('/admin/system/programs');

      const links = cell('/admin/system/programs', '연결 메뉴');
      const summary = links.querySelector('summary');
      expect(summary).toHaveTextContent('화면 관리 외 1개');
      expect(within(links).getAllByRole('listitem', { hidden: true }).map((item) => item.textContent)).toEqual([
        '화면 관리(ID: 30)',
        '옛 화면 관리(ID: 31)· 사용 안 함',
      ]);
      expect(mocks.getMenuStructure).toHaveBeenCalledTimes(1);
      expect(mocks.getMenuStructure).toHaveBeenCalledWith({ suppressErrorToast: true });

      searchScreens('select-address-book-list');
      const addressBook = cell('/admin/collaboration/address-book/select-address-book-list', '연결 메뉴');
      expect(addressBook.querySelector('summary')).toHaveTextContent('주소록');
      expect(addressBook).toHaveTextContent('/admin/collaboration/address-book 경유');
      expect(cell('/admin/collaboration/address-book/select-address-book-list', '구분')).not.toHaveTextContent('메뉴 없음');
    });

    it('사용 중인 메뉴 하나가 직접 여는 화면의 연결 칸은 펼침 없이 이름 한 줄이다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValue(structure([structureMenu(30, '화면 관리', { modernRoute: '/admin/system/programs' })]));
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(chip('메뉴에 연결된 화면')).toHaveAccessibleName('메뉴에 연결된 화면 1'));
      fireEvent.click(chip('메뉴에 연결된 화면'));
      const links = cell('/admin/system/programs', '연결 메뉴');
      expect(links).toHaveTextContent(/^화면 관리/);
      expect(links.querySelector('details')).toBeNull();
      // 펼침이 없는 칸에도 메뉴 ID 가 보조기술용 글자로 남는다. [2026-10-05 반박 리뷰] hover 전용 title 은 두지 않는다 — 포커스를
      //   받지 않는 칸의 title 은 키보드·터치 사용자에게 같은 길이 없다(헌법 제16조 3항). 이 칸은 메뉴가 하나라 이름만으로 그
      //   메뉴를 가리킨다. 메뉴가 여럿이거나 사용 안 함·다른 경로를 거치면 펼침이 ID 를 보인다('집계 기준' 도움말과 같은 서술).
      expect(within(links).getByText('(메뉴 ID: 30)', { exact: false })).toHaveClass('sr-only');
      expect(links.querySelector('[title]')).toBeNull();
    });

    it('메뉴에 없는 화면 보기는 연결 메뉴가 없는 화면만 남고 메뉴 없음 배지가 붙는다(동적 경로 화면은 들지 않는다)', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValue(structureCoveringAllBut('/admin/system/menus'));
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건'));
      expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true');

      // 동적 경로 화면은 어떤 메뉴도 열지 않지만 메뉴에 둘 수 없는 화면이라 세지 않는다.
      expect(SCREEN_REGISTRY.some((entry) => entry.dynamic)).toBe(true);
      expect(within(cell('/admin/system/menus', '구분')).getByText('메뉴 없음')).toBeInTheDocument();
      expect(cell('/admin/system/menus', '연결 메뉴')).toHaveTextContent('연결 없음');

      fireEvent.click(chip('동적 경로'));
      expect(cell('/smart-toolkit/dept-job/[id]', '연결 메뉴')).toHaveTextContent('연결 없음');
      expect(cell('/smart-toolkit/dept-job/[id]', '구분')).not.toHaveTextContent('메뉴 없음');
    });

    /*
     * '메뉴에 없는 화면' 은 권한 작업대와 같은 공용 판정이다 — 사용 중인 메뉴로 열리지 않는 화면. 사용 안 함 메뉴만 가리키는
     * 화면은 연결 칸에 그 메뉴를 보이되 메뉴 없음으로 센다(사이드바에 보이지 않는다).
     */
    it('사용 안 함 메뉴만 가리키는 화면은 연결을 보이되 메뉴에 없는 화면으로 센다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValue(structure(
        SCREEN_REGISTRY.filter((entry) => entry.route !== '/admin/system/menus' && !entry.dynamic)
          .map((entry, index) => structureMenu(index + 1, `메뉴 ${index + 1}`, {
            modernRoute: entry.route,
            useYn: entry.route === '/admin/system/programs' ? 'N' : 'Y',
          })),
      ));
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 2건'));

      expect(within(cell('/admin/system/programs', '구분')).getByText('메뉴 없음')).toBeInTheDocument();
      expect(cell('/admin/system/programs', '연결 메뉴').querySelector('summary')).toHaveTextContent(/\(사용 안 함\)$/);
      expect(cell('/admin/system/programs', '연결 메뉴')).toHaveTextContent('· 사용 안 함');
      expect(within(cell('/admin/system/menus', '구분')).getByText('메뉴 없음')).toBeInTheDocument();
      // 두 단추는 동적 경로가 아닌 화면을 정확히 나눈다.
      expect(chip('메뉴에 연결된 화면')).toHaveAccessibleName(`메뉴에 연결된 화면 ${STATIC_SCREENS.length - 2}`);
    });

    it('메뉴 구조를 불러오지 못하면 0건으로 위장하지 않고 실패를 말하며 다시 불러올 수 있다(처음 보기는 전체)', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockRejectedValueOnce({ response: { status: 500 } });
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(chip('전체')).toHaveAttribute('aria-pressed', 'true'));
      searchScreens('/admin/system/programs');

      const failed = await within(cell('/admin/system/programs', '연결 메뉴')).findByText('메뉴를 불러오지 못함');
      expect(failed).toHaveClass('text-destructive-emphasis');
      expect(screen.getByText('화면 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.')).toBeInTheDocument();
      expect(chip('메뉴에 없는 화면')).toHaveAccessibleDescription('메뉴 구조를 불러오지 못해 메뉴에 연결된 화면과 메뉴에 없는 화면을 셀 수 없습니다.');

      mocks.getMenuStructure.mockResolvedValueOnce(structure([structureMenu(30, '화면 관리', { modernRoute: '/admin/system/programs' })]));
      fireEvent.click(screen.getByRole('button', { name: '연결 메뉴 다시 불러오기' }));
      expect(await within(cell('/admin/system/programs', '연결 메뉴')).findByText('화면 관리')).toBeInTheDocument();
      expect(mocks.getMenuStructure).toHaveBeenCalledTimes(2);
      // 처음 보기는 한 번 정하면 그대로다 — 다시 불러왔다고 보기가 바뀌지 않는다.
      expect(chip('전체')).toHaveAttribute('aria-pressed', 'true');
    });

    /*
     * [2026-10-05 반박 리뷰 — WCAG 2.4.3] 받은 데이터 없이 실패한 뒤 다시 불러오면 조회 상태가 'pending' 으로 돌아간다. 종전에는
     * 그 순간 출처가 '불러오는 중' 이 되어 실패 안내와 단추가 함께 사라지고 포커스가 문서 맨 앞으로 갔다(disabled·aria-busy 는 한
     * 번도 보이지 않았다). 다시 불러오는 동안 안내와 단추는 남고(aria-disabled·aria-busy, 포커스 유지), 중복 요청을 막으며, 불러오면
     * 포커스가 눌린 보기 단추로 간다. 실패를 유지하는 배선(useMenuStructureSource)이나 포커스 이동을 되돌리면 이 테스트가 실패한다.
     */
    it('다시 불러오는 동안 안내와 단추가 남아 포커스를 지키고, 불러오면 포커스가 눌린 보기 단추로 간다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockRejectedValueOnce({ response: { status: 500 } });
      renderClient(<ProgramAdminClient />);
      const retry = await screen.findByRole('button', { name: '연결 메뉴 다시 불러오기' });
      expect(chip('전체')).toHaveAttribute('aria-pressed', 'true');

      let resolveMenus!: (value: unknown) => void;
      mocks.getMenuStructure.mockReturnValueOnce(new Promise((resolve) => { resolveMenus = resolve; }));
      retry.focus();
      await act(async () => { fireEvent.click(retry); });

      const pending = screen.getByRole('button', { name: '연결 메뉴 다시 불러오기' });
      expect(pending).toBe(retry);
      expect(pending).toHaveFocus();
      expect(pending).toHaveAttribute('aria-busy', 'true');
      expect(pending).toHaveAttribute('aria-disabled', 'true');
      expect(pending).not.toBeDisabled();
      expect(screen.getByText('화면 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.')).toBeInTheDocument();
      // 다시 불러오는 중이라는 이유로 연결 칸이 '불러오는 중' 으로 바뀌지도 않는다(실패를 그대로 둔다).
      expect(cell('/admin/system/programs', '연결 메뉴')).toHaveTextContent('메뉴를 불러오지 못함');
      // 다시 눌러도 요청을 더 보내지 않는다.
      fireEvent.click(pending);
      expect(mocks.getMenuStructure).toHaveBeenCalledTimes(2);

      await act(async () => resolveMenus(structure([structureMenu(30, '화면 관리', { modernRoute: '/admin/system/programs' })])));
      await waitFor(() => expect(screen.queryByRole('button', { name: '연결 메뉴 다시 불러오기' })).not.toBeInTheDocument());
      await waitFor(() => expect(chip('전체')).toHaveFocus());
      expect(cell('/admin/system/programs', '연결 메뉴')).toHaveTextContent('화면 관리');
    });

    it('다시 불러오기가 또 실패하면 안내와 단추가 그대로 남고 포커스도 단추에 남는다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockRejectedValueOnce({ response: { status: 500 } }).mockRejectedValueOnce({ response: { status: 500 } });
      renderClient(<ProgramAdminClient />);
      const retry = await screen.findByRole('button', { name: '연결 메뉴 다시 불러오기' });
      retry.focus();
      await act(async () => { fireEvent.click(retry); });
      await waitFor(() => expect(mocks.getMenuStructure).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(retry).not.toHaveAttribute('aria-busy'));
      expect(screen.getByRole('button', { name: '연결 메뉴 다시 불러오기' })).toBe(retry);
      expect(retry).toHaveFocus();
      expect(retry).not.toHaveAttribute('aria-disabled');
    });

    /*
     * [2026-10-05 반박 리뷰] 초기화는 처음 보기도 지금의 메뉴 구조로 다시 정한다. 첫 조회가 실패해 '전체' 로 시작한 뒤 다시
     * 불러왔다면 초기화가 '메뉴에 없는 화면' 으로 돌아간다(기억해 둔 처음 보기를 그대로 쓰면 '전체' 로 돌아갔다).
     */
    it('첫 조회가 실패해 전체로 시작해도, 다시 불러온 뒤 초기화하면 메뉴에 없는 화면으로 돌아간다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValueOnce(structureCoveringAllBut('/admin/system/menus'));
      renderClient(<ProgramAdminClient />);
      fireEvent.click(await screen.findByRole('button', { name: '연결 메뉴 다시 불러오기' }));
      await waitFor(() => expect(chip('메뉴에 없는 화면')).toHaveAccessibleName('메뉴에 없는 화면 1'));
      // 다시 불러왔다고 보기를 바꾸지 않는다.
      expect(chip('전체')).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: '초기화' }));
      expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건');
    });

    /*
     * [2026-10-05 반박 리뷰] 처음 보기를 정한 뒤 권한 버전이 바뀌어 메뉴 구조를 다시 불러오는 동안, 메뉴 구조가 필요한 보기를
     * 보고 있으면 표는 빈 표('…아직 거를 수 없습니다')가 아니라 불러오는 중이다(tableLoading 의 두 번째 조건).
     */
    it('처음 보기를 정한 뒤 권한 버전이 바뀌어 다시 불러오는 동안 메뉴에 없는 화면 표는 빈 표가 아니라 불러오는 중이다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValueOnce(structureCoveringAllBut('/admin/system/menus'));
      const client = createAppQueryClient();
      const view = render(<QueryClientProvider client={client}><ProgramAdminClient /></QueryClientProvider>);
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건'));
      expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true');

      let resolveMenus!: (value: unknown) => void;
      mocks.getMenuStructure.mockReturnValueOnce(new Promise((resolve) => { resolveMenus = resolve; }));
      auth.version = 'v2';
      view.rerender(<QueryClientProvider client={client}><ProgramAdminClient /></QueryClientProvider>);

      await waitFor(() => expect(mocks.getMenuStructure).toHaveBeenCalledTimes(2));
      expect(table()).toHaveAttribute('data-loading', 'true');
      expect(screen.getByText('화면 목록을(를) 불러오는 중…')).toBeInTheDocument();
      expect(screen.queryByText(/거를 수 없습니다/)).not.toBeInTheDocument();
      expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true');

      await act(async () => resolveMenus(structureCoveringAllBut('/admin/system/menus', '/admin/help')));
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 2건'));
      expect(table()).not.toHaveAttribute('data-loading');
    });

    /*
     * 처음 보기('메뉴에 없는 화면')를 기억한다. 기억하지 않으면 백그라운드 재조회가 실패하는 순간 보기가 말없이 '전체' 로
     * 바뀐다. 메뉴 구조를 모르게 되면 전체를 메뉴 없음으로도, 0건으로도 말하지 않고 그 이유를 빈 상태로 말한다.
     */
    it('메뉴에 없는 화면을 보는 채 메뉴 구조를 모르게 되면 보기를 그대로 두고 그 이유를 빈 상태로 말한다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValueOnce(structure([])).mockRejectedValueOnce({ response: { status: 500 } });
      const client = createAppQueryClient();
      render(<QueryClientProvider client={client}><ProgramAdminClient /></QueryClientProvider>);
      // 메뉴가 하나도 없으면 동적 경로가 아닌 모든 화면이 메뉴에 없다.
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${STATIC_SCREENS.length.toLocaleString()}건`));
      expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true');

      // 백그라운드 재조회가 실패하면 어떤 화면이 메뉴에 없는지 모른다.
      await act(async () => { await client.refetchQueries(); });
      expect(await screen.findByText('메뉴 구조를 불러오지 못해 메뉴에 없는 화면을 거를 수 없습니다. 연결 메뉴를 다시 불러와 주세요.')).toBeInTheDocument();
      // 모르는 것을 0건이라고 말하지 않는다.
      expect(screen.getByTestId('work-list-toolbar')).not.toHaveTextContent('총');
      // 고른(처음) 보기는 그대로 둔다 — 단추가 막혀 보기가 사라지지 않게 눌린 단추는 막지 않는다.
      expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('메뉴에 없는 화면')).not.toHaveAttribute('aria-disabled');
      expect(chip('메뉴에 연결된 화면')).toHaveAttribute('aria-disabled', 'true');
    });

    it('거른 결과가 지금 쪽보다 짧아지면 마지막 쪽을 보인다(빈 쪽에 갇히지 않는다)', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      const covered = SCREEN_REGISTRY.slice(2).map((entry, index) => structureMenu(index + 1, `메뉴 ${index + 1}`, { modernRoute: entry.route }));
      mocks.getMenuStructure.mockResolvedValueOnce(structure([])).mockResolvedValueOnce(structure(covered));
      const client = createAppQueryClient();
      render(<QueryClientProvider client={client}><ProgramAdminClient /></QueryClientProvider>);
      await waitFor(() => expect(chip('메뉴에 없는 화면')).toHaveAccessibleName(`메뉴에 없는 화면 ${STATIC_SCREENS.length}`));
      fireEvent.click(screen.getByRole('button', { name: '화면 목록 20개씩' }));
      fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
      fireEvent.click(screen.getByRole('button', { name: '화면 목록 다음 쪽' }));
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent(/^3\//);

      // 메뉴 구조가 바뀌어 메뉴에 없는 화면이 두 개만 남는다.
      await act(async () => { await client.refetchQueries(); });
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 2건'));
      expect(screen.getByTestId('화면 목록-page')).toHaveTextContent('1/1');
      expect(screen.getByTestId('화면 목록-count')).toHaveTextContent('2 items');
    });

    it('초기화하면 검색어를 비우고 처음 보기로 돌아간다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValue(structureCoveringAllBut('/admin/system/menus'));
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true'));
      fireEvent.click(chip('전체'));
      searchScreens('admin');
      expect(chip('전체')).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: '초기화' }));
      expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건');
    });

    /*
     * [2026-10-05] 메뉴 관리에서 '메뉴에 추가' 로 저장하고 돌아오면 방금 넣은 화면이 '메뉴 없음' 으로 남지 않아야 한다 —
     * 화면을 열 때마다 메뉴 구조를 다시 읽는다(전역 staleTime 60초 안이어도). 같은 QueryClient 로 다시 마운트해 본다.
     */
    /*
     * [2026-10-05 반박 리뷰] 다시 연 직후, 새 조회 응답이 오기 전에는 지난 방문의 결과를 쓰지 않는다 — 쓰면 방금 메뉴에 넣은
     * 화면이 그동안 '메뉴에 추가' 를 단 채 보인다. 화면 연결(awaitingFreshResult)을 되돌리면 이 테스트가 실패한다.
     */
    it('다시 연 직후 새 조회 응답 전에는 지난 결과로 메뉴에 추가를 두지 않고 표는 불러오는 중이다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, ...MENU_MANAGER];
      mocks.getMenuStructure.mockResolvedValueOnce(structureCoveringAllBut('/admin/system/programs'));
      const client = createAppQueryClient();
      const first = render(<QueryClientProvider client={client}><ProgramAdminClient /></QueryClientProvider>);
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건'));
      expect(within(cell('/admin/system/programs', '관리')).getByRole('button', { name: /^메뉴에 추가/ })).toBeInTheDocument();
      first.unmount();

      let resolveMenus!: (value: unknown) => void;
      mocks.getMenuStructure.mockReturnValueOnce(new Promise((resolve) => { resolveMenus = resolve; }));
      render(<QueryClientProvider client={client}><ProgramAdminClient /></QueryClientProvider>);
      expect(screen.queryAllByRole('button', { name: /^메뉴에 추가/ })).toHaveLength(0);
      expect(table()).toHaveAttribute('data-loading', 'true');
      expect(screen.getByTestId('work-list-toolbar')).not.toHaveTextContent('총');

      await act(async () => resolveMenus(structureCoveringAllBut('/admin/system/programs', '/admin/help')));
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 2건'));
      expect(table()).not.toHaveAttribute('data-loading');
    });

    it('화면을 다시 열면 캐시가 신선해도 메뉴 구조를 다시 읽어 방금 메뉴에 넣은 화면을 메뉴 없음으로 두지 않는다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, 'MENU_READ'];
      mocks.getMenuStructure.mockResolvedValueOnce(structureCoveringAllBut('/admin/system/menus', '/admin/help'));
      const client = createAppQueryClient();
      const first = render(<QueryClientProvider client={client}><ProgramAdminClient /></QueryClientProvider>);
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 2건'));
      first.unmount();

      // 메뉴 관리에서 /admin/help 를 메뉴에 넣고 저장한 뒤 돌아온다.
      mocks.getMenuStructure.mockResolvedValueOnce(structureCoveringAllBut('/admin/system/menus'));
      render(<QueryClientProvider client={client}><ProgramAdminClient /></QueryClientProvider>);
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건'));
      expect(mocks.getMenuStructure).toHaveBeenCalledTimes(2);
      expect(() => row('/admin/help')).toThrow();
    });

    /*
     * [2026-10-05 시안 복원] 다른 화면으로 넘어가는 경로(별칭)는 표 아래에 늘 펼쳐 두지 않고 '넘어가는 경로' 단추를 고를 때
     * 표 자리에 보인다. 링크하지 않고 목적지와 넘기는 곳만 보인다.
     */
    it('넘어가는 경로는 그 단추를 고를 때만 표 자리에 보이고, 링크하지 않고 목적지와 넘기는 곳만 보인다', () => {
      renderClient(<ProgramAdminClient />);
      // 검색어 칸은 지금 보기에서 실제로 거르는 칸을 말한다(2026-10-05 반박 리뷰 — 넘어가는 경로에는 이름이 없다).
      expect(searchBox()).toHaveAccessibleName('화면 이름 · 경로');
      expect(searchBox()).toHaveAttribute('placeholder', '화면 이름 또는 경로로 검색');
      expect(screen.queryByRole('region', { name: /다른 화면으로 넘어가는 경로/ })).not.toBeInTheDocument();
      expect(screen.getAllByTestId('data-table').map((element) => element.getAttribute('data-table-label'))).toEqual(['화면 목록']);
      expect(chip('넘어가는 경로')).toHaveAccessibleName(`넘어가는 경로 ${SCREEN_ALIASES.length}`);

      fireEvent.click(chip('넘어가는 경로'));
      expect(searchBox()).toHaveAccessibleName('경로 · 넘어가는 곳');
      expect(searchBox()).toHaveAttribute('placeholder', '경로 또는 넘어가는 곳으로 검색');
      expect(screen.getAllByTestId('data-table').map((element) => element.getAttribute('data-table-label'))).toEqual(['다른 화면으로 넘어가는 경로']);
      expect(table()).toHaveAttribute('data-row-density', 'work');
      expect(table()).toHaveAttribute('data-fill-height', 'true');
      expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent(`총 ${SCREEN_ALIASES.length}건`);
      expect(screen.getByTestId('다른 화면으로 넘어가는 경로-count')).toHaveTextContent(`${SCREEN_ALIASES.length} items`);
      expect(within(table()).queryAllByRole('link')).toHaveLength(0);
      expect(cell('/admin/system/ism', '넘어가는 곳')).toHaveTextContent('/approvals');
      expect(cell('/admin/system/ism', '넘기는 곳')).toHaveTextContent('화면 파일이 넘김');
      // 넘겨받는 동적 값은 생성 목록의 자리표시자(${id})가 아니라 화면 경로와 같은 표기로 보인다.
      expect(cell('/admin/community/[id]', '넘어가는 곳')).toHaveTextContent('/cop/cmy/selectCommunityDetail/[id]');
      expect(within(table()).queryByText(/\$\{/)).not.toBeInTheDocument();

      searchScreens('approvals');
      expect(Number(screen.getByTestId('다른 화면으로 넘어가는 경로-count').textContent?.split(' ')[0]))
        .toBeLessThan(SCREEN_ALIASES.length);
      expect(chip('넘어가는 경로')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  /*
   * [2026-10-02 D3] 행 동작 '메뉴에 추가' — 메뉴를 만들고(MENU_CREATE) 구조를 저장할 수 있고(MENU_UPDATE) 메뉴 관리에
   * 들어갈 수 있는(라우트 게이트와 같은 판정) 사람에게만 보인다. 화면 인계(이 탭의 sessionStorage, URL 비노출) 뒤 이동한다.
   * [2026-10-05] 메뉴에 없는 화면 행에만, 작은(24px) 단추로 둔다.
   */
  describe('메뉴에 추가', () => {
    const HANDOFF_KEY = 'egov.screen-handoff.v1:menu-add-screen';

    it('메뉴를 만들 수 있으면 메뉴에 없는 화면 행에만 작은 단추로 보이고, 누르면 화면을 넘긴 뒤 메뉴 관리로 간다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, ...MENU_MANAGER];
      mocks.getMenuStructure.mockResolvedValue(structureCoveringAllBut('/admin/system/programs'));
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건'));
      fireEvent.click(chip('전체'));
      // 사용 중인 메뉴가 여는 화면에는 두지 않는다(같은 화면의 메뉴를 하나 더 만들라는 권유가 된다).
      expect(within(cell('/admin/system/menus', '관리')).queryByRole('button')).not.toBeInTheDocument();
      // 동적 경로 화면에는 두지 않는다.
      expect(within(cell('/smart-toolkit/dept-job/[id]', '관리')).queryByRole('button')).not.toBeInTheDocument();

      const add = within(cell('/admin/system/programs', '관리')).getByRole('button', { name: '메뉴에 추가: 화면 관리 (/admin/system/programs)' });
      expect(add).toHaveAttribute('data-size', 'xs');
      expect(add).toHaveClass('h-6');
      fireEvent.click(add);

      const stored = JSON.parse(window.sessionStorage.getItem(HANDOFF_KEY) ?? 'null');
      expect(stored).toMatchObject({ route: '/admin/system/programs', label: '화면 관리' });
      expect(typeof stored.at).toBe('number');
      expect(mocks.push).toHaveBeenCalledTimes(1);
      expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus');
      // 화면·탭 상태는 주소에 싣지 않는다.
      expect(window.location.search).toBe('');
    });

    it('메뉴 구조를 모르면 어떤 화면에도 메뉴에 추가를 두지 않는다(메뉴에 없다고 말할 수 없다)', async () => {
      auth.permissions = [...BASE_PERMISSIONS, ...MENU_MANAGER];
      mocks.getMenuStructure.mockRejectedValue({ response: { status: 500 } });
      renderClient(<ProgramAdminClient />);
      // [2026-10-05 반박 리뷰 — 통합 단계에서 테스트를 구현에 맞췄다] 메뉴를 만들 수 있는 사람에게는 '메뉴에 추가' 가 왜 사라졌는지도 말한다.
      await waitFor(() => expect(screen.getByText('화면 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다. 메뉴에 추가는 연결 메뉴를 불러온 뒤에 쓸 수 있습니다.')).toBeInTheDocument());
      expect(screen.getByTestId('화면 목록-count')).toHaveTextContent(`${SCREEN_REGISTRY.length} items`);
      expect(screen.queryByRole('button', { name: /^메뉴에 추가/ })).not.toBeInTheDocument();
    });

    // [2026-10-03] 이름을 지어내지 않고 등록된 이름(없으면 null)을 그대로 넘긴다. 이름이 null 인 인계는 target-handoff.test 가,
    //   이름 없는 화면의 표시는 screenList.test 가 합성 값으로 고정한다(실제 생성물의 이름 미확인 화면은 0개가 됐다).
    it('메뉴에 추가는 화면의 등록된 이름을 지어내지 않고 그대로 넘긴다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, ...MENU_MANAGER];
      renderClient(<ProgramAdminClient />);
      const entry = SCREEN_REGISTRY.find((candidate) => candidate.route === '/admin/system/programs');
      expect(entry?.label).toBe('화면 관리');
      await waitFor(() => expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true'));
      searchScreens(entry!.route);
      fireEvent.click(within(cell(entry!.route, '관리')).getByRole('button', { name: `메뉴에 추가: 화면 관리 (${entry!.route})` }));
      expect(JSON.parse(window.sessionStorage.getItem(HANDOFF_KEY) ?? 'null')).toMatchObject({ route: entry!.route, label: entry!.label });
    });

    it('화면을 넘기지 못하면 이동하지 않고 그 사실을 알린다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, ...MENU_MANAGER];
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(chip('메뉴에 없는 화면')).toHaveAttribute('aria-pressed', 'true'));
      searchScreens('/admin/system/programs');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
      fireEvent.click(within(cell('/admin/system/programs', '관리')).getByRole('button', { name: /메뉴에 추가/ }));

      expect(mocks.push).not.toHaveBeenCalled();
      expect(mocks.toast).toHaveBeenCalledWith('화면을 메뉴 관리로 넘기지 못했습니다. 메뉴 관리에서 화면을 직접 추가해 주세요.', 'error');
    });

    /*
     * [2026-10-05 반박 리뷰] '관리' 열은 단추가 놓일 수 있는 보기(전체·메뉴에 없는 화면·로그인만 하면 열리는 화면)에만 둔다 —
     * 메뉴에 연결된 화면 보기는 모든 행이 사용 중인 메뉴를 갖고, 동적 경로 보기는 메뉴에 둘 수 없는 화면만 보인다.
     */
    it('메뉴를 만들 수 있어도 메뉴에 연결된 화면·동적 경로 보기에는 빈 관리 열을 두지 않는다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, ...MENU_MANAGER];
      mocks.getMenuStructure.mockResolvedValue(structureCoveringAllBut('/admin/system/programs'));
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건'));
      const manageCells = () => document.querySelectorAll('[data-column="관리"]').length;
      expect(manageCells()).toBeGreaterThan(0);

      fireEvent.click(chip('메뉴에 연결된 화면'));
      expect(screen.getByTestId('화면 목록-count')).not.toHaveTextContent(/^0 /);
      expect(manageCells()).toBe(0);
      fireEvent.click(chip('동적 경로'));
      expect(screen.getByTestId('화면 목록-count')).not.toHaveTextContent(/^0 /);
      expect(manageCells()).toBe(0);
      fireEvent.click(chip('로그인만 하면 열리는 화면'));
      expect(manageCells()).toBeGreaterThan(0);
      fireEvent.click(chip('전체'));
      expect(manageCells()).toBeGreaterThan(0);
    });

    it('연결 메뉴를 불러오지 못했을 때 메뉴에 추가가 원래 없는 보기에서는 그 단추가 사라졌다고 말하지 않는다', async () => {
      auth.permissions = [...BASE_PERMISSIONS, ...MENU_MANAGER];
      mocks.getMenuStructure.mockRejectedValue({ response: { status: 500 } });
      renderClient(<ProgramAdminClient />);
      const ADD_SENTENCE = '메뉴에 추가는 연결 메뉴를 불러온 뒤에 쓸 수 있습니다.';
      const notice = () => screen.getByText(/연결 메뉴를 불러오지 못했습니다/);
      await waitFor(() => expect(notice()).toHaveTextContent(ADD_SENTENCE));
      fireEvent.click(chip('동적 경로'));
      expect(notice()).not.toHaveTextContent(ADD_SENTENCE);
      fireEvent.click(chip('로그인만 하면 열리는 화면'));
      expect(notice()).toHaveTextContent(ADD_SENTENCE);
    });

    it.each([
      ['메뉴 등록 권한이 없으면', ['MENU_READ', 'MENU_UPDATE']],
      ['구조 저장 권한이 없으면', ['MENU_READ', 'MENU_CREATE']],
      ['메뉴 관리에 들어갈 수 없으면(MENU_READ 없음)', ['MENU_CREATE', 'MENU_UPDATE']],
    ])('%s 메뉴에 추가를 보이지 않는다', async (_label, menuPermissions) => {
      auth.permissions = [...BASE_PERMISSIONS, ...menuPermissions];
      renderClient(<ProgramAdminClient />);
      await waitFor(() => expect(table()).not.toHaveAttribute('data-loading'));
      searchScreens('/admin/system/programs');
      expect(screen.queryByRole('button', { name: /메뉴에 추가/ })).not.toBeInTheDocument();
      expect(row('/admin/system/programs').querySelector('[data-column="관리"]')).toBeNull();
    });
  });
});

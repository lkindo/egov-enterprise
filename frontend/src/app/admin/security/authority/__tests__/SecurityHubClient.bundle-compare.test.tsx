import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnsavedChangesProvider } from '@/contexts/UnsavedChangesContext';
import type { PermissionCode } from '@/types/generated-permissions';
import type { PermissionBundle } from '@/types/generated-screen-registry';
import SecurityHubClient from '../SecurityHubClient';

/**
 * 권한 작업대 3단계(2026-10-02, 관리 콘솔 UX G2·G3)의 허브 통합 계약.
 *  · G2 '권한 묶음 적용': 권한 설정 권한·편집 가능할 때만 두고, 공개 메뉴 그룹에서는 숨기지 않고 잠근 채 이유를 단다. 묶음은
 *    초안에만 더한다 — 저장 전 요약·탭 변경 수가 늘어난 수를 그대로 보이고, 저장은 기존 '권한 변경 저장' 하나다.
 *  · G3 '그룹 비교': 조회 권한으로 여는 허브 안 영역이다(URL·저장소 금지). 읽기 전용이고, 줄의 편집 버튼은 권한 설정 권한이
 *    있을 때만 그 그룹의 편집기 탭(과 줄)로 옮긴다.
 */
const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  toast: vi.fn(), confirm: vi.fn(), getCatalog: vi.fn(), getGroups: vi.fn(), getGroup: vi.fn(),
  createGroup: vi.fn(), updateGroup: vi.fn(), deleteGroup: vi.fn(), saveGroupGrants: vi.fn(),
  getMemberships: vi.fn(), saveUserGroups: vi.fn(), getUsers: vi.fn(), getHistory: vi.fn(), getGroupMembers: vi.fn(),
  getGrantMatrix: vi.fn(), updateGroupMembers: vi.fn(), createGroupCopy: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator', role: 'ROLE_ADMIN', permissions: mocks.permissions, authorizationVersion: 'auth-v1' } }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({ authorizationAdminService: mocks }));
// [2026-10-05] 영역 단추는 셸의 navigation 슬롯에 있다 — 모의 셸도 그 슬롯을 그린다.
vi.mock('@/app/components/patterns/work-list-page', () => ({ WorkListPage: ({ title, actions, navigation, children }: { title: string; actions: ReactNode; navigation?: ReactNode; children: ReactNode }) => <main><h1>{title}</h1>{actions}{navigation}{children}</main> }));
// 묶음과 화면 목록은 고정한다 — 원장·화면 소스가 바뀌어도 이 계약이 흔들리지 않게.
vi.mock('@/types/generated-screen-registry', async (importOriginal) => {
  const fixture = await import('./screen-registry-fixture');
  const bundle: PermissionBundle = {
    id: 'menu-screen', name: '메뉴·화면 설정', description: '메뉴와 화면 관리를 맡깁니다.', protected: false,
    permissions: ['MENU_READ', 'MENU_UPDATE', 'ADMCODE_READ'] as PermissionCode[], screens: ['/admin/system/menus', '/admin/system/codes/administ'],
    relatedScreens: [],
  };
  const recovery: PermissionBundle = {
    id: 'account-recovery', name: '계정 복구', description: '비밀번호 초기화를 맡깁니다.', protected: true,
    permissions: ['USER_PASSWORD', 'USER_READ'] as PermissionCode[], screens: ['/admin/user/manage'], relatedScreens: [],
  };
  return { ...fixture.withFixtureScreenRegistry(await importOriginal()), PERMISSION_BUNDLES: [bundle, recovery] };
});
// 전역 설정(vitest.setup.ts)은 탭을 children 통과 mock 으로 바꾼다. 편집기·비교는 비활성 탭을 숨기는 것이 계약이므로 실제 탭을 쓴다.
vi.unmock('@/components/ui/tabs');

type Grant = { type: 'OPERATION' | 'NAVIGATION'; code: string };
type Snapshot = { code: string; name: string; description: string | null; version: string; complete: true; grants: Grant[] };

const groups = [
  { code: 'CONTENT', name: '콘텐츠 담당', description: '', version: 'c1' },
  { code: 'SURVEY', name: '설문 담당', description: '', version: 's1' },
  { code: 'ROLE_ANONYMOUS', name: '비로그인 사용자', description: '', version: 'a1' },
];
const catalog = {
  operations: [
    { code: 'BOARD_READ', name: '게시글 조회', domain: 'BOARD', action: 'READ' },
    { code: 'MENU_READ', name: '메뉴 조회', domain: 'MENU', action: 'READ' },
    { code: 'MENU_UPDATE', name: '메뉴 수정', domain: 'MENU', action: 'UPDATE' },
    { code: 'ADMCODE_READ', name: '행정 코드 조회', domain: 'ADMCODE', action: 'READ' },
  ],
  navigation: [
    { code: 'AREA', name: '관리', parentCode: null, route: null, useYn: 'Y' },
    { code: 'SECTION', name: '시스템', parentCode: 'AREA', route: null, useYn: 'Y' },
    { code: 'MENUS', name: '메뉴 관리', parentCode: 'SECTION', route: '/admin/system/menus', useYn: 'Y' },
    { code: 'ADMCODES', name: '행정 표준코드 관리', parentCode: 'SECTION', route: '/admin/system/codes/administ', useYn: 'Y' },
  ],
  catalogVersion: 'catalog-v1',
};
const USER_OPERATIONS = [
  { code: 'USER_READ', name: '사용자 조회', domain: 'USER', action: 'READ' },
  { code: 'USER_PASSWORD', name: '비밀번호 초기화', domain: 'USER', action: 'PASSWORD' },
];
let server = new Map<string, Snapshot>();
const page = (list: unknown[]) => ({ list, total: list.length, page: 1, size: 20, totalPage: 1 });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><UnsavedChangesProvider><SecurityHubClient /></UnsavedChangesProvider></QueryClientProvider>);
}
async function openGroup(name: RegExp, region: string) {
  setup();
  await userEvent.click(await screen.findByRole('button', { name }));
  return screen.findByRole('region', { name: region });
}
async function openComparison() {
  setup();
  await userEvent.click(await screen.findByRole('button', { name: '그룹 비교' }));
  const section = await screen.findByRole('region', { name: '그룹 비교' });
  await userEvent.selectOptions(within(section).getByRole('combobox', { name: 'A 그룹' }), 'CONTENT');
  await userEvent.selectOptions(within(section).getByRole('combobox', { name: 'B 그룹' }), 'SURVEY');
  return section;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  server = new Map<string, Snapshot>([
    ['CONTENT', { ...groups[0], complete: true, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'MENU_READ' }, { type: 'NAVIGATION', code: 'AREA' }] }],
    ['SURVEY', { ...groups[1], complete: true, grants: [{ type: 'OPERATION', code: 'MENU_READ' }, { type: 'OPERATION', code: 'MENU_UPDATE' }] }],
    ['ROLE_ANONYMOUS', { ...groups[2], complete: true, grants: [{ type: 'NAVIGATION', code: 'AREA' }] }],
  ]);
  mocks.permissions = ['AUTHRT_READ', 'AUTHRT_GRANT', 'AUTHRT_ASSIGN', 'AUTHRT_UPDATE'];
  mocks.getCatalog.mockResolvedValue(catalog);
  mocks.getGroups.mockResolvedValue(groups);
  mocks.getGroup.mockImplementation((code: string) => Promise.resolve(server.get(code)));
  mocks.getGroupMembers.mockResolvedValue(page([]));
  mocks.getGrantMatrix.mockImplementation(() => Promise.resolve({ catalogVersion: 'catalog-v1', groups: [...server.values()] }));
  mocks.saveGroupGrants.mockImplementation((code: string, body: { grants: Grant[] }) => {
    const saved = { ...server.get(code)!, grants: body.grants, version: `${code}-saved` };
    server.set(code, saved);
    return Promise.resolve(saved);
  });
  mocks.confirm.mockResolvedValue(true);
});

describe('권한 묶음 적용(G2)', () => {
  it('묶음을 초안에 더하면 요약·탭 변경 수가 늘고, 저장은 기존 권한 변경 저장이 상위 메뉴까지 명시적으로 보낸다', async () => {
    const editor = await openGroup(/콘텐츠 담당.*CONTENT/, '콘텐츠 담당 권한 설정');
    await userEvent.click(within(editor).getByRole('button', { name: '권한 묶음 적용' }));
    const dialog = screen.getByRole('dialog', { name: '권한 묶음 적용' });
    await userEvent.click(within(dialog).getByRole('radio', { name: '메뉴·화면 설정' }));
    // MENU_READ·AREA 는 이미 있다 — 세지 않는다.
    expect(within(dialog).getByRole('region', { name: '묶음 미리보기' })).toHaveTextContent('기능권한 추가 2개(이미 있음 1개) · 메뉴 표시 추가 3개');
    await userEvent.click(within(dialog).getByRole('button', { name: '선택한 묶음을 초안에 추가' }));
    expect(screen.queryByRole('dialog', { name: '권한 묶음 적용' })).toBeNull();
    // 초안에 더했을 뿐 저장하지 않았다.
    expect(mocks.saveGroupGrants).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining("'권한 변경 저장'을 눌러야 반영됩니다"), 'info');
    // [2026-10-05] 저장 막대의 요약은 한 줄이다 — 적용 범위 설명은 '변경 내용 보기' 창에 있다.
    expect(within(editor).getByText(/^저장 전 변경:/)).toHaveTextContent('저장 전 변경: 추가 5 · 회수 0');
    expect(within(editor).getByRole('tab', { name: '화면별 권한 5건 변경' })).toBeInTheDocument();
    expect(within(editor).getByRole('tab', { name: '기능별 권한 2건 변경' })).toBeInTheDocument();

    // 같은 묶음을 다시 고르면 더할 것이 없다(멱등).
    await userEvent.click(within(editor).getByRole('button', { name: '권한 묶음 적용' }));
    const again = screen.getByRole('dialog', { name: '권한 묶음 적용' });
    await userEvent.click(within(again).getByRole('radio', { name: '메뉴·화면 설정' }));
    expect(within(again).getByRole('button', { name: '선택한 묶음을 초안에 추가' })).toBeDisabled();
    await userEvent.click(within(again).getByRole('button', { name: '묶음 적용 취소' }));

    await userEvent.click(within(editor).getByRole('button', { name: '권한 변경 저장' }));
    await waitFor(() => expect(mocks.saveGroupGrants).toHaveBeenCalledTimes(1));
    expect(mocks.saveGroupGrants).toHaveBeenCalledWith('CONTENT', {
      grants: [
        { type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'MENU_READ' }, { type: 'OPERATION', code: 'MENU_UPDATE' }, { type: 'OPERATION', code: 'ADMCODE_READ' },
        { type: 'NAVIGATION', code: 'AREA' }, { type: 'NAVIGATION', code: 'SECTION' }, { type: 'NAVIGATION', code: 'MENUS' }, { type: 'NAVIGATION', code: 'ADMCODES' },
      ],
      version: 'c1', complete: true,
    });
  });

  it('비로그인 사용자 그룹에서는 버튼을 숨기지 않고 잠근 채 이유를 단다', async () => {
    const editor = await openGroup(/비로그인 사용자.*ROLE_ANONYMOUS/, '비로그인 사용자 권한 설정');
    const button = within(editor).getByRole('button', { name: '권한 묶음 적용' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('비로그인 사용자 그룹에는 묶음을 적용할 수 없습니다.');
  });

  it('보호 권한 경고는 저장본과 비교한다 — 초안에서 뺀 보호 권한을 묶음이 되돌리면 경고하지 않는다', async () => {
    // 권한 배정 권한(AUTHRT_ASSIGN)이 없는 운영자다.
    mocks.permissions = ['AUTHRT_READ', 'AUTHRT_GRANT', 'AUTHRT_UPDATE'];
    mocks.getCatalog.mockResolvedValue({ ...catalog, operations: [...catalog.operations, ...USER_OPERATIONS] });
    server.set('SURVEY', { ...server.get('SURVEY')!, grants: [...server.get('SURVEY')!.grants, { type: 'OPERATION', code: 'USER_READ' }, { type: 'OPERATION', code: 'USER_PASSWORD' }] });
    const editor = await openGroup(/설문 담당.*SURVEY/, '설문 담당 권한 설정');
    await userEvent.click(within(editor).getByRole('tab', { name: /^기능별 권한/ }));
    await userEvent.click(within(editor).getByRole('checkbox', { name: /\(USER_PASSWORD\)$/ }));
    await userEvent.click(within(editor).getByRole('button', { name: '권한 묶음 적용' }));
    const dialog = screen.getByRole('dialog', { name: '권한 묶음 적용' });
    await userEvent.click(within(dialog).getByRole('radio', { name: /계정 복구/ }));
    const preview = within(dialog).getByRole('region', { name: '묶음 미리보기' });
    // 초안에는 없으니 더하기는 하지만, 저장본과 같아지므로 보호 권한 변경이 아니다.
    expect(preview).toHaveTextContent('기능권한 추가 1개(이미 있음 1개)');
    expect(within(preview).queryByRole('alert')).toBeNull();
  });

  it('저장본에 없는 보호 권한을 묶음이 더하면 권한 배정 권한이 없는 운영자에게 저장할 수 없다고 미리 말한다', async () => {
    mocks.permissions = ['AUTHRT_READ', 'AUTHRT_GRANT', 'AUTHRT_UPDATE'];
    mocks.getCatalog.mockResolvedValue({ ...catalog, operations: [...catalog.operations, ...USER_OPERATIONS] });
    const editor = await openGroup(/콘텐츠 담당.*CONTENT/, '콘텐츠 담당 권한 설정');
    await userEvent.click(within(editor).getByRole('button', { name: '권한 묶음 적용' }));
    const dialog = screen.getByRole('dialog', { name: '권한 묶음 적용' });
    await userEvent.click(within(dialog).getByRole('radio', { name: /계정 복구/ }));
    expect(within(within(dialog).getByRole('region', { name: '묶음 미리보기' })).getByRole('alert')).toHaveTextContent('보호 권한(USER_PASSWORD)');
  });

  it('권한 설정 권한이 없으면 버튼을 두지 않는다', async () => {
    mocks.permissions = ['AUTHRT_READ', 'AUTHRT_UPDATE'];
    const editor = await openGroup(/콘텐츠 담당.*CONTENT/, '콘텐츠 담당 권한 설정');
    expect(within(editor).queryByRole('button', { name: '권한 묶음 적용' })).toBeNull();
  });
});

describe('그룹 비교(G3)', () => {
  it('두 그룹의 저장된 권한을 글자로 나란히 보이고 차이 수를 센다 — 쓰기도 URL 변화도 없다', async () => {
    const section = await openComparison();
    // A에만: BOARD_READ·AREA, B에만: MENU_UPDATE.
    expect(within(section).getByText(/^A에만 2 · B에만 1/)).toBeInTheDocument();
    expect(within(section).getByRole('tab', { name: '화면별' })).toHaveAttribute('aria-selected', 'true');
    const menus = within(section).getByRole('row', { name: /^메뉴 관리/ });
    const cells = within(menus).getAllByRole('cell');
    // 메뉴 표시(둘 다 없음)·화면 진입(둘 다 있음)·…
    expect(cells[0]).toHaveTextContent('A 없음B 없음');
    expect(cells[1]).toHaveTextContent('A 있음B 있음');
    const area = within(section).getByRole('row', { name: /^관리/ });
    expect(within(area).getAllByRole('cell')[0]).toHaveTextContent('A 있음B 없음다름');

    await userEvent.click(within(section).getByRole('tab', { name: '기능별' }));
    const menuRow = within(section).getByRole('row', { name: /^메뉴/ });
    expect(within(menuRow).getAllByRole('cell').slice(0, 3).map((cell) => cell.textContent)).toEqual(['둘 다', '', 'B만']);
    expect(mocks.saveGroupGrants).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
  });

  it('차이만 보기는 다른 줄과 그 상위만 남기고, 같은 그룹을 고르면 안내만 한다', async () => {
    const section = await openComparison();
    expect(within(section).getByRole('row', { name: /^행정 표준코드 관리/ })).toBeInTheDocument();
    await userEvent.click(within(section).getByRole('checkbox', { name: '차이만 보기' }));
    expect(within(section).queryByRole('row', { name: /^행정 표준코드 관리/ })).toBeNull();
    expect(within(section).getByRole('row', { name: /^관리/ })).toBeInTheDocument();
    await userEvent.selectOptions(within(section).getByRole('combobox', { name: 'B 그룹' }), 'CONTENT');
    expect(within(section).getByText('서로 다른 두 그룹을 고르세요.')).toBeInTheDocument();
    expect(within(section).queryByRole('table')).toBeNull();
  });

  it('줄의 편집 버튼은 A 그룹 편집기의 그 탭(과 메뉴 줄)으로 옮긴다', async () => {
    const section = await openComparison();
    await userEvent.click(within(section).getByRole('button', { name: '콘텐츠 담당에서 편집 (메뉴 관리)' }));
    const editor = await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });
    expect(within(editor).getByRole('tab', { name: /^화면별 권한/ })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(document.activeElement).toHaveAttribute('data-row-key', 'menu:MENUS'));
    expect(screen.getByRole('button', { name: '그룹 · 기능권한' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: '그룹 비교' }));
    const again = await screen.findByRole('region', { name: '그룹 비교' });
    await userEvent.selectOptions(within(again).getByRole('combobox', { name: 'A 그룹' }), 'SURVEY');
    await userEvent.selectOptions(within(again).getByRole('combobox', { name: 'B 그룹' }), 'CONTENT');
    await userEvent.click(within(again).getByRole('tab', { name: '기능별' }));
    await userEvent.click(within(again).getByRole('button', { name: '설문 담당에서 편집 (메뉴)' }));
    const survey = await screen.findByRole('region', { name: '설문 담당 권한 설정' });
    const operationsTab = within(survey).getByRole('tab', { name: /^기능별 권한/ });
    expect(operationsTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(document.activeElement).toBe(operationsTab));
  });

  it('편집으로 갔다가 다른 영역에 다녀와도 처리한 이동 요청을 다시 실행하지 않는다', async () => {
    const section = await openComparison();
    await userEvent.click(within(section).getByRole('tab', { name: '기능별' }));
    await userEvent.click(within(section).getByRole('button', { name: '콘텐츠 담당에서 편집 (메뉴)' }));
    const editor = await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });
    const operationsTab = within(editor).getByRole('tab', { name: /^기능별 권한/ });
    expect(operationsTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(document.activeElement).toBe(operationsTab));

    await userEvent.click(screen.getByRole('button', { name: '그룹 비교' }));
    await screen.findByRole('region', { name: '그룹 비교' });
    const groupsArea = screen.getByRole('button', { name: '그룹 · 기능권한' });
    await userEvent.click(groupsArea);
    const again = await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });
    // 새로 만들어진 편집기는 기본 탭(화면별 권한)이고, 포커스는 사용자가 누른 영역 버튼에 그대로 있다.
    expect(within(again).getByRole('tab', { name: /^화면별 권한/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(again).getByRole('tab', { name: /^기능별 권한/ })).toHaveAttribute('aria-selected', 'false');
    expect(document.activeElement).toBe(groupsArea);
  });

  it('비교 조건(두 그룹·보기·차이만 보기)은 편집하러 갔다 돌아와도 남는다', async () => {
    const section = await openComparison();
    await userEvent.click(within(section).getByRole('tab', { name: '기능별' }));
    await userEvent.click(within(section).getByRole('checkbox', { name: '차이만 보기' }));
    await userEvent.click(within(section).getByRole('button', { name: '콘텐츠 담당에서 편집 (메뉴)' }));
    await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });

    await userEvent.click(screen.getByRole('button', { name: '그룹 비교' }));
    const again = await screen.findByRole('region', { name: '그룹 비교' });
    expect(within(again).getByRole('combobox', { name: 'A 그룹' })).toHaveValue('CONTENT');
    expect(within(again).getByRole('combobox', { name: 'B 그룹' })).toHaveValue('SURVEY');
    expect(within(again).getByRole('tab', { name: '기능별' })).toHaveAttribute('aria-selected', 'true');
    expect(within(again).getByRole('checkbox', { name: '차이만 보기' })).toBeChecked();
  });

  it('권한이 여럿인 칸은 A·B 글자가 같아도 보이는 다름과 한쪽에만 있는 권한 이름을 적는다', async () => {
    mocks.getCatalog.mockResolvedValue({
      ...catalog,
      operations: [...catalog.operations, { code: 'AUTHRT_READ', name: '권한 조회', domain: 'AUTHRT', action: 'READ' }, { code: 'AUTHRT_AUDIT', name: '권한 감사', domain: 'AUTHRT', action: 'AUDIT' }],
      navigation: [...catalog.navigation, { code: 'AUTHORITY', name: '권한 그룹 관리', parentCode: 'AREA', route: '/admin/security/authority', useYn: 'Y' }],
    });
    server.set('CONTENT', { ...server.get('CONTENT')!, grants: [{ type: 'OPERATION', code: 'AUTHRT_READ' }] });
    server.set('SURVEY', { ...server.get('SURVEY')!, grants: [{ type: 'OPERATION', code: 'AUTHRT_AUDIT' }] });
    const section = await openComparison();
    const authority = within(section).getByRole('row', { name: /^권한 그룹 관리/ });
    // 화면 진입 칸(ANY[AUTHRT_READ, AUTHRT_AUDIT]) — 둘 다 들어갈 수 있고 수도 같다.
    const entry = within(authority).getAllByRole('cell')[1];
    expect(entry).toHaveTextContent('A 있음 1/2');
    expect(entry).toHaveTextContent('B 있음 1/2');
    expect(within(entry).getByText('다름')).not.toHaveClass('sr-only');
    expect(entry).toHaveTextContent('A에만: 권한 조회');
    expect(entry).toHaveTextContent('B에만: 권한 감사');
  });

  it('비교 표 스크롤 상자는 넘치면 조회 권한만 가진 사람도 키보드로 스크롤할 수 있는 이름 있는 영역이 된다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    const restore = ['scrollHeight', 'clientHeight'].map((prop) => [prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)] as const);
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 100 });
    try {
      const section = await openComparison();
      // 조회 전용이라 상자 안에 편집 버튼이 없다.
      expect(within(section).queryByRole('button', { name: /에서 편집/ })).toBeNull();
      expect(within(section).getByRole('region', { name: '화면별 비교 표 스크롤 영역' })).toHaveAttribute('tabindex', '0');
      await userEvent.click(within(section).getByRole('tab', { name: '기능별' }));
      expect(within(section).getByRole('region', { name: '기능별 비교 표 스크롤 영역' })).toHaveAttribute('tabindex', '0');
    } finally {
      for (const [prop, descriptor] of restore) {
        if (descriptor) Object.defineProperty(HTMLElement.prototype, prop, descriptor);
        else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
      }
    }
  });

  it('권한 설정 권한이 없으면 편집 버튼을 두지 않고, 조회 권한이 없으면 비교 영역이 없다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    const section = await openComparison();
    expect(within(section).queryByRole('button', { name: /에서 편집/ })).toBeNull();
    expect(within(section).queryByRole('columnheader', { name: '편집' })).toBeNull();
  });

  it('조회 권한이 없으면 그룹 비교 버튼이 없다', () => {
    mocks.permissions = ['AUTHRT_AUDIT'];
    mocks.getHistory.mockResolvedValue(page([]));
    setup();
    expect(screen.queryByRole('button', { name: '그룹 비교' })).toBeNull();
  });
});

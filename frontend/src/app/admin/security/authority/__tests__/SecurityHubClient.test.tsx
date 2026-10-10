import { UnsavedChangesProvider } from '@/contexts/UnsavedChangesContext';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityHubClient from '../SecurityHubClient';
import { pageInProjection } from '@/test-utils/projection';

// 기능 예시(모두 충족 판정·별칭·쪽지함 등)에 기대는 시험은 그 화면이 투영으로 빠진 생성물에서 등록하지 않는다 — page 파일이 원장에 있고 실제로 없을 때다(원본에서는 그대로다).

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  // 보는 사람의 권한 버전 — 내가 속한 그룹을 저장하면 인증 컨텍스트가 이 값을 바꾸고 조회 캐시를 비운다.
  version: 'auth-v1',
  toast: vi.fn(), confirm: vi.fn(), getCatalog: vi.fn(), getGroups: vi.fn(), getGroup: vi.fn(),
  createGroup: vi.fn(), updateGroup: vi.fn(), deleteGroup: vi.fn(), saveGroupGrants: vi.fn(),
  getMemberships: vi.fn(), saveUserGroups: vi.fn(), getUsers: vi.fn(), getHistory: vi.fn(), getGroupMembers: vi.fn(),
  getGrantMatrix: vi.fn(), updateGroupMembers: vi.fn(), createGroupCopy: vi.fn(), getDepartments: vi.fn(), getDepartmentMemberships: vi.fn(),
}));
const { createGroup, updateGroup, deleteGroup, saveGroupGrants, saveUserGroups, createGroupCopy } = mocks;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator', role: 'ROLE_ADMIN', permissions: mocks.permissions, authorizationVersion: mocks.version } }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({ authorizationAdminService: mocks }));
// [2026-10-05] 영역 단추는 셸의 navigation 슬롯에 있다 — 모의 셸도 그 슬롯을 그린다(빠뜨리면 영역 단추가 사라져 영역 전환 시험이 빈 검사가 된다).
// fill 은 셸 루트의 data-work-fill 표지로 옮긴다(실제 셸과 같은 표지) — 영역마다 업무면 fill 셸을 쓰는지 본다(2026-10-05 과제 B).
vi.mock('@/app/components/patterns/work-list-page', () => ({ WorkListPage: ({ title, actions, navigation, filter, children, fill }: { title: string; actions: ReactNode; navigation?: ReactNode; filter: ReactNode; children: ReactNode; fill?: boolean }) => <main data-work-fill={fill ? '' : undefined}><h1>{title}</h1>{actions}{navigation}{filter}{children}</main> }));
// 전역 설정(vitest.setup.ts)은 탭을 children 통과 mock 으로 바꾼다. 편집기는 비활성 탭을 숨기는 것이 계약이므로 실제 탭을 쓴다.
vi.unmock('@/components/ui/tabs');

type Grant = { type: string; code: string };
type Snapshot = { code: string; name: string; description: string | null; version: string; complete: boolean; grants: Grant[] };

const groups = [
  { code: 'CONTENT', name: '콘텐츠 담당', description: '콘텐츠 운영', version: 'v1' },
  { code: 'SURVEY', name: '설문 담당', description: '', version: 's1' },
];
const catalog = {
  operations: [
    { code: 'BOARD_READ', name: '게시글 조회', domain: 'BOARD', action: 'READ' },
    { code: 'BOARD_CREATE', name: '게시글 등록', domain: 'BOARD', action: 'CREATE' },
    { code: 'QESTNR_READ', name: '설문 조회', domain: 'QESTNR', action: 'READ' },
  ],
  navigation: [{ code: 'MENU_1', name: '게시판', parentCode: null, route: null, useYn: 'Y' }], catalogVersion: 'catalog-v1',
};
const snapshot: Snapshot = { ...groups[0], complete: true, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'NAVIGATION', code: 'MENU_1' }] };
const treeCatalog = { ...catalog, navigation: [
  { code: 'ROOT', name: '업무 메뉴', parentCode: null, route: null, useYn: 'Y' },
  { code: 'BRANCH', name: '게시판 관리', parentCode: 'ROOT', route: null, useYn: 'Y' },
  { code: 'LEAF', name: '게시글 목록', parentCode: 'BRANCH', route: null, useYn: 'Y' },
  { code: 'SIBLING', name: '통계 메뉴', parentCode: 'ROOT', route: null, useYn: 'Y' },
  { code: 'OTHER', name: '다른 메뉴', parentCode: null, route: null, useYn: 'Y' },
] };
const membership = { userId: 'ESNTL_A', groups: ['CONTENT'], version: 'member-v1', complete: true };
const page = (list: unknown[], total = list.length) => ({ list, total, page: 1, size: 20, totalPage: Math.ceil(total / 20) });

/*
 * 서버 흉내 — 그룹 스냅샷을 들고 있다가 쓰기 응답과 다시 읽기가 같은 상태를 돌려준다(2단계 S2: 쓰기 응답이 저장 뒤 스냅샷).
 * 응답과 다시 읽기가 어긋나면 실제 서버에 없는 '다른 곳에서 바뀜' 이 생기므로, 그룹을 바꿀 때는 putGroup 을 쓴다.
 */
let server = new Map<string, Snapshot>();
let revision = 0;
function putGroup(value: Snapshot) { server.set(value.code, value); }
function commit(code: string, change: Partial<Snapshot>): Snapshot {
  const next = { ...server.get(code)!, ...change, version: `${code.toLowerCase()}-r${++revision}` };
  server.set(code, next);
  return next;
}

function hubTree(client: QueryClient) {
  return <QueryClientProvider client={client}><UnsavedChangesProvider><SecurityHubClient /></UnsavedChangesProvider></QueryClientProvider>;
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(hubTree(client));
  return { client, ...view };
}
/*
 * [2026-10-02 관리 콘솔 UX 2단계] 편집기 탭은 '화면별 권한'(기본)·'기능별 권한'·'구성원'·'기본 정보'·'변경 이력'이다. 비활성 탭은
 * 마운트를 유지하되 숨겨지므로(접근성 트리 밖) 상호작용 전에 그 탭을 연다. 기능권한 칸의 이름은 `영역 × 행위 (코드)`,
 * 화면별 권한의 메뉴 표시 칸은 `메뉴 × 메뉴 표시 (메뉴 번호)`다.
 */
type TabName = '화면별 권한' | '기능별 권한' | '구성원' | '기본 정보' | '변경 이력';
const BOARD_READ = /\(BOARD_READ\)$/;
const BOARD_CREATE = /\(BOARD_CREATE\)$/;
const QESTNR_READ = /\(QESTNR_READ\)$/;
const menuCell = (name: string, code: string) => new RegExp(`^${name} × 메뉴 표시 \\(${code}\\)$`);
async function openTab(name: TabName) {
  const tab = screen.getByRole('tab', { name: new RegExp(`^${name}`) });
  await userEvent.click(tab);
  expect(tab).toHaveAttribute('aria-selected', 'true');
}
/** 화면에 보이는 탭 글자(시각적으로 숨긴 보충 문구 제외). 접근 이름이 이 글자를 그대로 담는지 본다. */
function visibleLabel(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const hidden of clone.querySelectorAll('.sr-only')) hidden.remove();
  return clone.textContent?.trim();
}
async function openGroup(tab?: TabName) {
  const view = setup();
  await userEvent.click(await screen.findByRole('button', { name: /콘텐츠 담당.*CONTENT/ }));
  await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });
  // 기본 탭은 '화면별 권한'이다.
  expect(screen.getByRole('tab', { name: /^화면별 권한/ })).toHaveAttribute('aria-selected', 'true');
  if (tab) await openTab(tab);
  return view;
}
async function openMembership() {
  const view = setup();
  await userEvent.click(screen.getByRole('button', { name: '사용자 배정' }));
  await userEvent.click(await screen.findByRole('button', { name: '사용자 가 · login-a' }));
  await screen.findByRole('region', { name: '사용자 권한 그룹 배정' });
  return view;
}
/** [2026-10-05] 편집기 머리의 '더보기'를 연다 — '이 그룹으로 새 그룹 만들기'·'입력 취소 · 최신 정보 적용'은 그 안에 있다. */
async function openMore() {
  await userEvent.click(screen.getByRole('button', { name: '더보기' }));
}
/** 다시 읽기(재조회)가 끝나 편집할 수 있을 때까지 기다린다. */
async function untilEditable(name: RegExp) {
  await waitFor(() => expect(screen.getByRole('checkbox', { name })).toBeEnabled());
}

function resetMocks() {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  server = new Map([['CONTENT', snapshot], ['SURVEY', { ...groups[1], complete: true, grants: [] }]]);
  revision = 0;
  mocks.version = 'auth-v1';
  mocks.permissions = ['AUTHRT_READ', 'AUTHRT_CREATE', 'AUTHRT_UPDATE', 'AUTHRT_DELETE', 'AUTHRT_GRANT', 'AUTHRT_ASSIGN', 'AUTHRT_AUDIT'];
  mocks.getCatalog.mockResolvedValue(catalog);
  mocks.getGroups.mockResolvedValue(groups);
  mocks.getGroup.mockImplementation((code: string) => Promise.resolve(server.get(code)));
  mocks.saveGroupGrants.mockImplementation((code: string, body: { grants: Grant[] }) => Promise.resolve(commit(code, { grants: body.grants })));
  mocks.updateGroup.mockImplementation((code: string, body: { name: string; description: string }) => Promise.resolve(commit(code, { name: body.name, description: body.description })));
  mocks.createGroup.mockImplementation((body: { code: string; name: string; description: string }) => {
    putGroup({ ...body, version: `${body.code.toLowerCase()}-r0`, complete: true, grants: [] });
    return Promise.resolve(server.get(body.code));
  });
  mocks.createGroupCopy.mockImplementation((source: string, body: { code: string; name: string; description: string }) => {
    putGroup({ code: body.code, name: body.name, description: body.description, version: `${body.code.toLowerCase()}-r0`, complete: true, grants: server.get(source)!.grants });
    return Promise.resolve(server.get(body.code));
  });
  mocks.deleteGroup.mockResolvedValue(undefined);
  mocks.saveUserGroups.mockResolvedValue(undefined);
  mocks.getUsers.mockResolvedValue(page([{ id: 'ESNTL_A', userId: 'login-a', userNm: '사용자 가' }, { id: 'ESNTL_B', userId: 'login-b', userNm: '사용자 나' }]));
  mocks.getMemberships.mockImplementation((id: string) => Promise.resolve(id === 'ESNTL_A' ? membership : { userId: id, groups: ['SURVEY'], version: 'member-b', complete: true }));
  mocks.getHistory.mockResolvedValue(page([]));
  mocks.getGroupMembers.mockResolvedValue(page([]));
  mocks.getDepartments.mockResolvedValue([]);
  mocks.getGrantMatrix.mockImplementation(() => Promise.resolve({ catalogVersion: 'catalog-v1', groups: [...server.values()] }));
  mocks.confirm.mockResolvedValue(true);
}

describe('SecurityHub: AuthorizationGroupEditor and AuthorizationMembershipEditor', () => {
  beforeEach(resetMocks);

  it('legacy ADMIN 역할만으로 조회나 변경을 허용하지 않는다', () => {
    mocks.permissions = [];
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent('조회 권한이 없습니다');
    expect(mocks.getGroups).not.toHaveBeenCalled();
    expect(mocks.getHistory).not.toHaveBeenCalled();
  });

  it('미저장 기능권한은 그룹 또는 영역 전환을 취소하면 보존하고 승인한 전환만 실행한다', async () => {
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    mocks.confirm.mockResolvedValue(false);
    await userEvent.click(screen.getByRole('button', { name: /설문 담당.*SURVEY/ }));
    expect(screen.getByRole('region', { name: '콘텐츠 담당 권한 설정' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: '사용자 배정' }));
    expect(screen.getByRole('region', { name: '콘텐츠 담당 권한 설정' })).toBeVisible();
    mocks.confirm.mockResolvedValue(true);
    await userEvent.click(screen.getByRole('button', { name: /설문 담당.*SURVEY/ }));
    expect(await screen.findByRole('region', { name: '설문 담당 권한 설정' })).toBeVisible();
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('탭 전환은 화면 안 이동이라 확인 없이 편집을 유지하고, 탭 이름에 변경 수를 보인다', async () => {
    await openGroup();
    // 비활성 탭은 마운트돼 있어도 숨겨져 접근성 트리에 없다.
    expect(screen.queryByRole('checkbox', { name: BOARD_READ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '그룹명' })).not.toBeInTheDocument();
    await openTab('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    // 보이는 글자('기능별 권한 1')가 접근 이름 안에 그대로 이어져 있어야 음성 조작으로 부를 수 있다(WCAG 2.5.3).
    expect(visibleLabel(screen.getByRole('tab', { name: '기능별 권한 1건 변경' }))).toBe('기능별 권한 1');
    // 화면별 권한과 기능별 권한은 같은 초안이다 — 화면별 권한 탭은 모든 변경을 센다.
    expect(visibleLabel(screen.getByRole('tab', { name: '화면별 권한 1건 변경' }))).toBe('화면별 권한 1');
    await openTab('화면별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: menuCell('게시판', 'MENU_1') }));
    expect(visibleLabel(screen.getByRole('tab', { name: '화면별 권한 2건 변경' }))).toBe('화면별 권한 2');
    expect(visibleLabel(screen.getByRole('tab', { name: '기능별 권한 1건 변경' }))).toBe('기능별 권한 1');
    await openTab('기본 정보');
    await openTab('기능별 권한');
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
    // 탭 상태는 URL 에 싣지 않는다.
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe('');
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'BOARD_CREATE' }], version: 'v1', complete: true });
  });

  /*
   * [2026-10-02 A2] 기본 정보와 권한 편집은 서로를 잠그지 않는다. 한쪽 저장 응답(스냅샷)이 다른 쪽 기준선과 같으면 그 version 을
   * 이어받아 초안을 유지한다 — 종전에는 한쪽이 편집 중이면 다른 쪽 입력이 잠겼고 저장 뒤에는 편집기 전체가 잠겼다.
   */
  it('기본 정보와 권한 초안을 함께 편집하고, 한쪽 저장 뒤 다른 쪽은 이어받은 version 으로 저장한다', async () => {
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    await openTab('기본 정보');
    const nameInput = screen.getByRole('textbox', { name: '그룹명' });
    expect(nameInput).toBeEnabled();
    fireEvent.change(nameInput, { target: { value: '콘텐츠 운영' } });
    expect(visibleLabel(screen.getByRole('tab', { name: '기본 정보 수정 중' }))).toBe('기본 정보 수정 중');
    await openTab('기능별 권한');
    // 기본 정보를 편집하는 동안에도 권한 칸은 잠기지 않는다.
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();

    await openTab('기본 정보');
    await userEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }));
    expect(updateGroup).toHaveBeenCalledWith('CONTENT', { name: '콘텐츠 운영', description: '콘텐츠 운영', version: 'v1' });
    // 저장한 권한이 초안 기준선과 같으므로 권한 초안이 남고, 그 저장은 이어받은 version 을 쓴다.
    await openTab('기능별 권한');
    await untilEditable(BOARD_CREATE);
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
    expect(screen.queryByText(/다른 곳에서 변경되어/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'BOARD_CREATE' }, { type: 'NAVIGATION', code: 'MENU_1' }], version: 'content-r1', complete: true });

    // 권한 저장 응답의 이름·설명이 폼 기준선과 같으므로 기본 정보도 그 version 을 이어받는다 — 저장 뒤에도 잠기지 않는다.
    await openTab('기본 정보');
    await waitFor(() => expect(screen.getByRole('textbox', { name: '그룹명' })).toBeEnabled());
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '콘텐츠 총괄' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }));
    expect(updateGroup).toHaveBeenLastCalledWith('CONTENT', { name: '콘텐츠 총괄', description: '콘텐츠 운영', version: 'content-r2' });
  });

  it('저장 응답이 다른 쪽 기준선과 다르면 version 을 이어받지 않고 그 쪽만 최신 정보 적용을 요구한다', async () => {
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    // 그 사이 다른 관리자가 권한을 바꿨다 — 기본 정보 저장 응답의 권한이 초안 기준선과 다르다.
    updateGroup.mockImplementationOnce((code: string, body: { name: string; description: string }) => Promise.resolve(commit(code, { name: body.name, description: body.description, grants: [] })));
    await openTab('기본 정보');
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '콘텐츠 운영' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }));
    expect(await screen.findByText(/다른 곳에서 변경되어 화면별 권한·기능별 권한을 저장할 수 없습니다/)).toHaveAttribute('role', 'status');
    // [2026-10-05] 저장 막대는 화면별·기능별 권한 탭에만 있다 — 기본 정보 탭에는 '권한 변경 저장'이 없다(어느 저장이 무엇을 저장하는지 탭으로 가른다).
    expect(screen.queryByRole('button', { name: '권한 변경 저장', hidden: true })).not.toBeInTheDocument();
    await openTab('기능별 권한');
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true');
    // 막힌 이유를 버튼 옆에 글자로 말한다.
    expect(screen.getByText('최신 정보를 적용해야 저장할 수 있습니다.')).toBeVisible();
    // 초안은 지우지 않는다(무엇을 하려 했는지 보이게).
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
    // 기본 정보는 응답이 새 기준선이라 계속 편집할 수 있다.
    await openTab('기본 정보');
    expect(screen.getByRole('textbox', { name: '그룹명' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: '입력 취소 · 최신 정보 적용' }));
    await openTab('기능별 권한');
    await untilEditable(BOARD_CREATE);
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).not.toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: QESTNR_READ }));
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'QESTNR_READ' }], version: 'content-r1', complete: true });
  });

  it('권한 저장 응답의 이름이 폼 기준선과 다르면 기본 정보만 최신 정보 적용을 요구한다', async () => {
    await openGroup('기능별 권한');
    saveGroupGrants.mockImplementationOnce((code: string, body: { grants: Grant[] }) => Promise.resolve(commit(code, { grants: body.grants, name: '다른 이름' })));
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(await screen.findByText(/그룹명·설명이 다른 곳에서 변경되었습니다/)).toHaveAttribute('role', 'status');
    await openTab('기본 정보');
    expect(screen.getByRole('textbox', { name: '그룹명' })).toBeDisabled();
    // 권한은 응답이 새 기준선이라 이어서 편집할 수 있다.
    await openTab('기능별 권한');
    await untilEditable(QESTNR_READ);
    await userEvent.click(screen.getByRole('checkbox', { name: QESTNR_READ }));
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).not.toHaveAttribute('aria-disabled');
  });

  it('미저장 그룹명과 사용자 배정도 선택 전환에서 보호한다', async () => {
    const view = await openGroup('기본 정보');
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '편집 중 그룹' } });
    mocks.confirm.mockResolvedValue(false);
    await userEvent.click(screen.getByRole('button', { name: '사용자 배정' }));
    expect(screen.getByRole('textbox', { name: '그룹명' })).toHaveValue('편집 중 그룹');
    // 탭을 오가도 비활성 탭은 마운트를 유지해 입력이 남는다. 권한 칸은 잠기지 않는다.
    await openTab('기능별 권한');
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeEnabled();
    await openTab('기본 정보');
    expect(screen.getByRole('textbox', { name: '그룹명' })).toHaveValue('편집 중 그룹');
    view.unmount();
    await openMembership();
    await userEvent.click(screen.getByRole('checkbox', { name: /설문 담당/ }));
    await userEvent.click(screen.getByRole('button', { name: '사용자 나 · login-b' }));
    expect(screen.getByRole('heading', { name: '사용자 가' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /설문 담당/ })).toBeChecked();
    expect(saveUserGroups).not.toHaveBeenCalled();
  });

  it('조회 전용 그룹은 읽을 수 있지만 생성·수정·할당·삭제·복제 버튼이 없다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    await openGroup('기능별 권한');
    expect(screen.getByRole('checkbox', { name: BOARD_READ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: BOARD_READ })).toBeDisabled();
    // 숨은 탭에 남아 있어도 안 된다 — 숨김 요소까지 찾는다.
    for (const name of ['그룹 추가', '그룹 정보 저장', '권한 변경 저장', '그룹 삭제', '구성원 추가', '이 그룹으로 새 그룹 만들기', '콘텐츠 담당 그룹으로 새 그룹 만들기']) {
      expect(screen.queryByRole('button', { name, hidden: true })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /명 회수$/, hidden: true })).not.toBeInTheDocument();
    // [2026-10-05] 일괄 버튼 이름은 '… 전체 선택(보호 권한 제외)'다 — 끝 고정($)을 두면 늘 맞지 않아 빈 검사가 된다.
    expect(screen.queryByRole('button', { name: /전체 (선택|해제)/, hidden: true })).not.toBeInTheDocument();
    await openTab('화면별 권한');
    expect(screen.getByRole('checkbox', { name: menuCell('게시판', 'MENU_1') })).toBeDisabled();
    // 읽기 전용이어도 메뉴 미리보기는 볼 수 있다.
    expect(screen.getByRole('button', { name: '메뉴 미리보기' })).toBeEnabled();
    // 저장 막대 대신 조회만 할 수 있다고 말한다. '더보기'를 열어도 복제는 없다(닫힌 채 세면 늘 없어 빈 검사가 된다).
    expect(screen.getByText('권한 설정 권한이 없어 조회만 할 수 있습니다.')).toBeVisible();
    await openMore();
    expect(screen.queryByRole('button', { name: '이 그룹으로 새 그룹 만들기' })).not.toBeInTheDocument();
  });

  it('기능 검색 밖의 기존 기능·메뉴 선택을 전체 교체에 보존한다', async () => {
    await openGroup('기능별 권한');
    fireEvent.change(screen.getByRole('textbox', { name: '기능 검색' }), { target: { value: '설문' } });
    expect(screen.queryByRole('checkbox', { name: BOARD_READ })).not.toBeInTheDocument();
    expect(screen.getByText(/표시 1 \/ 전체 2개 영역/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: QESTNR_READ }));
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'QESTNR_READ' }, { type: 'NAVIGATION', code: 'MENU_1' }], version: 'v1', complete: true });
  });

  it('바꾼 칸 수가 저장 전 요약 수와 같고, 칸은 저장 버튼이나 Ctrl+S 로만 저장된다', async () => {
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_READ }));
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    expect(saveGroupGrants).not.toHaveBeenCalled();
    const panel = screen.getByRole('tabpanel', { name: /^기능별 권한/ });
    expect(panel.querySelectorAll('[data-changed="true"]')).toHaveLength(2);
    // [2026-10-05] 저장 막대의 요약은 늘 보이는 한 줄이다(알림은 표 도구 줄의 바꾼 칸 수가 맡는다 — 같은 변화를 두 번 읽지 않게).
    expect(screen.getByText(/저장 전 변경: 추가/)).toHaveTextContent('저장 전 변경: 추가 1 · 회수 1');
    expect(screen.getByText(/이 표에서 바꾼 칸 2개/)).toHaveAttribute('aria-live', 'polite');
    screen.getByRole('checkbox', { name: BOARD_CREATE }).focus();
    await userEvent.keyboard('{Control>}s{/Control}');
    expect(saveGroupGrants).toHaveBeenCalledTimes(1);
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_CREATE' }, { type: 'NAVIGATION', code: 'MENU_1' }], version: 'v1', complete: true });
  });

  it('저장할 변경이 없으면 권한 변경 저장 버튼이 비활성이고, 변경이 생겼다 사라지면 다시 비활성이 된다', async () => {
    // 편집할 수 있는 깨끗한 상태 — 다른 잠금 사유(미완료·stale·계층 오류) 없이 '변경 없음'만으로 막히는지 본다.
    await openGroup('기능별 권한');
    const save = screen.getByRole('button', { name: '권한 변경 저장' });
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeEnabled();
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    expect(save).not.toHaveAttribute('aria-disabled');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await openTab('화면별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: menuCell('게시판', 'MENU_1') }));
    expect(save).not.toHaveAttribute('aria-disabled');
    await userEvent.click(screen.getByRole('checkbox', { name: menuCell('게시판', 'MENU_1') }));
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('Ctrl+S 는 변경이 없으면 저장하지 않고, 화면별 권한 표에서도 같은 저장을 부른다', async () => {
    await openGroup('기능별 권한');
    screen.getByRole('checkbox', { name: BOARD_READ }).focus();
    await userEvent.keyboard('{Control>}s{/Control}');
    expect(saveGroupGrants).not.toHaveBeenCalled();
    await openTab('화면별 권한');
    const menu = screen.getByRole('checkbox', { name: menuCell('게시판', 'MENU_1') });
    await userEvent.click(menu);
    menu.focus();
    await userEvent.keyboard('{Control>}s{/Control}');
    expect(saveGroupGrants).toHaveBeenCalledTimes(1);
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }], version: 'v1', complete: true });
  });

  it('줄 일괄 선택은 보호 권한을 빼고 초안에만 더한다', async () => {
    mocks.getCatalog.mockResolvedValue({ ...catalog, operations: [...catalog.operations,
      { code: 'AUTHRT_READ', name: '권한 조회', domain: 'AUTHRT', action: 'READ' },
      { code: 'AUTHRT_GRANT', name: '권한 설정', domain: 'AUTHRT', action: 'GRANT' }] });
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('button', { name: '권한 관리 전체 선택(보호 권한 제외)' }));
    expect(screen.getByRole('checkbox', { name: /\(AUTHRT_READ\)$/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /\(AUTHRT_GRANT\)$/ })).not.toBeChecked();
    expect(saveGroupGrants).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'AUTHRT_READ' }, { type: 'NAVIGATION', code: 'MENU_1' }], version: 'v1', complete: true });
  });

  it('공개 메뉴 그룹은 기능권한을 더할 수 없고 일괄 선택도 해제만 하며, 복제·구성원 추가를 두지 않는다', async () => {
    mocks.getGroups.mockResolvedValue([{ ...groups[0], code: 'ROLE_ANONYMOUS' }]);
    putGroup({ ...snapshot, code: 'ROLE_ANONYMOUS' });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: /콘텐츠 담당.*ROLE_ANONYMOUS/ }));
    await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });
    await openTab('기능별 권한');
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: BOARD_READ })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: '게시글 전체 해제(보호 권한 제외)' }));
    expect(screen.getByRole('checkbox', { name: BOARD_READ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: '게시글 전체 선택(보호 권한 제외)' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '구성원 추가', hidden: true })).not.toBeInTheDocument();
    // 복제는 '더보기' 안에 있다 — 열어도 공개 메뉴 그룹에는 없다(닫힌 채 세면 늘 없어 빈 검사가 된다).
    await openMore();
    expect(screen.getByRole('button', { name: '입력 취소 · 최신 정보 적용' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이 그룹으로 새 그룹 만들기' })).not.toBeInTheDocument();
  });

  it('완료되지 않은 배정 조회는 선택과 저장을 막는다', async () => {
    putGroup({ ...snapshot, complete: false });
    await openGroup('기능별 권한');
    expect(screen.getByText(/전체 권한 또는 현재 기능 목록/)).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeDisabled();
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true');
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('카탈로그에 없는 기존 권한은 조용히 제거하지 않고 저장을 막는다', async () => {
    putGroup({ ...snapshot, grants: [...snapshot.grants, { type: 'OPERATION', code: 'REMOVED_CODE' }] });
    await openGroup();
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true');
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('다른 관리자의 새 revision을 적용하기 전에는 기존 선택으로 저장하지 않는다', async () => {
    const view = await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    act(() => view.client.setQueryData(['authorization', 'operator', 'auth-v1', 'group', 'CONTENT'], { ...snapshot, version: 'v2', grants: [] }));
    await waitFor(() => expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: '입력 취소 · 최신 정보 적용' }));
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).not.toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: QESTNR_READ }));
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'QESTNR_READ' }], version: 'v2', complete: true });
  });

  it('권한 저장의 같은 tick 중복 요청을 막고 실패 후 선택을 보존한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    saveGroupGrants.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    const save = screen.getByRole('button', { name: '권한 변경 저장' });
    act(() => { fireEvent.click(save); fireEvent.click(save); });
    expect(saveGroupGrants).toHaveBeenCalledTimes(1);
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(updateGroup).not.toHaveBeenCalled();
    // '그룹 삭제'는 기본 정보 탭의 위험 영역에 있다(숨은 탭이라 접근성 트리 밖) — 저장하는 동안 잠긴다.
    expect(screen.getByRole('button', { name: '그룹 삭제', hidden: true })).toBeDisabled();
    act(() => rejectWrite(new Error('다른 관리자가 변경했습니다.')));
    await waitFor(() => expect(save).not.toHaveAttribute('aria-disabled'));
    expect(mocks.toast).toHaveBeenCalledWith('다른 관리자가 변경했습니다.', 'error');
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
  });

  it('수정 액션이 선택한 그룹과 그 revision만 전달한다', async () => {
    await openGroup();
    await userEvent.click(screen.getByRole('button', { name: /설문 담당.*SURVEY/ }));
    // 그룹을 바꾸면 편집기를 새로 연다 — 기본 탭('화면별 권한')에서 시작한다.
    await screen.findByRole('region', { name: '설문 담당 권한 설정' });
    await openTab('기본 정보');
    const input = await screen.findByRole('textbox', { name: '그룹명' });
    await waitFor(() => expect(input).toHaveValue('설문 담당'));
    fireEvent.change(input, { target: { value: '설문 운영' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }));
    expect(updateGroup).toHaveBeenCalledWith('SURVEY', { name: '설문 운영', description: '', version: 's1' });
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('잘못된 그룹 코드는 API를 호출하지 않고 입력 오류로 안내한다', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: '그룹 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '그룹 코드' }), { target: { value: 'invalid-code' } });
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '새 그룹' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 등록' }));
    await waitFor(() => expect(document.querySelector('[data-form-error-summary]')).toHaveTextContent('입력 오류'));
    expect(createGroup).not.toHaveBeenCalled();
  });

  it('규칙이 생기기 전에 만든 그룹 코드도 이름을 고칠 수 있다 — 코드 형식 규칙은 새 코드(등록·복제)에만 적용한다', async () => {
    const legacy = { code: 'Legacy-Role', name: '옛 그룹', description: '', version: 'l1' };
    mocks.getGroups.mockResolvedValue([legacy]);
    putGroup({ ...legacy, complete: true, grants: [] });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: /옛 그룹.*Legacy-Role/ }));
    await screen.findByRole('region', { name: '옛 그룹 권한 설정' });
    await openTab('기본 정보');
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '옛 그룹 정리' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }));
    await waitFor(() => expect(updateGroup).toHaveBeenCalledWith('Legacy-Role', { name: '옛 그룹 정리', description: '', version: 'l1' }));
  });

  it('그룹 등록은 검증한 코드·이름·설명만 저장한다', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: '그룹 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '그룹 코드' }), { target: { value: 'AUDITOR' } });
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '감사 담당' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 등록' }));
    expect(createGroup).toHaveBeenCalledWith({ code: 'AUDITOR', name: '감사 담당', description: '' });
  });

  it('그룹 등록은 제출 중 잠기고 실패하면 입력을 유지한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    createGroup.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: '그룹 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '그룹 코드' }), { target: { value: 'AUDITOR' } });
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '감사 담당' } });
    const submit = screen.getByRole('button', { name: '그룹 등록' });
    await userEvent.click(submit);
    expect(createGroup).toHaveBeenCalledTimes(1);
    expect(createGroup).toHaveBeenCalledWith({ code: 'AUDITOR', name: '감사 담당', description: '' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    act(() => rejectWrite(new Error('중복 그룹입니다.')));
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(screen.getByRole('textbox', { name: '그룹명' })).toHaveValue('감사 담당');
    expect(mocks.toast).toHaveBeenCalledWith('중복 그룹입니다.', 'error');
  });

  it('그룹 정보 저장 중 다른 권한·삭제 동작을 잠그고 실패하면 값을 보존한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    updateGroup.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    await openTab('기본 정보');
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '콘텐츠 운영' } });
    const submit = screen.getByRole('button', { name: '그룹 정보 저장' });
    await userEvent.click(submit);
    expect(updateGroup).toHaveBeenCalledTimes(1);
    expect(updateGroup).toHaveBeenCalledWith('CONTENT', { name: '콘텐츠 운영', description: '콘텐츠 운영', version: 'v1' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    // 쓰기는 한 번에 하나다 — 그룹 정보를 저장하는 동안 권한 저장·삭제·칸은 잠긴다.
    expect(screen.getByRole('button', { name: '그룹 삭제' })).toBeDisabled();
    await openTab('기능별 권한');
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('다른 저장이 끝난 뒤 저장할 수 있습니다.')).toBeVisible();
    expect(saveGroupGrants).not.toHaveBeenCalled();
    expect(deleteGroup).not.toHaveBeenCalled();
    act(() => rejectWrite(new Error('변경 충돌입니다.')));
    await openTab('기본 정보');
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(screen.getByRole('textbox', { name: '그룹명' })).toHaveValue('콘텐츠 운영');
    expect(mocks.toast).toHaveBeenCalledWith('변경 충돌입니다.', 'error');
    await openTab('기능별 권한');
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
  });

  it('삭제 확인부터 응답까지 잠그고 중복 삭제·편집을 차단한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    deleteGroup.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    // 삭제는 탭 밖 저장 줄에 있다. 잠긴 그룹 정보 저장을 보려고 기본 정보 탭을 연다.
    await openGroup('기본 정보');
    const submit = screen.getByRole('button', { name: '그룹 삭제' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '그룹 정보 저장' })).toBeDisabled();
    expect(updateGroup).not.toHaveBeenCalled();
    act(() => rejectWrite(new Error('사용자가 배정되어 있습니다.')));
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(mocks.toast).toHaveBeenCalledWith('사용자가 배정되어 있습니다.', 'error');
  });

  it('사용자 그룹 저장은 중복 요청을 차단하고 실패 시 선택을 보존한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    saveUserGroups.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    await openMembership();
    await userEvent.click(screen.getByRole('checkbox', { name: /설문 담당/ }));
    const submit = screen.getByRole('button', { name: '사용자 그룹 저장' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    expect(saveUserGroups).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    act(() => rejectWrite(new Error('배정 버전이 변경되었습니다.')));
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(mocks.toast).toHaveBeenCalledWith('배정 버전이 변경되었습니다.', 'error');
    expect(screen.getByRole('checkbox', { name: /설문 담당/ })).toBeChecked();
  });

  it('할당된 사용자가 있으면 그룹 삭제 실패를 알리고 선택을 유지한다', async () => {
    deleteGroup.mockRejectedValue(new Error('사용 중인 자원입니다.'));
    // [2026-10-05] '그룹 삭제'는 저장 막대가 아니라 기본 정보 탭 아래 위험 영역에 있다.
    await openGroup();
    expect(screen.queryByRole('button', { name: '그룹 삭제' })).not.toBeInTheDocument();
    await openTab('기본 정보');
    expect(within(screen.getByRole('region', { name: '되돌릴 수 없는 작업' })).getByRole('button', { name: '그룹 삭제' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '그룹 삭제' }));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('먼저 사용자 할당을 해제') }));
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('CONTENT', 'v1'));
    expect(mocks.toast).toHaveBeenCalledWith('사용 중인 자원입니다.', 'error');
    expect(screen.getByRole('region', { name: '콘텐츠 담당 권한 설정' })).toBeInTheDocument();
  });

  it('예약 그룹의 삭제 버튼은 제공하지 않는다', async () => {
    mocks.getGroups.mockResolvedValue([{ ...groups[0], code: 'ROLE_ADMIN' }]);
    putGroup({ ...snapshot, code: 'ROLE_ADMIN' });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: /콘텐츠 담당.*ROLE_ADMIN/ }));
    await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });
    expect(screen.queryByRole('button', { name: '그룹 삭제', hidden: true })).not.toBeInTheDocument();
  });

  it('사용자 전체 배정은 로그인 ID가 아닌 esntlId로 조회하고 복수 그룹을 저장한다', async () => {
    await openMembership();
    const region = screen.getByRole('region', { name: '사용자 권한 그룹 배정' });
    expect(within(region).getByRole('checkbox', { name: /콘텐츠 담당/ })).toBeChecked();
    expect(within(region).getByRole('checkbox', { name: /설문 담당/ })).not.toBeChecked();
    await userEvent.click(within(region).getByRole('checkbox', { name: /설문 담당/ }));
    await userEvent.click(screen.getByRole('button', { name: '사용자 그룹 저장' }));
    expect(mocks.getMemberships).toHaveBeenCalledWith('ESNTL_A');
    expect(saveUserGroups).toHaveBeenCalledWith('ESNTL_A', { groups: ['CONTENT', 'SURVEY'], version: 'member-v1', complete: true });
  });

  it('사용자 검색 페이지가 바뀌어도 현재 사용자의 전체 그룹 선택을 지우지 않는다', async () => {
    await openMembership();
    fireEvent.change(screen.getByRole('textbox', { name: '사용자 이름·로그인 ID' }), { target: { value: '다른 사용자' } });
    // [DIP C9] 검색어는 조회 버튼으로 적용한다 — 입력만으로는 목록이 바뀌지 않는다.
    await userEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.getUsers).toHaveBeenLastCalledWith('다른 사용자', 0, expect.any(Number)));
    await userEvent.click(screen.getByRole('checkbox', { name: /설문 담당/ }));
    await userEvent.click(screen.getByRole('button', { name: '사용자 그룹 저장' }));
    expect(saveUserGroups).toHaveBeenCalledWith('ESNTL_A', expect.objectContaining({ groups: ['CONTENT', 'SURVEY'] }));
  });

  it('사용자 전환 중에는 이전 사용자의 배정을 표시하거나 저장하지 않는다', async () => {
    await openMembership();
    mocks.getMemberships.mockReturnValue(new Promise(() => undefined));
    await userEvent.click(screen.getByRole('button', { name: '사용자 나 · login-b' }));
    expect(screen.queryByRole('region', { name: '사용자 권한 그룹 배정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '사용자 그룹 저장' })).not.toBeInTheDocument();
    expect(saveUserGroups).not.toHaveBeenCalled();
  });

  it('부분 사용자 배정은 저장을 허용하지 않는다', async () => {
    mocks.getMemberships.mockResolvedValue({ ...membership, complete: false });
    await openMembership();
    expect(screen.getByRole('button', { name: '사용자 그룹 저장' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /설문 담당/ })).toBeDisabled();
  });

  it('사용자 배정이 외부에서 변경되면 이전 revision 저장을 차단한다', async () => {
    const view = await openMembership();
    await userEvent.click(screen.getByRole('checkbox', { name: /설문 담당/ }));
    act(() => view.client.setQueryData(['authorization', 'operator', 'auth-v1', 'membership', 'ESNTL_A'], { ...membership, version: 'member-v2' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '사용자 그룹 저장' })).toBeDisabled());
    expect(saveUserGroups).not.toHaveBeenCalled();
  });

  it('감사 권한만 가진 사용자는 다른 관리 조회 없이 변경 이력을 읽는다', async () => {
    mocks.permissions = ['AUTHRT_AUDIT'];
    mocks.getHistory.mockResolvedValue(page([{ id: 1, targetType: 'GRANT', changeType: 'ADD', group: 'CONTENT', grantType: 'OPERATION', grantCode: 'BOARD_READ', before: null, after: 'BOARD_READ', actorId: 'operator', createdAt: '2026-09-10T10:00:00' }]));
    setup();
    expect(await screen.findByRole('table', { name: '권한 변경 이력' })).toBeInTheDocument();
    await screen.findByText('GRANT');
    expect(mocks.getGroups).not.toHaveBeenCalled();
    expect(mocks.getUsers).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '그룹 추가' })).not.toBeInTheDocument();
  });
  it('변경 이력은 대상과 처리자를 이름으로 보이고, 이름이 없으면 식별자만 보인다', async () => {
    mocks.permissions = ['AUTHRT_AUDIT'];
    mocks.getHistory.mockResolvedValue(page([
      { id: 1, targetType: 'USER_GROUP', changeType: 'ADD', group: 'CONTENT', userId: 'ESNTL_A', userNm: '홍길동', grantType: null, grantCode: null, field: 'membership', before: null, after: 'CONTENT', actorId: 'ESNTL_OP', actorNm: '운영자', createdAt: '2026-09-10T10:00:00' },
      { id: 2, targetType: 'USER_GROUP', changeType: 'REMOVE', group: 'CONTENT', userId: 'ESNTL_GONE', userNm: null, grantType: null, grantCode: null, field: 'membership', before: 'CONTENT', after: null, actorId: 'ESNTL_OLD', actorNm: null, createdAt: '2026-09-10T11:00:00' },
    ]));
    setup();
    const table = await screen.findByRole('table', { name: '권한 변경 이력' });
    expect(await within(table).findByText('홍길동 (ESNTL_A)')).toBeInTheDocument();
    expect(within(table).getByText('운영자 (ESNTL_OP)')).toBeInTheDocument();
    expect(within(table).getByText('ESNTL_GONE')).toBeInTheDocument();
    expect(within(table).getByText('ESNTL_OLD')).toBeInTheDocument();
  });
  it('AuthorizationHistory 검색은 적용한 필터만 보내고 거꾸로 된 기간을 거부한다', async () => {
    mocks.permissions = ['AUTHRT_AUDIT'];
    setup();
    await screen.findByRole('search', { name: '권한 변경 이력 검색' });
    fireEvent.change(screen.getByRole('textbox', { name: '그룹 코드' }), { target: { value: ' CONTENT ' } });
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-09-10' } });
    await userEvent.click(screen.getByRole('button', { name: '이력 조회' }));
    await waitFor(() => expect(mocks.getHistory).toHaveBeenLastCalledWith(0, 20, { groupCode: 'CONTENT', fromDate: '2026-09-01', toDate: '2026-09-10' }));
    const count = mocks.getHistory.mock.calls.length;
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-09-11' } });
    await userEvent.click(screen.getByRole('button', { name: '이력 조회' }));
    expect(screen.getByRole('alert')).toHaveTextContent('시작일은 종료일보다 늦을 수 없습니다');
    expect(mocks.getHistory).toHaveBeenCalledTimes(count);
  });

  it('AuthorizationEffectivePermissions는 저장된 기능의 제공 그룹을 조회하고 변경된 배정은 확정하지 않는다', async () => {
    const view = await openMembership();
    await userEvent.click(screen.getByRole('button', { name: '저장된 유효권한 · 제공 그룹 보기' }));
    const table = await screen.findByRole('table', { name: '기능권한별 제공 그룹' });
    expect(within(table).getByText('게시글 조회')).toBeInTheDocument();
    expect(within(table).getByText('콘텐츠 담당')).toBeInTheDocument();
    mocks.getMemberships.mockResolvedValue({ ...membership, version: 'member-new' });
    act(() => { void view.client.invalidateQueries({ queryKey: ['authorization', 'operator', 'auth-v1', 'effective-groups'] }); });
    await waitFor(() => expect(screen.getByText(/최신 전체 권한을 확인하지 못했습니다/)).toBeInTheDocument());
    expect(screen.queryByRole('table', { name: '기능권한별 제공 그룹' })).not.toBeInTheDocument();
  });

  it('메뉴만 남기는 변경은 기능권한이 자동 추가되지 않음을 안내한다', async () => {
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_READ }));
    // 저장 전체에 대한 경고라 탭 밖에 둔다 — 기능별 권한 탭에서 칸을 끄는 순간 보인다.
    const alert = screen.getByText(/메뉴만 선택되어 있고 기능권한이 없습니다/);
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'NAVIGATION', code: 'MENU_1' }], version: 'v1', complete: true });
  });

  it('배정한 메뉴 가운데 이 그룹의 기능권한으로 들어갈 수 없는 화면을 저장 전에 알리고, 저장은 막지 않는다', async () => {
    // [2026-10-01] 메뉴 표시와 화면 진입은 서로 다른 권한이 판정한다. 종전에는 기능권한이 하나도 없을 때만 경고했다.
    mocks.getCatalog.mockResolvedValue({ ...catalog, navigation: [{ code: 'MENU_1', name: '메뉴 관리', parentCode: null, route: '/admin/system/menus', useYn: 'Y' }] });
    await openGroup();

    const hint = screen.getByText(/이 그룹의 기능권한만으로는 들어갈 수 없는 화면의 메뉴가 1개 있습니다: 메뉴 관리/);
    expect(hint).toHaveAttribute('role', 'status');
    expect(hint).toBeVisible();
    // 줄의 상태 칸이 같은 사실을 말한다.
    expect(screen.getByText('진입 권한 없음')).toBeVisible();
    // 현재 기능 목록에 그 화면의 권한(MENU_READ)이 없으면 고칠 수 있다고 말하지 않는다.
    expect(screen.queryByRole('button', { name: '메뉴 관리 진입 권한 추가' })).not.toBeInTheDocument();
    expect(screen.getByText(/이 화면이 요구하는 권한이 현재 기능 목록에 없습니다/)).toBeVisible();
    // 다른 그룹이 그 권한을 줄 수 있으므로 저장을 막는 오류가 아니다.
    await openTab('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).not.toHaveAttribute('aria-disabled');
  });

  it('메뉴가 여는 화면이 /admin 밖이거나 분류뿐이면 알리지 않는다', async () => {
    await openGroup();
    expect(screen.queryByText(/이 그룹의 기능권한만으로는 들어갈 수 없는 화면의 메뉴/)).not.toBeInTheDocument();
  });

  /*
   * [2026-10-02 관리 콘솔 UX 1단계 → 2단계] 진입 권한 경고를 고칠 수 있게 한다. 버튼은 '화면별 권한' 표의 상태 칸에 있고 초안에만
   * 더한다 — 기능권한과 메뉴 표시는 같은 '권한 변경 저장' 하나로 저장된다(두 축의 독립성 유지 — 자동 추가는 하지 않는다).
   */
  const entryCatalog = {
    ...catalog,
    operations: [...catalog.operations,
      { code: 'MENU_READ', name: '메뉴 조회', domain: 'MENU', action: 'READ' },
      { code: 'ADMCODE_READ', name: '행정 코드 조회', domain: 'ADMCODE', action: 'READ' },
      { code: 'AUTHRT_READ', name: '권한 조회', domain: 'AUTHRT', action: 'READ' },
      { code: 'AUTHRT_AUDIT', name: '권한 감사', domain: 'AUTHRT', action: 'AUDIT' }],
    navigation: [
      { code: 'MENU_1', name: '게시판', parentCode: null, route: null, useYn: 'Y' },
      { code: 'MENUS', name: '메뉴 관리', parentCode: null, route: '/admin/system/menus', useYn: 'Y' },
      { code: 'ADMCODES', name: '행정 표준코드 관리', parentCode: null, route: '/admin/system/codes/administ', useYn: 'Y' },
      { code: 'AUTHORITY', name: '권한 그룹 관리', parentCode: null, route: '/admin/security/authority', useYn: 'Y' },
      { code: 'GHOST', name: '없는 화면', parentCode: null, route: '/admin/unregistered-only-in-test/page', useYn: 'Y' },
    ],
  };
  const entrySnapshot: Snapshot = { ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, ...entryCatalog.navigation.map((menu) => ({ type: 'NAVIGATION', code: menu.code }))] };

  it('진입 권한 추가는 필요한 기능권한을 초안에 더하고, 같은 권한 변경 저장으로 저장한다', async () => {
    mocks.getCatalog.mockResolvedValue(entryCatalog);
    putGroup(entrySnapshot);
    await openGroup();
    expect(screen.getByText(/들어갈 수 없는 화면의 메뉴가 4개 있습니다/)).toHaveAttribute('role', 'status');
    expect(screen.getByText(/등록되지 않은 화면이라 기능권한으로 열 수 없습니다/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^없는 화면 진입 권한 추가/ })).not.toBeInTheDocument();

    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    // [2026-10-05] 상태 칸의 버튼은 짧은 '+ 권한 이름'이다 — 더할 권한을 누르기 전에 글자로 본다(반박 리뷰 반영: 종전 '권한 추가'는
    // 더할 권한을 title·설명에만 두었다). 접근 이름은 메뉴와 같은 권한 이름을 싣고, 코드까지 담은 필요한 권한 문장은 설명이다.
    const add = screen.getByRole('button', { name: '메뉴 관리 진입 권한 추가: 메뉴 조회' });
    expect(add).toHaveTextContent('메뉴 조회');
    expect(add).not.toHaveTextContent('권한 추가');
    expect(add).toHaveAccessibleDescription('필요한 권한: 메뉴 × 조회 (MENU_READ)');
    await userEvent.click(add);
    expect(saveGroupGrants).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^메뉴 관리 진입 권한 추가/ })).not.toBeInTheDocument();
    // 누른 버튼은 사라진다 — 포커스는 표 밖으로 가지 않고 같은 줄의 화면 진입 칸에 남고, 결과 문장은 알림 영역이 읽어 준다.
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '메뉴 관리 × 화면 진입 (MENU_READ)' })).toHaveFocus());
    const notice = screen.getByText(/메뉴 관리 진입 권한\(MENU_READ\)을 추가했습니다/);
    expect(notice.closest('[aria-live="polite"]')).not.toBeNull();
    // 표 위의 결과 문장으로는 한 번도 옮기지 않는다(포커스가 표 밖을 거쳐 돌아오지 않는다).
    expect(focusSpy.mock.contexts).not.toContain(notice);
    focusSpy.mockRestore();
    expect(screen.getByRole('tab', { name: '기능별 권한 1건 변경' })).toBeInTheDocument();
    // 같은 초안이라 화면별 권한 표의 칸도 켜지고, 상태는 '보임'이 된다.
    expect(screen.getByRole('checkbox', { name: '메뉴 관리 × 화면 진입 (MENU_READ)' })).toBeChecked();

    // 후보가 여럿인 화면은 '권한 추가'가 고르는 창을 연다 — 조회를 '권장'으로 먼저 보이되 사람이 고른다.
    await userEvent.click(screen.getByRole('button', { name: '권한 그룹 관리 진입 권한 추가: 후보 2개 중 고르기' }));
    const picker = await screen.findByRole('dialog', { name: '권한 그룹 관리 진입 권한 고르기' });
    expect(within(picker).getByRole('button', { name: /AUTHRT_READ/ })).toHaveTextContent('· 권장');
    await userEvent.click(within(picker).getByRole('button', { name: /AUTHRT_AUDIT/ }));

    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', {
      grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'MENU_READ' }, { type: 'OPERATION', code: 'AUTHRT_AUDIT' },
        ...entryCatalog.navigation.map((menu) => ({ type: 'NAVIGATION', code: menu.code }))],
      version: 'v1', complete: true,
    });
  });

  it('진입 권한 추가 안내는 추가한 권한을 다시 끄거나 저장하면 사라지고, 저장 뒤에도 이어서 편집할 수 있다', async () => {
    mocks.getCatalog.mockResolvedValue(entryCatalog);
    putGroup(entrySnapshot);
    await openGroup();
    const added = /메뉴 관리 진입 권한\(MENU_READ\)을 추가했습니다/;
    await userEvent.click(screen.getByRole('button', { name: /^메뉴 관리 진입 권한 추가/ }));
    expect(screen.getByText(added)).toBeVisible();

    // 추가한 칸을 끄면 '추가했습니다'는 더는 사실이 아니다.
    await openTab('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: /\(MENU_READ\)$/ }));
    await openTab('화면별 권한');
    expect(screen.queryByText(added)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^메뉴 관리 진입 권한 추가/ })).toBeInTheDocument();

    // 다시 추가한 뒤 저장하면 '저장하세요'도 더는 사실이 아니다.
    await userEvent.click(screen.getByRole('button', { name: /^메뉴 관리 진입 권한 추가/ }));
    expect(screen.getByText(added)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(added)).not.toBeInTheDocument());
    // [A2] 저장 뒤 편집 불가 잠금은 없다 — 응답 스냅샷이 새 기준선이다.
    expect(screen.queryByText(/다른 곳에서 변경되어/)).not.toBeInTheDocument();
    await untilEditable(menuCell('게시판', 'MENU_1'));
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('checkbox', { name: menuCell('게시판', 'MENU_1') }));
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).not.toHaveAttribute('aria-disabled');
  });

  it('진입 권한 모두 추가는 정해진 권한만 더하고 후보가 여럿인 메뉴는 뺀다고 말한다', async () => {
    mocks.getCatalog.mockResolvedValue(entryCatalog);
    putGroup(entrySnapshot);
    await openGroup();
    expect(screen.getByText(/후보가 여럿이거나 보호·타인 자료 권한이 필요한 메뉴 1개는 모두 추가에서 빠집니다/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '진입 권한 모두 추가' }));
    // 표 위의 '모두 추가'를 누르면 그 버튼이 사라지므로 포커스를 바로 옆 결과 문장으로 옮긴다.
    await waitFor(() => expect(screen.getByText(/메뉴 2개의 진입 권한을 추가했습니다/)).toHaveFocus());
    expect(screen.queryByRole('button', { name: /^메뉴 관리 진입 권한 추가/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^행정 표준코드 관리 진입 권한 추가/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^권한 그룹 관리 진입 권한 추가/ })).toBeInTheDocument();
    await openTab('기능별 권한');
    expect(screen.getByRole('checkbox', { name: /\(MENU_READ\)$/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /\(ADMCODE_READ\)$/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /\(AUTHRT_READ\)$/ })).not.toBeChecked();
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  /*
   * [2026-10-05 반박 리뷰 반영, H3] '모두 추가'는 영역·섹션 줄의 묶음 칸과 같은 제외 규칙을 따른다 — 정해진 권한이라도 타인 자료
   * 권한(…_ALL)이나 보호 권한이 필요한 메뉴는 빼고 화면 줄에서 고르게 한다. 종전에는 '모두 있어야 열림' 투표 관리(POLL_READ +
   * POLL_READ_ALL)와 댓글 관리(COMMENT_READ_ALL)를 한 번에 초안에 넣었다.
   */
  if (pageInProjection('/admin/survey/polls') && pageInProjection('/admin/system/comments')) it('진입 권한 모두 추가는 타인 자료 권한이 필요한 메뉴를 빼고, 그 메뉴는 화면 줄에서 고르게 한다', async () => {
    mocks.getCatalog.mockResolvedValue({
      ...catalog,
      operations: [...catalog.operations,
        { code: 'MENU_READ', name: '메뉴 조회', domain: 'MENU', action: 'READ' },
        { code: 'ADMCODE_READ', name: '행정 코드 조회', domain: 'ADMCODE', action: 'READ' },
        { code: 'POLL_READ', name: '투표 조회', domain: 'POLL', action: 'READ' },
        { code: 'POLL_READ_ALL', name: '타인 투표 조회', domain: 'POLL', action: 'READ_ALL' },
        { code: 'COMMENT_READ_ALL', name: '타인 댓글 조회', domain: 'COMMENT', action: 'READ_ALL' }],
      navigation: [
        { code: 'MENU_1', name: '게시판', parentCode: null, route: null, useYn: 'Y' },
        { code: 'MENUS', name: '메뉴 관리', parentCode: null, route: '/admin/system/menus', useYn: 'Y' },
        { code: 'ADMCODES', name: '행정 표준코드 관리', parentCode: null, route: '/admin/system/codes/administ', useYn: 'Y' },
        { code: 'POLLS', name: '투표 관리', parentCode: null, route: '/admin/survey/polls', useYn: 'Y' },
        { code: 'COMMENTS', name: '댓글 관리', parentCode: null, route: '/admin/system/comments', useYn: 'Y' },
      ],
    });
    putGroup({ ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, ...['MENU_1', 'MENUS', 'ADMCODES', 'POLLS', 'COMMENTS'].map((code) => ({ type: 'NAVIGATION', code }))] });
    await openGroup();
    expect(screen.getByText(/후보가 여럿이거나 보호·타인 자료 권한이 필요한 메뉴 2개는 모두 추가에서 빠집니다/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '진입 권한 모두 추가' }));
    await openTab('기능별 권한');
    expect(screen.getByRole('checkbox', { name: /\(MENU_READ\)$/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /\(ADMCODE_READ\)$/ })).toBeChecked();
    for (const code of ['POLL_READ', 'POLL_READ_ALL', 'COMMENT_READ_ALL']) expect(screen.getByRole('checkbox', { name: new RegExp(`\\(${code}\\)$`) })).not.toBeChecked();
    // 빠진 메뉴는 화면 줄의 단추가 더할 권한을 글자로 보인 채 남는다 — 사람이 그 화면 하나를 골라 더한다.
    await openTab('화면별 권한');
    expect(screen.getByRole('button', { name: '투표 관리 진입 권한 추가: 투표 조회, 타인 투표 조회' })).toHaveTextContent('투표 조회, 타인 투표 조회');
    expect(screen.getByRole('button', { name: '댓글 관리 진입 권한 추가: 타인 댓글 조회' })).toHaveTextContent('타인 댓글 조회');
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('권한 설정 권한이 없으면 진입 권한 경고만 보이고 고치는 버튼은 없다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    mocks.getCatalog.mockResolvedValue(entryCatalog);
    putGroup(entrySnapshot);
    await openGroup();
    expect(screen.getByText(/들어갈 수 없는 화면의 메뉴가 4개 있습니다/)).toBeVisible();
    // [2026-10-05] 버튼 이름 뒤에 권한 이름이 붙으므로 끝 고정($) 없이 찾는다(끝 고정이면 늘 맞지 않아 빈 검사가 된다).
    expect(screen.queryByRole('button', { name: /진입 권한 (모두 )?추가/, hidden: true })).not.toBeInTheDocument();
    // 고칠 수 없는 대신 무엇이 필요한지는 글자로 보인다.
    expect(screen.getByText('필요: 메뉴 조회')).toBeVisible();
  });

  it('기본 정보를 편집하는 동안에도 진입 권한을 더할 수 있고, 저장하는 동안에는 잠긴다', async () => {
    mocks.getCatalog.mockResolvedValue(entryCatalog);
    putGroup(entrySnapshot);
    updateGroup.mockImplementation(() => new Promise(() => undefined));
    await openGroup('기본 정보');
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '편집 중 그룹' } });
    await openTab('화면별 권한');
    expect(screen.getByRole('button', { name: /^메뉴 관리 진입 권한 추가/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: '진입 권한 모두 추가' })).toBeEnabled();
    await openTab('기본 정보');
    await userEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }));
    await openTab('화면별 권한');
    expect(screen.getByRole('button', { name: /^메뉴 관리 진입 권한 추가/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '진입 권한 모두 추가' })).toBeDisabled();
  });

  it('접힌 상위 메뉴를 해제해도 모든 하위 선택을 회수하고 기능권한과 다른 메뉴는 보존한다', async () => {
    mocks.getCatalog.mockResolvedValue(treeCatalog);
    putGroup({ ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, ...treeCatalog.navigation.map((menu) => ({ type: 'NAVIGATION', code: menu.code }))] });
    await openGroup();
    // 처음에는 영역만 펼친다 — 섹션 아래 화면을 보려면 섹션을 펼친다.
    expect(screen.queryByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '게시판 관리 하위 메뉴 펼치기' }));
    expect(screen.getByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') })).toBeChecked();
    const disclosure = screen.getByRole('button', { name: '업무 메뉴 하위 메뉴 접기' });
    disclosure.focus();
    await userEvent.keyboard('{Enter}');
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    // 탭을 오가도 표 펼침 상태를 잃지 않는다.
    await openTab('기능별 권한');
    await openTab('화면별 권한');
    expect(screen.getByRole('button', { name: '업무 메뉴 하위 메뉴 펼치기' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: menuCell('업무 메뉴', 'ROOT') }));
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'NAVIGATION', code: 'OTHER' }], version: 'v1', complete: true });
  });

  it('하위 메뉴를 키보드로 선택하면 모든 상위 메뉴만 함께 저장하고 형제는 선택하지 않는다', async () => {
    mocks.getCatalog.mockResolvedValue(treeCatalog);
    putGroup({ ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }] });
    await openGroup();
    await userEvent.click(screen.getByRole('button', { name: '게시판 관리 하위 메뉴 펼치기' }));
    screen.getByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') }).focus();
    await userEvent.keyboard('[Space]');
    // [2026-10-05] 영역·섹션 줄의 메뉴 표시 칸은 아래 메뉴의 집계다 — 형제(통계 메뉴)가 꺼져 있어 업무 메뉴는 일부 선택이다.
    expect(screen.getByRole('checkbox', { name: menuCell('업무 메뉴', 'ROOT') })).toBePartiallyChecked();
    for (const [name, code] of [['게시판 관리', 'BRANCH'], ['게시글 목록', 'LEAF']]) expect(screen.getByRole('checkbox', { name: menuCell(name, code) })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: menuCell('통계 메뉴', 'SIBLING') })).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, ...['ROOT', 'BRANCH', 'LEAF'].map((code) => ({ type: 'NAVIGATION', code }))], version: 'v1', complete: true });
  });

  /*
   * [2026-10-05 사용자 승인 — 시안 의미] 영역·섹션 줄의 메뉴 표시 칸은 그 아래 메뉴 전체를 켜고 끈다. 종전에는 그 메뉴 자신만 켜
   * ('상위 메뉴만 선택하면 하위 메뉴는 자동 선택되지 않는다') 섹션을 운영하게 하려면 하위 화면마다 메뉴 표시를 따로 켜야 했다.
   * 기능권한은 건드리지 않는다(메뉴 표시와 기능권한은 다른 권한, H3).
   */
  it('영역 줄의 메뉴 표시는 그 아래 메뉴 전체를 켜고 끄며 기능권한과 다른 영역은 건드리지 않는다', async () => {
    mocks.getCatalog.mockResolvedValue(treeCatalog);
    putGroup({ ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }] });
    await openGroup();
    const root = screen.getByRole('checkbox', { name: menuCell('업무 메뉴', 'ROOT') });
    expect(root).toHaveAccessibleDescription(/아래 메뉴 4개 중 0개 표시/);
    await userEvent.click(root);
    expect(root).toBeChecked();
    expect(screen.getByRole('checkbox', { name: menuCell('게시판 관리', 'BRANCH') })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: menuCell('통계 메뉴', 'SIBLING') })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: menuCell('다른 메뉴', 'OTHER') })).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: '게시판 관리 하위 메뉴 펼치기' }));
    expect(screen.getByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') })).toBeChecked();
    expect(screen.getByText(/영역·섹션 줄의 메뉴 표시 칸은 그 아래 메뉴 전체를 한 번에 켜고 끕니다/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenLastCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, ...['ROOT', 'BRANCH', 'LEAF', 'SIBLING'].map((code) => ({ type: 'NAVIGATION', code }))], version: 'v1', complete: true });
    // 다시 누르면 그 아래 전체를 끈다.
    await untilEditable(menuCell('업무 메뉴', 'ROOT'));
    await userEvent.click(screen.getByRole('checkbox', { name: menuCell('업무 메뉴', 'ROOT') }));
    for (const [name, code] of [['업무 메뉴', 'ROOT'], ['게시판 관리', 'BRANCH'], ['게시글 목록', 'LEAF'], ['통계 메뉴', 'SIBLING']]) {
      expect(screen.getByRole('checkbox', { name: menuCell(name, code) })).not.toBeChecked();
    }
  });

  it.each(['parent', 'child'])('기존 상위 누락은 자동 수정하지 않고 저장을 막되 %s 선택 수정으로 복구할 수 있다', async (repair) => {
    mocks.getCatalog.mockResolvedValue(treeCatalog);
    putGroup({ ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'NAVIGATION', code: 'LEAF' }] });
    await openGroup('기능별 권한');
    // 저장을 막는 이유는 어느 탭에서도 보여야 한다 — 이유 없이 죽은 저장 버튼을 남기지 않는다(G10).
    const gapReason = screen.getByText(/상위 메뉴가 선택되지 않은 메뉴가 있습니다/);
    expect(gapReason).toHaveAttribute('role', 'alert');
    expect(gapReason).toBeVisible();
    expect(gapReason).toHaveTextContent(/'화면별 권한' 탭의 '메뉴 표시' 칸에서/);
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true');
    expect(gapReason).toBeVisible();
    await openTab('화면별 권한');
    await userEvent.click(screen.getByRole('button', { name: '게시판 관리 하위 메뉴 펼치기' }));
    expect(screen.getByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') })).toBeChecked();
    // 영역 줄의 칸은 아래 메뉴의 집계다 — 게시글 목록만 켜져 있어 일부 선택이고, 업무 메뉴 자신은 표시 안 함이라고 설명한다.
    expect(screen.getByRole('checkbox', { name: menuCell('업무 메뉴', 'ROOT') })).toBePartiallyChecked();
    expect(screen.getByRole('checkbox', { name: menuCell('업무 메뉴', 'ROOT') })).toHaveAccessibleDescription(/이 메뉴 표시 안 함/);
    expect(gapReason).toBeVisible();
    await userEvent.click(screen.getByRole('checkbox', { name: repair === 'parent' ? menuCell('게시판 관리', 'BRANCH') : menuCell('게시글 목록', 'LEAF') }));
    expect(screen.queryByText(/상위 메뉴가 선택되지 않은 메뉴가 있습니다/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    const navigation = repair === 'parent' ? ['ROOT', 'BRANCH', 'LEAF'] : [];
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'BOARD_CREATE' }, ...navigation.map((code) => ({ type: 'NAVIGATION', code }))], version: 'v1', complete: true });
  });

  it('조회 권한만 있어도 메뉴 계층은 펼칠 수 있지만 선택을 바꾸거나 저장할 수 없다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    mocks.getCatalog.mockResolvedValue(treeCatalog);
    putGroup({ ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }] });
    await openGroup();
    const table = within(screen.getByRole('group', { name: '화면별 권한 선택' })).getByRole('table');
    // 384px 상자가 아니라 A5 의 고정 머리글 스크롤 상자다. [2026-10-05] 편집기는 fill 변형을 쓴다 — 넓고 높은 화면에서는 남은
    // 높이를 채우고(work-fill:flex-1), 조건 밖에서는 70vh 상자다. 칸이 고정 머리글·첫 열 밑에 가리지 않게 스크롤 여백을 둔다.
    const box = table.parentElement!.className.split(/\s+/);
    expect(box).toEqual(expect.arrayContaining(['max-h-[min(70vh,48rem)]', 'overflow-auto', 'work-fill:flex-1', 'work-fill:max-h-[var(--work-fill-height)]', 'scroll-pt-8', 'scroll-pl-[15rem]']));
    for (const checkbox of within(table).getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: '업무 메뉴 하위 메뉴 접기' }));
    await userEvent.click(screen.getByRole('button', { name: '업무 메뉴 하위 메뉴 펼치기' }));
    await userEvent.click(screen.getByRole('button', { name: '게시판 관리 하위 메뉴 펼치기' }));
    expect(screen.getByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '권한 변경 저장' })).not.toBeInTheDocument();
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('메뉴를 선택한 뒤 그룹 revision이 바뀌면 선택은 보존하고 추가 변경·저장을 막는다', async () => {
    mocks.getCatalog.mockResolvedValue(treeCatalog);
    const original = { ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }] };
    putGroup(original);
    const view = await openGroup();
    await userEvent.click(screen.getByRole('button', { name: '게시판 관리 하위 메뉴 펼치기' }));
    await userEvent.click(screen.getByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') }));
    act(() => view.client.setQueryData(['authorization', 'operator', 'auth-v1', 'group', 'CONTENT'], { ...original, version: 'v2' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: menuCell('게시글 목록', 'LEAF') })).toBeDisabled();
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: 'INVALID', name: '없는 상위 메뉴', parentCode: 'MISSING', route: null, useYn: 'Y' }],
    [{ code: 'INVALID', name: '순환 메뉴', parentCode: 'INVALID', route: null, useYn: 'Y' }],
  ])('손상된 메뉴 계층은 기능·메뉴 변경과 저장을 모두 막는다: %j', async (item) => {
    mocks.getCatalog.mockResolvedValue({ ...catalog, navigation: [item] });
    putGroup({ ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }] });
    await openGroup();
    // 기본 탭에서 칸을 그릴 수 없으므로 그 이유도 기본 탭에서 보여야 한다.
    expect(screen.getByText(/메뉴 설정을 확인한 뒤 다시 조회해 주세요/)).toHaveAttribute('role', 'alert');
    expect(screen.getByText(/메뉴 설정을 확인한 뒤 다시 조회해 주세요/)).toBeVisible();
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true');
    await openTab('기능별 권한');
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeDisabled();
    expect(screen.getByText(/메뉴 설정을 확인한 뒤 다시 조회해 주세요/)).toBeVisible();
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });
});

/**
 * [2026-10-01] 그룹 쪽에서 배정된 사용자를 보고, 사용자 상세에서 넘어온 대상으로 바로 연다(UI/UX 분석 15번).
 * [2026-10-02] 구성원은 편집기의 '구성원' 탭에 있다.
 */
describe('SecurityHub: 그룹 구성원과 대상 인계', () => {
  beforeEach(() => {
    resetMocks();
    mocks.permissions = ['AUTHRT_READ', 'AUTHRT_ASSIGN', 'AUTHRT_AUDIT'];
    mocks.getUsers.mockResolvedValue(page([]));
    mocks.getMemberships.mockResolvedValue(membership);
    mocks.getGroupMembers.mockResolvedValue(page([{ id: 'ESNTL_A', userId: 'login-a', userNm: '사용자 가', departmentId: null }], 21));
  });

  it('그룹 상세의 구성원 탭에 배정된 사용자 수와 목록을 보이고, 행에서 그 사람의 배정 편집으로 간다', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: /콘텐츠 담당.*CONTENT/ }));
    await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });
    await openTab('구성원');

    expect(await screen.findByRole('heading', { name: '배정된 사용자 (21명)' })).toBeInTheDocument();
    expect(mocks.getGroupMembers).toHaveBeenCalledWith('CONTENT', 0, 20);
    await userEvent.click(screen.getByRole('button', { name: '사용자 가 배정 편집' }));

    expect(await screen.findByRole('region', { name: '사용자 권한 그룹 배정' })).toBeInTheDocument();
    expect(mocks.getMemberships).toHaveBeenCalledWith('ESNTL_A');
    expect(screen.getByRole('button', { name: '사용자 배정' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('사용자 상세에서 넘어온 대상이 있으면 사용자 배정 탭에서 그 사람을 연다', async () => {
    const { handOffTarget } = await import('@/lib/navigation/target-handoff');
    handOffTarget('authority-user', { id: 'ESNTL_A', loginId: 'login-a', name: '사용자 가' });
    setup();

    expect(await screen.findByRole('region', { name: '사용자 권한 그룹 배정' })).toBeInTheDocument();
    expect(mocks.getMemberships).toHaveBeenCalledWith('ESNTL_A');
    expect(screen.getByRole('heading', { name: '사용자 가' })).toBeInTheDocument();
  });

  /*
   * [2026-10-05 한 화면 압축 2차, 과제 B] 허브 '변경 이력' 영역은 업무면 fill 셸이다 — 표가 늘어 페이지가 970~2,042px 스크롤하던 것을,
   * 조건·쪽 넘김은 제자리에 두고 표 상자만 남은 높이 안에서 스크롤하게 했다. 행은 편집기 이력 탭과 같은 업무 표 행 토큰이다.
   * 사용자 배정·그룹 비교는 실측에서 넘치지 않아 종전처럼 쌓인다.
   */
  it('변경 이력 영역은 fill 셸이고 이력 표는 남은 높이를 받는 이름 있는 스크롤 상자 안에 있다 — 사용자 배정·그룹 비교는 쌓인다', async () => {
    mocks.getHistory.mockResolvedValue(page([
      { id: 1, targetType: 'USER_GROUP', changeType: 'ADD', group: 'CONTENT', userId: 'ESNTL_A', userNm: '홍길동', grantType: null, grantCode: null, field: 'membership', before: null, after: 'CONTENT', actorId: 'ESNTL_OP', actorNm: '운영자', createdAt: '2026-09-10T10:00:00' },
    ]));
    const view = setup();
    const shell = () => view.container.querySelector('main')!;
    expect(shell()).toHaveAttribute('data-work-fill');
    await userEvent.click(screen.getByRole('button', { name: '변경 이력' }));
    const table = await screen.findByRole('table', { name: '권한 변경 이력' });
    expect(shell()).toHaveAttribute('data-work-fill');
    // 영역 → 표 상자까지 남은 높이를 넘겨받는 사슬이다(표 상자는 PermissionScrollRegion 의 fill 변형).
    expect(screen.getByRole('region', { name: '권한 변경 이력' })).toHaveClass('work-fill:flex-1', 'work-fill:min-h-0', 'work-fill:flex-col');
    expect(table.parentElement).toHaveClass('relative', 'overflow-auto', 'work-fill:flex-1');
    expect(table.querySelector('thead')).toHaveClass('sticky', 'top-0');
    // 칸은 업무 표 행 토큰이고, 그룹과 사용자는 한 칸 안에 잇는다(종전처럼 블록 두 줄로 쌓지 않는다). 짧은 사실은 낱말 안에서 꺾지 않는다.
    const cells = within(table).getAllByRole('cell');
    for (const cell of cells) expect(cell).toHaveClass('py-[var(--work-cell-py)]');
    const person = within(table).getByText('홍길동 (ESNTL_A)');
    expect(person.tagName).toBe('SPAN');
    expect(person.closest('td')).toHaveTextContent('CONTENT · 홍길동 (ESNTL_A)');
    expect(person.closest('td')).toHaveClass('break-keep');
    expect(within(table).getByText('운영자 (ESNTL_OP)')).toHaveClass('break-keep');
    await userEvent.click(screen.getByRole('button', { name: '사용자 배정' }));
    expect(shell()).not.toHaveAttribute('data-work-fill');
    await userEvent.click(screen.getByRole('button', { name: '그룹 비교' }));
    expect(shell()).not.toHaveAttribute('data-work-fill');
  });

  it('권한 변경 이력으로 넘어오면 그 사람의 로그인 ID 로 조회한 이력을 연다', async () => {
    const { handOffTarget } = await import('@/lib/navigation/target-handoff');
    handOffTarget('authority-history-user', { id: 'ESNTL_A', loginId: 'login-a', name: '사용자 가' });
    setup();

    await waitFor(() => expect(mocks.getHistory).toHaveBeenCalledWith(0, 20, { userId: 'login-a' }));
    expect(screen.getByRole('textbox', { name: '대상 사용자 로그인 ID' })).toHaveValue('login-a');
  });

  it('이력은 원시 코드 대신 한국어 라벨과 날짜 형식으로 보인다 — 모르는 코드는 원문으로 남긴다', async () => {
    mocks.permissions = ['AUTHRT_AUDIT'];
    mocks.getHistory.mockResolvedValue(page([
      { id: 1, requestId: 'r', policyVersion: 'p', targetType: 'GROUP_GRANT', changeType: 'ADD', group: 'CONTENT', userId: null, userNm: null,
        grantType: 'OPERATION', grantCode: 'BOARD_READ', field: 'authrt_grnt_cd', before: null, after: 'BOARD_READ', actorId: 'E0', actorNm: '운영자', createdAt: '2026-10-01T09:10:11.123', reason: null },
      { id: 2, requestId: 'r', policyVersion: 'p', targetType: 'NEW_KIND', changeType: 'UPDATE', group: 'CONTENT', userId: null, userNm: null,
        grantType: null, grantCode: null, field: 'authrt_nm', before: '가', after: '나', actorId: 'E0', actorNm: '운영자', createdAt: '2026-10-01T09:11:00', reason: '복제 원본: SURVEY' },
    ]));
    setup();

    const table = within(await screen.findByRole('table', { name: '권한 변경 이력' }));
    expect(await table.findByText('2026-10-01 09:10:11')).toBeInTheDocument();
    expect(table.getByText('그룹 권한')).toBeInTheDocument();
    expect(table.getByText('추가')).toBeInTheDocument();
    expect(table.getByText('기능 권한 BOARD_READ')).toBeInTheDocument();
    expect(table.getByText('NEW_KIND')).toBeInTheDocument();
    expect(table.getByText('그룹 이름')).toBeInTheDocument();
    // [2026-10-02] 복제 사유가 남은 행은 사유 칸에 원본이 보인다.
    expect(table.getByText('복제 원본: SURVEY')).toBeInTheDocument();
  });
});

/**
 * [2026-10-02 관리 콘솔 UX 2단계] 그룹 복제(A6)·변경 이력 탭(A5)·메뉴 미리보기(A7)를 허브 흐름으로 본다. 구성원 추가·회수(A4)와
 * 화면별 권한 표(A3)의 세부 계약은 각 컴포넌트 테스트가 고정한다.
 */
describe('SecurityHub: 그룹 복제·변경 이력·메뉴 미리보기', () => {
  beforeEach(resetMocks);

  it('편집기 머리의 이 그룹으로 새 그룹 만들기는 원본 버전과 함께 복제하고 새 그룹을 연다', async () => {
    await openGroup();
    // [2026-10-05] 머리를 한 줄로 줄이며 '더보기' 안으로 옮겼다.
    await openMore();
    await userEvent.click(screen.getByRole('button', { name: '이 그룹으로 새 그룹 만들기' }));
    const dialog = await screen.findByRole('dialog', { name: '이 그룹으로 새 그룹 만들기' });
    expect(within(dialog).getByText(/기능권한 1개 · 메뉴 표시 1개/)).toBeInTheDocument();
    expect(within(dialog).getByText(/구성원은 복사하지 않습니다/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: '그룹 코드' }), { target: { value: 'CONTENT_COPY' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '그룹명' }), { target: { value: '콘텐츠 보조' } });
    await userEvent.click(within(dialog).getByRole('button', { name: '새 그룹 만들기' }));
    expect(createGroupCopy).toHaveBeenCalledWith('CONTENT', { code: 'CONTENT_COPY', name: '콘텐츠 보조', description: '콘텐츠 운영', sourceVersion: 'v1' });
    expect(await screen.findByRole('region', { name: '콘텐츠 보조 권한 설정' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '이 그룹으로 새 그룹 만들기' })).not.toBeInTheDocument();
  });

  it('그룹 목록의 행에서도 그 그룹으로 새 그룹 만들기를 연다 — 다른 그룹의 미저장 변경은 먼저 묻는다', async () => {
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    mocks.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole('button', { name: '설문 담당 그룹으로 새 그룹 만들기' }));
    expect(screen.queryByRole('dialog', { name: '이 그룹으로 새 그룹 만들기' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '콘텐츠 담당 권한 설정' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '설문 담당 그룹으로 새 그룹 만들기' }));
    const dialog = await screen.findByRole('dialog', { name: '이 그룹으로 새 그룹 만들기' });
    expect(within(dialog).getByText('설문 담당')).toBeInTheDocument();
  });

  it('복제 아이콘으로 정한 원본은 다른 그룹을 고르면 지워진다 — 나중에 그 그룹을 다시 골라도 복제 대화상자가 저절로 열리지 않는다', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    // 콘텐츠 담당의 첫 조회는 늦게 끝난다 — 복제 아이콘을 누르고 그 그룹이 열리기 전에 다른 그룹을 고른다.
    mocks.getGroup.mockImplementation(async (code: string) => { if (code === 'CONTENT') await gate; return server.get(code); });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: '콘텐츠 담당 그룹으로 새 그룹 만들기' }));
    await userEvent.click(screen.getByRole('button', { name: /설문 담당.*SURVEY/ }));
    await screen.findByRole('region', { name: '설문 담당 권한 설정' });
    act(() => release());
    await userEvent.click(screen.getByRole('button', { name: /콘텐츠 담당.*CONTENT/ }));
    await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' });
    expect(screen.queryByRole('dialog', { name: '이 그룹으로 새 그룹 만들기' })).not.toBeInTheDocument();
    // 복제는 다시 누르면 열린다.
    await openMore();
    await userEvent.click(screen.getByRole('button', { name: '이 그룹으로 새 그룹 만들기' }));
    expect(await screen.findByRole('dialog', { name: '이 그룹으로 새 그룹 만들기' })).toBeInTheDocument();
  });

  it('내가 속한 그룹을 저장해 내 권한 버전이 바뀌어도 편집기를 다시 만들지 않는다 — 기본 정보 초안과 고른 탭이 남는다(A2)', async () => {
    const view = await openGroup('기본 정보');
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '편집 중 그룹' } });
    await openTab('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('기능권한과 메뉴 표시를 저장했습니다.', 'success'));
    const reads = mocks.getGroup.mock.calls.length;
    // 인증 컨텍스트가 하는 일을 흉내 낸다 — 내 권한 버전이 바뀌면 조회 캐시를 비우고 새 사용자 정보를 내려 준다.
    act(() => { mocks.version = 'auth-v2'; view.client.clear(); view.rerender(hubTree(view.client)); });
    // 다시 읽는 동안에도 편집기는 같은 그룹의 직전 스냅샷을 들고 남는다 — 고른 탭이 그대로다.
    expect(screen.getByRole('region', { name: '콘텐츠 담당 권한 설정' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^기능별 권한/ })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(mocks.getGroup.mock.calls.length).toBeGreaterThan(reads));
    await openTab('기본 정보');
    expect(screen.getByRole('textbox', { name: '그룹명' })).toHaveValue('편집 중 그룹');
    // 다시 읽은 스냅샷도 같은 버전이라 이어서 저장할 수 있다.
    await waitFor(() => expect(screen.getByRole('button', { name: '그룹 정보 저장' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }));
    await waitFor(() => expect(updateGroup).toHaveBeenCalledWith('CONTENT', expect.objectContaining({ name: '편집 중 그룹' })));
  });

  it('보호 권한을 가진 원본은 권한 배정 권한이 없으면 복제할 수 없다고 말한다', async () => {
    mocks.permissions = ['AUTHRT_READ', 'AUTHRT_CREATE', 'AUTHRT_GRANT'];
    putGroup({ ...snapshot, grants: [...snapshot.grants, { type: 'OPERATION', code: 'AUTHRT_GRANT' }] });
    mocks.getCatalog.mockResolvedValue({ ...catalog, operations: [...catalog.operations, { code: 'AUTHRT_GRANT', name: '권한 설정', domain: 'AUTHRT', action: 'GRANT' }] });
    await openGroup();
    await openMore();
    await userEvent.click(screen.getByRole('button', { name: '이 그룹으로 새 그룹 만들기' }));
    const dialog = await screen.findByRole('dialog', { name: '이 그룹으로 새 그룹 만들기' });
    expect(within(dialog).getByText(/권한 설정과 권한 배정 권한이 모두 필요합니다/)).toBeInTheDocument();
    expect(within(dialog).getByText(/권한 배정 권한이 없어 이 그룹을 복제할 수 없습니다/)).toHaveAttribute('role', 'alert');
    expect(within(dialog).getByRole('button', { name: '새 그룹 만들기' })).toBeDisabled();
  });

  it('변경 이력 탭은 이 그룹의 변경만 사유와 함께 보이고, 감사 권한이 없으면 탭이 없다', async () => {
    mocks.getHistory.mockResolvedValue(page([
      { id: 7, requestId: 'r', policyVersion: 'p', targetType: 'GROUP', changeType: 'ADD', group: 'CONTENT', userId: null, userNm: null,
        grantType: null, grantCode: null, field: 'authrt_nm', before: null, after: '콘텐츠 담당', actorId: 'E0', actorNm: '운영자', createdAt: '2026-10-02T09:00:00', reason: '복제 원본: SURVEY' },
    ]));
    await openGroup('변경 이력');
    const table = within(await screen.findByRole('table', { name: '이 그룹의 권한 변경 이력' }));
    expect(await table.findByText('그룹 추가: 그룹 이름')).toBeInTheDocument();
    expect(table.getByText('운영자 (E0)')).toBeInTheDocument();
    expect(table.getByText('복제 원본: SURVEY')).toBeInTheDocument();
    expect(mocks.getHistory).toHaveBeenCalledWith(0, 20, { groupCode: 'CONTENT' });
  });

  it('감사 권한이 없으면 변경 이력 탭을 두지 않는다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    await openGroup();
    expect(screen.queryByRole('tab', { name: '변경 이력' })).not.toBeInTheDocument();
  });

  const previewCatalog = {
    ...catalog,
    operations: [...catalog.operations, { code: 'MENU_READ', name: '메뉴 조회', domain: 'MENU', action: 'READ' }],
    navigation: [
      { code: 'AREA', name: '시스템', parentCode: null, route: null, useYn: 'Y' },
      { code: 'MENUS', name: '메뉴 관리', parentCode: 'AREA', route: '/admin/system/menus', useYn: 'Y' },
      { code: 'NOTES', name: '쪽지함', parentCode: 'AREA', route: '/note', useYn: 'Y' },
    ],
  };

  it('메뉴 미리보기는 초안 기준 사이드바와 숨는 메뉴·이유를 보이고, 줄로 가기는 그 줄에 포커스한다', async () => {
    mocks.getCatalog.mockResolvedValue(previewCatalog);
    putGroup({ ...snapshot, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, ...['AREA', 'MENUS', 'NOTES'].map((code) => ({ type: 'NAVIGATION', code }))] });
    await openGroup();
    await userEvent.click(screen.getByRole('button', { name: '메뉴 미리보기' }));
    const dialog = await screen.findByRole('dialog', { name: '콘텐츠 담당 메뉴 미리보기' });
    const visible = within(dialog).getByRole('list', { name: '보이는 메뉴 트리' });
    expect(within(visible).getByText('시스템')).toBeInTheDocument();
    expect(within(visible).getByText('쪽지함')).toBeInTheDocument();
    expect(within(visible).queryByText('메뉴 관리')).not.toBeInTheDocument();
    expect(within(dialog).getByText('메뉴 표시를 줬지만 숨는 메뉴 1개')).toBeInTheDocument();
    expect(within(dialog).getByText('진입 권한 없음')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '메뉴 관리 줄로 가기' }));
    expect(screen.queryByRole('dialog', { name: '콘텐츠 담당 메뉴 미리보기' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('rowheader', { name: '메뉴 관리' })).toHaveFocus());
    // 미리보기는 초안을 바꾸지 않는다.
    expect(saveGroupGrants).not.toHaveBeenCalled();
    expect(screen.queryByRole('tab', { name: /건 변경$/ })).not.toBeInTheDocument();
  });

  it('사용자 메뉴 미리보기는 고른 그룹의 권한을 합치고, 고치기는 그 그룹의 화면별 권한 줄로 간다', async () => {
    mocks.getCatalog.mockResolvedValue(previewCatalog);
    putGroup({ ...snapshot, grants: [{ type: 'NAVIGATION', code: 'AREA' }, { type: 'NAVIGATION', code: 'MENUS' }] });
    putGroup({ ...groups[1], complete: true, grants: [{ type: 'NAVIGATION', code: 'AREA' }, { type: 'NAVIGATION', code: 'NOTES' }] });
    mocks.getMemberships.mockResolvedValue({ ...membership, groups: ['CONTENT', 'SURVEY'] });
    await openMembership();
    await userEvent.click(screen.getByRole('button', { name: '메뉴 미리보기' }));
    const dialog = await screen.findByRole('dialog', { name: '사용자 가 메뉴 미리보기' });
    expect(await within(dialog).findByText(/지금 고른 그룹 2개\(콘텐츠 담당, 설문 담당\)/)).toBeInTheDocument();
    // 두 그룹의 메뉴 표시를 합친다 — 쪽지함은 설문 담당이 준다.
    expect(within(within(dialog).getByRole('list', { name: '보이는 메뉴 트리' })).getByText('쪽지함')).toBeInTheDocument();
    expect(within(dialog).getByText('진입 권한 없음')).toBeInTheDocument();
    // 버튼 이름은 보이는 글자('콘텐츠 담당에서 고치기')로 시작하고 고칠 메뉴를 덧붙인다(WCAG 2.5.3).
    await userEvent.click(within(dialog).getByRole('button', { name: '콘텐츠 담당에서 고치기 (메뉴 관리)' }));
    expect(await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '그룹 · 기능권한' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: /^화면별 권한/ })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.getByRole('rowheader', { name: '메뉴 관리' })).toHaveFocus());
    // URL·브라우저 저장소에 대상을 싣지 않는다.
    expect(window.location.search).toBe('');
    expect(window.sessionStorage.length).toBe(0);
  });
});

/**
 * [2026-10-05 한 화면 압축, 사용자 승인] 첫 진입 자동 선택, 그룹 단추의 저장된 수·저장하지 않은 변경 수, 저장 막대(보이는 탭·요약·
 * 변경 목록·권한만 되돌리기), '더보기', 기본 정보 탭의 위험 영역.
 */
describe('SecurityHub: 한 화면 작업대', () => {
  beforeEach(resetMocks);

  it('처음 들어오면 첫 그룹을 골라 작업대를 연다 — URL·브라우저 저장소는 바꾸지 않는다', async () => {
    setup();
    expect(await screen.findByRole('region', { name: '콘텐츠 담당 권한 설정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /콘텐츠 담당.*CONTENT/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('설정할 권한 그룹을 선택하세요.')).not.toBeInTheDocument();
    expect(mocks.getGroup).toHaveBeenCalledWith('CONTENT');
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('자동 선택은 처음 한 번뿐이다 — 고른 그룹을 지운 뒤에는 다시 고르지 않는다', async () => {
    await openGroup('기본 정보');
    await userEvent.click(screen.getByRole('button', { name: '그룹 삭제' }));
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('CONTENT', 'v1'));
    expect(await screen.findByText('설정할 권한 그룹을 선택하세요.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /권한 설정$/ })).not.toBeInTheDocument();
  });

  it('그룹 단추는 저장된 메뉴·기능 수(전체 그룹 권한 조회)와 지금 편집 중인 그룹의 저장하지 않은 변경 수를 보인다', async () => {
    await openGroup('기능별 권한');
    const content = screen.getByRole('button', { name: /콘텐츠 담당.*CONTENT/ });
    await waitFor(() => expect(content).toHaveTextContent('CONTENT · 메뉴 1 · 기능 1'));
    expect(screen.getByRole('button', { name: /설문 담당.*SURVEY/ })).toHaveTextContent('SURVEY · 메뉴 0 · 기능 0');
    expect(content).not.toHaveTextContent('변경');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    await userEvent.click(screen.getByRole('checkbox', { name: QESTNR_READ }));
    expect(content).toHaveTextContent('변경 2');
    // 다른 그룹 단추에는 붙지 않는다.
    expect(screen.getByRole('button', { name: /설문 담당.*SURVEY/ })).not.toHaveTextContent('변경');
    // 되돌리면 사라진다.
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    await userEvent.click(screen.getByRole('checkbox', { name: QESTNR_READ }));
    expect(content).not.toHaveTextContent('변경');
  });

  it('저장이 끝나 막힌 권한 변경 저장 단추도 포커스를 잃지 않고, 막힌 동안 눌러도 저장하지 않는다', async () => {
    let resolveWrite: () => void = () => undefined;
    saveGroupGrants.mockImplementation((code: string, body: { grants: Grant[] }) => new Promise((resolve) => {
      resolveWrite = () => resolve(commit(code, { grants: body.grants }));
    }));
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    const save = screen.getByRole('button', { name: '권한 변경 저장' });
    await userEvent.click(save);
    // 저장하는 동안은 disabled + aria-busy 다(쓰기 잠금 계약). 브라우저는 disabled 가 된 포커스 요소에서 포커스를 body 로 보낼 수 있다 —
    // jsdom 은 그러지 않고 disabled 단추의 blur 도 무시하므로, 잠깐 둔 단추를 거쳐 포커스를 body 로 보내 흉내 낸다.
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'true');
    act(() => {
      const probe = document.createElement('button');
      document.body.append(probe);
      probe.focus();
      probe.blur();
      probe.remove();
    });
    expect(document.body).toHaveFocus();
    await act(async () => { resolveWrite(); });
    await waitFor(() => expect(save).toHaveAttribute('aria-busy', 'false'));
    // 저장이 끝난 단추는 막혀도 disabled 가 아니라 aria-disabled 이고(2.4.3), 저장하는 동안 잃은 포커스를 되돌려 받는다.
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(save).not.toBeDisabled();
    await waitFor(() => expect(save).toHaveFocus());
    await userEvent.click(save);
    expect(saveGroupGrants).toHaveBeenCalledTimes(1);
  });

  it('그룹을 바꾸면 버린 변경 수가 새 그룹 단추에 한 번도 그려지지 않는다', async () => {
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    expect(screen.getByRole('button', { name: /콘텐츠 담당.*CONTENT/ })).toHaveTextContent('변경 1');
    const survey = screen.getByRole('button', { name: /설문 담당.*SURVEY/ });
    // 중간 그림까지 본다 — 종전에는 새 그룹 단추가 먼저 '변경 1'로 그려지고 앞 편집기의 정리가 그 뒤에 0 으로 지웠다(최종 상태만 보면 놓친다).
    const added: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) added.push(node.textContent ?? '');
    });
    observer.observe(survey, { childList: true, subtree: true, characterData: true });
    await userEvent.click(survey);
    await screen.findByRole('region', { name: '설문 담당 권한 설정' });
    await waitFor(() => expect(survey).toHaveAttribute('aria-pressed', 'true'));
    observer.disconnect();
    expect(mocks.confirm).toHaveBeenCalled();
    expect(added.filter((text) => /변경 \d/.test(text))).toEqual([]);
    expect(survey).not.toHaveTextContent('변경');
  });

  /*
   * [2026-10-05 반박 리뷰 반영 — blocker] 창이 낮으면 표 상자의 바닥값(6rem)이 남은 높이보다 커지는데, 편집기·탭·탭 내용이 모두
   * min-h-0 + overflow visible 이라 표 상자가 탭 밖으로 넘쳐 '권한 변경 저장'을 덮었다(구조 재현: 1280×720 에서 저장 단추 중심의
   * elementFromPoint 가 표 칸). jsdom 은 배치를 재지 않으므로 넘침을 가두는 클래스를 고정하고, 실제 배치는 e2e 의 저장 단추 hit-test
   * (security-administration)와 구조 재현 측정이 본다.
   */
  it('화면별·기능별 권한 탭 내용은 넘침을 가두는 스크롤 상자이고, 탭 묶음은 바닥값을 지켜 저장 막대를 덮지 않는다', async () => {
    await openGroup();
    for (const name of ['화면별 권한', '기능별 권한'] as const) {
      await openTab(name);
      const panel = screen.getByRole('tabpanel', { name: new RegExp(`^${name}`) });
      expect(panel.className.split(/\s+/)).toEqual(expect.arrayContaining(['relative', 'work-fill:overflow-y-auto', 'work-fill:min-h-0', 'work-fill:-m-1', 'work-fill:p-1']));
      // 저장 막대는 탭 묶음 밖(뒤)의 형제다 — 탭 내용이 넘쳐도 그 상자 안에서 스크롤할 뿐 막대 위로 나오지 않는다.
      const tabs = panel.closest('[data-slot="tabs"]')!;
      expect(tabs.className.split(/\s+/)).toEqual(expect.arrayContaining(['work-fill:min-h-[5rem]', 'work-fill:flex-1']));
      expect(tabs.className).not.toMatch(/work-fill:min-h-0/);
      const save = screen.getByRole('button', { name: '권한 변경 저장' });
      expect(tabs.contains(save)).toBe(false);
      expect(tabs.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('긴 그룹명은 줄바꿈해 편집기 밖으로 가로로 넘치지 않는다', async () => {
    await openGroup();
    const heading = within(screen.getByRole('region', { name: '콘텐츠 담당 권한 설정' })).getByRole('heading', { level: 2, name: '콘텐츠 담당' });
    expect(heading).toHaveClass('break-words', 'min-w-0');
    expect(heading).not.toHaveClass('shrink-0');
  });

  it('그룹 목록 스크롤 상자는 가장자리 포커스 링이 잘리지 않게 안쪽 여백을 둔다', async () => {
    await openGroup();
    const list = screen.getByRole('button', { name: /콘텐츠 담당.*CONTENT/ }).closest('ul')!;
    expect(list.className.split(/\s+/)).toEqual(expect.arrayContaining(['work-fill:overflow-y-auto', 'work-fill:-m-1', 'work-fill:p-1', 'relative']));
  });

  it('저장 막대는 화면별·기능별 권한 탭에만 있고, 구성원·기본 정보·변경 이력 탭에는 없다', async () => {
    await openGroup();
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('변경 없음')).toBeVisible();
    await openTab('기능별 권한');
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toBeInTheDocument();
    for (const tab of ['구성원', '기본 정보', '변경 이력'] as const) {
      await openTab(tab);
      expect(screen.queryByRole('button', { name: '권한 변경 저장', hidden: true })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '권한 변경 되돌리기', hidden: true })).not.toBeInTheDocument();
    }
  });

  it('변경 내용 보기는 추가·회수할 권한과 메뉴를 이름으로 보인다', async () => {
    await openGroup('기능별 권한');
    expect(screen.getByRole('button', { name: '변경 내용 보기' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_READ }));
    expect(screen.getByText(/^저장 전 변경:/)).toHaveTextContent('저장 전 변경: 추가 1 · 회수 1');
    await userEvent.click(screen.getByRole('button', { name: '변경 내용 보기' }));
    const list = await screen.findByRole('dialog', { name: '저장하지 않은 권한 변경' });
    expect(within(within(list).getByRole('region', { name: '추가 1개' })).getByRole('listitem')).toHaveTextContent('게시글 등록 (BOARD_CREATE)');
    expect(within(within(list).getByRole('region', { name: '회수 1개' })).getByRole('listitem')).toHaveTextContent('게시글 조회 (BOARD_READ)');
    expect(within(list).getByText(/다른 그룹이 제공하는 같은 권한은 유지됩니다/)).toBeInTheDocument();
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('권한 변경 되돌리기는 확인 뒤 권한 초안만 되돌리고 기본 정보 입력은 남긴다 — 취소하면 그대로다', async () => {
    await openGroup('기본 정보');
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '편집 중 그룹' } });
    await openTab('화면별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: menuCell('게시판', 'MENU_1') }));
    await openTab('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    mocks.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 되돌리기' }));
    expect(mocks.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ message: expect.stringContaining('권한 변경 2건(추가 1 · 회수 1)') }));
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 되돌리기' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).not.toBeChecked());
    expect(screen.getByText('변경 없음')).toBeVisible();
    // [2026-10-05 반박 리뷰 반영] 되돌린 뒤 단추는 막히지만 disabled 가 아니라 aria-disabled 다 — 확인 대화상자가 닫히며 돌아온 포커스가
    // body 로 떨어지지 않는다(2.4.3). 결과는 저장 막대의 알림 영역이 읽고, 막힌 단추를 다시 눌러도 아무 일이 없다.
    const revert = screen.getByRole('button', { name: '권한 변경 되돌리기' });
    expect(revert).toHaveAttribute('aria-disabled', 'true');
    expect(revert).not.toBeDisabled();
    expect(revert).toHaveFocus();
    expect(screen.getByText('저장하지 않은 권한 변경 2건을 되돌렸습니다. 변경 없음.')).toHaveAttribute('role', 'status');
    mocks.confirm.mockClear();
    await userEvent.click(revert);
    expect(mocks.confirm).not.toHaveBeenCalled();
    // 다시 바꾸기 시작하면 '되돌렸습니다'는 더는 사실이 아니다.
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    expect(screen.queryByText(/되돌렸습니다/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    await openTab('화면별 권한');
    expect(screen.getByRole('checkbox', { name: menuCell('게시판', 'MENU_1') })).toBeChecked();
    await openTab('기본 정보');
    expect(screen.getByRole('textbox', { name: '그룹명' })).toHaveValue('편집 중 그룹');
    expect(saveGroupGrants).not.toHaveBeenCalled();
    expect(updateGroup).not.toHaveBeenCalled();
  });

  it('더보기는 복제와 입력 취소 · 최신 정보 적용을 담고, 그룹 삭제는 기본 정보 탭의 위험 영역에만 있다', async () => {
    await openGroup('기능별 권한');
    await userEvent.click(screen.getByRole('checkbox', { name: BOARD_CREATE }));
    // 머리에는 작은 단추 둘과 더보기뿐이다.
    expect(screen.queryByRole('button', { name: '이 그룹으로 새 그룹 만들기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '그룹 삭제' })).not.toBeInTheDocument();
    await openMore();
    const more = await screen.findByRole('dialog', { name: '콘텐츠 담당 더보기' });
    expect(within(more).getAllByRole('button').map((button) => button.textContent)).toEqual(['이 그룹으로 새 그룹 만들기', '입력 취소 · 최신 정보 적용']);
    // 저장하지 않은 변경이 있으면 입력 취소는 이탈 확인을 거친다 — 취소하면 남는다.
    mocks.confirm.mockResolvedValueOnce(false);
    await userEvent.click(within(more).getByRole('button', { name: '입력 취소 · 최신 정보 적용' }));
    expect(mocks.confirm).toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: BOARD_CREATE })).toBeChecked();
    await openTab('기본 정보');
    const danger = screen.getByRole('region', { name: '되돌릴 수 없는 작업' });
    expect(within(danger).getByRole('button', { name: '그룹 삭제' })).toBeEnabled();
  });
});

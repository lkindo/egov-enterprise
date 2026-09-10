import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityHubClient from '../SecurityHubClient';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  toast: vi.fn(), confirm: vi.fn(), getCatalog: vi.fn(), getGroups: vi.fn(), getGroup: vi.fn(),
  createGroup: vi.fn(), updateGroup: vi.fn(), deleteGroup: vi.fn(), saveGroupGrants: vi.fn(),
  getMemberships: vi.fn(), saveUserGroups: vi.fn(), getUsers: vi.fn(), getHistory: vi.fn(),
}));
const { createGroup, updateGroup, deleteGroup, saveGroupGrants, saveUserGroups } = mocks;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator', role: 'ROLE_ADMIN', permissions: mocks.permissions, authorizationVersion: 'auth-v1' } }) }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({ authorizationAdminService: mocks }));
vi.mock('@/app/components/patterns/work-list-page', () => ({ WorkListPage: ({ title, actions, filter, children }: { title: string; actions: ReactNode; filter: ReactNode; children: ReactNode }) => <main><h1>{title}</h1>{actions}{filter}{children}</main> }));

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
  navigation: [{ code: 'MENU_1', name: '게시판', parentCode: null }], catalogVersion: 'catalog-v1',
};
const snapshot = { ...groups[0], complete: true, grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'NAVIGATION', code: 'MENU_1' }] };
const membership = { userId: 'ESNTL_A', groups: ['CONTENT'], version: 'member-v1', complete: true };
const page = (list: unknown[], total = list.length) => ({ list, total, page: 1, size: 20, totalPage: Math.ceil(total / 20) });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><SecurityHubClient /></QueryClientProvider>);
  return { client, ...view };
}
async function openGroup() {
  const view = setup();
  await userEvent.click(await screen.findByRole('button', { name: /콘텐츠 담당.*CONTENT/ }));
  await screen.findByRole('checkbox', { name: /게시글 조회/ });
  return view;
}
async function openMembership() {
  const view = setup();
  await userEvent.click(screen.getByRole('button', { name: '사용자 배정' }));
  await userEvent.click(await screen.findByRole('button', { name: '사용자 가 · login-a' }));
  await screen.findByRole('region', { name: '사용자 권한 그룹 배정' });
  return view;
}

describe('SecurityHub: AuthorizationGroupEditor and AuthorizationMembershipEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['AUTHRT_READ', 'AUTHRT_CREATE', 'AUTHRT_UPDATE', 'AUTHRT_DELETE', 'AUTHRT_GRANT', 'AUTHRT_ASSIGN', 'AUTHRT_AUDIT'];
    mocks.getCatalog.mockResolvedValue(catalog);
    mocks.getGroups.mockResolvedValue(groups);
    mocks.getGroup.mockImplementation((code: string) => Promise.resolve(code === 'CONTENT' ? snapshot : { ...groups[1], complete: true, grants: [] }));
    mocks.getUsers.mockResolvedValue(page([{ id: 'ESNTL_A', userId: 'login-a', userNm: '사용자 가' }, { id: 'ESNTL_B', userId: 'login-b', userNm: '사용자 나' }]));
    mocks.getMemberships.mockImplementation((id: string) => Promise.resolve(id === 'ESNTL_A' ? membership : { userId: id, groups: ['SURVEY'], version: 'member-b', complete: true }));
    mocks.getHistory.mockResolvedValue(page([]));
    mocks.confirm.mockResolvedValue(true);
    for (const action of [createGroup, updateGroup, deleteGroup, saveGroupGrants, saveUserGroups]) action.mockResolvedValue(undefined);
  });

  it('legacy ADMIN 역할만으로 조회나 변경을 허용하지 않는다', () => {
    mocks.permissions = [];
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent('조회 권한이 없습니다');
    expect(mocks.getGroups).not.toHaveBeenCalled();
    expect(mocks.getHistory).not.toHaveBeenCalled();
  });

  it('조회 전용 그룹은 읽을 수 있지만 생성·수정·할당·삭제 버튼이 없다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    await openGroup();
    expect(screen.getByRole('checkbox', { name: /게시글 조회/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /게시글 조회/ })).toBeDisabled();
    for (const name of ['그룹 추가', '그룹 정보 저장', '권한 변경 저장', '그룹 삭제']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('기능 검색 밖의 기존 기능·메뉴 선택을 전체 교체에 보존한다', async () => {
    await openGroup();
    fireEvent.change(screen.getByRole('textbox', { name: '기능 검색' }), { target: { value: '설문' } });
    expect(screen.queryByRole('checkbox', { name: /게시글 조회/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /설문 조회/ }));
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'BOARD_READ' }, { type: 'OPERATION', code: 'QESTNR_READ' }, { type: 'NAVIGATION', code: 'MENU_1' }], version: 'v1', complete: true });
  });

  it('완료되지 않은 배정 조회는 선택과 저장을 막는다', async () => {
    mocks.getGroup.mockResolvedValue({ ...snapshot, complete: false });
    await openGroup();
    expect(screen.getByText(/전체 권한 또는 현재 기능 목록/)).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('checkbox', { name: /게시글 등록/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toBeDisabled();
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('카탈로그에 없는 기존 권한은 조용히 제거하지 않고 저장을 막는다', async () => {
    mocks.getGroup.mockResolvedValue({ ...snapshot, grants: [...snapshot.grants, { type: 'OPERATION', code: 'REMOVED_CODE' }] });
    await openGroup();
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toBeDisabled();
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('다른 관리자의 새 revision을 적용하기 전에는 기존 선택으로 저장하지 않는다', async () => {
    const view = await openGroup();
    await userEvent.click(screen.getByRole('checkbox', { name: /게시글 등록/ }));
    act(() => view.client.setQueryData(['authorization', 'operator', 'auth-v1', 'group', 'CONTENT'], { ...snapshot, version: 'v2', grants: [] }));
    await waitFor(() => expect(screen.getByRole('button', { name: '권한 변경 저장' })).toBeDisabled());
    expect(screen.getByRole('checkbox', { name: /게시글 등록/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: '입력 취소 · 최신 정보 적용' }));
    expect(screen.getByRole('checkbox', { name: /게시글 등록/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: /설문 조회/ }));
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'OPERATION', code: 'QESTNR_READ' }], version: 'v2', complete: true });
  });

  it('권한 저장의 같은 tick 중복 요청을 막고 실패 후 선택을 보존한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    saveGroupGrants.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    await openGroup();
    await userEvent.click(screen.getByRole('checkbox', { name: /게시글 등록/ }));
    const save = screen.getByRole('button', { name: '권한 변경 저장' });
    act(() => { fireEvent.click(save); fireEvent.click(save); });
    expect(saveGroupGrants).toHaveBeenCalledTimes(1);
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save).toBeDisabled();
    expect(updateGroup).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '그룹 삭제' })).toBeDisabled();
    act(() => rejectWrite(new Error('다른 관리자가 변경했습니다.')));
    await waitFor(() => expect(save).not.toBeDisabled());
    expect(mocks.toast).toHaveBeenCalledWith('다른 관리자가 변경했습니다.', 'error');
    expect(screen.getByRole('checkbox', { name: /게시글 등록/ })).toBeChecked();
  });

  it('수정 액션이 선택한 그룹과 그 revision만 전달한다', async () => {
    await openGroup();
    await userEvent.click(screen.getByRole('button', { name: /설문 담당.*SURVEY/ }));
    const input = await screen.findByRole('textbox', { name: '그룹명' });
    await waitFor(() => expect(input).toHaveValue('설문 담당'));
    fireEvent.change(input, { target: { value: '설문 운영' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }));
    expect(updateGroup).toHaveBeenCalledWith('SURVEY', { name: '설문 운영', description: '', version: 's1' });
    expect(saveGroupGrants).not.toHaveBeenCalled();
  });

  it('잘못된 그룹 코드는 API를 호출하지 않고 입력 오류로 안내한다', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: '그룹 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '그룹 코드' }), { target: { value: 'invalid-code' } });
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '새 그룹' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 등록' }));
    await waitFor(() => expect(document.querySelector('[data-form-error-summary]')).toHaveTextContent('입력 오류'));
    expect(createGroup).not.toHaveBeenCalled();
  });

  it('그룹 등록은 검증한 코드·이름·설명만 저장한다', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: '그룹 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '그룹 코드' }), { target: { value: 'AUDITOR' } });
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '감사 담당' } });
    await userEvent.click(screen.getByRole('button', { name: '그룹 등록' }));
    expect(createGroup).toHaveBeenCalledWith({ code: 'AUDITOR', name: '감사 담당', description: '' });
  });

  it('그룹 등록은 제출 중 잠기고 실패하면 입력을 유지한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    createGroup.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    setup();
    await userEvent.click(screen.getByRole('button', { name: '그룹 추가' }));
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
    await openGroup();
    await userEvent.click(screen.getByRole('checkbox', { name: /게시글 등록/ }));
    fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: '콘텐츠 운영' } });
    const submit = screen.getByRole('button', { name: '그룹 정보 저장' });
    await userEvent.click(submit);
    expect(updateGroup).toHaveBeenCalledTimes(1);
    expect(updateGroup).toHaveBeenCalledWith('CONTENT', { name: '콘텐츠 운영', description: '콘텐츠 운영', version: 'v1' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '권한 변경 저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '그룹 삭제' })).toBeDisabled();
    expect(saveGroupGrants).not.toHaveBeenCalled();
    expect(deleteGroup).not.toHaveBeenCalled();
    act(() => rejectWrite(new Error('변경 충돌입니다.')));
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(screen.getByRole('textbox', { name: '그룹명' })).toHaveValue('콘텐츠 운영');
    expect(mocks.toast).toHaveBeenCalledWith('변경 충돌입니다.', 'error');
  });

  it('삭제 확인부터 응답까지 잠그고 중복 삭제·편집을 차단한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    deleteGroup.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    await openGroup();
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
    await openGroup();
    await userEvent.click(screen.getByRole('button', { name: '그룹 삭제' }));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('먼저 사용자 할당을 해제') }));
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith('CONTENT', 'v1'));
    expect(mocks.toast).toHaveBeenCalledWith('사용 중인 자원입니다.', 'error');
    expect(screen.getByRole('region', { name: '콘텐츠 담당 권한 설정' })).toBeInTheDocument();
  });

  it('예약 그룹의 삭제 버튼은 제공하지 않는다', async () => {
    mocks.getGroups.mockResolvedValue([{ ...groups[0], code: 'ROLE_ADMIN' }]);
    mocks.getGroup.mockResolvedValue({ ...snapshot, code: 'ROLE_ADMIN' });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: /콘텐츠 담당.*ROLE_ADMIN/ }));
    await screen.findByRole('checkbox', { name: /게시글 조회/ });
    expect(screen.queryByRole('button', { name: '그룹 삭제' })).not.toBeInTheDocument();
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
    await openGroup();
    await userEvent.click(screen.getByRole('checkbox', { name: /게시글 조회/ }));
    expect(screen.getByText(/메뉴만 선택되어 있고 기능권한이 없습니다/)).toHaveAttribute('role', 'alert');
    await userEvent.click(screen.getByRole('button', { name: '권한 변경 저장' }));
    expect(saveGroupGrants).toHaveBeenCalledWith('CONTENT', { grants: [{ type: 'NAVIGATION', code: 'MENU_1' }], version: 'v1', complete: true });
  });

});

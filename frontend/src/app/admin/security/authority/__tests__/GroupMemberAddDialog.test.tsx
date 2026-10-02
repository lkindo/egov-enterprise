import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, type InvalidateQueryFilters, type Query } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupMemberAddDialog } from '../components/GroupMemberAddDialog';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  toast: vi.fn(), confirm: vi.fn(),
  getDepartments: vi.fn(), updateGroupMembers: vi.fn(), getUsers: vi.fn(), getMemberships: vi.fn(), getDepartmentMemberships: vi.fn(),
}));
const { updateGroupMembers } = mocks;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator', permissions: mocks.permissions, authorizationVersion: 'auth-v1' } }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({ authorizationAdminService: mocks }));
vi.unmock('@/components/ui/tabs');

const page = (list: unknown[], total = list.length) => ({ list, total, page: 1, size: 20, totalPage: Math.ceil(total / 20) });
const conflict = (message: string) => Object.assign(new Error('Request failed with status code 409'), { isAxiosError: true, response: { status: 409, data: { message } } });

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const onClose = vi.fn();
  render(<QueryClientProvider client={client}><GroupMemberAddDialog code="CONTENT" name="콘텐츠 담당" onClose={onClose} /></QueryClientProvider>);
  return { onClose, invalidate, dialog: within(screen.getByRole('dialog', { name: "'콘텐츠 담당' 구성원 추가" })) };
}
async function chooseSearchResult(dialog: ReturnType<typeof within>, name: string) {
  const results = within(await dialog.findByRole('list', { name: '사용자 검색 결과' }));
  await waitFor(() => expect(results.getByRole('checkbox', { name })).toBeEnabled());
  await userEvent.click(results.getByRole('checkbox', { name }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = ['AUTHRT_READ', 'AUTHRT_ASSIGN'];
  mocks.confirm.mockResolvedValue(true);
  mocks.getDepartments.mockResolvedValue([{ id: 'D1', name: '운영팀' }, { id: 'D2', name: '기획팀' }]);
  mocks.updateGroupMembers.mockImplementation((_code: string, body: { add: string[] }) => Promise.resolve({
    code: 'CONTENT', added: body.add.map((id) => ({ id, userId: id.toLowerCase(), userNm: id, departmentId: null })), removed: [], memberCount: 2 + body.add.length,
  }));
  mocks.getUsers.mockResolvedValue(page([
    { id: 'ESNTL_A', userId: 'login-a', userNm: '사용자 가', departmentId: 'D1' },
    { id: 'ESNTL_C', userId: 'login-c', userNm: '사용자 다', departmentId: null },
    { id: 'ESNTL_F', userId: 'login-f', userNm: '사용자 바', departmentId: null },
  ]));
  mocks.getMemberships.mockImplementation((id: string) => id === 'ESNTL_F'
    ? Promise.reject(new Error('조회 실패'))
    : Promise.resolve({ userId: id, groups: id === 'ESNTL_A' ? ['CONTENT'] : ['ROLE_USER'], version: `m-${id}`, complete: true }));
  mocks.getDepartmentMemberships.mockResolvedValue({
    departmentId: 'D2', version: 'd2', complete: true,
    users: [
      { userId: 'ESNTL_B', loginId: 'login-b', userName: '사용자 나', groups: ['CONTENT'], version: 'm', complete: true },
      { userId: 'ESNTL_D', loginId: 'login-d', userName: '사용자 라', groups: [], version: 'm', complete: true },
      { userId: 'ESNTL_E', loginId: 'login-e', userName: '사용자 마', groups: ['SURVEY'], version: 'm', complete: true },
    ],
  });
});

describe('GroupMemberAddDialog — 구성원 추가', () => {
  it('사용자 검색에서 이미 구성원이거나 구성원 여부를 모르는 사람은 고를 수 없고, 부서 명부에서도 여러 명을 고른다', async () => {
    const { dialog } = renderDialog();
    const results = within(await dialog.findByRole('list', { name: '사용자 검색 결과' }));
    await waitFor(() => expect(results.getByText('이미 구성원')).toBeInTheDocument());
    expect(results.getByRole('checkbox', { name: '사용자 가 · login-a' })).toBeDisabled();
    await waitFor(() => expect(results.getByText('구성원 여부를 확인하지 못해 고를 수 없습니다')).toBeInTheDocument());
    expect(results.getByRole('checkbox', { name: '사용자 바 · login-f' })).toBeDisabled();
    await chooseSearchResult(dialog, '사용자 다 · login-c');

    await userEvent.click(dialog.getByRole('tab', { name: '부서' }));
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: '부서' }), 'D2');
    const roster = within(await dialog.findByRole('list', { name: '부서 구성원' }));
    expect(roster.getByRole('checkbox', { name: '사용자 나 · login-b' })).toBeDisabled();
    await userEvent.click(dialog.getByRole('button', { name: '이 부서에서 구성원이 아닌 사람 모두 고르기' }));
    // 고른 사람은 탭을 바꿔도 남는다.
    expect(dialog.getByText('고른 사람 3명')).toBeInTheDocument();
    // 고른 사람 버튼의 이름은 보이는 글자(이름 · 로그인 ID)로 시작한다(WCAG 2.5.3).
    await userEvent.click(dialog.getByRole('button', { name: '사용자 마 · login-e 고르기 취소' }));
    expect(dialog.getByText('고른 사람 2명')).toBeInTheDocument();
    expect(mocks.getDepartmentMemberships).toHaveBeenCalledWith('D2');
    await userEvent.click(dialog.getByRole('button', { name: '2명 추가' }));
    await waitFor(() => expect(updateGroupMembers).toHaveBeenCalledWith('CONTENT', { add: ['ESNTL_C', 'ESNTL_D'], remove: [], complete: true }));
  });

  it('addSelected 는 고른 사람을 한 번만 보내고, 보내는 동안 잠그며, 실패하면 알리고 대화상자와 선택을 남긴다', async () => {
    let rejectWrite: (error: unknown) => void = () => undefined;
    updateGroupMembers.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    const { dialog, onClose } = renderDialog();
    await chooseSearchResult(dialog, '사용자 다 · login-c');
    const add = dialog.getByRole('button', { name: '1명 추가' });
    act(() => { fireEvent.click(add); fireEvent.click(add); });
    expect(updateGroupMembers).toHaveBeenCalledTimes(1);
    expect(updateGroupMembers).toHaveBeenCalledWith('CONTENT', { add: ['ESNTL_C'], remove: [], complete: true });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('aria-busy', 'true');
    act(() => rejectWrite(conflict('다른 곳에서 구성원이 바뀌었습니다(이미 구성원인 사용자 사용자 다(login-c)). 구성원 목록을 다시 불러온 뒤 저장해 주세요.')));
    await waitFor(() => expect(add).toBeEnabled());
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('이미 구성원인 사용자 사용자 다(login-c)'), 'error');
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.getByText('고른 사람 1명')).toBeInTheDocument();
  });

  it('추가에 성공하면 결과를 알리고 구성원 관련 조회를 다시 읽고 닫는다', async () => {
    const { dialog, onClose, invalidate } = renderDialog();
    await chooseSearchResult(dialog, '사용자 다 · login-c');
    await userEvent.click(dialog.getByRole('button', { name: '1명 추가' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.toast).toHaveBeenCalledWith('구성원 1명을 추가했습니다. 지금 구성원은 3명입니다.', 'success');
    expect(invalidate).toHaveBeenCalledTimes(1);
    const filters: InvalidateQueryFilters | undefined = invalidate.mock.calls[0][0];
    const predicate = filters?.predicate;
    if (!predicate) throw new Error('구성원 변경 뒤 무효화에 predicate 가 없습니다.');
    // predicate 는 queryKey 만 읽는다 — 시험용 조회 객체는 그 필드만 갖는다.
    const key = (kind: string) => ({ queryKey: ['authorization', 'operator', 'auth-v1', kind, 'x'] }) as unknown as Query;
    // 구성원 변경은 그룹 버전을 바꾸지 않는다 — 그룹 스냅샷·카탈로그는 다시 읽지 않아 열린 권한 초안을 흔들지 않는다.
    expect(['group-members', 'membership', 'department-memberships', 'effective-groups', 'history'].every((kind) => predicate(key(kind)))).toBe(true);
    expect(['group', 'catalog', 'groups', 'grant-matrix'].some((kind) => predicate(key(kind)))).toBe(false);
  });

  it('고른 사람이 없으면 추가할 수 없고, 권한 배정 권한이 없으면 추가 버튼을 두지 않는다', async () => {
    const first = renderDialog();
    expect(first.dialog.getByRole('button', { name: '0명 추가' })).toBeDisabled();
    await userEvent.click(first.dialog.getByRole('button', { name: '추가 취소' }));
    expect(first.onClose).toHaveBeenCalled();
    cleanup();
    mocks.permissions = ['AUTHRT_READ'];
    const second = renderDialog();
    expect(second.dialog.queryByRole('button', { name: /명 추가$/ })).not.toBeInTheDocument();
  });

  it('고른 사람이 있으면 Esc·추가 취소로 닫을 때 확인하고, 고른 사람이 없으면 묻지 않는다(DEC-OPS-188)', async () => {
    const { dialog, onClose } = renderDialog();
    await userEvent.click(dialog.getByRole('button', { name: '추가 취소' }));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    await chooseSearchResult(dialog, '사용자 다 · login-c');
    // 고르기는 폼 입력이 아니라 모달의 자동 가드가 세지 못한다 — 화면이 고른 사람 수로 확인을 건다.
    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.keyDown(screen.getByRole('dialog', { name: "'콘텐츠 담당' 구성원 추가" }), { key: 'Escape' });
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '변경 버리고 닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog.getByText('고른 사람 1명')).toBeInTheDocument();
    // 버리고 닫기를 고르면 닫는다.
    await userEvent.click(dialog.getByRole('button', { name: '추가 취소' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
    expect(mocks.confirm).toHaveBeenCalledTimes(2);
  });

  it('검색은 조회로 적용하고 결과가 없으면 검색 조건 때문이라고 말한다', async () => {
    const { dialog } = renderDialog();
    mocks.getUsers.mockResolvedValue(page([]));
    fireEvent.change(dialog.getByRole('textbox', { name: '추가할 사용자 이름·로그인 ID' }), { target: { value: '없는 사람' } });
    await userEvent.click(dialog.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.getUsers).toHaveBeenLastCalledWith('없는 사람', 0, 20));
    expect(await dialog.findByText('"없는 사람"에 대한 검색 결과가 없습니다.')).toHaveAttribute('role', 'status');
  });
});

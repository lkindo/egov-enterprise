import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationGroupMembers } from '../components/AuthorizationGroupMembers';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  toast: vi.fn(), confirm: vi.fn(),
  getGroupMembers: vi.fn(), getDepartments: vi.fn(), updateGroupMembers: vi.fn(),
  getUsers: vi.fn(), getMemberships: vi.fn(), getDepartmentMemberships: vi.fn(),
}));
const { updateGroupMembers } = mocks;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator', permissions: mocks.permissions, authorizationVersion: 'auth-v1' } }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({ authorizationAdminService: mocks }));
vi.unmock('@/components/ui/tabs');

const page = (list: unknown[], total = list.length) => ({ list, total, page: 1, size: 20, totalPage: Math.ceil(total / 20) });
const members = [
  { id: 'ESNTL_A', userId: 'login-a', userNm: '사용자 가', departmentId: 'D1' },
  { id: 'ESNTL_B', userId: 'login-b', userNm: '사용자 나', departmentId: null },
];
const conflict = (message: string) => Object.assign(new Error('Request failed with status code 409'), { isAxiosError: true, response: { status: 409, data: { message } } });

function renderMembers(props: Partial<{ anonymous: boolean; protectedGrants: boolean }> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onEditMember = vi.fn();
  render(<QueryClientProvider client={client}>
    <AuthorizationGroupMembers code="CONTENT" name="콘텐츠 담당" anonymous={props.anonymous ?? false} protectedGrants={props.protectedGrants ?? false} onEditMember={onEditMember} />
  </QueryClientProvider>);
  return { client, onEditMember };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = ['AUTHRT_READ', 'AUTHRT_ASSIGN', 'AUTHRT_GRANT'];
  mocks.getGroupMembers.mockResolvedValue(page(members, 2));
  mocks.getDepartments.mockResolvedValue([{ id: 'D1', name: '운영팀' }, { id: 'D2', name: '기획팀' }]);
  mocks.updateGroupMembers.mockImplementation((_code: string, body: { add: string[]; remove: string[] }) => Promise.resolve({
    code: 'CONTENT',
    added: body.add.map((id) => ({ id, userId: id.toLowerCase(), userNm: id, departmentId: null })),
    removed: body.remove.map((id) => ({ id, userId: id.toLowerCase(), userNm: id, departmentId: null })),
    memberCount: 2 + body.add.length - body.remove.length,
  }));
  mocks.getUsers.mockResolvedValue(page([
    { id: 'ESNTL_A', userId: 'login-a', userNm: '사용자 가', departmentId: 'D1' },
    { id: 'ESNTL_C', userId: 'login-c', userNm: '사용자 다', departmentId: null },
  ]));
  mocks.getMemberships.mockImplementation((id: string) => Promise.resolve({ userId: id, groups: id === 'ESNTL_A' ? ['CONTENT'] : ['ROLE_USER'], version: `m-${id}`, complete: true }));
  mocks.getDepartmentMemberships.mockResolvedValue({
    departmentId: 'D2', version: 'd2', complete: true,
    users: [
      { userId: 'ESNTL_B', loginId: 'login-b', userName: '사용자 나', groups: ['CONTENT'], version: 'm', complete: true },
      { userId: 'ESNTL_D', loginId: 'login-d', userName: '사용자 라', groups: [], version: 'm', complete: true },
      { userId: 'ESNTL_E', loginId: 'login-e', userName: '사용자 마', groups: ['SURVEY'], version: 'm', complete: true },
    ],
  });
  mocks.confirm.mockResolvedValue(true);
});

describe('권한 그룹 구성원 탭', () => {
  it('구성원의 이름·로그인 ID·부서를 보이고, 행에서 그 사람의 전체 배정 편집으로 간다', async () => {
    const { onEditMember } = renderMembers();
    expect(await screen.findByRole('heading', { name: '배정된 사용자 (2명)' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: '배정된 사용자 목록' });
    expect(await within(list).findByText('운영팀')).toBeInTheDocument();
    expect(within(list).getByText('부서 없음')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '사용자 가 배정 편집' }));
    expect(onEditMember).toHaveBeenCalledWith({ id: 'ESNTL_A', name: '사용자 가' });
  });

  it('선택한 구성원 회수는 확인 뒤 한 번만 보내고, 보내는 동안 잠그며, 실패하면 알리고 선택을 남긴다', async () => {
    let rejectWrite: (error: unknown) => void = () => undefined;
    updateGroupMembers.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    renderMembers();
    await userEvent.click(await screen.findByRole('checkbox', { name: '사용자 가 (login-a) 선택' }));
    await userEvent.click(screen.getByRole('checkbox', { name: '사용자 나 (login-b) 선택' }));
    const revoke = screen.getByRole('button', { name: '선택한 2명 회수' });
    act(() => { fireEvent.click(revoke); fireEvent.click(revoke); });
    await waitFor(() => expect(updateGroupMembers).toHaveBeenCalled());
    expect(updateGroupMembers).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '2명 회수', variant: 'destructive', message: expect.stringContaining('다른 그룹 배정은 그대로 유지됩니다') }));
    expect(updateGroupMembers).toHaveBeenCalledWith('CONTENT', { add: [], remove: ['ESNTL_A', 'ESNTL_B'], complete: true });
    expect(revoke).toBeDisabled();
    expect(revoke).toHaveAttribute('aria-busy', 'true');
    act(() => rejectWrite(new Error('마지막 활성 권한관리자의 권한은 회수할 수 없습니다.')));
    await waitFor(() => expect(revoke).toBeEnabled());
    expect(mocks.toast).toHaveBeenCalledWith('마지막 활성 권한관리자의 권한은 회수할 수 없습니다.', 'error');
    expect(screen.getByRole('checkbox', { name: '사용자 가 (login-a) 선택' })).toBeChecked();
  });

  it('회수에 성공하면 결과를 알리고 선택을 비우고 목록을 다시 읽으며, 확인을 취소하면 보내지 않는다', async () => {
    renderMembers();
    await userEvent.click(await screen.findByRole('checkbox', { name: '사용자 가 (login-a) 선택' }));
    mocks.confirm.mockResolvedValueOnce(false);
    await userEvent.click(screen.getByRole('button', { name: '선택한 1명 회수' }));
    expect(mocks.updateGroupMembers).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '선택한 1명 회수' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('구성원 1명을 회수했습니다. 남은 구성원은 1명입니다.', 'success'));
    await waitFor(() => expect(mocks.getGroupMembers).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: '선택한 0명 회수' })).toBeDisabled();
  });

  it('다른 곳에서 구성원이 바뀌었으면(409) 서버 문구를 보이고 목록을 다시 읽는다', async () => {
    mocks.updateGroupMembers.mockRejectedValue(conflict('다른 곳에서 구성원이 바뀌었습니다(구성원이 아닌 사용자 사용자 가(login-a)). 구성원 목록을 다시 불러온 뒤 저장해 주세요.'));
    renderMembers();
    await userEvent.click(await screen.findByRole('checkbox', { name: '사용자 가 (login-a) 선택' }));
    await userEvent.click(screen.getByRole('button', { name: '선택한 1명 회수' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('다른 곳에서 구성원이 바뀌었습니다'), 'error'));
    await waitFor(() => expect(mocks.getGroupMembers).toHaveBeenCalledTimes(2));
  });

  it('409 뒤 이미 빠져 목록에 없는 사람은 회수할 사람 목록에서 풀고 다시 보낼 수 있다', async () => {
    mocks.updateGroupMembers.mockRejectedValueOnce(conflict('다른 곳에서 구성원이 바뀌었습니다(구성원이 아닌 사용자 사용자 가(login-a)). 구성원 목록을 다시 불러온 뒤 저장해 주세요.'));
    renderMembers();
    await userEvent.click(await screen.findByRole('checkbox', { name: '사용자 가 (login-a) 선택' }));
    await userEvent.click(screen.getByRole('checkbox', { name: '사용자 나 (login-b) 선택' }));
    // 그 사이 다른 곳에서 사용자 가가 빠졌다 — 다시 읽은 목록에는 사용자 나만 있다.
    mocks.getGroupMembers.mockResolvedValue(page([members[1]], 1));
    await userEvent.click(screen.getByRole('button', { name: '선택한 2명 회수' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('구성원이 아닌 사용자 사용자 가(login-a)'), 'error'));
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: '사용자 가 (login-a) 선택' })).not.toBeInTheDocument());
    // 목록에는 그 사람의 체크박스가 없지만 회수할 사람 목록에서 풀 수 있다.
    const chosen = screen.getByRole('region', { name: '회수할 사람' });
    await userEvent.click(within(chosen).getByRole('button', { name: '사용자 가 · login-a 선택 해제' }));
    await userEvent.click(screen.getByRole('button', { name: '선택한 1명 회수' }));
    await waitFor(() => expect(updateGroupMembers).toHaveBeenLastCalledWith('CONTENT', { add: [], remove: ['ESNTL_B'], complete: true }));
    expect(updateGroupMembers).toHaveBeenCalledTimes(2);
  });

  it('마지막 페이지의 구성원을 모두 회수하면 남은 마지막 페이지로 돌아가고, 그룹이 비었다고 말하지 않는다', async () => {
    let current = Array.from({ length: 21 }, (_, index) => ({ id: `E${index + 1}`, userId: `login-${index + 1}`, userNm: `사용자 ${index + 1}`, departmentId: null }));
    mocks.getGroupMembers.mockImplementation((_code: string, pageIndex: number, size: number) =>
      Promise.resolve(page(current.slice(pageIndex * size, pageIndex * size + size), current.length)));
    updateGroupMembers.mockImplementation((_code: string, body: { remove: string[] }) => {
      const removed = current.filter((member) => body.remove.includes(member.id));
      current = current.filter((member) => !body.remove.includes(member.id));
      return Promise.resolve({ code: 'CONTENT', added: [], removed, memberCount: current.length });
    });
    renderMembers();
    await screen.findByRole('heading', { name: '배정된 사용자 (21명)' });
    await userEvent.click(screen.getByRole('link', { name: '다음 페이지로 이동' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: '사용자 21 (login-21) 선택' }));
    await userEvent.click(screen.getByRole('button', { name: '선택한 1명 회수' }));
    // 2페이지는 이제 비었다 — 앞 페이지(남은 마지막 페이지)로 돌아가 남은 20명을 보인다.
    expect(await screen.findByRole('checkbox', { name: '사용자 1 (login-1) 선택' })).toBeInTheDocument();
    expect(mocks.getGroupMembers).toHaveBeenLastCalledWith('CONTENT', 0, 20);
    expect(screen.getByRole('heading', { name: '배정된 사용자 (20명)' })).toBeInTheDocument();
    expect(screen.queryByText('이 그룹에 배정된 사용자가 없습니다.')).not.toBeInTheDocument();
  });

  it('빈 페이지를 받아도 총수가 있으면 그룹이 비었다고 말하지 않는다', async () => {
    // 목록과 총수가 엇갈린 응답(그 사이 구성원이 바뀜) — 비었다는 말은 총수가 0일 때만 사실이다.
    mocks.getGroupMembers.mockResolvedValue(page([], 3));
    renderMembers();
    expect(await screen.findByRole('heading', { name: '배정된 사용자 (3명)' })).toBeInTheDocument();
    expect(screen.queryByText('이 그룹에 배정된 사용자가 없습니다.')).not.toBeInTheDocument();
    mocks.getGroupMembers.mockResolvedValue(page([], 0));
    cleanup();
    renderMembers();
    expect(await screen.findByText('이 그룹에 배정된 사용자가 없습니다.')).toHaveAttribute('role', 'status');
  });

  it('권한 배정 권한이 없으면 보기만 하고, 보호 권한 그룹은 권한 설정 권한도 있어야 바꾼다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    renderMembers();
    await screen.findByRole('heading', { name: '배정된 사용자 (2명)' });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '구성원 추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /명 회수$/ })).not.toBeInTheDocument();
  });

  it('보호 권한을 가진 그룹은 권한 설정 권한이 없으면 구성원을 바꾸지 못한다고 말한다', async () => {
    mocks.permissions = ['AUTHRT_READ', 'AUTHRT_ASSIGN'];
    renderMembers({ protectedGrants: true });
    expect(await screen.findByText(/보호 권한이 있어 구성원을 바꾸려면 권한 설정 권한도 필요합니다/)).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: '구성원 추가' })).not.toBeInTheDocument();
  });

  it('공개 메뉴 그룹은 구성원을 더할 수 없고 기존 배정은 회수할 수 있다', async () => {
    renderMembers({ anonymous: true });
    expect(await screen.findByText(/공개 메뉴 그룹은 로그인 사용자에게 배정할 수 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '구성원 추가' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '선택한 0명 회수' })).toBeInTheDocument();
  });

  it('구성원 추가는 대화상자를 열고, 닫으면 목록으로 돌아온다', async () => {
    renderMembers();
    await userEvent.click(await screen.findByRole('button', { name: '구성원 추가' }));
    const dialog = await screen.findByRole('dialog', { name: "'콘텐츠 담당' 구성원 추가" });
    await userEvent.click(within(dialog).getByRole('button', { name: '추가 취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: "'콘텐츠 담당' 구성원 추가" })).not.toBeInTheDocument());
    expect(updateGroupMembers).not.toHaveBeenCalled();
  });
});


import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityDeptAuthorityClient from '../SecurityDeptAuthorityClient';

const mocks = vi.hoisted(() => ({ permissions: [] as string[], getDepartments: vi.fn(), getGroups: vi.fn(), getDepartmentMemberships: vi.fn(), updateDepartmentMemberships: vi.fn(), confirm: vi.fn(), toast: vi.fn() }));
const { updateDepartmentMemberships } = mocks;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator', authorizationVersion: 'a1', permissions: mocks.permissions } }) }));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({ authorizationAdminService: mocks }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/patterns/work-list-page', () => ({ WorkListPage: ({ title, actions, filter, children }: { title: string; actions: ReactNode; filter: ReactNode; children: ReactNode }) => <main><h1>{title}</h1>{actions}{filter}{children}</main> }));
const snapshot = { departmentId: 'D1', version: 'd1', complete: true, users: [
  { userId: 'ESNTL_A', loginId: 'login-a', userName: '사용자 가', groups: ['CONTENT'], version: 'm1', complete: true },
  { userId: 'ESNTL_B', loginId: 'login-b', userName: '사용자 나', groups: ['SURVEY'], version: 'm2', complete: true },
] };
async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><SecurityDeptAuthorityClient /></QueryClientProvider>);
  await userEvent.click(await screen.findByRole('button', { name: '기획부' }));
  await screen.findByRole('region', { name: '부서 구성원 그룹 배정' });
  return { client };
}
describe('department multi-group assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['AUTHRT_READ', 'AUTHRT_ASSIGN'];
    mocks.getDepartments.mockResolvedValue([{ id: 'D1', name: '기획부' }, { id: 'D2', name: '인사부' }]);
    mocks.getGroups.mockResolvedValue([{ code: 'CONTENT', name: '콘텐츠', version: 'g1' }, { code: 'SURVEY', name: '설문', version: 'g2' }, { code: 'ROLE_ANONYMOUS', name: '공개 메뉴', version: 'g3' }]);
    mocks.getDepartmentMemberships.mockResolvedValue(snapshot);
    updateDepartmentMemberships.mockResolvedValue({ ...snapshot, version: 'd2' });
    mocks.confirm.mockResolvedValue(true);
  });
  it('전체 명부를 표시하되 선택 전에는 적용하지 않는다', async () => {
    await setup();
    expect(screen.getByRole('checkbox', { name: /사용자 가 · login-a/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: '선택한 0명에게 적용' })).toBeDisabled();
    expect(mocks.getDepartmentMemberships).toHaveBeenCalledWith('D1');
  });
  it('선택 사용자에게 한 그룹만 ADD하고 기존 타 그룹은 요청으로 덮어쓰지 않는다', async () => {
    await setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '권한 그룹' }), 'SURVEY');
    await userEvent.click(screen.getByRole('checkbox', { name: /사용자 가 · login-a/ }));
    await userEvent.click(screen.getByRole('button', { name: '선택한 1명에게 적용' }));
    expect(updateDepartmentMemberships).toHaveBeenCalledWith('D1', { userIds: ['ESNTL_A'], groupCode: 'SURVEY', action: 'ADD', version: 'd1', complete: true });
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('다른 그룹은 유지됩니다') }));
  });
  it('회수는 REMOVE delta로 전송하고 전체 구성원 선택도 명시적으로 수행한다', async () => {
    await setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '변경 방식' }), 'REMOVE');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '권한 그룹' }), 'CONTENT');
    await userEvent.click(screen.getByRole('button', { name: '전체 구성원 선택' }));
    await userEvent.click(screen.getByRole('button', { name: '선택한 2명에게 적용' }));
    expect(updateDepartmentMemberships).toHaveBeenCalledWith('D1', { userIds: ['ESNTL_A', 'ESNTL_B'], groupCode: 'CONTENT', action: 'REMOVE', version: 'd1', complete: true });
  });
  it('명부 구성원의 부분 배정 응답은 변경을 막는다', async () => {
    mocks.getDepartmentMemberships.mockResolvedValue({ ...snapshot, users: [{ ...snapshot.users[0], complete: false }] });
    await setup();
    expect(screen.getByRole('alert')).toHaveTextContent('전체 명부를 확인하지 못해');
    expect(screen.getByRole('button', { name: '전체 구성원 선택' })).toBeDisabled();
  });
  it('다른 관리자의 명부 revision을 적용하기 전에는 저장을 막는다', async () => {
    const { client } = await setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '권한 그룹' }), 'SURVEY');
    await userEvent.click(screen.getByRole('button', { name: '전체 구성원 선택' }));
    act(() => client.setQueryData(['authorization', 'operator', 'a1', 'department-memberships', 'D1'], { ...snapshot, version: 'd3' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '선택한 2명에게 적용' })).toBeDisabled());
    expect(updateDepartmentMemberships).not.toHaveBeenCalled();
  });
  it('A2 방향키 선택과 상세 패널 Tab 이동을 유지한다', async () => {
    await setup();
    const first = screen.getByRole('button', { name: '기획부' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    const next = screen.getByRole('button', { name: '인사부' });
    await waitFor(() => expect(next).toHaveAttribute('aria-current', 'true'));
    expect(next).toHaveFocus();
    await screen.findByRole('region', { name: '부서 구성원 그룹 배정' });
    fireEvent.keyDown(next, { key: 'Tab' });
    expect(screen.getByRole('button', { name: '선택 취소 · 최신 명부 적용' })).toHaveFocus();
  });
  it('부서 전환 중에는 이전 부서 명부를 재사용하지 않는다', async () => {
    await setup();
    mocks.getDepartmentMemberships.mockReturnValue(new Promise(() => undefined));
    await userEvent.click(screen.getByRole('button', { name: '인사부' }));
    expect(screen.queryByRole('region', { name: '부서 구성원 그룹 배정' })).not.toBeInTheDocument();
  });
  it('공개 메뉴 그룹은 ADD 대상에서 제외하고 기존 잘못된 배정의 REMOVE는 허용한다', async () => {
    await setup();
    expect(screen.queryByRole('option', { name: '공개 메뉴' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '변경 방식' }), 'REMOVE');
    expect(screen.getByRole('option', { name: '공개 메뉴' })).toBeInTheDocument();
  });
  it('조회 전용 사용자에게 배정 동작을 제공하지 않는다', async () => {
    mocks.permissions = ['AUTHRT_READ'];
    await setup();
    expect(screen.queryByRole('button', { name: /명에게 적용/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /사용자 가/ })).toBeDisabled();
  });
  it('같은 tick 중복 적용을 차단하고 실패 후 명부와 선택을 유지한다', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    updateDepartmentMemberships.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    await setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '권한 그룹' }), 'SURVEY');
    await userEvent.click(screen.getByRole('checkbox', { name: /사용자 가/ }));
    const submit = screen.getByRole('button', { name: '선택한 1명에게 적용' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    await waitFor(() => expect(updateDepartmentMemberships).toHaveBeenCalledTimes(1));
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(submit).toBeDisabled();
    act(() => rejectWrite(new Error('명부가 변경되었습니다.')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('명부가 변경되었습니다.', 'error'));
    expect(screen.getByRole('checkbox', { name: /사용자 가/ })).toBeChecked();
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { RecipientPicker } from '../recipient-picker';

/**
 * 🎯 수신자 피커의 부서 탭 계약(2026-09-27 DIP B5 F5).
 *
 * 부서를 고르면 그 부서의 사용 중 인원이 보이고, '부서 전체 선택' 한 번으로 모두 담는다. 담긴 사람은 사용자 검색과 같은
 * `kind: 'user'`(esntlId 만)다 — 연락처는 발송 때 서버가 해석한다. 탭은 출처가 주입될 때만 보인다(권한이 있는 사람).
 */
const mocks = vi.hoisted(() => ({
  searchAssignableUsers: vi.fn(),
  listDepartments: vi.fn(),
  listMembers: vi.fn(),
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockStandardModal({ isOpen, title, children, footer }: {
    isOpen: boolean; title: string; children: ReactNode; footer?: ReactNode;
  }) {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label={title}>
        {children}
        <div>{footer}</div>
      </div>
    );
  },
}));

vi.mock('@/services/business/user/UserSearchService', () => ({
  userSearchService: { searchAssignableUsers: (...args: unknown[]) => mocks.searchAssignableUsers(...args) },
}));

vi.mock('@/lib/safe-error-log', () => ({ logErrorSafely: vi.fn() }));

const fakeDepartment = {
  listDepartments: (...args: unknown[]) => mocks.listDepartments(...args),
  listMembers: (...args: unknown[]) => mocks.listMembers(...args),
};

function renderPicker(channel: 'mail' | 'sms' | 'notification' = 'mail', withDepartment = true) {
  return render(
    <RecipientPicker
      isOpen
      channel={channel}
      onClose={mocks.onClose}
      onConfirm={mocks.onConfirm}
      department={withDepartment ? fakeDepartment : undefined}
    />,
  );
}

async function openDepartment(user: ReturnType<typeof userEvent.setup>, departmentId = 'ORG_A') {
  await user.click(screen.getByRole('tab', { name: /부서/ }));
  const select = await screen.findByLabelText('부서 선택');
  await user.selectOptions(select, departmentId);
}

describe('RecipientPicker — 부서 탭', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listDepartments.mockResolvedValue([
      { id: 'ORG_A', name: '기획팀', depth: 0 },
      { id: 'ORG_B', name: '예산계', depth: 1 },
    ]);
    mocks.listMembers.mockImplementation(async (id: string) => (id === 'ORG_A'
      ? {
        members: [
          { esntlId: 'USR_A', name: '김갑', deptNm: '기획팀' },
          { esntlId: 'USR_B', name: '이을', deptNm: '기획팀', absent: true },
        ],
        truncated: false,
      }
      : { members: [], truncated: false }));
  });

  it('출처가 주입되지 않으면 부서 탭이 없다', () => {
    renderPicker('mail', false);
    expect(screen.queryByRole('tab', { name: /부서/ })).not.toBeInTheDocument();
  });

  it('부서를 고르면 소속 인원을 읽고, 부서 전체 선택 한 번으로 모두 담아 esntlId 만 돌려준다', async () => {
    const user = userEvent.setup();
    renderPicker('mail');

    await openDepartment(user);
    expect(mocks.listDepartments).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.listMembers).toHaveBeenCalledWith('ORG_A'));
    // 하위 부서는 조직도 깊이만큼 들여 쓴다.
    expect(screen.getByRole('option', { name: /예산계/ }).textContent).toBe('　예산계');

    await user.click(await screen.findByRole('checkbox', { name: '기획팀 전체 선택' }));
    expect(screen.getByText('2명 선택')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '선택 추가 (2)' }));

    expect(mocks.onConfirm.mock.calls[0][0]).toEqual([
      { kind: 'user', esntlId: 'USR_A', name: '김갑', deptNm: '기획팀' },
      { kind: 'user', esntlId: 'USR_B', name: '이을', deptNm: '기획팀' },
    ]);
  });

  it('일부만 고르면 전체 선택이 중간 상태이고, 다시 누르면 부서 인원 전부를 담는다 — 전체 해제는 이 부서 인원만 뺀다', async () => {
    const user = userEvent.setup();
    mocks.searchAssignableUsers.mockResolvedValue([{ esntlId: 'USR_X', userNm: '박다른', deptNm: '총무과' }]);
    renderPicker('mail');

    // 다른 탭에서 고른 사람은 부서 전체 해제에 휩쓸리지 않는다.
    await user.type(screen.getByLabelText('사용자 검색어 입력'), '박다');
    await user.click(screen.getByRole('button', { name: '검색' }));
    await user.click(await screen.findByRole('checkbox', { name: '박다른 선택' }));

    await openDepartment(user);
    const list = await screen.findByRole('list', { name: '부서 소속 인원' });
    await user.click(within(list).getByRole('checkbox', { name: '김갑 선택' }));
    const all = screen.getByRole('checkbox', { name: '기획팀 전체 선택' }) as HTMLInputElement;
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);

    await user.click(all);
    expect(all.checked).toBe(true);
    expect(screen.getByText('3명 선택')).toBeInTheDocument();

    await user.click(all);
    expect(screen.getByText('1명 선택')).toBeInTheDocument();
  });

  it('상한을 넘은 부서는 일부만 보인다고 알리고, 인원이 없거나 조회가 실패하면 그대로 말한다', async () => {
    const user = userEvent.setup();
    mocks.listMembers.mockResolvedValueOnce({ members: [{ esntlId: 'USR_A', name: '김갑' }], truncated: true });
    renderPicker('sms');

    await openDepartment(user);
    expect(await screen.findByText(/인원이 많아 앞의 1명만 표시합니다/)).toBeInTheDocument();
    expect(screen.getByText(/등록된 휴대전화 번호가 없는 사람이 있으면 발송이 거부됩니다/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('부서 선택'), 'ORG_B');
    expect(await screen.findByText('이 부서에는 사용 중인 계정이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /전체 선택/ })).not.toBeInTheDocument();

    mocks.listMembers.mockRejectedValueOnce(new Error('403'));
    await user.selectOptions(screen.getByLabelText('부서 선택'), 'ORG_A');
    expect(await screen.findByRole('alert')).toHaveTextContent('소속 인원을 불러오지 못했습니다.');
  });

  it('앞 부서의 늦은 응답이 지금 고른 부서의 인원을 덮지 않는다', async () => {
    const user = userEvent.setup();
    let releaseSlow: (value: unknown) => void = () => {};
    mocks.listMembers.mockImplementationOnce(() => new Promise((resolve) => { releaseSlow = resolve; }));
    renderPicker('mail');

    await openDepartment(user, 'ORG_A');
    await user.selectOptions(screen.getByLabelText('부서 선택'), 'ORG_B');
    expect(await screen.findByText('이 부서에는 사용 중인 계정이 없습니다.')).toBeInTheDocument();

    releaseSlow({ members: [{ esntlId: 'USR_LATE', name: '늦은응답' }], truncated: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('늦은응답')).not.toBeInTheDocument();
    expect(screen.getByText('이 부서에는 사용 중인 계정이 없습니다.')).toBeInTheDocument();
  });

  it('앱 내 알림 채널에서도 부서 탭을 쓴다 — 소속 인원은 계정이다', async () => {
    const user = userEvent.setup();
    renderPicker('notification');
    expect(screen.getByRole('tab', { name: /부서/ })).toBeInTheDocument();
    await openDepartment(user);
    expect(await screen.findByRole('checkbox', { name: '기획팀 전체 선택' })).toBeInTheDocument();
  });

  it('부서 목록 조회 실패는 다시 시도를 준다', async () => {
    const user = userEvent.setup();
    mocks.listDepartments.mockRejectedValueOnce(new Error('network'));
    renderPicker('mail');

    await user.click(screen.getByRole('tab', { name: /부서/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('부서 목록을 불러오지 못했습니다.');
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByLabelText('부서 선택')).toBeInTheDocument();
    expect(mocks.listDepartments).toHaveBeenCalledTimes(2);
  });
});

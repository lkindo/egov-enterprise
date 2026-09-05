import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { RecipientPicker, recipientKey } from '../recipient-picker';

/**
 * 🎯 수신자 피커 계약 — 메일·문자가 공유하는 사람 고르기.
 *
 * [2026-09-05 DEC-OPS-035] 판정은 "무엇을 돌려주는가" 다. 사용자 탭은 esntlId 만 싣고(연락처는 서버가 해석),
 * 주소록 탭은 채널에 맞는 연락처가 있는 명함만 고를 수 있으며 그 값을 그대로 싣는다. 조회 실패는 "결과 없음"
 * 으로 위장하지 않는다.
 */
const mocks = vi.hoisted(() => ({
  searchAssignableUsers: vi.fn(),
  getAddressBooks: vi.fn(),
  getAddressBook: vi.fn(),
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

vi.mock('@/services/business/user/addressbook/AddressbookUserService', () => ({
  addressbookUserService: {
    getAddressBooks: (...args: unknown[]) => mocks.getAddressBooks(...args),
    getAddressBook: (...args: unknown[]) => mocks.getAddressBook(...args),
  },
}));

vi.mock('@/lib/safe-error-log', () => ({ logErrorSafely: vi.fn() }));

function renderPicker(channel: 'mail' | 'sms' = 'mail') {
  return render(
    <RecipientPicker isOpen channel={channel} onClose={mocks.onClose} onConfirm={mocks.onConfirm} />,
  );
}

async function searchUsers(user: ReturnType<typeof userEvent.setup>, keyword: string) {
  await user.type(screen.getByLabelText('사용자 검색어 입력'), keyword);
  await user.click(screen.getByRole('button', { name: '검색' }));
}

describe('RecipientPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchAssignableUsers.mockResolvedValue([
      { esntlId: 'USR_A', userNm: '김갑', deptNm: '총무과' },
      { esntlId: 'USR_B', userNm: '김을', deptNm: undefined },
    ]);
    mocks.getAddressBooks.mockResolvedValue({ list: [{ adbkSn: 7, adbkNm: '협력사 명단' }], total: 1, page: 0, size: 50, totalPage: 1 });
    mocks.getAddressBook.mockResolvedValue({
      adbkSn: 7,
      adbkNm: '협력사 명단',
      adbkMan: [
        { adbkMbrSn: 1, userId: 'ext1', nm: '박외부', emlAddr: 'park@partner.example', mblTelno: '01012345678' },
        { adbkMbrSn: 2, userId: 'ext2', nm: '이번호없음', emlAddr: 'lee@partner.example', mblTelno: '' },
        { adbkMbrSn: 3, userId: 'ext3', nm: '최메일없음', emlAddr: '', mblTelno: '01099998888' },
      ],
    });
  });

  it('사용자 탭은 성명으로 검색해 여러 명을 고르고 esntlId 만 돌려준다 — 연락처는 화면이 알지 못한다', async () => {
    const user = userEvent.setup();
    renderPicker('mail');

    expect(screen.getByRole('button', { name: /선택 추가/ })).toBeDisabled();
    await searchUsers(user, '김씨');

    await waitFor(() => expect(mocks.searchAssignableUsers).toHaveBeenCalledWith('김씨'));
    const list = await screen.findByRole('list', { name: '사용자 검색 결과' });
    await user.click(within(list).getByRole('checkbox', { name: '김갑 선택' }));
    await user.click(within(list).getByRole('checkbox', { name: '김을 선택' }));
    expect(screen.getByText('2명 선택')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '선택 추가 (2)' }));

    expect(mocks.onConfirm).toHaveBeenCalledTimes(1);
    expect(mocks.onConfirm.mock.calls[0][0]).toEqual([
      { kind: 'user', esntlId: 'USR_A', name: '김갑', deptNm: '총무과' },
      { kind: 'user', esntlId: 'USR_B', name: '김을', deptNm: undefined },
    ]);
    expect(mocks.onClose).toHaveBeenCalledTimes(1);
  });

  it('두 글자 미만 검색어는 조회하지 않고, 조회 실패는 "결과 없음" 으로 위장하지 않는다', async () => {
    const user = userEvent.setup();
    mocks.searchAssignableUsers.mockRejectedValueOnce(new Error('검색 서버 오류'));
    renderPicker('mail');

    await searchUsers(user, '김');
    expect(mocks.searchAssignableUsers).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('사용자 검색어 입력'), '갑');
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('사용자 검색에 실패했습니다.');
    expect(screen.queryByText('검색 결과가 없습니다.')).not.toBeInTheDocument();
  });

  it('주소록 탭은 탭을 열 때 목록을 읽고, 메일 채널에서는 이메일이 있는 명함만 고를 수 있으며 그 주소를 그대로 돌려준다', async () => {
    const user = userEvent.setup();
    renderPicker('mail');

    expect(mocks.getAddressBooks).not.toHaveBeenCalled();
    await user.click(screen.getByRole('tab', { name: /주소록/ }));
    await waitFor(() => expect(mocks.getAddressBooks).toHaveBeenCalledWith({ page: 0, size: 50 }));

    await user.selectOptions(await screen.findByLabelText('주소록 선택'), '7');
    await waitFor(() => expect(mocks.getAddressBook).toHaveBeenCalledWith(7));
    const list = await screen.findByRole('list', { name: '주소록 명함' });

    expect(within(list).getByRole('checkbox', { name: '최메일없음 선택' })).toBeDisabled();
    expect(within(list).getByText(/이메일 없음/)).toBeInTheDocument();
    await user.click(within(list).getByRole('checkbox', { name: '박외부 선택' }));
    await user.click(within(list).getByRole('checkbox', { name: '이번호없음 선택' }));

    await user.click(screen.getByRole('button', { name: '선택 추가 (2)' }));

    expect(mocks.onConfirm.mock.calls[0][0]).toEqual([
      { kind: 'contact', name: '박외부', email: 'park@partner.example', phone: undefined },
      { kind: 'contact', name: '이번호없음', email: 'lee@partner.example', phone: undefined },
    ]);
  });

  it('문자 채널에서는 휴대전화 번호가 있는 명함만 고를 수 있다', async () => {
    const user = userEvent.setup();
    renderPicker('sms');

    await user.click(screen.getByRole('tab', { name: /주소록/ }));
    await user.selectOptions(await screen.findByLabelText('주소록 선택'), '7');
    const list = await screen.findByRole('list', { name: '주소록 명함' });

    expect(within(list).getByRole('checkbox', { name: '이번호없음 선택' })).toBeDisabled();
    expect(within(list).getByText(/휴대전화 번호 없음/)).toBeInTheDocument();
    await user.click(within(list).getByRole('checkbox', { name: '최메일없음 선택' }));
    await user.click(screen.getByRole('button', { name: '선택 추가 (1)' }));

    expect(mocks.onConfirm.mock.calls[0][0]).toEqual([
      { kind: 'contact', name: '최메일없음', email: undefined, phone: '01099998888' },
    ]);
  });

  it('취소는 아무것도 돌려주지 않고 닫기만 한다', async () => {
    const user = userEvent.setup();
    renderPicker('mail');
    await searchUsers(user, '김씨');
    await user.click(await screen.findByRole('checkbox', { name: '김갑 선택' }));

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(mocks.onClose).toHaveBeenCalledTimes(1);
    expect(mocks.onConfirm).not.toHaveBeenCalled();
  });

  it('recipientKey 는 같은 사용자·같은 주소를 하나로 본다', () => {
    expect(recipientKey({ kind: 'user', esntlId: 'USR_A', name: '갑' }))
      .toBe(recipientKey({ kind: 'user', esntlId: 'USR_A', name: '다른 표시 이름' }));
    expect(recipientKey({ kind: 'contact', name: 'a', email: 'A@Example.com' }))
      .toBe(recipientKey({ kind: 'contact', name: 'b', email: 'a@example.com' }));
    expect(recipientKey({ kind: 'contact', name: 'a', phone: '01011112222' }))
      .not.toBe(recipientKey({ kind: 'contact', name: 'a', phone: '01033334444' }));
  });
});

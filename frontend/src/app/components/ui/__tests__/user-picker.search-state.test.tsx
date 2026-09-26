import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.hoisted(() => ({ searchAssignableUsers: vi.fn() }));

vi.mock('@/services/business/user/UserSearchService', () => ({ userSearchService: search }));
vi.mock('next/dynamic', () => ({
  default: () => function ModalStub({ isOpen, title, children }: { isOpen: boolean; title?: string; children?: ReactNode }) {
    return isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null;
  },
}));

import { UserPicker } from '../user-picker';

/**
 * [2026-09-15 DEC-OPS-100] 사용자 선택기는 검색하기 전의 빈 결과를 "검색 결과 없음"으로, 검색 실패를 결과
 * 없음으로 말하지 않는다. 종전에는 열자마자 "검색 결과가 없습니다."가 보였고(first-use-empty), 검색이 실패하면
 * 로그만 남기고 빈 결과 문구가 그대로 남았다(server-error).
 */
describe('UserPicker 검색 상태', () => {
  beforeEach(() => {
    search.searchAssignableUsers.mockReset();
  });

  const renderPicker = () => render(<UserPicker isOpen onClose={vi.fn()} onSelect={vi.fn()} />);

  it('검색하기 전에는 결과 없음이 아니라 검색 방법만 안내한다', () => {
    renderPicker();

    expect(screen.queryByText(/검색 결과가 없습니다/)).toBeNull();
    expect(screen.getByText('이름을 두 글자 이상 입력하고 엔터를 눌러주세요')).toBeInTheDocument();
  });

  it('검색한 이름에 맞는 사용자가 없으면 그 검색어를 밝혀 결과 없음을 말한다', async () => {
    search.searchAssignableUsers.mockResolvedValue([]);
    renderPicker();

    await userEvent.type(screen.getByPlaceholderText('이름으로 검색'), '홍길');
    await userEvent.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByText('"홍길"에 대한 검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('검색이 실패하면 결과 없음이 아니라 실패를 알린다', async () => {
    search.searchAssignableUsers.mockRejectedValue(new Error('network down'));
    renderPicker();

    await userEvent.type(screen.getByPlaceholderText('이름으로 검색'), '홍길');
    await userEvent.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('사용자를 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect(screen.queryByText(/검색 결과가 없습니다/)).toBeNull();
  });

  it('[DIP B4 P4] 부재 중인 사용자는 고르기 전에 부재 중이라고 보인다', async () => {
    search.searchAssignableUsers.mockResolvedValue([
      { esntlId: 'E1', userNm: '홍길동', deptNm: '기획팀', absent: true },
      { esntlId: 'E2', userNm: '홍길순', deptNm: '기획팀', absent: false },
    ]);
    renderPicker();

    await userEvent.type(screen.getByPlaceholderText('이름으로 검색'), '홍길');
    await userEvent.click(screen.getByRole('button', { name: '검색' }));

    const absent = await screen.findByRole('button', { name: '사용자 선택: 홍길동' });
    const present = screen.getByRole('button', { name: '사용자 선택: 홍길순' });
    expect(absent).toHaveTextContent('부재 중');
    expect(present).not.toHaveTextContent('부재 중');
  });
});

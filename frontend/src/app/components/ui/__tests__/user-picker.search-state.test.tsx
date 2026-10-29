import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';

const search = vi.hoisted(() => ({ searchAssignableUsers: vi.fn() }));

vi.mock('@/services/business/user/UserSearchService', () => ({ userSearchService: search }));
vi.mock('next/dynamic', () => ({
  default: () => function ModalStub({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title?: string; children?: ReactNode }) {
    return isOpen ? <div role="dialog" aria-label={title}><button onClick={onClose}>닫기</button>{children}</div> : null;
  },
}));

import { UserPicker } from '../user-picker';

function deferredSearch() {
  let resolve!: (rows: UserSearchResult[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<UserSearchResult[]>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function submitSearch(keyword: string) {
  fireEvent.change(screen.getByPlaceholderText('이름으로 검색'), { target: { value: keyword } });
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
}

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

  it('늦은 이전 검색 결과가 최신 검색어와 선택 대상을 덮지 않는다', async () => {
    const previous = deferredSearch();
    const latest = deferredSearch();
    search.searchAssignableUsers.mockReturnValueOnce(previous.promise).mockReturnValueOnce(latest.promise);
    const onSelect = vi.fn();
    render(<UserPicker isOpen onClose={vi.fn()} onSelect={onSelect} />);
    submitSearch('이전');
    submitSearch('최신');
    await act(async () => latest.resolve([{ esntlId: 'NEW', userNm: '최신 사용자' }]));
    await act(async () => previous.resolve([{ esntlId: 'OLD', userNm: '이전 사용자' }]));

    expect(screen.getByPlaceholderText('이름으로 검색')).toHaveValue('최신');
    expect(screen.queryByRole('button', { name: '사용자 선택: 이전 사용자' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '사용자 선택: 최신 사용자' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ esntlId: 'NEW' }));
  });

  it.each(['success', 'error'] as const)('이전 요청의 %s와 finally는 최신 검색의 진행 상태를 바꾸지 않는다', async (outcome) => {
    const previous = deferredSearch();
    const latest = deferredSearch();
    search.searchAssignableUsers.mockReturnValueOnce(previous.promise).mockReturnValueOnce(latest.promise);
    renderPicker();
    submitSearch('이전');
    submitSearch('최신');
    await act(async () => {
      if (outcome === 'success') previous.resolve([{ esntlId: 'OLD', userNm: '이전 사용자' }]);
      else previous.reject(new Error('stale failure'));
    });
    expect(screen.getByText('검색 중..')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => latest.resolve([]));
    expect(screen.getByText('"최신"에 대한 검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it.each(['success', 'error'] as const)('닫고 다시 연 뒤 이전 요청의 %s를 무시하고 새 검색을 계속한다', async (outcome) => {
    const previous = deferredSearch();
    const latest = deferredSearch();
    search.searchAssignableUsers.mockReturnValueOnce(previous.promise).mockReturnValueOnce(latest.promise);
    const props = { onClose: vi.fn(), onSelect: vi.fn() };
    const view = render(<UserPicker isOpen {...props} />);
    submitSearch('이전');
    view.rerender(<UserPicker isOpen={false} {...props} />);
    view.rerender(<UserPicker isOpen {...props} />);
    expect(screen.queryByText('검색 중..')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('이름으로 검색')).toHaveValue('이전');
    submitSearch('최신');
    await act(async () => {
      if (outcome === 'success') previous.resolve([{ esntlId: 'OLD', userNm: '이전 사용자' }]);
      else previous.reject(new Error('closed request failure'));
    });
    expect(screen.getByText('검색 중..')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => latest.resolve([{ esntlId: 'NEW', userNm: '최신 사용자' }]));
    expect(screen.getByRole('button', { name: '사용자 선택: 최신 사용자' })).toBeInTheDocument();
  });

  it('닫기 요청은 부모의 isOpen 반영 전에도 진행 중 검색을 무효화한다', async () => {
    const pending = deferredSearch();
    search.searchAssignableUsers.mockReturnValue(pending.promise);
    const onClose = vi.fn();
    render(<UserPicker isOpen onClose={onClose} onSelect={vi.fn()} />);
    submitSearch('이전');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await act(async () => pending.resolve([{ esntlId: 'OLD', userNm: '이전 사용자' }]));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: '사용자 선택: 이전 사용자' })).not.toBeInTheDocument();
    expect(screen.queryByText('검색 중..')).not.toBeInTheDocument();
    expect(screen.queryByText(/검색 결과가 없습니다/)).not.toBeInTheDocument();
  });

  it('완료한 검색어와 결과는 닫고 다시 열어도 보존한다', async () => {
    search.searchAssignableUsers.mockResolvedValue([{ esntlId: 'KNOWN', userNm: '기존 사용자' }]);
    const props = { onClose: vi.fn(), onSelect: vi.fn() };
    const view = render(<UserPicker isOpen {...props} />);
    submitSearch('기존');
    await screen.findByRole('button', { name: '사용자 선택: 기존 사용자' });
    view.rerender(<UserPicker isOpen={false} {...props} />);
    view.rerender(<UserPicker isOpen {...props} />);
    expect(screen.getByPlaceholderText('이름으로 검색')).toHaveValue('기존');
    expect(screen.getByRole('button', { name: '사용자 선택: 기존 사용자' })).toBeInTheDocument();
    expect(search.searchAssignableUsers).toHaveBeenCalledTimes(1);
  });

  it('실패 뒤 재시도를 닫으면 오류를 보존하고 다음 성공 때만 해제한다', async () => {
    const retry = deferredSearch();
    search.searchAssignableUsers
      .mockRejectedValueOnce(new Error('initial search failure'))
      .mockReturnValueOnce(retry.promise)
      .mockResolvedValueOnce([{ esntlId: 'RECOVERED', userNm: '회복 사용자' }]);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const props = { onClose: vi.fn(), onSelect: vi.fn() };
      const view = render(<UserPicker isOpen {...props} />);
      submitSearch('실패');
      expect(await screen.findByRole('alert')).toHaveTextContent('사용자를 검색하지 못했습니다.');

      submitSearch('재시도');
      expect(screen.getByText('검색 중..')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      view.rerender(<UserPicker isOpen={false} {...props} />);
      await act(async () => retry.resolve([{ esntlId: 'IGNORED', userNm: '취소 사용자' }]));
      view.rerender(<UserPicker isOpen {...props} />);

      expect(screen.getByRole('alert')).toHaveTextContent('사용자를 검색하지 못했습니다.');
      expect(screen.queryByText(/검색 결과가 없습니다/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '사용자 선택: 취소 사용자' })).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('이름으로 검색')).toHaveValue('재시도');

      submitSearch('회복');
      expect(await screen.findByRole('button', { name: '사용자 선택: 회복 사용자' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(search.searchAssignableUsers).toHaveBeenCalledTimes(3);
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each(['success', 'error'] as const)('닫힌 동안 도착한 %s는 보존한 결과나 오류 상태를 바꾸지 않는다', async (outcome) => {
    const pending = deferredSearch();
    search.searchAssignableUsers
      .mockResolvedValueOnce([{ esntlId: 'KNOWN', userNm: '기존 사용자' }])
      .mockReturnValueOnce(pending.promise);
    const props = { onClose: vi.fn(), onSelect: vi.fn() };
    const view = render(<UserPicker isOpen {...props} />);
    submitSearch('기존');
    await screen.findByRole('button', { name: '사용자 선택: 기존 사용자' });
    submitSearch('이전');
    view.rerender(<UserPicker isOpen={false} {...props} />);
    await act(async () => {
      if (outcome === 'success') pending.resolve([{ esntlId: 'OLD', userNm: '이전 사용자' }]);
      else pending.reject(new Error('response while closed'));
    });
    view.rerender(<UserPicker isOpen {...props} />);
    expect(screen.getByRole('button', { name: '사용자 선택: 기존 사용자' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '사용자 선택: 이전 사용자' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('검색 중..')).not.toBeInTheDocument();
    expect(search.searchAssignableUsers).toHaveBeenCalledTimes(2);
  });
});

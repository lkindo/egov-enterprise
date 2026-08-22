import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchResultsContent } from '../SearchClient';

const mocks = vi.hoisted(() => ({
  legacyGet: vi.fn(),
  searchAssignableUsers: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

// 현재 결함 구현과 교정 구현 모두 같은 실제 PageResponse 계약을 받게 한다.
// 결함 구현은 이를 data.resultList로 다시 읽으므로 이 fixture에서 사용자를 잃는다.
vi.mock('@/lib/api/client', () => ({
  default: { get: mocks.legacyGet },
}));

vi.mock('@/services/business/user/UserSearchService', () => ({
  userSearchService: { searchAssignableUsers: mocks.searchAssignableUsers },
}));

const emptyResults = { articles: [], users: [], menus: [] };
const users = [{ esntlId: 'synthetic-user-1', userNm: '홍길동', deptNm: '연구부' }];

describe('SearchResultsContent 사용자 검색 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyGet.mockResolvedValue(users);
    mocks.searchAssignableUsers.mockResolvedValue(users);
  });

  it('일반 인증 사용자용 최소정보 검색 API로 조회한다', async () => {
    render(<SearchResultsContent initialResults={emptyResults} query="홍길" />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('연구부')).toBeInTheDocument();
    expect(mocks.searchAssignableUsers).toHaveBeenCalledWith('홍길');
    expect(mocks.legacyGet).not.toHaveBeenCalled();
  });

  it('사용자 검색 실패를 결과 0건으로 위장하지 않는다', async () => {
    mocks.searchAssignableUsers.mockRejectedValue(new Error('private upstream detail'));

    render(<SearchResultsContent initialResults={emptyResults} query="홍길" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('임직원 검색 결과를 불러오지 못했습니다');
    expect(screen.queryByText('일치하는 결과가 없습니다.')).not.toBeInTheDocument();
    expect(screen.queryByText('private upstream detail')).not.toBeInTheDocument();
  });

  it('빈 검색어에서는 사용자 API를 호출하지 않는다', async () => {
    render(<SearchResultsContent initialResults={emptyResults} query="" />);

    await waitFor(() => {
      expect(mocks.legacyGet).not.toHaveBeenCalled();
      expect(mocks.searchAssignableUsers).not.toHaveBeenCalled();
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchResultsContent } from '../SearchClient';

const mocks = vi.hoisted(() => ({
  legacyGet: vi.fn(),
  getUserList: vi.fn(),
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

vi.mock('@/services/foundation/system/UserAdminService', () => ({
  userAdminService: { getUserList: mocks.getUserList },
}));

const emptyResults = { articles: [], users: [], menus: [] };
const userPage = {
  list: [
    {
      userId: 'hong',
      userNm: '홍길동',
      emlAddr: 'hong@example.com',
      userSttsCd: 'P',
    },
  ],
  total: 1,
  page: 1,
  size: 10,
  totalPage: 1,
};

describe('SearchResultsContent 사용자 검색 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyGet.mockResolvedValue(userPage);
    mocks.getUserList.mockResolvedValue(userPage);
  });

  it('PageResponse.list의 임직원을 렌더링하고 표준 사용자 서비스로 조회한다', async () => {
    render(<SearchResultsContent initialResults={emptyResults} query="홍" />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('hong')).toBeInTheDocument();
    expect(mocks.getUserList).toHaveBeenCalledWith({
      pageNo: 1,
      searchKeyword: '홍',
      size: 10,
    });
    expect(mocks.legacyGet).not.toHaveBeenCalled();
  });

  it('빈 검색어에서는 사용자 API를 호출하지 않는다', async () => {
    render(<SearchResultsContent initialResults={emptyResults} query="" />);

    await waitFor(() => {
      expect(mocks.legacyGet).not.toHaveBeenCalled();
      expect(mocks.getUserList).not.toHaveBeenCalled();
    });
  });
});

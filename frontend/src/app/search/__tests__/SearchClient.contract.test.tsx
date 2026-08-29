import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchResultsContent } from '../SearchClient';

const mocks = vi.hoisted(() => ({
  legacyGet: vi.fn(),
  searchAssignableUsers: vi.fn(),
  getHeadMenus: vi.fn(),
  getLeftMenus: vi.fn(),
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

/*
 * [2026-08-29] '메뉴 바로가기' 가 실제 메뉴 API 에서 온다.
 *
 * 종전에는 하드코딩한 두 항목을 이름으로 걸렀고, 두 라벨 모두 목적지와 달랐다. 이제 Ctrl+K
 * 커맨드 센터와 같은 조합(head + left)을 쓴다. 이 계약의 본래 축(임직원 검색은 최소정보
 * API 를 쓰고 원시 client 를 쓰지 않는다)을 유지하려면 메뉴 서비스를 따로 목 해야 한다 —
 * 목하지 않으면 메뉴 조회가 같은 client 를 통과해 legacyGet 단언이 엉뚱하게 깨진다.
 */
vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: mocks.getHeadMenus, getLeftMenus: mocks.getLeftMenus },
}));

const emptyResults = { articles: [], users: [], menus: [] };
const users = [{ esntlId: 'synthetic-user-1', userNm: '홍길동', deptNm: '연구부' }];

describe('SearchResultsContent 사용자 검색 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyGet.mockResolvedValue(users);
    mocks.searchAssignableUsers.mockResolvedValue(users);
    mocks.getHeadMenus.mockResolvedValue([]);
    mocks.getLeftMenus.mockResolvedValue([]);
  });

  /**
   * 메뉴 바로가기는 하드코딩이 아니라 실제 메뉴에서 온다.
   *
   * 종전 구현은 '공지사항 관리'·'자유 게시판' 두 리터럴을 이름 부분일치로 걸렀다. 두 라벨
   * 모두 목적지와 달랐고(각각 시스템 메뉴 관리·업무게시판), /admin/system/menus 는 관리자
   * 전용이라 비관리자는 결과를 눌러도 라우트 게이트에 막혔다.
   */
  it('메뉴 바로가기를 실제 메뉴 API 에서 만든다', async () => {
    mocks.getHeadMenus.mockResolvedValue([
      { menuNo: 1, menuNm: '시스템관리', modernRoute: '/admin/system' },
    ]);
    mocks.getLeftMenus.mockResolvedValue([
      { menuNo: 2, menuNm: '시스템 메뉴 관리', modernRoute: '/admin/system/menus' },
    ]);

    render(<SearchResultsContent initialResults={emptyResults} query="메뉴" />);

    expect(await screen.findByText('시스템 메뉴 관리')).toBeInTheDocument();
    expect(mocks.getHeadMenus).toHaveBeenCalled();
    // 하드코딩 리터럴이 되살아나면 이 단언이 잡는다.
    expect(screen.queryByText('공지사항 관리')).toBeNull();
    expect(screen.queryByText('자유 게시판')).toBeNull();
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

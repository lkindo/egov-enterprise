import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchResultsContent } from '../SearchClient';
import { inProjection } from '@/test-utils/projection';

// 게시글 축(협업 팩 마커)의 결과에 기대는 시험은 게시글 검색 서비스가 투영으로 빠진 생성물에서 등록하지 않는다(원본에서는 그대로다).

const mocks = vi.hoisted(() => ({
  legacyGet: vi.fn(),
  searchAssignableUsers: vi.fn(),
  searchPosts: vi.fn(),
  getHeadMenus: vi.fn(),
  getLeftMenus: vi.fn(),
  push: vi.fn(),
  authUser: undefined as { permissions: string[]; authorizationVersion: string } | undefined,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useOptionalAuth: () => (mocks.authUser ? { user: mocks.authUser } : undefined),
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

/*
 * [2026-09-02] 게시글 검색이 실제 백엔드 엔드포인트를 쓴다.
 *
 * 종전에는 전역 검색 API 가 없어 articles 가 늘 빈 배열이었고 탭 라벨이 '미지원' 이었다.
 * 이제 GET /api/v1/boards/search 를 쓰므로 그 서비스도 목 해야 원시 client 단언이 유효하다.
 */
vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { searchPosts: mocks.searchPosts },
}));

const emptyResults = { articles: [], users: [], menus: [] };
const users = [{ esntlId: 'synthetic-user-1', userNm: '홍길동', deptNm: '연구부' }];

describe('SearchResultsContent 사용자 검색 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyGet.mockResolvedValue(users);
    mocks.searchAssignableUsers.mockResolvedValue(users);
    mocks.searchPosts.mockResolvedValue([]);
    mocks.getHeadMenus.mockResolvedValue([]);
    mocks.getLeftMenus.mockResolvedValue([]);
    mocks.authUser = undefined;
  });

  /**
   * 메뉴 바로가기는 하드코딩이 아니라 실제 메뉴에서 온다.
   *
   * 종전 구현은 '공지사항 관리'·'자유 게시판' 두 리터럴을 이름 부분일치로 걸렀다. 두 라벨
   * 모두 목적지와 달랐고(각각 시스템 메뉴 관리·업무게시판), /admin/system/menus 는 관리자
   * 전용이라 비관리자는 결과를 눌러도 라우트 게이트에 막혔다.
   */
  it('메뉴 바로가기를 실제 메뉴 API 에서 만든다', async () => {
    // [DIP B5 F10] 하위 메뉴는 상위 메뉴 응답의 children 으로 온다 — 상위마다 다시 요청하지 않는다.
    mocks.getHeadMenus.mockResolvedValue([
      { menuNo: 1, menuNm: '시스템관리', modernRoute: '/admin/system',
        children: [{ menuNo: 2, menuNm: '시스템 메뉴 관리', modernRoute: '/admin/system/menus' }] },
    ]);

    render(<SearchResultsContent initialResults={emptyResults} query="메뉴" />);

    expect(await screen.findByText('시스템 메뉴 관리')).toBeInTheDocument();
    expect(mocks.getHeadMenus).toHaveBeenCalledOnce();
    expect(mocks.getLeftMenus).not.toHaveBeenCalled();
    // 하드코딩 리터럴이 되살아나면 이 단언이 잡는다.
    expect(screen.queryByText('공지사항 관리')).toBeNull();
    expect(screen.queryByText('자유 게시판')).toBeNull();
  });

  it('기능 권한이 없어 들어갈 수 없는 메뉴는 바로가기 결과로 내지 않는다', async () => {
    // [2026-10-01] 메뉴는 라우트 게이트와 같은 판정으로 보인다 — 배정만 되고 화면의 조회 권한이 없으면 누를 때마다 홈으로 되돌려진다.
    mocks.authUser = { permissions: ['USER_READ'], authorizationVersion: 'v1' };
    mocks.getHeadMenus.mockResolvedValue([
      { menuNo: 1, menuNm: '관리', children: [
        { menuNo: 2, menuNm: '시스템 메뉴 관리', modernRoute: '/admin/system/menus' },
        { menuNo: 3, menuNm: '사용자 메뉴 배정 현황', modernRoute: '/admin/user/manage' },
      ] },
    ]);

    render(<SearchResultsContent initialResults={emptyResults} query="메뉴" />);

    expect(await screen.findByText('사용자 메뉴 배정 현황')).toBeInTheDocument();
    expect(screen.queryByText('시스템 메뉴 관리')).toBeNull();
  });

  it('🚨 1글자 검색은 게시글·임직원을 부르지 않고 2자 이상이 필요하다고 안내한다 (DIP V9)', async () => {
    mocks.getHeadMenus.mockResolvedValue([{ menuNo: 1, menuNm: '홍보 관리', modernRoute: '/admin/promotion' }]);
    render(<SearchResultsContent initialResults={emptyResults} query="홍" />);

    expect(await screen.findByRole('status')).toHaveTextContent('2자 이상 입력해야 찾습니다');
    expect(await screen.findByText('홍보 관리')).toBeInTheDocument();
    expect(mocks.searchAssignableUsers).not.toHaveBeenCalled();
    expect(mocks.searchPosts).not.toHaveBeenCalled();
  });

  it('3·4단계 메뉴를 전체 조상 경로와 안전한 목적지로 찾고 중지 분류는 제외한다', async () => {
    mocks.getHeadMenus.mockResolvedValue([
      { menuNo: 1, menuNm: '업무', modernRoute: '/admin/work-hub', children: [
        { menuNo: 11, menuNm: '팀 업무', children: [
          { menuNo: 111, menuNm: '보고 목록', modernRoute: '/reports?tab=list#results', children: [
            { menuNo: 1111, menuNm: '보고 상세', modernRoute: '/reports/detail?view=summary#content' },
            { menuNo: 1112, menuNm: '위험 보고', modernRoute: '//external.example', chkURL: 'legacy/report.do' },
          ] },
        ] },
        { menuNo: 88, menuNm: '중지 분류', useYn: 'N', children: [
          { menuNo: 89, menuNm: '중지 보고', modernRoute: '/reports?tab=list#results' },
        ] },
      ] },
    ]);
    render(<SearchResultsContent initialResults={emptyResults} query="보고" />);

    expect(await screen.findByRole('link', { name: '보고 목록 업무 > 팀 업무 모듈' }))
      .toHaveAttribute('href', '/reports?tab=list#results');
    expect(screen.getByRole('link', { name: '보고 상세 업무 > 팀 업무 > 보고 목록 모듈' }))
      .toHaveAttribute('href', '/reports/detail?view=summary#content');
    expect(screen.getByRole('button', { name: '메뉴 바로가기 2건' })).toBeInTheDocument();
    expect(screen.queryByText('위험 보고')).toBeNull();
    expect(screen.queryByText('중지 보고')).toBeNull();
    expect(mocks.getHeadMenus).toHaveBeenCalledOnce();
    expect(mocks.getLeftMenus).not.toHaveBeenCalled();
  });

  it('일반 인증 사용자용 최소정보 검색 API로 조회한다', async () => {
    render(<SearchResultsContent initialResults={emptyResults} query="홍길" />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('연구부')).toBeInTheDocument();
    expect(mocks.searchAssignableUsers).toHaveBeenCalledWith('홍길');
    expect(mocks.legacyGet).not.toHaveBeenCalled();
  });

  if (inProjection('frontend/src/services/business/user/board/BoardUserService.ts')) it('사용자 검색 실패를 결과 0건으로 위장하지 않는다', async () => {
    mocks.searchAssignableUsers.mockRejectedValue(new Error('private upstream detail'));
    mocks.searchPosts.mockResolvedValue([
      { bbsId: 'BBS_01', pstSn: 8, pstTtl: '독립 게시글 결과' },
    ]);

    render(<SearchResultsContent initialResults={emptyResults} query="홍길" />);

    expect(await screen.findByText('독립 게시글 결과')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('임직원 검색 결과를 불러오지 못했습니다');
    expect(screen.getByRole('button', { name: '임직원 (조회 실패)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '임직원 0건' })).not.toBeInTheDocument();
    expect(mocks.searchPosts).toHaveBeenCalledWith('홍길');
    expect(mocks.getHeadMenus).toHaveBeenCalled();
    expect(screen.queryByText('일치하는 결과가 없습니다.')).not.toBeInTheDocument();
    expect(screen.queryByText('private upstream detail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /게시글/ }));
    expect(screen.getByRole('button', { name: '임직원 (조회 실패)' })).toBeInTheDocument();
  });

  it('빈 검색어에서는 사용자 API를 호출하지 않는다', async () => {
    render(<SearchResultsContent initialResults={emptyResults} query="" />);

    await waitFor(() => {
      expect(mocks.legacyGet).not.toHaveBeenCalled();
      expect(mocks.searchAssignableUsers).not.toHaveBeenCalled();
      expect(mocks.searchPosts).not.toHaveBeenCalled();
    });
  });

  /*
   * 게시글 검색 계약.
   *
   * 이 탭은 오랫동안 '미지원' 이었다 — 전역 검색 엔드포인트가 없어 결과가 항상 빈 배열이었고,
   * 화면은 그 사실을 경고로 정직하게 알렸다. 아래 세 건은 그 상태로 되돌아가는 것을 막는다.
   */
  if (inProjection('frontend/src/services/business/user/board/BoardUserService.ts')) it('게시글을 통합 검색 API 에서 가져와 표시한다', async () => {
    mocks.searchPosts.mockResolvedValue([
      { bbsId: 'BBS_01', pstSn: 7, pstTtl: '연차 신청 안내', userNm: '홍길동', crtDt: '2026-09-01T10:00:00' },
    ]);

    render(<SearchResultsContent initialResults={emptyResults} query="연차" />);

    expect(await screen.findByText('연차 신청 안내')).toBeInTheDocument();
    expect(mocks.searchPosts).toHaveBeenCalledWith('연차');
  });

  it('게시글 탭에 기능 부재가 아니라 검색 범위를 안내한다', async () => {
    render(<SearchResultsContent initialResults={emptyResults} query="연차" />);

    // '미지원' 문구로 되돌아가면 red 가 된다 — 기능이 있는데 없다고 말하는 것도 거짓이다.
    await waitFor(() => {
      expect(screen.queryByText(/제공되지 않습니다/)).toBeNull();
    });
  });

  /**
   * 게시글 검색이 실패해도 임직원·메뉴 결과는 살아야 하지만, 실패를 0건으로 위장해서도
   * 안 된다. 부분 결과와 실패 축을 함께 표시한다.
   */
  if (inProjection('frontend/src/services/business/user/board/BoardUserService.ts')) it('게시글 검색 실패를 알리면서 임직원 결과는 유지한다', async () => {
    mocks.searchPosts.mockRejectedValue(new Error('board search down'));

    render(<SearchResultsContent initialResults={emptyResults} query="홍길" />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('게시글 검색 결과를 불러오지 못했습니다');
    expect(screen.getByRole('button', { name: '게시글 (조회 실패)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게시글 0건' })).not.toBeInTheDocument();
    expect(screen.queryByText('일치하는 결과가 없습니다.')).not.toBeInTheDocument();
  });

  if (inProjection('frontend/src/services/business/user/board/BoardUserService.ts')) it('메뉴 검색 실패를 알리면서 다른 두 검색 축은 유지한다', async () => {
    mocks.getHeadMenus.mockRejectedValue(new Error('menu endpoint down'));
    mocks.searchPosts.mockResolvedValue([
      { bbsId: 'BBS_01', pstSn: 9, pstTtl: '메뉴와 무관한 게시글' },
    ]);

    render(<SearchResultsContent initialResults={emptyResults} query="홍길" />);

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('메뉴와 무관한 게시글')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('메뉴 바로가기 검색 결과를 불러오지 못했습니다');
    expect(screen.getByRole('button', { name: '메뉴 바로가기 (조회 실패)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '메뉴 바로가기 0건' })).not.toBeInTheDocument();
    expect(screen.queryByText('menu endpoint down')).not.toBeInTheDocument();
  });

  if (inProjection('frontend/src/services/business/user/board/BoardUserService.ts')) it('선택한 검색 범주만 0건이면 다른 범주의 결과 대신 빈 상태를 표시한다', async () => {
    mocks.searchPosts.mockResolvedValue([
      { bbsId: 'BBS_01', pstSn: 10, pstTtl: '게시글만 존재' },
    ]);
    mocks.searchAssignableUsers.mockResolvedValue([]);

    render(<SearchResultsContent initialResults={emptyResults} query="게시글" />);

    expect(await screen.findByText('게시글만 존재')).toBeInTheDocument();
    const emptyUsersTab = screen.getByRole('button', { name: '임직원 0건' });
    fireEvent.click(emptyUsersTab);
    expect(screen.getByText('일치하는 결과가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText('게시글만 존재')).not.toBeInTheDocument();
  });

  it('검색 입력에 placeholder와 별개의 접근 가능한 이름을 제공한다', () => {
    render(<SearchResultsContent initialResults={emptyResults} query="" />);

    expect(screen.getByRole('textbox', { name: '통합검색어' })).toBeInTheDocument();
  });

  it('URL 입력 오류를 검색 0건으로 위장하지 않고 API 요청을 보내지 않는다', async () => {
    render(<SearchResultsContent initialResults={emptyResults} query="" queryError="검색어는 200자 이내로 입력해 주세요." />);
    expect(screen.getByRole('alert')).toHaveTextContent('200자 이내');
    expect(screen.getByRole('textbox', { name: '통합검색어' })).toHaveAttribute('maxlength', '200');
    expect(screen.getByRole('textbox', { name: '통합검색어' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('일치하는 결과가 없습니다.')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.searchAssignableUsers).not.toHaveBeenCalled();
      expect(mocks.searchPosts).not.toHaveBeenCalled();
      expect(mocks.getHeadMenus).not.toHaveBeenCalled();
    });
  });
});

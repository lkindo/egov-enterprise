/**
 * 커뮤니티의 쿼리 키 — 커뮤니티 상세, 내 멤버십, 귀속 게시판 목록, 사용자 커뮤니티 목록, 관리 화면 목록·회원.
 *
 * 조회는 커뮤니티 목록·상세 허브(CommunityHubClient·CommunityDetailHubClient)와 관리 대화상자(CommunityManageDialog·
 * CommunityMembersPanel)가 하고, 무효화는 그 화면들과 운영 패널(CommunityOperatorPanel), 게시판 설정 저장(invalidateBoardCaches)이 한다.
 * 다섯 뿌리는 서로 다른 캐시라 하나의 `all` 아래로 모으지 않는다 — 뿌리 이름을 바꾸면 이미 쓰는 캐시 키가 달라진다.
 * 다른 모듈을 import 하지 않는다(기능을 뺀 생성물의 연쇄 제거에 걸리지 않게).
 */
export const communityKeys = {
  /** 커뮤니티 상세 뿌리. */
  detailRoot: ['community'] as const,
  /** 커뮤니티 한 곳의 상세 — 운영 패널이 소개를 저장한 뒤 무효화한다. */
  detail: (cmntySn: number) => [...communityKeys.detailRoot, cmntySn] as const,
  /** 내 멤버십 뿌리. */
  membershipRoot: ['community-membership'] as const,
  /** 커뮤니티 한 곳에서의 내 멤버십 — 가입·탈퇴, 관리자·운영자의 회원 처리 뒤 무효화한다. */
  membership: (cmntySn: number) => [...communityKeys.membershipRoot, cmntySn] as const,
  /** 귀속 게시판 목록 뿌리 — 게시판 이름·사용 여부가 바뀌면(invalidateBoardCaches) 전체를 무효화한다. */
  boardsRoot: ['community-boards'] as const,
  /** 커뮤니티 한 곳의 귀속 게시판 목록. */
  boards: (cmntySn: number) => [...communityKeys.boardsRoot, cmntySn] as const,
  /**
   * 사용자 커뮤니티 목록 뿌리 — 새로고침과 관리 화면의 변경 뒤 전체를 무효화한다. 목록 화면은 이 뿌리 뒤에 권한 범위·검색어·쪽·
   * 쪽당 건수·가입 여부를 배열로 직접 펼친다(쪽당 건수 census 가 화면의 queryKey 배열을 읽는다).
   */
  listRoot: ['communities'] as const,
  /**
   * 커뮤니티 게시판 한 곳의 글 목록 뿌리(CommunityBoardClient) — 게시글 상세가 글을 지운 뒤 그 게시판의 목록을 무효화한다.
   * 목록 화면은 이 뿌리 뒤에 게시판·검색어·쪽을 배열로 직접 펼친다(쪽당 건수 census 가 화면의 queryKey 배열을 읽는다).
   */
  boardPostsRoot: ['community-board'] as const,
  /** 관리 화면 뿌리 — 커뮤니티를 만들거나 고친 뒤 전체를 무효화한다. */
  adminRoot: ['admin-communities'] as const,
  /** 관리 화면의 커뮤니티 목록 한 쪽. */
  adminList: (page: number) => [...communityKeys.adminRoot, 'manage', page] as const,
  /** 관리 화면에서 커뮤니티 한 곳의 회원 목록 전체 — 회원을 처리한 뒤 무효화하는 접두. */
  adminMembersOf: (cmntySn: number) => [...communityKeys.adminRoot, 'members', cmntySn] as const,
  /** 관리 화면 회원 목록의 상태 조건·쪽 하나. */
  adminMembers: (cmntySn: number, filter: string, page: number) =>
    [...communityKeys.adminMembersOf(cmntySn), filter, page] as const,
};

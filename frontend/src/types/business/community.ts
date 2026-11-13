// Community Types

export interface CommunityVO {
  cmntySn?: number;
  cmntyNm: string;
  cmntyIntroCn: string;
  useYn: string;
  regSeCd?: string;
  regSeCdNm?: string;
  tmpltId?: string;
  tmpltNm?: string;
  createdByMe?: boolean;
  editable?: boolean;
  deletable?: boolean;
  crtDt?: string;
  version?: number;
}

export interface CommunitySearchParams {
  /** 페이지 번호(1부터, ADR-0036). */
  page?: number;
  size?: number;
  searchCondition?: string;
  searchKeyword?: string;
  /** [GAP-CMTY-001] true 면 내가 승인된 회원인 커뮤니티만(서버 필터 — 신청·탈퇴 제외). */
  joined?: boolean;
  [key: string]: unknown;
}

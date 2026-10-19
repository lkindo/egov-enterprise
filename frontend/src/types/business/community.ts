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
}

export interface CommunitySearchParams {
  /** 페이지 번호(1부터, ADR-0036). */
  page?: number;
  size?: number;
  searchCondition?: string;
  searchKeyword?: string;
  [key: string]: unknown;
}

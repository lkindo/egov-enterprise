// Community Types

export interface CommunityVO {
  cmntyId?: string;
  cmntyNm: string;
  cmntyIntroCn: string;
  useYn: string;
  regSeCd?: string;
  regSeCdNm?: string;
  tmpltId?: string;
  tmpltNm?: string;
  frstRgtrId?: string;
  frstRegisterNm?: string;
  crtDt?: string;
}

export interface CommunitySearchParams {
  page?: number;
  pageIndex?: number;
  pageNo?: number;
  pageUnit?: number;
  searchCondition?: string;
  searchKeyword?: string;
  [key: string]: unknown;
}

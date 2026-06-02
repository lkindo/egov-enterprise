// Community Types

export interface CommunityVO {
  cmmntyId?: string;
  cmmntyNm: string;
  cmmntyIntrcn: string;
  useAt: string;
  registSeCode?: string;
  registSeCodeNm?: string;
  tmpltId?: string;
  tmplatNm?: string;
  frstRgtrId?: string;
  frstRegisterNm?: string;
  createdDate?: string;
  lastModifiedDate?: string;
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

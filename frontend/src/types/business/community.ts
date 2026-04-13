// Community Types

export interface CommunityVO {
  cmmntyId?: string;
  cmmntyNm: string;
  cmmntyIntrcn: string;
  useAt: string;
  registSeCode?: string;
  registSeCodeNm?: string;
  tmplatId?: string;
  tmplatNm?: string;
  frstRegisterId?: string;
  frstRegisterNm?: string;
  frstRegisterPnttm?: string;
  lastUpdtPnttm?: string;
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

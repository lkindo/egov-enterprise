// Online Help Types

export interface FaqVO {
  faqId?: string;
  qstnTtl: string;
  qstnCn: string;
  ansCn: string;
  inqCnt?: number;
  frstRgtrId?: string;
  crtDt?: string;
  lastMdfrId?: string;
  mdfcnDt?: string;
  atchFileId?: string;
}

export interface OnlineHelpSearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchCondition?: string;
  searchKeyword?: string;
}

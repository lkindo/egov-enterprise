// Online Help Types

export interface FaqVO {
  faqId?: string;
  qestnSj: string;
  qestnCn: string;
  answerCn: string;
  inqireCo?: number;
  frstRegisterId?: string;
  frstRegisterNm?: string;
  frstRegisterPnttm?: string;
  lastUpdtPnttm?: string;
  atchFileId?: string;
}

export interface OnlineHelpSearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchCondition?: string;
  searchKeyword?: string;
}

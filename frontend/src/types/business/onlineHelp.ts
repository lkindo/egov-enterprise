// Online Help Types

export interface FaqVO {
  faqId?: string;
  qestnSj: string;
  qestnCn: string;
  answerCn: string;
  inqireCo?: number;
  frstRgtrId?: string;
  frstRegisterNm?: string;
  createdDate?: string;
  lastModifiedDate?: string;
  atchFileId?: string;
}

export interface OnlineHelpSearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchCondition?: string;
  searchKeyword?: string;
}

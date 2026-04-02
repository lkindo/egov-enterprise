import { SearchParams } from '../foundation/system';

export interface CnsltVO {
  cnsltId?: string;
  cnsltSj: string;
  cnsltCn: string;
  othbcAt?: string;
  writngPassword?: string;
  wrterNm: string;
  inqireCo?: number;
  qnaProcessSttusCode?: string;
  managtCn?: string;
  managtDe?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface CnsltSearchParams extends SearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchCondition?: string;
  searchKeyword?: string;
}

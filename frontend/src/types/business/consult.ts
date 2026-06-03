import { SearchParams } from '../foundation/system';

export interface CnsltVO {
  dscsnId?: string;
  dscsnTtl: string;
  dscsnCn: string;
  rlsYn?: string;
  wrtPswd?: string;
  wrterNm: string;
  areaNo?: string;
  mdTelno?: string;
  endTelno?: string;
  mblFrstTelno?: string;
  mblMdTelno?: string;
  mblEndTelno?: string;
  emlAddr?: string;
  emlAnsYn?: string;
  inqCnt?: number;
  qnaProcSttsCd?: string;
  atchFileId?: string;
  procCn?: string;
  mngYmd?: string;
  frstRgtrId?: string;
  crtDt?: string;
}

export interface CnsltSearchParams extends SearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchCondition?: string;
  searchKeyword?: string;
}

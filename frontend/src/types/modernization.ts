/**
 * Modernization Supplement Types
 * This file adds missing types from the backend that are not yet in generated-api.d.ts
 */

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  code: string;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

export interface BaseSearchDto {
  searchCondition?: string;
  searchKeyword?: string;
  pageIndex?: number;
  pageUnit?: number;
  pageSize?: number;
  recordCountPerPage?: number;
  searchKeywordFrom?: string;
  searchKeywordTo?: string;
}

export interface CommunityDto {
  cmntyId?: string;
  cmntyNm?: string;
  cmntyIntroCn?: string;
  regSeCd?: string;
  regSeCdNm?: string;
  tmpltId?: string;
  tmpltNm?: string;
  useYn?: string;
  frstRgtrId?: string;
  frstRegisterNm?: string;
  crtDt?: string;
}

export interface BoardMasterDto {
  bbsId?: string;
  bbsTtl?: string;
  bbsExpln?: string;
  bbsTypeCd?: string;
  bbsAtrbCd?: string;
  ansPsbltyYn?: string;
  fileAtchPsbltyYn?: string;
  atchPsbltyFileQty?: number;
  atchPsbltyFileSz?: number;
  tmpltId?: string;
  frstRgtrId?: string;
  crtDt?: string;
  lastMdfrId?: string;
  mdfcnDt?: string;
  useYn?: string;
  cmntyId?: string;
  blogId?: string;
  blogYn?: string;
  ansYn?: string;
  stsfdgYn?: string;
  // UI related fields (often joined in backend)
  bbsTypeCdNm?: string;
  bbsAtrbCdNm?: string;
  frstRegisterNm?: string;
}


export interface ScheduleDto {
  schdlId?: string;
  schdlSeCd?: string;
  schdlDeptId?: string;
  schdlKndCd?: string;
  schdlBgngYmd?: string;
  schdlEndYmd?: string;
  schdlNm?: string;
  schdlCn?: string;
  schdlPlcNm?: string;
  schdlImprtCd?: string;
  schdlPicId?: string;
  atchFileId?: string;
  reptSeCd?: string;
  frstRgtrId?: string;
  crtDt?: string;
  lastMdfrId?: string;
  mdfcnDt?: string;
}

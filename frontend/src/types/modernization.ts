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
  cmmntyId?: string;
  cmmntyNm?: string;
  cmmntyIntrcn?: string;
  registSeCode?: string;
  registSeCodeNm?: string;
  tmpltId?: string;
  tmplatNm?: string;
  useAt?: string;
  frstRgtrId?: string;
  frstRegisterNm?: string;
  createdDate?: string;
}

export interface BoardMasterDto {
  bbsId?: string;
  bbsNm?: string;
  bbsTtl?: string;
  bbsExpln?: string;
  bbsTypeCd?: string;
  bbsAtrbCd?: string;
  ansPsbltyYn?: string;
  fileAtchPsbltyYn?: string;
  atchPosblFileNumber?: number;
  atchPsbltyFileQty?: number;
  atchPosblFileSize?: number;
  atchPsblFileSizeLong?: number;
  tmpltId?: string;
  frstRgtrId?: string;
  createdDate?: string;
  lastMdfrId?: string;
  lastModifiedDate?: string;
  useAt?: string;
  useYn?: string;
  cmmntyId?: string;
  blogId?: string;
  blogAt?: string;
  blogYn?: string;
  commentAt?: string;
  ansYn?: string;
  stsfdgAt?: string;
  stsfdgYn?: string;
  // UI related fields (often joined in backend but may be missing in core DTO)
  bbsTypeCdNm?: string;
  bbsAtrbCdNm?: string; // 새롭게 정립된 카멜케이스 표준 조인 필드
  tmplatNm?: string;
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
  createdDate?: string;
  lastMdfrId?: string;
  modifiedDate?: string;
}

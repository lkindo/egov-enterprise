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
  tmplatId?: string;
  tmplatNm?: string;
  useAt?: string;
  frstRegisterId?: string;
  frstRegisterNm?: string;
  frstRegisterPnttm?: string;
}

export interface BoardMasterDto {
  bbsId?: string;
  bbsNm?: string;
  bbsTtl?: string;
  bbsIntrcn?: string;
  bbsIntroCn?: string;
  bbsExpln?: string;
  bbsTyCode?: string;
  bbsTypeCd?: string;
  bbsAttrbCode?: string;
  bbsAtrbCd?: string;
  replyPosblAt?: string;
  ansPsblYn?: string;
  fileAtchPosblAt?: string;
  fileAtchPsblYn?: string;
  atchPosblFileNumber?: number;
  atchPsblFileCnt?: number;
  atchPosblFileSize?: number;
  atchPsblFileSizeLong?: number;
  tmplatId?: string;
  frstRegisterId?: string;
  frstRegisterPnttm?: string;
  lastUpdusrId?: string;
  lastUpdusrPnttm?: string;
  useAt?: string;
  useYn?: string;
  cmmntyId?: string;
  blogId?: string;
  blogAt?: string;
  blogYn?: string;
  commentAt?: string;
  commentYn?: string;
  stsfdgAt?: string;
  stsfdgYn?: string;
  // UI related fields (often joined in backend but may be missing in core DTO)
  bbsTyCodeNm?: string;
  bbsTypeCdNm?: string; // 새롭게 정립된 카멜케이스 표준 조인 필드
  bbsAtrbCdNm?: string; // 새롭게 정립된 카멜케이스 표준 조인 필드
  tmplatNm?: string;
  frstRegisterNm?: string;
}


export interface ScheduleDto {
  schdulId?: string;
  schdulSe?: string;
  schdulDeptId?: string;
  schdulKindCode?: string;
  schdulBgnde?: string;
  schdulEndde?: string;
  schdulNm?: string;
  schdulCn?: string;
  schdulPlace?: string;
  schdulIpcrCode?: string;
  schdulChargerId?: string;
  atchFileId?: string;
  reptitSeCode?: string;
  frstRegisterId?: string;
  createdDate?: string;
  lastUpdusrId?: string;
  modifiedDate?: string;
}

/**
 * Modernization Supplement Types
 * This file adds missing types from the backend that are not yet in generated-api.d.ts
 */


export interface PageResponse<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
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
  blogSn?: number;
  blogYn?: string;
  ansYn?: string;
  stsfdgYn?: string;
  // UI related fields (often joined in backend)
  bbsTypeCdNm?: string;
  bbsAtrbCdNm?: string;
  frstRegisterNm?: string;
}



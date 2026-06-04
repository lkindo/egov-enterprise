
export interface PaginationInfo {
  currentPageNo?: number;
  recordCountPerPage?: number;
  pageSize?: number;
  totalRecordCount?: number;
  totalPageCount?: number;
  firstPageNoOnPageList?: number;
  lastPageNoOnPageList?: number;
  firstRecordNo?: number;
  lastRecordNo?: number;
}

/**
 * 백엔드 신규 페이지 응답 모델 (PageResponse)
 * - list/content: 현재 페이지 데이터
 * - total/totalElements: 전체 레코드 수
 * - page: 현재 페이지 번호 (1-based)
 * - size: 페이지당 항목 수
 * - totalPage: 전체 페이지 수
 */
export interface PageResponse<T = unknown> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  status: number;
  code: string;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginationResponse<T> {
  success?: boolean;
  list?: T[];
  content?: T[]; // Spring Data JPA 대응 추가
  totalRecordCount?: number;
  totalElements?: number; // Spring Data JPA 대응 추가
  resultList?: T[];
  paginationInfo?: PaginationInfo;
}

export interface SearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  size?: number;
  searchCondition?: string;
  searchKeyword?: string;
  searchWrd?: string;
  ntwrkId?: string;
  codeId?: string;
  pageUnit?: number;
  sbscrbSttus?: string;
  [key: string]: unknown;
}

// Common Code
export interface CmmnClCode {
  clsfCd: string;
  clsfCdNm: string;
  clsfCdExpln: string;
  useYn: 'Y' | 'N';
  frstRgtrId?: string;
  lastMdfrId?: string;
}

export interface CmmnCode {
  cdId: string;
  cdIdNm: string;
  cdIdExpln: string;
  useYn: 'Y' | 'N';
  clsfCd: string;
  clsfCdNm?: string;
}

export interface CmmnDetailCode {
  cdId: string;
  dtlCd: string;
  dtlCdNm: string;
  dtlCdExpln: string;
  useYn: 'Y' | 'N';
  cdIdNm?: string;
}

// Menu
export interface MenuManage {
  menuNo: number;
  menuOrdr: number;
  menuNm: string;
  upperMenuId: number;
  menuExpln?: string;
  relImgNm?: string;
  relImgPath?: string;
  prgrmFileNm: string;
}

// Program
export interface ProgrmManage {
  prgrmFileNm: string;
  prgrmStrgPath: string;
  prgrmKornNm: string;
  prgrmExpln: string;
  url: string;
}

// Log
export interface SysLog {
  dmndId: string;
  srvcNm: string;
  methodNm: string;
  prcsSeCd: string;
  prcsTm: string;
  dmndUserId: string;
  rqesterIp: string;
  ocrnYmd: string;
}

export interface UserLog {
  occrrncDe: string;
  rqesterId: string;
  svcNm: string;
  methodNm: string;
  creatDt: string;
  userLogId: string;
}

// Login Log
export interface LoginLog {
  logId: string;
  loginId: string;
  loginIp: string;
  loginMthd: string;
  errOccrrAt: string;
  errorCode: string;
  creatDt: string;
}

// Web Log
export interface WebLog {
  webLogId: string;
  url: string;
  method: string;
  processSeCode: string;
  processTime: number;
  creatDt: string;
  rqesterIp: string;
}

// Privacy Log
export interface PrivacyLog {
  logId: string;
  trgetId: string;
  trgetClCode: string;
  trgetNm: string;
  processSeCode: string;
  creatDt: string;
  rqesterId: string;
}

// Transfer Log
export interface TransferLog {
  logId: string;
  trnsmitTrgetId: string;
  provdOrgnCode: string;
  provdSysCode: string;
  requstSysCode: string;
  result: string;
  creatDt: string;
}

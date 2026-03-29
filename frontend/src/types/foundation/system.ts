export interface PaginationInfo {
 currentPageNo?: number;
 recordCountPerPage?: number;
 pageSize?: number;
 totalRecordCount?: number;
 totalPageCount?: number;
 firstPageNoOnPageList?: number;
 lastPageNoOnPageList?: number;
 firstRecord번호?: number;
 lastRecord번호?: number;
}

/**
 * 백엔드 신규 페이징 응답 포맷 (PageResponse)
 * - list/content: 현재 페이지 데이터
 * - total/totalElements: 전체 레코드 수
 * - page: 현재 페이지 번호 (1-based)
 * - size: 페이지당 항목 수
 * - totalPage: 전체 페이지 수
 */
export interface PageResponse<T = unknown> {
 list: T[];
 content?: T[]; // Spring Data JPA
 resultList?: T[]; // eGovFrame Legacy 대응
 total: number;
 totalElements?: number; // Spring Data JPA
 page: number;
 size: number;
 totalPage: number;
 paginationInfo?: PaginationInfo; // eGovFrame Legacy 대응
 totalCount?: number; // eGovFrame Legacy 대응
  [key: string]: unknown; // 모든 추가 필드 허용
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
  page번호?: number;
  page?: number;
 size?: number;
 searchCondition?: string;
 searchKeyword?: string;
 searchWrd?: string; // 추가
 ntwrkId?: string; // 추가
 codeId?: string; // 추가
 pageUnit?: number; // 추가
 sbscrbSttus?: string; // 사용자 가입 상태 필터 추가
  [key: string]: unknown; // 모든 추가 필드 허용
}

// Common Code
export interface CmmnClCode {
 clCode: string;
 clCodeNm: string;
 clCodeDc: string;
 useAt: 'Y' | 'N';
 frstRegisterId?: string;
 lastUpdusrId?: string;
}

export interface CmmnCode {
 codeId: string;
 codeIdNm: string;
 codeIdDc: string;
 useAt: 'Y' | 'N';
 clCode: string;
 clCodeNm?: string;
}

export interface CmmnDetailCode {
 codeId: string;
 code: string;
 codeNm: string;
 codeDc: string;
 useAt: 'Y' | 'N';
 codeIdNm?: string;
}

// Menu
export interface MenuManage {
 menuNo: number;
 menuOrdr: number;
 menuNm: string;
 upperMenuId: number;
 menuDc: string;
 relateImageNm: string;
 relateImagePath: string;
 progrmFileNm: string;
 useAt?: 'Y' | 'N';
}

// Program
export interface ProgrmManage {
 progrmFileNm: string;
 progrmStrePath: string;
 progrmKoreanNm: string;
 progrmDc: string;
 url: string;
}

// Log
export interface SysLog {
 requstId: string;
 occrrncDe: string;
 srvcNm: string;
 methodNm: string;
 processSeCode: string;
 processTime: string;
 rqesterIp: string;
 rqesterId: string;
 trgetMenuNm?: string;
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
 loginDt: string;
 errorOccrrAt: string;
 errorCode: string;
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

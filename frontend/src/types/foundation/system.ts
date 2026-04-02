export interface PaginationInfo {
 currentPageNo?: number;
 recordCountPerPage?: number;
 pageSize?: number;
 totalRecordCount?: number;
 totalPageCount?: number;
 firstPageNoOnPageList?: number;
 lastPageNoOnPageList?: number;
 firstRecord踰덊샇?: number;
 lastRecord踰덊샇?: number;
}

/**
 * 諛깆뿏님신규 ?섏씠吏님묐떟 щ㎎ (PageResponse)
 * - list/content: 현재 ?섏씠吏 데이터 * - total/totalElements: ?꾩껜 ?덉퐫님님 * - page: 현재 ?섏씠吏 踰덊샇 (1-based)
 * - size: ?섏씠吏님님ぉ 님 * - totalPage: ?꾩껜 ?섏씠吏 님 */
export interface PageResponse<T = unknown> {
 list: T[];
 content?: T[]; // Spring Data JPA
 resultList?: T[]; // eGovFrame Legacy 님 total: number;
 totalElements?: number; // Spring Data JPA
 page: number;
 size: number;
 totalPage: number;
 paginationInfo?: PaginationInfo; // eGovFrame Legacy 님 totalCount?: number; // eGovFrame Legacy 님  [key: string]: unknown; // 紐⑤뱺 異붽? ?꾨뱶 ?덉슜
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
 content?: T[]; // Spring Data JPA 님異붽?
 totalRecordCount?: number;
 totalElements?: number; // Spring Data JPA 님異붽?
 resultList?: T[];
 paginationInfo?: PaginationInfo;
}

export interface SearchParams {
  page踰덊샇?: number;
  page?: number;
 size?: number;
 searchCondition?: string;
 searchKeyword?: string;
 searchWrd?: string; // 異붽?
 ntwrkId?: string; // 異붽?
 codeId?: string; // 異붽?
 pageUnit?: number; // 異붽?
 sbscrbSttus?: string; // 사용자媛님?곹깭 ?꾪꽣 異붽?
  [key: string]: unknown; // 紐⑤뱺 異붽? ?꾨뱶 ?덉슜
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

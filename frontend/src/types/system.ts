export interface PaginationInfo {
    currentPageNo: number;
    recordCountPerPage: number;
    pageSize: number;
    totalRecordCount: number;
    totalPageCount: number;
    firstPageNoOnPageList: number;
    lastPageNoOnPageList: number;
    firstRecordIndex: number;
    lastRecordIndex: number;
}

export interface PaginationResponse<T> {
    success?: boolean;
    list?: T[];
    totalRecordCount?: number;
    resultList: T[];
    paginationInfo: PaginationInfo;
}

export interface SearchParams {
    pageIndex?: number;
    searchCondition?: string;
    searchKeyword?: string;
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

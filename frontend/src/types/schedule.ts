// Schedule Management Types

export interface DeptSchedule {
    schdulId?: string;
    schdulNm: string;
    schdulCn: string;
    schdulBgnDe: string;
    schdulEndDe: string;
    schdulPlace?: string;
    schdulIpcrCode?: string;
    schdulCharger?: string;
    schdulDeptId?: string;
    schdulDeptName?: string;
    frstRegisterId?: string;
    frstRegisterNm?: string;
    frstRegistPnttm?: string;
}

export interface WikMnthngReprt {
    reprtId?: string;
    reprtSe: string; // W: Weekly, M: Monthly
    reprtThstrn?: string;
    reprtBgnEndDe?: string;
    reprtBgnDe?: string;
    reprtEndDe?: string;
    thsWikEno?: number;
    wikWorkCn?: string;
    nextWikWorkCn?: string;
    partclrMatter?: string;
    reporterId?: string;
    reporterNm?: string;
    confirmAt?: string;
    confmDt?: string;
    confmerId?: string;
    frstRegisterId?: string;
    frstRegisterNm?: string;
    frstRegistPnttm?: string;
    atchFileId?: string;
}

export interface ScheduleSearchParams {
    pageIndex?: number;
    searchCondition?: string;
    searchKeyword?: string;
    schdulDeptId?: string;
    searchYear?: string;
    searchMonth?: string;
}

export interface ReportSearchParams {
    pageIndex?: number;
    searchCondition?: string;
    searchKeyword?: string;
    searchDate?: string;
}

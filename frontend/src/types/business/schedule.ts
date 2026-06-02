export interface Schedule {
  schdlId: string;
  schdlSeCd: string; // 1: 부서 2: 개인
  schdlDeptId?: string;
  schdlKndCd?: string;
  schdlBgngYmd: string; // yyyyMMddHHmm
  schdlEndYmd: string;
  schdlNm: string;
  schdlCn: string;
  schdlPlcNm?: string;
  schdlImprtCd?: string;
  schdlPicId?: string;
  atchFileId?: string;
  reptSeCd?: string;
  frstRgtrId?: string;
  createdDate?: string;
}

export interface ScheduleResponse {
  resultList: Schedule[];
  totalCount: number;
  pageNo: number;
  totalPages: number;
}

export interface MonthlyScheduleResponse {
  schedules: Schedule[];
  yearMonth: string;
}

export interface DeptSchedule extends Schedule {
  schdlDeptId: string;
  deptNm: string;
}

export interface ScheduleSearchParams {
  schdlSeCd?: string;
  schdlDeptId?: string;
  schdlBgngYmd?: string;
  schdlEndYmd?: string;
  schdlNm?: string;
  pageNo?: number;
  pageIndex?: number;
  size?: number;
}

export interface WorkReport {
  rptId: string;
  rptTtl: string;
  rptCn: string;
  rptSeCd: string;
  rptYmd: string;
  userId: string;
  rptSttsCd: string;
}

export interface ReportSearchParams {
  searchWrd?: string;
  pageNo?: number;
  pageIndex?: number;
  size?: number;
}

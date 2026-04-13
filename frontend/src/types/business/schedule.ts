export interface Schedule {
  schdulId: string;
  schdulSe: string; // 1: 부서 2: 개인
  schdulDeptId?: string;
  schdulKindCode?: string;
  schdulBgnde: string; // yyyyMMddHHmm
  schdulEndde: string;
  schdulNm: string;
  schdulCn: string;
  schdulPlace?: string;
  schdulIpcrCode?: string;
  schdulChargerId?: string;
  atchFileId?: string;
  reptitSeCode?: string;
  frstRegisterId?: string;
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
  schdulDeptId: string;
  deptNm: string;
}

export interface ScheduleSearchParams {
  schdulSe?: string;
  schdulDeptId?: string;
  schdulBgnde?: string;
  schdulEndde?: string;
  schdulNm?: string;
  pageNo?: number;
  pageIndex?: number;
  size?: number;
}

export interface WorkReport {
  reportId: string;
  reportSubject: string;
  reportContent: string;
  reportType: string;
  reportDate: string;
  writerId: string;
  reportStatus: string;
}

export interface ReportSearchParams {
  reportNm?: string;
  writngBgnde?: string;
  writngEndde?: string;
  pageNo?: number;
  pageIndex?: number;
  size?: number;
}

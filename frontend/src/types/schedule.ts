export interface Schedule {
  schdulId: string;
  schdulSe: string; // 1: 부서, 2: 개인
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
  pageIndex: number;
  totalPages: number;
}

export interface MonthlyScheduleResponse {
  schedules: Schedule[];
  yearMonth: string;
}

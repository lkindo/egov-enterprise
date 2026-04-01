export interface Schedule {
 schdulId: string;
 schdulSe: string; // 1: 遺님 2: 媛쒖씤
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
 page踰덊샇: number;
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
 page踰덊샇?: number;
 size?: number;
}

export interface WorkReport {
 reportId: string;
 reportNm: string;
 reportCn: string;
 writngBgnde: string;
 writngEndde: string;
 reportDeptId: string;
 reportDeptNm: string;
 chargerId: string;
 chargerNm: string;
 createdDate: string;
 sanctnSttus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ReportSearchParams {
 reportNm?: string;
 writngBgnde?: string;
 writngEndde?: string;
 page踰덊샇?: number;
 size?: number;
}

import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { WorkReport, ReportSearchParams } from '@/types/schedule';

export const getReportList = async (params: ReportSearchParams): Promise<PaginationResponse<WorkReport>> =>
    client.get<PaginationResponse<WorkReport>>('/smart-toolkit/work-report/EgovWikMnthngReprtList.do', { params });

export const getReport = async (reprtId: string): Promise<WorkReport> =>
    client.get<WorkReport>(`/smart-toolkit/work-report/selectWikMnthngReprt.do?reprtId=${reprtId}`);

export const createReport = async (report: WorkReport): Promise<void> =>
    client.post('/smart-toolkit/work-report/insertWikMnthngReprt.do', report);

export const updateReport = async (report: WorkReport): Promise<void> =>
    client.post('/smart-toolkit/work-report/updateWikMnthngReprt.do', report);

export const deleteReport = async (reprtId: string): Promise<void> =>
    client.post(`/smart-toolkit/work-report/deleteWikMnthngReprt.do?reprtId=${reprtId}`);

export const confirmReport = async (reprtId: string): Promise<void> =>
    client.post(`/smart-toolkit/work-report/confirmWikMnthngReprt.do?reprtId=${reprtId}`);

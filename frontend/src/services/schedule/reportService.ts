import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { WorkReport, ReportSearchParams } from '@/types/schedule';

export const getReportList = async (params: ReportSearchParams): Promise<PaginationResponse<WorkReport>> =>
    client.get<PaginationResponse<WorkReport>>('/cop/smt/wmr/EgovWikMnthngReprtList.do', { params });

export const getReport = async (reprtId: string): Promise<WorkReport> =>
    client.get<WorkReport>(`/cop/smt/wmr/selectWikMnthngReprt.do?reprtId=${reprtId}`);

export const createReport = async (report: WorkReport): Promise<void> =>
    client.post('/cop/smt/wmr/insertWikMnthngReprt.do', report);

export const updateReport = async (report: WorkReport): Promise<void> =>
    client.post('/cop/smt/wmr/updateWikMnthngReprt.do', report);

export const deleteReport = async (reprtId: string): Promise<void> =>
    client.post(`/cop/smt/wmr/deleteWikMnthngReprt.do?reprtId=${reprtId}`);

export const confirmReport = async (reprtId: string): Promise<void> =>
    client.post(`/cop/smt/wmr/confirmWikMnthngReprt.do?reprtId=${reprtId}`);

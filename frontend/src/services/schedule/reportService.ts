import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { WorkReport, ReportSearchParams } from '@/types/schedule';

// Weekly/Monthly Report Management
export const getReportList = async (params: ReportSearchParams) => {
    const { data } = await client.get<PaginationResponse<WorkReport>>('/cop/smt/wmr/EgovWikMnthngReprtList.do', { params });
    return data;
};

export const getReport = async (reprtId: string) => {
    const { data } = await client.get<WorkReport>(`/cop/smt/wmr/selectWikMnthngReprt.do?reprtId=${reprtId}`);
    return data;
};

export const createReport = async (report: WorkReport) => {
    return client.post('/cop/smt/wmr/insertWikMnthngReprt.do', report);
};

export const updateReport = async (report: WorkReport) => {
    return client.post('/cop/smt/wmr/updateWikMnthngReprt.do', report);
};

export const deleteReport = async (reprtId: string) => {
    return client.post(`/cop/smt/wmr/deleteWikMnthngReprt.do?reprtId=${reprtId}`);
};

export const confirmReport = async (reprtId: string) => {
    return client.post(`/cop/smt/wmr/confirmWikMnthngReprt.do?reprtId=${reprtId}`);
};

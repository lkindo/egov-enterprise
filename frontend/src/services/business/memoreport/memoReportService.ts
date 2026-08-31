import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import type { components } from '@/types/generated-api';
import {
  createMemoReportOperation,
  deleteMemoReportOperation,
  getMemoReportOperation,
  getMemoReportsOperation,
  getMyReportsOperation,
  getReceivedReportsOperation,
  updateDrctMatterOperation,
  updateMemoReportOperation,
} from '@/types/generated-operations';
import { MemoInstructionRequestSchema } from '@/types/generated-zod';
import { z } from 'zod';

const MemoInstructionBoundarySchema = MemoInstructionRequestSchema.superRefine((request, context) => {
  if (!request.drctnMttr.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['drctnMttr'],
      message: '지시사항은 필수입니다.',
    });
  }
});

export interface MemoReportInfo {
  memoRptSn: number;
  rptTtl: string;
  rptCn: string;
  userId: string;
  wrterNm: string;
  rptrId: string;
  rptrNm: string;
  memoRptYmd: string;
  drctnMttr?: string;
  drctnMttrRegDt?: string;
  rptrInqDt?: string;
  crtDt: string;
}

export interface PageResponse<T> {
  list: T[];
  total: number;
}

export const memoReportService = {
  getMemoReports: async (params: { searchKeyword?: string; page?: number; size?: number } = {}) => {
    return executeGeneratedOperation(getMemoReportsOperation, { query: params }) as
      Promise<PageResponse<MemoReportInfo>>;
  },
  getMyReports: async (params: { page?: number; size?: number } = {}) => {
    return executeGeneratedOperation(getMyReportsOperation, { query: params }) as
      Promise<PageResponse<MemoReportInfo>>;
  },
  getReceivedReports: async (params: { page?: number; size?: number } = {}) => {
    return executeGeneratedOperation(getReceivedReportsOperation, { query: params }) as
      Promise<PageResponse<MemoReportInfo>>;
  },
  getMemoReport: async (memoRptSn: number) => {
    return executeGeneratedOperation(getMemoReportOperation, { path: { memoRptSn } }) as
      Promise<MemoReportInfo>;
  },
  createMemoReport: async (data: Partial<MemoReportInfo>) => {
    return executeGeneratedOperation(createMemoReportOperation, {
      body: data as components['schemas']['MemoReportDto'],
    });
  },
  updateMemoReport: async (memoRptSn: number, data: Partial<MemoReportInfo>) => {
    return executeGeneratedOperation(updateMemoReportOperation, {
      path: { memoRptSn },
      body: data as components['schemas']['MemoReportDto'],
    });
  },
  updateDrctMatter: async (memoRptSn: number, drctnMttr: string) => {
    const request = MemoInstructionBoundarySchema.parse({ drctnMttr });
    return executeGeneratedOperation(updateDrctMatterOperation, {
      path: { memoRptSn },
      body: request,
    });
  },
  deleteMemoReport: async (memoRptSn: number) => {
    return executeGeneratedOperation(deleteMemoReportOperation, { path: { memoRptSn } });
  }
};

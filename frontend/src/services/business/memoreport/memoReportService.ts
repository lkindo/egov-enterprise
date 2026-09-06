import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
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
import {
  MemoInstructionRequestSchema,
  MemoReportDtoRequestSchema,
  MemoReportDtoResponseSchema,
} from '@/types/generated-zod';
import { z } from 'zod';

export type MemoReportInput = z.input<typeof MemoReportDtoRequestSchema>;

const MemoInstructionBoundarySchema = MemoInstructionRequestSchema.superRefine((request, context) => {
  if (!request.drctnMttr.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['drctnMttr'],
      message: '지시사항은 필수입니다.',
    });
  }
});

export type MemoReportInfo = z.output<typeof MemoReportDtoResponseSchema> & { memoRptSn: number };

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
  createMemoReport: async (data: MemoReportInput) => {
    return executeGeneratedOperation(createMemoReportOperation, {
      body: data,
    });
  },
  updateMemoReport: async (memoRptSn: number, data: MemoReportInput) => {
    return executeGeneratedOperation(updateMemoReportOperation, {
      path: { memoRptSn },
      body: data,
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

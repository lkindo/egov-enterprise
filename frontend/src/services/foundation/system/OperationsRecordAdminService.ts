import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import {
  auditJournalListOperation,
  durableJobListOperation,
  durableJobRetryOperation,
} from '@/types/generated-operations';
import { AuditJournalEntryResponseSchema, StatusResponseSchema } from '@/types/generated-zod';
import { z } from 'zod';

/**
 * 운영 기록 열람(2026-10-01 결정 19) — 민감 작업 감사 원장과 후속 작업 상태.
 *
 * 두 API 는 전부터 서버에 있었지만(감사 원장은 이번에 열람 경로를 더했다) 화면이 없어, 실패한 알림 전달·
 * 첨부 삭제를 재처리하거나 누가 비밀번호를 초기화했는지 보려면 DB 를 열어야 했다.
 */
export type AuditJournalEntry = z.output<typeof AuditJournalEntryResponseSchema>;
export type DurableJobStatus = z.output<typeof StatusResponseSchema>;

export interface AuditJournalQuery {
  actorId?: string;
  fromDate?: string;
  toDate?: string;
  /** 0-base */
  page: number;
  size: number;
}

export const operationsRecordAdminService = {
  async getAuditJournal(query: AuditJournalQuery) {
    const result = await executeGeneratedOperation(auditJournalListOperation, {
      query: {
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.fromDate && query.toDate ? { fromDate: query.fromDate, toDate: query.toDate } : {}),
        page: query.page,
        size: query.size,
      },
    });
    return { list: result.list ?? [], total: Number(result.total ?? 0) };
  },

  async getDurableJobs(page: number, size: number) {
    const result = await executeGeneratedOperation(durableJobListOperation, { query: { page, size } });
    return {
      list: result.content ?? [],
      total: Number(result.totalElements ?? 0),
      totalPages: Number(result.totalPages ?? 0),
    };
  },

  async retryDurableJob(jobSn: string) {
    await executeGeneratedOperation(durableJobRetryOperation, { path: { jobSn } });
  },
};

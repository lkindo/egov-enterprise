import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { requirePageResponse } from '@/services/core/page-response';
import {
  auditJournalListOperation,
  auditJournalOperationsOperation,
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
  /** 작업 이름(원장의 작업 종류 값 그대로). */
  operation?: string;
  fromDate?: string;
  toDate?: string;
  /** 1부터 세는 페이지 번호(ADR-0036). */
  page: number;
  size: number;
}

export const operationsRecordAdminService = {
  async getAuditJournal(query: AuditJournalQuery) {
    const result = await executeGeneratedOperation(auditJournalListOperation, {
      query: {
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.operation ? { operation: query.operation } : {}),
        ...(query.fromDate && query.toDate ? { fromDate: query.fromDate, toDate: query.toDate } : {}),
        page: query.page,
        size: query.size,
      },
    });
    return { list: result.list ?? [], total: Number(result.total ?? 0) };
  },

  /** [2026-10-20] 원장에 남은 작업 종류(작업 이름, 이름 순) — 조건 검색의 선택지다. */
  async getAuditJournalOperations(): Promise<string[]> {
    const result = await executeGeneratedOperation(auditJournalOperationsOperation, {});
    return Array.isArray(result) ? result.filter((value): value is string => typeof value === 'string') : [];
  },

  /**
   * 후속 작업 목록. `page` 는 1부터다(ADR-0036).
   *
   * <p>[ADR-0036] 서버가 Spring `Page` 원형(content·totalElements·totalPages, 0 기반 number) 대신 다른 목록과 같은
   * `PageResponse`(list·total·page·size·totalPage)를 돌려준다. 화면이 쓰는 모양(list·total·totalPages)은 그대로 둔다.
   */
  async getDurableJobs(page: number, size: number) {
    const result = requirePageResponse<DurableJobStatus>(
      await executeGeneratedOperation(durableJobListOperation, { query: { page, size } }),
      '후속 작업',
    );
    return {
      list: result.list,
      total: result.total,
      totalPages: result.totalPage,
    };
  },

  async retryDurableJob(jobSn: string) {
    await executeGeneratedOperation(durableJobRetryOperation, { path: { jobSn } });
  },
};

import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { requirePageResponse } from '@/services/core/page-response';
import {
  auditJournalListOperation,
  auditJournalOperationsOperation,
  durableJobListOperation,
  durableJobRetryOperation,
  exportAuditJournalOperation,
} from '@/types/generated-operations';
import { AuditJournalEntryResponseSchema, StatusResponseSchema } from '@/types/generated-zod';
import { z } from 'zod';

/** 파일 요청의 오류 본문은 Blob 으로 온다. JSON 이면 읽어 바꿔 넣고, 아니면 원래 오류를 그대로 돌려준다. */
async function withJsonErrorBody(error: unknown): Promise<unknown> {
  const response = (error as { response?: { data?: unknown } } | null)?.response;
  if (!response || typeof Blob === 'undefined' || !(response.data instanceof Blob)) return error;
  try {
    response.data = JSON.parse(await response.data.text());
  } catch {
    // JSON 이 아닌 본문(게이트웨이 오류 페이지 등)은 그대로 둔다 — 호출부는 과업별 안내 문구를 쓴다.
  }
  return error;
}

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

  /**
   * [2026-10-20] 감사 원장 전체 결과 xlsx. 목록과 같은 조건(행위자·작업·기간)과 사유(필수)를 싣는다.
   *
   * <p>다른 로그 내보내기는 브라우저 이동으로 받지만, 이 내보내기는 사유를 받는 폼이라 서버 거부(사유·상한 400, 권한 403)를
   * 폼이 말해야 한다. 그래서 인증 요청으로 Blob 을 받는다. 상한(10만 행)이 있어 메모리 부담이 작다. 오류 본문도 Blob 으로
   * 오므로 JSON 으로 다시 읽어 필드 오류(`errors`)와 서버 문구를 호출부가 그대로 쓰게 한다.
   */
  async exportAuditJournal(query: Omit<AuditJournalQuery, 'page' | 'size'> & { reason: string }): Promise<Blob> {
    try {
      const result = await executeGeneratedOperation(exportAuditJournalOperation, {
        query: {
          ...(query.actorId ? { actorId: query.actorId } : {}),
          ...(query.operation ? { operation: query.operation } : {}),
          ...(query.fromDate && query.toDate ? { fromDate: query.fromDate, toDate: query.toDate } : {}),
          reason: query.reason,
        },
      });
      if (!(result instanceof Blob)) throw new Error('감사 원장 파일 응답이 파일이 아닙니다.');
      return result;
    } catch (error) {
      throw await withJsonErrorBody(error);
    }
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

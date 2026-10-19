import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { operationsRecordAdminService } from '../OperationsRecordAdminService';

vi.mock('@/lib/api/generated-api-client', () => ({ executeGeneratedOperation: vi.fn() }));

/**
 * [ADR-0036] 운영 기록 열람 서비스의 페이지 계약.
 *
 * 후속 작업 목록은 종전에 Spring `Page` 원형(content·totalElements·totalPages, 0 기반 number)을 돌려줘 이 서비스만 따로 풀었다.
 * 이제 다른 목록과 같은 `PageResponse`(list·total·page·size·totalPage)이고, 요청 `page` 는 1부터다.
 */
describe('OperationsRecordAdminService — 페이지 계약(ADR-0036)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('후속 작업 목록은 page(1부터)·size 를 그대로 보내고 PageResponse 를 화면 모양(list·total·totalPages)으로 옮긴다', async () => {
    const job = { id: '7', type: 'MAIL', status: 'FAILED', attempts: 8, retryable: false };
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ list: [job], total: 21, page: 2, size: 20, totalPage: 2 });

    await expect(operationsRecordAdminService.getDurableJobs(2, 20)).resolves.toEqual({ list: [job], total: 21, totalPages: 2 });
    expect(executeGeneratedOperation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'durableJobList' }),
      { query: { page: 2, size: 20 } },
    );
  });

  it('Spring Page 원형(content·totalElements)은 빈 목록으로 흘리지 않고 계약 위반으로 거부한다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ content: [{ id: '7' }], totalElements: 1, totalPages: 1, number: 0 });

    await expect(operationsRecordAdminService.getDurableJobs(1, 20))
      .rejects.toThrow('후속 작업 페이지 응답이 필수 계약과 일치하지 않습니다.');
  });

  it('감사 원장 목록은 page(1부터)·size 를 그대로 보낸다', async () => {
    vi.mocked(executeGeneratedOperation).mockResolvedValue({ list: [], total: 0, page: 1, size: 20, totalPage: 0 });

    await operationsRecordAdminService.getAuditJournal({ actorId: 'admin', page: 1, size: 20 });
    expect(executeGeneratedOperation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'auditJournalList' }),
      { query: { actorId: 'admin', page: 1, size: 20 } },
    );
  });
});

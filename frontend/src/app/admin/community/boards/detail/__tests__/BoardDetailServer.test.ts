import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { commentService } from '@/services/business/comment/commentService';
import { getInitialBoardDetailData } from '../BoardDetailServer';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

vi.mock('@/services/business/knowledge/knowledgeService', () => ({
  knowledgeService: { getArticle: vi.fn() },
}));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { getBoardMaster: vi.fn() },
}));

vi.mock('@/services/business/comment/commentService', () => ({
  commentService: { getComments: vi.fn() },
}));

describe('BoardDetailServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'test-token' }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  it('관리자 전용 게시판 메타 조회가 거부되어도 인증 사용자의 게시글과 댓글을 유지합니다.', async () => {
    const article = { pstSn: 7, pstTtl: '사용자 게시글', pstCn: '본문' };
    const comment = { commentNo: 11, commentCn: '댓글' };

    vi.mocked(knowledgeService.getArticle).mockResolvedValue(article);
    vi.mocked(boardAdminService.getBoardMaster).mockRejectedValue({ response: { status: 403 } });
    vi.mocked(commentService.getComments).mockResolvedValue({
      list: [comment],
      total: 1,
      page: 1,
      size: 100,
      totalPage: 1,
    } as never);

    await expect(getInitialBoardDetailData('BBS-1', 7)).resolves.toEqual({
      article,
      masterInfo: null,
      initialComments: [comment],
      fetchError: null,
    });
  });

  it('주요 게시글 조회 실패의 원문과 오류 객체를 사용자 응답이나 서버 콘솔에 노출하지 않습니다.', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(knowledgeService.getArticle).mockRejectedValue(
      Object.assign(new Error('PRIVATE_BACKEND_DETAIL'), {
        response: { status: 500, data: { message: 'PRIVATE_RESPONSE_DETAIL' } },
      }),
    );
    vi.mocked(boardAdminService.getBoardMaster).mockResolvedValue({} as never);
    vi.mocked(commentService.getComments).mockResolvedValue({ list: [] } as never);

    const result = await getInitialBoardDetailData('BBS-2', 8);

    expect(result).toEqual({
      article: null,
      masterInfo: null,
      initialComments: [],
      fetchError: '게시글을 불러오지 못했습니다.',
    });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(consoleError).not.toHaveBeenCalled();
  });
});

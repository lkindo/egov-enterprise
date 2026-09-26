import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { commentService } from '@/services/business/comment/commentService';
import { getInitialBoardDetailData } from '../BoardDetailServer';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

vi.mock('@/services/business/knowledge/knowledgeService', () => ({
  knowledgeService: { getArticle: vi.fn() },
}));

vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { getBoardMeta: vi.fn() },
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

  it('게시판 메타 조회가 거부되어도 인증 사용자의 게시글과 댓글을 유지합니다.', async () => {
    const article = { pstSn: 7, pstTtl: '사용자 게시글', pstCn: '본문' };
    const comment = { commentNo: 11, commentCn: '댓글' };

    vi.mocked(knowledgeService.getArticle).mockResolvedValue(article);
    vi.mocked(boardUserService.getBoardMeta).mockRejectedValue({ response: { status: 403 } });
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
      commentTotal: 1,
      fetchError: null,
    });
  });

  it('댓글 전체 수를 함께 넘겨 첫 100개 밖의 댓글이 있음을 화면이 말하게 한다 (DIP C7)', async () => {
    vi.mocked(knowledgeService.getArticle).mockResolvedValue({ pstSn: 7, pstTtl: '글', pstCn: '본문' });
    vi.mocked(boardUserService.getBoardMeta).mockResolvedValue(null as never);
    vi.mocked(commentService.getComments).mockResolvedValue({ list: [{ ansSn: 1 }], total: 150, page: 1, size: 100, totalPage: 2 } as never);

    const data = await getInitialBoardDetailData('BBS-1', 7);

    expect(data.commentTotal).toBe(150);
    expect(commentService.getComments).toHaveBeenCalledWith({ pstSn: 7, bbsId: 'BBS-1', size: 100 }, expect.anything());
  });

  it('🚨 게시판 메타는 사용자용 API 로 읽어 일반 사용자도 제목·템플릿을 받는다 (DIP V5)', async () => {
    const meta = { bbsId: 'BBS-3', bbsTtl: '자유게시판', tmpltId: 'TMPLT_FAQ' };
    vi.mocked(knowledgeService.getArticle).mockResolvedValue({ pstSn: 9 } as never);
    vi.mocked(boardUserService.getBoardMeta).mockResolvedValue(meta as never);
    vi.mocked(commentService.getComments).mockResolvedValue({ list: [] } as never);

    const result = await getInitialBoardDetailData('BBS-3', 9);

    expect(result.masterInfo).toEqual(meta);
    expect(boardUserService.getBoardMeta).toHaveBeenCalledWith('BBS-3', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('🚨 게시글 403 은 장애가 아니라 권한으로 돌려준다 — 재시도를 권하지 않도록 표시한다 (DIP V9)', async () => {
    vi.mocked(knowledgeService.getArticle).mockRejectedValue({ response: { status: 403 } });
    vi.mocked(boardUserService.getBoardMeta).mockResolvedValue({} as never);
    vi.mocked(commentService.getComments).mockResolvedValue({ list: [] } as never);

    const result = await getInitialBoardDetailData('BBS-4', 10);

    expect(result).toMatchObject({ article: null, forbidden: true });
    expect(result.fetchError).toContain('볼 권한이 없습니다');
  });

  it('주요 게시글 조회 실패의 원문과 오류 객체를 사용자 응답이나 서버 콘솔에 노출하지 않습니다.', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(knowledgeService.getArticle).mockRejectedValue(
      Object.assign(new Error('PRIVATE_BACKEND_DETAIL'), {
        response: { status: 500, data: { message: 'PRIVATE_RESPONSE_DETAIL' } },
      }),
    );
    vi.mocked(boardUserService.getBoardMeta).mockResolvedValue({} as never);
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

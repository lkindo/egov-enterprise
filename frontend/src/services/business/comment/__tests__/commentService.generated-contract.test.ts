import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { commentService } from '../commentService';

const comment = {
  ansSn: 11,
  pstSn: 7,
  bbsId: 'BBSMSTR_A',
  wrterId: 'writer-1',
  wrterNm: '작성자',
  frstRgtrId: 'user-1',
  ansCn: '댓글 본문',
  crtDt: '2026-08-30T12:00:00',
};

describe('commentService generated response contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generated PageResponseCommentDto를 검증하고 UI용 페이지 기본값을 보정한다', async () => {
    client.get.mockResolvedValueOnce({ list: [comment], total: 1 });

    await expect(commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' })).resolves.toEqual({
      list: [comment],
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    });
    expect(client.get).toHaveBeenCalledWith('comments', {
      params: { pstSn: 7, bbsId: 'BBSMSTR_A' },
    });
  });

  it('화면 식별에 필요한 generated Comment 필드가 빠진 행은 경계에서 거부한다', async () => {
    client.get.mockResolvedValueOnce({
      list: [{ ...comment, ansSn: undefined }],
      total: 1,
    });

    await expect(commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' })).rejects.toThrow();
  });

  it('legacy nullable 작성자·등록일은 adapter에서 안전한 표시값으로만 정규화한다', async () => {
    client.get.mockResolvedValueOnce({
      list: [{
        ...comment,
        wrterId: null,
        wrterNm: null,
        frstRgtrId: null,
        crtDt: null,
        pswd: 'response-must-not-retain-this',
      }],
      total: 1,
    });

    const page = await commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' });

    expect(page.list[0]).toMatchObject({
      ansSn: 11,
      wrterId: '',
      wrterNm: '작성자 정보 없음',
      crtDt: '',
    });
    expect(page.list[0].frstRgtrId).toBeUndefined();
    expect(page.list[0]).not.toHaveProperty('pswd');
  });

  it('현재 계약에 없는 legacy resultList/paginationInfo를 목록으로 오인하지 않는다', async () => {
    client.get.mockResolvedValueOnce({
      resultList: [comment],
      paginationInfo: { totalRecordCount: 1 },
    });

    await expect(commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' })).resolves.toEqual({
      list: [],
      total: 0,
      page: 1,
      size: 10,
      totalPage: 1,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { commentService } from '../commentService';

const comment = {
  ansSn: 11,
  pstSn: 7,
  bbsId: 'BBSMSTR_A',
  wrterNm: '작성자',
  editable: true,
  deletable: false,
  ansCn: '댓글 본문',
  crtDt: '2026-08-30T12:00:00',
};

// 목록 응답의 PageResponse 다섯 필드는 계약상 필수다(ADR-0036).
const pageOf = (list: unknown[]) => ({ list, total: list.length, page: 1, size: 10, totalPage: 1 });

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

describe('commentService generated response contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generated PageResponseCommentDto를 검증해 화면 페이지 모델로 넘긴다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope(pageOf([comment])));

    await expect(commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' })).resolves.toEqual({
      list: [comment],
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    });
    expect(client.getRaw).toHaveBeenCalledWith('comments', {
      params: { pstSn: 7, bbsId: 'BBSMSTR_A' },
    });
  });

  it('화면 식별에 필요한 generated Comment 필드가 빠진 행은 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope(pageOf([{ ...comment, ansSn: undefined }])));

    await expect(commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' })).rejects.toThrow();
  });

  it('계약상 nullable 작성자·등록일을 UI 표시값으로 안전하게 정규화한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope(pageOf([{
      ...comment,
      wrterNm: null,
      crtDt: null,
    }])));

    const page = await commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' });

    expect(page.list[0]).toMatchObject({
      ansSn: 11,
      wrterNm: '작성자 정보 없음',
      crtDt: '',
    });
    expect(page.list[0]).not.toHaveProperty('frstRgtrId');
    expect(page.list[0]).not.toHaveProperty('wrterId');
    expect(page.list[0]).not.toHaveProperty('pswd');
  });

  it.each(['frstRgtrId', 'wrterId'])('작성자 식별자 %s가 재유입해도 화면 소비자에게 전달하지 않는다', async (field) => {
    client.getRaw.mockResolvedValueOnce(successEnvelope(pageOf([{ ...comment, [field]: 'private-login' }])));
    const response = await commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' });
    expect(response.list).toEqual([comment]);
    expect(response.list[0]).not.toHaveProperty(field);
  });

  it('폐기된 익명 비밀번호(pswd)는 계약에 없다 — 응답에 섞여 와도 화면 소비자에게 전달하지 않는다', async () => {
    // 서버는 이 필드를 받지도 저장하지도 않는다(CommentDto 에서 제거). 계약 밖 필드는 작성자 식별자처럼 걸러진다.
    client.getRaw.mockResolvedValueOnce(successEnvelope(pageOf([{ ...comment, pswd: 'response-must-not-retain-this' }])));

    const response = await commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' });

    expect(response.list).toEqual([comment]);
    expect(response.list[0]).not.toHaveProperty('pswd');
    expect(client.getRaw).toHaveBeenCalledWith('comments', {
      params: { pstSn: 7, bbsId: 'BBSMSTR_A' },
    });
  });

  it('현재 계약에 없는 legacy resultList/paginationInfo 응답은 페이지 필드가 없어 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({
      resultList: [comment],
      paginationInfo: { totalRecordCount: 1 },
    }));

    await expect(commentService.getComments({ pstSn: 7, bbsId: 'BBSMSTR_A' })).rejects.toThrow('생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.');
  });

  it('등록·수정·삭제를 generated operation으로 실행한다', async () => {
    const request = { pstSn: 7, bbsId: 'BBSMSTR_A', ansCn: '댓글 본문' };
    client.requestRaw
      .mockResolvedValueOnce(successEnvelope(21))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null));

    await expect(commentService.createComment(request)).resolves.toBe(21);
    await expect(commentService.updateComment(21, request)).resolves.toBeUndefined();
    await expect(commentService.deleteComment(21)).resolves.toBeUndefined();

    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'comments',
      method: 'post',
      data: request,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'comments/21',
      method: 'put',
      data: request,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(3, {
      url: 'comments/21',
      method: 'delete',
    });
  });
});

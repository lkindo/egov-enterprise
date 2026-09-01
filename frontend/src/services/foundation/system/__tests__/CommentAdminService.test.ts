import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { commentAdminService } from '../CommentAdminService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: '성공',
  data,
});

const emptyPage = { list: [], total: 0, page: 0, size: 50, totalPage: 0 };

describe('CommentAdminService generated contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockResolvedValue(success(emptyPage));
    client.requestRaw.mockResolvedValue(success(null));
  });

  it('관리자 댓글 목록의 정확한 generated 경로를 사용한다', async () => {
    await commentAdminService.getComments({});

    expect(client.getRaw).toHaveBeenCalledWith('admin/comments', { params: {} });
  });

  it('Spring Pageable의 0-based page와 size를 중복 legacy 축 없이 전달한다', async () => {
    await commentAdminService.getComments({ page: 2, size: 50 });

    expect(client.getRaw).toHaveBeenCalledWith('admin/comments', {
      params: { page: 2, size: 50 },
    });
  });

  it('게시글 필터와 공개 searchWrd 별칭을 exact searchKeyword로 정규화한다', async () => {
    await commentAdminService.getComments({
      pstSn: 55,
      bbsId: 'BBSMSTR_000000000001',
      searchWrd: '스팸',
    });

    expect(client.getRaw).toHaveBeenCalledWith('admin/comments', {
      params: {
        pstSn: 55,
        bbsId: 'BBSMSTR_000000000001',
        searchKeyword: '스팸',
      },
    });
  });

  it('timeout·signal·Authorization을 generated config로 보존한다', async () => {
    const { signal } = new AbortController();
    const headers = { Authorization: 'Bearer test-token' };

    await commentAdminService.getComments(
      { page: 0, size: 20 },
      { timeout: 3000, signal, headers },
    );

    expect(client.getRaw).toHaveBeenCalledWith('admin/comments', {
      timeout: 3000,
      signal,
      headers,
      params: { page: 0, size: 20 },
    });
  });

  it('config.params는 공개 첫 인자에 덮이며 generated config로 새지 않는다', async () => {
    const { signal } = new AbortController();

    await commentAdminService.getComments({ pstSn: 7 }, { params: { pstSn: 999 }, signal });

    expect(client.getRaw).toHaveBeenCalledWith('admin/comments', {
      signal,
      params: { pstSn: 7 },
    });
  });

  it('검증된 페이지 응답을 재포장하지 않고 반환한다', async () => {
    const page = {
      list: [{
        ansSn: 1001,
        pstSn: 55,
        bbsId: 'BBSMSTR_000000000001',
        wrterId: 'USER_1',
        wrterNm: '홍길동',
        ansCn: '확인했습니다.',
        crtDt: '2026-08-14T10:00:00',
      }],
      total: 1,
      page: 0,
      size: 50,
      totalPage: 1,
    };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(commentAdminService.getComments({ page: 0, size: 50 })).resolves.toBe(page);
  });

  it('페이지 필수 metadata가 빠지면 fail-closed한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({ list: [] }));

    await expect(commentAdminService.getComments({})).rejects.toThrow(
      '댓글 페이지 응답이 필수 계약과 일치하지 않습니다.',
    );
  });

  it('응답에 write-only pswd가 섞이면 generated forbidden-path 경계가 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({
      ...emptyPage,
      list: [{ ansSn: 1, pswd: 'should-not-leak' }],
    }));

    await expect(commentAdminService.getComments({})).rejects.toThrow(
      '생성 API 응답에 허용되지 않은 필드가 있습니다.',
    );
  });

  it('목록 transport 오류를 삼키지 않는다', async () => {
    const failure = new Error('Request failed with status code 500');
    client.getRaw.mockRejectedValueOnce(failure);

    await expect(commentAdminService.getComments({})).rejects.toBe(failure);
  });

  it('댓글 식별자를 exact DELETE path에 넣는다', async () => {
    await commentAdminService.deleteComment(1001);
    await commentAdminService.deleteComment(0);

    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'admin/comments/1001',
      method: 'delete',
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'admin/comments/0',
      method: 'delete',
    });
  });

  it('DELETE config를 보존하고 params를 임의로 만들지 않는다', async () => {
    const { signal } = new AbortController();

    await commentAdminService.deleteComment(1001, { timeout: 5000, signal });

    expect(client.requestRaw).toHaveBeenCalledWith({
      timeout: 5000,
      signal,
      url: 'admin/comments/1001',
      method: 'delete',
    });
  });

  it('삭제 실패를 삼키거나 재시도하지 않는다', async () => {
    const denied = new Error('삭제 권한이 없습니다');
    client.requestRaw.mockRejectedValueOnce(denied);

    await expect(commentAdminService.deleteComment(1001)).rejects.toBe(denied);
    expect(client.requestRaw).toHaveBeenCalledTimes(1);
  });
});

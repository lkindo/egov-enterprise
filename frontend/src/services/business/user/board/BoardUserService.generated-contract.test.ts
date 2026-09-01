import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { boardUserService } from './BoardUserService';

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

const post = {
  pstSn: 9,
  bbsId: 'BBS01',
  pstTtl: '제목',
  pstCn: '본문',
  useYn: 'Y',
  userId: 'writer01',
};
const saveRequest = {
  bbsId: 'BBS01',
  pstTtl: '제목',
  pstCn: '본문',
  useYn: 'Y',
};

describe('BoardUserService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('6개 경계를 generated operation으로 실행하고 등록 ID 반환을 보존한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(successEnvelope({ list: [post], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(post));
    client.requestRaw
      .mockResolvedValueOnce(successEnvelope(21))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(4));

    await expect(boardUserService.getPosts('BBS01', { page: 0, size: 20 }))
      .resolves.toMatchObject({ list: [post], total: 1 });
    await expect(boardUserService.getPost('BBS01', 9)).resolves.toEqual(post);
    await expect(boardUserService.createPost(saveRequest)).resolves.toBe(21);
    await expect(boardUserService.updatePost('BBS01', 9, saveRequest)).resolves.toBeUndefined();
    await expect(boardUserService.deletePost('BBS01', 9)).resolves.toBeUndefined();
    await expect(boardUserService.likePost('BBS01', 9)).resolves.toBe(4);

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'boards/BBS01', {
      params: { page: 0, size: 20 },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'boards/BBS01/posts/9', undefined);
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'boards/posts',
      method: 'post',
      data: saveRequest,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'boards/BBS01/posts/9',
      method: 'put',
      data: saveRequest,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(3, {
      url: 'boards/BBS01/posts/9',
      method: 'delete',
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(4, {
      url: 'boards/BBS01/posts/9/like',
      method: 'patch',
    });
  });

  it('writeOnly pswd가 상세 응답에 섞이면 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({ ...post, pswd: 'secret' }));

    await expect(boardUserService.getPost('BBS01', 9)).rejects.toThrow(
      '생성 API 응답에 허용되지 않은 필드가 있습니다.',
    );
  });

  it('필수 본문이 없는 게시글 요청은 transport 전에 거부한다', async () => {
    await expect(boardUserService.createPost({ bbsId: 'BBS01', pstTtl: '제목' } as never))
      .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});

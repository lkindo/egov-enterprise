vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { saveBoardArticle, deleteBoardArticle, likeBoardArticle } from '../boardActions';
import client from '@/lib/api/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
  },
}));

function successEnvelope(data: unknown) {
  return { success: true, code: 'SUCCESS', message: '성공', data };
}

describe('boardActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.requestRaw).mockImplementation(async (config: { method?: string; url?: string }) => {
      if (config.url?.endsWith('/like')) return successEnvelope(4);
      return successEnvelope(config.method === 'post' ? 100 : null);
    });
  });

  describe('saveBoardArticle', () => {
    it('should return error if title is missing', async () => {
      const formData = new FormData();
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('제목을 입력해주세요.');
      expect(result.field).toBe('pstTtl');
    });

    it('should return error if content is missing', async () => {
      const formData = new FormData();
      formData.append('pstTtl', 'title');
      formData.append('bbsId', 'BBS_001');

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('내용을 입력해주세요.');
      expect(result.field).toBe('pstCn');
    });

    it('should call API and return success on create', async () => {
      const formData = new FormData();
      formData.append('pstTtl', 'title');
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'token' }),
      };
      (vi.mocked(cookies)).mockResolvedValue(mockCookies as unknown as Awaited<ReturnType<typeof cookies>>);

      const result = await saveBoardArticle({}, formData);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'boards/posts',
        method: 'post',
        data: expect.objectContaining({
          pstTtl: 'title',
          pstCn: 'content',
          bbsId: 'BBS_001',
        }),
        headers: { Authorization: 'Bearer token' },
      });
      expect(client.post).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards/select-board-list');
      expect(result.success).toBe(true);
      expect(result.message).toBe('게시글이 성공적으로 등록되었습니다.');
      expect(result.redirect).toBe('/admin/community/boards/detail?bbsId=BBS_001&pstSn=100');
    });

    it('should call API and return success on edit', async () => {
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('pstTtl', 'title edited');
      formData.append('pstCn', 'content edited');
      formData.append('bbsId', 'BBS_001');

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'token' }),
      };
      (vi.mocked(cookies)).mockResolvedValue(mockCookies as unknown as Awaited<ReturnType<typeof cookies>>);

      const result = await saveBoardArticle({}, formData);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'boards/BBS_001/posts/100',
        method: 'put',
        data: expect.objectContaining({
          pstTtl: 'title edited',
          pstCn: 'content edited',
          bbsId: 'BBS_001',
        }),
        headers: { Authorization: 'Bearer token' },
      });
      expect(client.put).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards/select-board-list');
      expect(result.success).toBe(true);
      expect(result.message).toBe('게시글이 성공적으로 수정되었습니다.');
      expect(result.redirect).toBe('/admin/community/boards/detail?bbsId=BBS_001&pstSn=100');
    });

    it('should handle API failure', async () => {
      const formData = new FormData();
      formData.append('pstTtl', 'title');
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');

      (vi.mocked(cookies)).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);
      vi.mocked(client.requestRaw).mockResolvedValueOnce(successEnvelope(0));

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('저장에 실패했습니다.');
    });

    it('should handle catch error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const formData = new FormData();
      formData.append('pstTtl', 'title');
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');

      (vi.mocked(client.requestRaw)).mockRejectedValue({
        response: { data: { message: 'Network Error' } }
      });

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('게시글 저장 중 오류가 발생했습니다.');
      expect(result.message).not.toContain('Network Error');
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('파일이 있으면 생성 BBS multipart 계약의 경로와 part를 사용한다', async () => {
      const formData = new FormData();
      formData.append('pstTtl', 'title');
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');
      formData.append('files', new File(['image'], 'image.png', { type: 'image/png' }));
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);
      const result = await saveBoardArticle({}, formData);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'bbs/BBS_001',
        method: 'post',
        data: expect.any(FormData),
        headers: { 'Content-Type': undefined },
      });
      const request = vi.mocked(client.requestRaw).mock.calls[0][0] as { data: FormData; headers?: object };
      expect(request.data.get('board')).toBeInstanceOf(Blob);
      expect(request.data.getAll('file')).toHaveLength(1);
      expect(request.headers).toEqual({ 'Content-Type': undefined });
      expect(client.post).not.toHaveBeenCalled();
      expect(result.redirect).toContain('pstSn=100');
    });

    it('파일이 있는 수정도 생성 BBS multipart 경로를 쓰고 Content-Type을 수동 지정하지 않는다', async () => {
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('pstTtl', 'title edited');
      formData.append('pstCn', 'content edited');
      formData.append('bbsId', 'BBS_001');
      formData.append('files', new File(['image'], 'image.png', { type: 'image/png' }));
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);
      const result = await saveBoardArticle({}, formData);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'bbs/BBS_001/posts/100',
        method: 'put',
        data: expect.any(FormData),
        headers: { 'Content-Type': undefined },
      });
      const request = vi.mocked(client.requestRaw).mock.calls[0][0] as { data: FormData; headers?: object };
      expect(request.data.get('board')).toBeInstanceOf(Blob);
      expect(request.data.getAll('file')).toHaveLength(1);
      expect(request.headers).toEqual({ 'Content-Type': undefined });
      expect(client.put).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('deleteBoardArticle', () => {
    it('should call delete API and revalidate', async () => {
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('bbsId', 'BBS_001');

      (vi.mocked(cookies)).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'token' }) } as unknown as Awaited<ReturnType<typeof cookies>>);
      const result = await deleteBoardArticle({}, formData);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'boards/BBS_001/posts/100',
        method: 'delete',
        headers: { Authorization: 'Bearer token' },
      });
      expect(client.delete).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards/select-board-list');
      expect(result.success).toBe(true);
    });

    it('should handle delete failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('bbsId', 'BBS_001');

      (vi.mocked(cookies)).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);
      (vi.mocked(client.requestRaw)).mockRejectedValue(new Error('삭제 중 오류가 발생했습니다.'));

      const result = await deleteBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('게시글 삭제 중 오류가 발생했습니다.');
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  describe('likeBoardArticle', () => {
    it('생성 likePost 계약으로 추천 수를 반환한다', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'token' }),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const result = await likeBoardArticle('BBS_001', 100);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'boards/BBS_001/posts/100/like',
        method: 'patch',
        headers: { Authorization: 'Bearer token' },
      });
      expect(result).toEqual({ success: true, count: 4 });
    });
  });
});

vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { saveBoardArticle, deleteBoardArticle } from '../boardActions';
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
  },
}));

describe('boardActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      (vi.mocked(client.post)).mockResolvedValue('100');

      const result = await saveBoardArticle({}, formData);

      expect(client.post).toHaveBeenCalledWith('/boards/posts', expect.objectContaining({
        pstTtl: 'title',
        pstCn: 'content',
        bbsId: 'BBS_001'
      }), expect.anything());
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

      (vi.mocked(client.put)).mockResolvedValue({ success: true });

      const result = await saveBoardArticle({}, formData);

      expect(client.put).toHaveBeenCalledWith('/boards/BBS_001/posts/100', expect.objectContaining({
        pstTtl: 'title edited',
        pstCn: 'content edited',
        bbsId: 'BBS_001'
      }), expect.anything());
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
      (vi.mocked(client.post)).mockResolvedValue(null);

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

      (vi.mocked(client.post)).mockRejectedValue({
        response: { data: { message: 'Network Error' } }
      });

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('게시글 저장 중 오류가 발생했습니다.');
      expect(result.message).not.toContain('Network Error');
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  describe('deleteBoardArticle', () => {
    it('should call delete API and revalidate', async () => {
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('bbsId', 'BBS_001');

      (vi.mocked(cookies)).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'token' }) } as unknown as Awaited<ReturnType<typeof cookies>>);
      (vi.mocked(client.delete)).mockResolvedValue({ success: true });

      const result = await deleteBoardArticle({}, formData);

      expect(client.delete).toHaveBeenCalledWith('/boards/BBS_001/posts/100', { headers: { Authorization: 'Bearer token' } });
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards/select-board-list');
      expect(result.success).toBe(true);
    });

    it('should handle delete failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('bbsId', 'BBS_001');

      (vi.mocked(cookies)).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);
      (vi.mocked(client.delete)).mockRejectedValue(new Error('삭제 중 오류가 발생했습니다.'));

      const result = await deleteBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('게시글 삭제 중 오류가 발생했습니다.');
      expect(consoleError).not.toHaveBeenCalled();
    });
  });
});

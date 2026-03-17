import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createBoardArticle, deleteBoardArticle } from '../boardActions';
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
    delete: vi.fn(),
  },
}));

describe('boardActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBoardArticle', () => {
    it('should return error if title is missing', async () => {
      const formData = new FormData();
      formData.append('nttCn', 'content');
      formData.append('bbsId', 'BBS_001');

      const result = await createBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('제목을 입력해주세요.');
      expect(result.field).toBe('nttSj');
    });

    it('should return error if content is missing', async () => {
      const formData = new FormData();
      formData.append('nttSj', 'title');
      formData.append('bbsId', 'BBS_001');

      const result = await createBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('내용을 입력해주세요.');
      expect(result.field).toBe('nttCn');
    });

    it('should call API and return success', async () => {
      const formData = new FormData();
      formData.append('nttSj', 'title');
      formData.append('nttCn', 'content');
      formData.append('bbsId', 'BBS_001');

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'token' }),
      };
      (cookies as any).mockResolvedValue(mockCookies);

      (client.post as any).mockResolvedValue({ success: true });

      const result = await createBoardArticle({}, formData);

      expect(client.post).toHaveBeenCalledWith('/bbs', {
        nttSj: 'title',
        nttCn: 'content',
        bbsId: 'BBS_001'
      }, expect.objectContaining({
        headers: { Authorization: 'Bearer token' }
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards');
      expect(result.success).toBe(true);
      expect(result.message).toBe('게시글이 성공적으로 등록되었습니다.');
    });

    it('should handle API failure', async () => {
      const formData = new FormData();
      formData.append('nttSj', 'title');
      formData.append('nttCn', 'content');
      formData.append('bbsId', 'BBS_001');

      (cookies as any).mockResolvedValue({ get: vi.fn() });
      (client.post as any).mockResolvedValue({ success: false, message: 'API Error' });

      const result = await createBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('API Error');
    });

    it('should handle catch error', async () => {
      const formData = new FormData();
      formData.append('nttSj', 'title');
      formData.append('nttCn', 'content');

      (cookies as any).mockResolvedValue({ get: vi.fn() });
      (client.post as any).mockRejectedValue({
        response: { data: { message: 'Network Error' } }
      });

      const result = await createBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network Error');
    });
  });

  describe('deleteBoardArticle', () => {
    it('should call delete API and revalidate', async () => {
      const formData = new FormData();
      formData.append('nttId', '100');
      formData.append('bbsId', 'BBS_001');

      (cookies as any).mockResolvedValue({ get: vi.fn() });
      (client.delete as any).mockResolvedValue({ success: true });

      const result = await deleteBoardArticle({}, formData);

      expect(client.delete).toHaveBeenCalledWith('/boards/BBS_001/posts/100', expect.any(Object));
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards');
      expect(result.success).toBe(true);
    });

    it('should handle delete failure', async () => {
      const formData = new FormData();
      formData.append('nttId', '100');
      formData.append('bbsId', 'BBS_001');

      (cookies as any).mockResolvedValue({ get: vi.fn() });
      (client.delete as any).mockResolvedValue({ success: false, message: 'Delete Failed' });

      const result = await deleteBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Delete Failed');
    });
  });
});

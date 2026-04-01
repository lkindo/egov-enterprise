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
      formData.append('nttCn', 'content');
      formData.append('bbsId', 'BBS_001');

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('제목을 입력해주세요.');
      expect(result.field).toBe('nttSj');
    });

    it('should return error if content is missing', async () => {
      const formData = new FormData();
      formData.append('nttSj', 'title');
      formData.append('bbsId', 'BBS_001');

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('내용을 입력해주세요.');
      expect(result.field).toBe('nttCn');
    });

    it('should call API and return success on create', async () => {
      const formData = new FormData();
      formData.append('nttSj', 'title');
      formData.append('nttCn', 'content');
      formData.append('bbsId', 'BBS_001');

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'token' }),
      };
      (cookies as unknown).mockResolvedValue(mockCookies);

      // 紐⑥쓽 ?앹꽦 ?묐떟?쇰줈 ?앹꽦님寃뚯떆湲 ID(님 '100')瑜?諛섑솚?쒕떎怨?媛님      (client.post as unknown).mockResolvedValue('100');

      const result = await saveBoardArticle({}, formData);

      expect(client.post).toHaveBeenCalledWith('/bbs/BBS_001', expect.any(FormData), expect.objectContaining({
        headers: { Authorization: 'Bearer token', 'Content-Type': 'multipart/form-data' }
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards');
      expect(result.success).toBe(true);
      expect(result.message).toBe('게시글이 성공적으로 등록되었습니다.');
      expect(result.redirect).toBe('/admin/community/boards/detail?bbsId=BBS_001&nttId=100');
    });

    it('should call API and return success on edit', async () => {
      const formData = new FormData();
      formData.append('nttId', '100');
      formData.append('nttSj', 'title edited');
      formData.append('nttCn', 'content edited');
      formData.append('bbsId', 'BBS_001');

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'token' }),
      };
      (cookies as unknown).mockResolvedValue(mockCookies);

      (client.put as unknown).mockResolvedValue({ success: true });

      const result = await saveBoardArticle({}, formData);

      expect(client.put).toHaveBeenCalledWith('/bbs/BBS_001/100', expect.any(FormData), expect.objectContaining({
        headers: { Authorization: 'Bearer token', 'Content-Type': 'multipart/form-data' }
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards');
      expect(result.success).toBe(true);
      expect(result.message).toBe('寃뚯떆湲님?깃났?곸쑝濡님섏젙?섏뿀?듬땲님');
      expect(result.redirect).toBe('/admin/community/boards/detail?bbsId=BBS_001&nttId=100');
    });

    it('should handle API failure', async () => {
      const formData = new FormData();
      formData.append('nttSj', 'title');
      formData.append('nttCn', 'content');
      formData.append('bbsId', 'BBS_001');

      (cookies as unknown).mockResolvedValue({ get: vi.fn() });
      (client.post as unknown).mockResolvedValue(null);

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('??μ뿉 ?ㅽ뙣?덉뒿?덈떎.');
    });

    it('should handle catch error', async () => {
      const formData = new FormData();
      formData.append('nttSj', 'title');
      formData.append('nttCn', 'content');

      (cookies as unknown).mockResolvedValue({ get: vi.fn() });
      (client.post as unknown).mockRejectedValue({
        response: { data: { message: 'Network Error' } }
      });

      const result = await saveBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('제목을 입력해주세요.');
    });
  });

  describe('deleteBoardArticle', () => {
    it('should call delete API and revalidate', async () => {
      const formData = new FormData();
      formData.append('nttId', '100');
      formData.append('bbsId', 'BBS_001');

      (cookies as unknown).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'token' }) });
      (client.delete as unknown).mockResolvedValue({ success: true });

      const result = await deleteBoardArticle({}, formData);

      expect(client.delete).toHaveBeenCalledWith('/bbs/BBS_001/100', { headers: { Authorization: 'Bearer token' } });
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards');
      expect(result.success).toBe(true);
    });

    it('should handle delete failure', async () => {
      const formData = new FormData();
      formData.append('nttId', '100');
      formData.append('bbsId', 'BBS_001');

      (cookies as unknown).mockResolvedValue({ get: vi.fn() });
      (client.delete as unknown).mockResolvedValue(undefined);

      const result = await deleteBoardArticle({}, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('님젣님?ㅽ뙣?덉뒿?덈떎.');
    });
  });
});

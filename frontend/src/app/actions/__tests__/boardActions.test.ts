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

    it.each([
      [403, { message: 'Forbidden' }, '이 게시판에 글을 쓰거나 이 글을 고칠 권한이 없습니다.'],
      [413, {}, '첨부 파일이 허용 크기를 넘습니다. 파일 크기를 줄여 다시 시도해 주세요.'],
      [415, {}, '보낼 수 없는 형식의 요청입니다. 첨부 파일 형식을 확인해 주세요.'],
      // 그 밖의 4xx 는 서버 사유를 그대로 싣는다(필드를 가리키지 않는 사유).
      [404, { message: '게시글을 찾을 수 없습니다.' }, '게시글을 찾을 수 없습니다.'],
      // [2026-10-23 ADR-0040 결정 10] 버전 충돌(409)은 '다시 시도' 가 아니라 다시 열어 확인하라고 말한다 — 같은 버전으로는 또 거부된다.
      [409, { message: '데이터가 이미 수정되었습니다. 다시 시도해주세요.' }, '다른 사용자가 먼저 이 글을 고쳐 저장하지 않았습니다. 글을 다시 열어 최신 내용을 확인한 뒤 고쳐 주세요.'],
    ])('🚨 저장 실패 %i 는 사유를 말한다 — 한 문장으로 뭉개지 않는다 (DIP V9)', async (status, data, expected) => {
      const formData = new FormData();
      formData.append('pstTtl', 'title');
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');
      (vi.mocked(client.requestRaw)).mockRejectedValue({ response: { status, data } });

      const result = await saveBoardArticle({}, formData);

      expect(result).toMatchObject({ success: false, message: expected });
    });

    // [2026-10-23 ADR-0040 결정 10] 게시글 버전은 수정에만 싣는다 — 새 글에 버전을 보내지 않는다.
    it('수정은 폼이 실은 게시글 버전을 숫자로 보내고, 등록은 보내지 않는다', async () => {
      const edit = new FormData();
      edit.append('pstSn', '100');
      edit.append('pstTtl', 'title');
      edit.append('pstCn', 'content');
      edit.append('bbsId', 'BBS_001');
      edit.append('version', '4');
      await saveBoardArticle({}, edit);
      expect(vi.mocked(client.requestRaw).mock.calls.at(-1)?.[0]).toMatchObject({ method: 'put', data: expect.objectContaining({ version: 4 }) });

      const create = new FormData();
      create.append('pstTtl', 'title');
      create.append('pstCn', 'content');
      create.append('bbsId', 'BBS_001');
      create.append('version', '4');
      await saveBoardArticle({}, create);
      const createCall = vi.mocked(client.requestRaw).mock.calls.at(-1)?.[0] as { method: string; data: Record<string, unknown> };
      expect(createCall.method).toBe('post');
      expect(createCall.data).not.toHaveProperty('version');
    });

    // [2026-10-23 ADR-0040 결정 3·D-11] 게시 기간 규칙의 서버 사유는 필드 없이 온다 — 사유가 말하는 날짜 칸에 붙인다.
    it.each([
      [400, '이 게시판은 예약 게시를 받지 않습니다. 게시 시작일은 오늘이나 그 이전으로 정해 주세요.', 'pstBgngYmd'],
      [403, '게시가 시작된 글의 시작일은 게시글 전체 수정 권한이 있어야 바꿀 수 있습니다.', 'pstBgngYmd'],
      [400, '종료일은 시작일보다 빠를 수 없습니다.', 'pstEndYmd'],
    ])('게시 기간 사유(%i)는 그 날짜 칸에 붙인다', async (status, message, field) => {
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('pstTtl', 'title');
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');
      formData.append('version', '1');
      (vi.mocked(client.requestRaw)).mockRejectedValue({ response: { status, data: { message } } });

      await expect(saveBoardArticle({}, formData)).resolves.toMatchObject({ success: false, field, message });
    });

    it('🚨 400 필드 오류는 어느 입력인지 함께 돌려준다 (DIP V9)', async () => {
      const formData = new FormData();
      formData.append('pstTtl', 'title');
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');
      (vi.mocked(client.requestRaw)).mockRejectedValue({
        response: { status: 400, data: { message: '입력값 오류', errors: [{ field: 'pstTtl', message: '제목은 300자 이하입니다.' }] } },
      });

      const result = await saveBoardArticle({}, formData);

      expect(result).toMatchObject({ success: false, field: 'pstTtl', message: '제목은 300자 이하입니다.' });
    });

    it('파일이 있으면 첨부 동반 등록(/with-files) 계약의 경로와 part를 사용한다', async () => {
      const formData = new FormData();
      formData.append('pstTtl', 'title');
      formData.append('pstCn', 'content');
      formData.append('bbsId', 'BBS_001');
      formData.append('files', new File(['image'], 'image.png', { type: 'image/png' }));
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);
      const result = await saveBoardArticle({}, formData);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'boards/BBS_001/posts/with-files',
        method: 'post',
        data: expect.any(FormData),
        headers: { 'Content-Type': undefined },
      });
      const request = vi.mocked(client.requestRaw).mock.calls[0][0] as { data: FormData; headers?: object };
      expect(request.data.get('board')).toBeInstanceOf(Blob);
      expect(request.data.getAll('file')).toHaveLength(1);
      expect(request.headers).toEqual({ 'Content-Type': undefined });
      expect(result.redirect).toContain('pstSn=100');
    });

    it('수정은 폼의 기존 첨부 번호를 싣는다 — 파일을 더해도 기존 첨부가 떨어져 나가지 않는다 (DIP I1)', async () => {
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('pstTtl', 'title edited');
      formData.append('pstCn', 'content edited');
      formData.append('bbsId', 'BBS_001');
      formData.append('atchFileSn', '77');
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);

      await saveBoardArticle({}, formData);

      const request = vi.mocked(client.requestRaw).mock.calls[0][0] as { data: Record<string, unknown> };
      expect(request.data.atchFileSn).toBe(77);
    });

    it('Q&A 수정은 상태·분류 기본값을 채우지 않는다 — 해결된 질문이 접수로 되돌아가지 않는다 (DIP I3)', async () => {
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('pstTtl', 'title edited');
      formData.append('pstCn', 'content edited');
      formData.append('bbsId', 'BBSMSTR_DDDDDDDDDDDD');
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);

      await saveBoardArticle({}, formData);

      const request = vi.mocked(client.requestRaw).mock.calls[0][0] as { data: Record<string, unknown> };
      expect(request.data.qnaSttsCd).toBeUndefined();
      expect(request.data.qnaCatCd).toBeUndefined();
    });

    it('Q&A 등록은 접수 상태·기본 분류로 시작한다', async () => {
      const formData = new FormData();
      formData.append('pstTtl', 'question');
      formData.append('pstCn', 'body');
      formData.append('bbsId', 'BBSMSTR_DDDDDDDDDDDD');
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);

      await saveBoardArticle({}, formData);

      const request = vi.mocked(client.requestRaw).mock.calls[0][0] as { data: Record<string, unknown> };
      expect(request.data.qnaSttsCd).toBe('OPEN');
      expect(request.data.qnaCatCd).toBe('CAT01');
    });

    it('파일이 있는 수정도 첨부 동반 수정(/with-files) 경로를 쓰고 Content-Type을 수동 지정하지 않는다', async () => {
      const formData = new FormData();
      formData.append('pstSn', '100');
      formData.append('pstTtl', 'title edited');
      formData.append('pstCn', 'content edited');
      formData.append('bbsId', 'BBS_001');
      formData.append('files', new File(['image'], 'image.png', { type: 'image/png' }));
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as unknown as Awaited<ReturnType<typeof cookies>>);
      const result = await saveBoardArticle({}, formData);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'boards/BBS_001/posts/100/with-files',
        method: 'put',
        data: expect.any(FormData),
        headers: { 'Content-Type': undefined },
      });
      const request = vi.mocked(client.requestRaw).mock.calls[0][0] as { data: FormData; headers?: object };
      expect(request.data.get('board')).toBeInstanceOf(Blob);
      expect(request.data.getAll('file')).toHaveLength(1);
      expect(request.headers).toEqual({ 'Content-Type': undefined });
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
});

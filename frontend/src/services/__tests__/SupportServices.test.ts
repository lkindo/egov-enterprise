vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import * as pollService from '@/services/business/user/poll/PollUserService';
import { commentService } from '@/services/business/comment/commentService';
import { fileService } from '@/services/foundation/file/FileService';

vi.mock('@/lib/api/client', () => ({
  default: (() => {
    const get = vi.fn();
    const post = vi.fn();
    const put = vi.fn();
    const remove = vi.fn();
    return {
      get,
      post,
      put,
      delete: remove,
      getRaw: vi.fn(async (url: string, config?: unknown) => {
        const result = await get(url, config);
        const fallback = url.startsWith('files/')
          ? []
          : { list: [], total: 0, page: 0, size: 10, totalPage: 0 };
        return { success: true, code: 'S000', message: '성공', data: result ?? fallback };
      }),
      requestRaw: vi.fn(async () => ({
        success: true,
        code: 'S000',
        message: '성공',
        data: null,
      })),
    };
  })(),
}));

describe('Common Support Services', () => {
 beforeEach(() => vi.clearAllMocks());

  it('pollService calls correct endpoints', async () => {
  await pollService.getPollList({});
  expect(client.get).toHaveBeenCalledWith('polls', expect.any(Object));
  });

  it('commentService calls correct endpoints', async () => {
    (client.get as any).mockResolvedValue({ list: [], total: 0, page: 0, size: 10, totalPage: 0 });
  await commentService.getComments({ pstSn: 1, bbsId: 'BBSMSTR_A' });
  expect(client.get).toHaveBeenCalledWith('comments', expect.any(Object));
  });

  it('fileService calls correct endpoints', async () => {
  vi.mocked(client.getRaw).mockResolvedValueOnce({
    success: true,
    code: 'S000',
    message: '성공',
    data: [],
  });
  await fileService.getFileList(101);
  expect(client.getRaw).toHaveBeenCalledWith('files/101', undefined);
  });

  /*
    [2026-09-07] securityService(= security/SecurityAdminService) 블록을 걷었다.
    그 파일은 system/AuthorAdminService·RoleAdminService·GroupAdminService 의 죽은 중복이었고
    화면은 전부 정본 쪽을 쓴다. 같은 경로 계약은 AuthorAdminService.test.ts 가 검증한다.
  */
});

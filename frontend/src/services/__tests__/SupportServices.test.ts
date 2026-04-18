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
import * as securityService from '@/services/foundation/security/SecurityAdminService';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn(),
 post: vi.fn(),
 put: vi.fn(),
 delete: vi.fn(),
 }
}));

describe('Common Support Services', () => {
 beforeEach(() => vi.clearAllMocks());

  it('pollService calls correct endpoints', async () => {
  await pollService.getPollList({});
  expect(client.get).toHaveBeenCalledWith('polls', expect.any(Object));
  });

  it('commentService calls correct endpoints', async () => {
    (client.get as any).mockResolvedValue({ list: [], total: 0 });
  await commentService.getComments({} as any);
  expect(client.get).toHaveBeenCalledWith('v1/comments', expect.any(Object));
  });

  it('fileService calls correct endpoints', async () => {
  await fileService.getFileList('TEST_ATCH_ID');
  expect(client.get).toHaveBeenCalledWith('files/TEST_ATCH_ID', undefined);
  });

  it('securityService calls correct endpoints', async () => {
  await securityService.getAuthorList({});
  expect(client.get).toHaveBeenCalledWith('admin/system/authorities', expect.any(Object));
  });
});

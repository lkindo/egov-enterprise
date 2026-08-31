vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { boardUserService } from '../board/BoardUserService';
import { approvalUserService } from '../approval/ApprovalUserService';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn(),
 getRaw: vi.fn(),
 requestRaw: vi.fn(),
 post: vi.fn(),
 put: vi.fn(),
 delete: vi.fn(),
 }
}));

describe('User Domain Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getRaw).mockResolvedValue({
      success: true,
      code: 'S000',
      message: '성공',
      data: { list: [], total: 0, page: 0, size: 10, totalPage: 0 },
    });
  });

  it('BoardUserService should call correct endpoints', async () => {
    await boardUserService.getPosts('BBS01', { page: 0 });
    expect(client.getRaw).toHaveBeenCalledWith('boards/BBS01', {
      params: { page: 0 },
    });
  });

  it('ApprovalUserService should call correct endpoints', async () => {
    await approvalUserService.getPending({ page: 0 });
    expect(client.getRaw).toHaveBeenCalledWith('approvals/pending', { params: { page: 0 } });
  });
});

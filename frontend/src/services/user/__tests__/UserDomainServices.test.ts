import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { boardUserService } from '../board/BoardUserService';
import { approvalUserService } from '../approval/ApprovalUserService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('User Domain Services', () => {
  beforeEach(() => vi.clearAllMocks());

  it('BoardUserService should call correct endpoints', async () => {
    await boardUserService.getPosts('BBS01', { page: 0 });
    expect(client.get).toHaveBeenCalledWith('/boards/BBS01', expect.objectContaining({
      params: { page: 0 }
    }));
  });

  it('ApprovalUserService should call correct endpoints', async () => {
    // Correct method is getPending
    await approvalUserService.getPending({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('/approvals/pending', expect.objectContaining({
      params: { page: 0 }
    }));
  });
});

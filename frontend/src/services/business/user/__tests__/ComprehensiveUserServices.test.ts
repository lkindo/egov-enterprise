vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { addressbookUserService } from '../addressbook/AddressbookUserService';
import { communityUserService } from '../community/CommunityUserService';
import { deptJobUserService } from '../deptJob/DeptJobUserService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('Comprehensive User Services', () => {
  beforeEach(() => vi.clearAllMocks());

  it('addressbookUserService calls correct endpoints', async () => {
    (client.get as any).mockResolvedValue({ result: { content: [] } });
    await addressbookUserService.getAddressBooks({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('address-books', expect.any(Object));
  });

  it('communityUserService calls correct endpoints', async () => {
    await communityUserService.getCommunityList({} as any);
    expect(client.get).toHaveBeenCalledWith('communities', expect.any(Object));
  });

  it('deptJobUserService calls correct endpoints', async () => {
    await deptJobUserService.getDeptJobBoxes({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('dept-jobs/boxes', expect.any(Object));
  });
});

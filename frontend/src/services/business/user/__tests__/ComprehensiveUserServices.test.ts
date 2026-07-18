vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
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

  it('deptJobUserService calls correct endpoints', async () => {
    await deptJobUserService.getDeptJobBoxes({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('dept-jobs/boxes', expect.any(Object));
  });
});

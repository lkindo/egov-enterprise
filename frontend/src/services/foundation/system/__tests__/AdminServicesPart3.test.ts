vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { auditAdminService } from '../AuditAdminService';
import { fileAdminService } from '../FileAdminService';
import { ismAdminService } from '../IsmAdminService';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn(),
 post: vi.fn(),
 put: vi.fn(),
 delete: vi.fn(),
 patch: vi.fn(),
 }
}));

describe('Admin System Services Part 3 (Specialized)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AuditAdminService calls correct endpoints', async () => {
    await auditAdminService.getAuditLogs({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('admin/system/logs/system', expect.objectContaining({ 
      params: expect.objectContaining({ page: 0, pageIndex: 1 }) 
    }));
  });

  it('FileAdminService calls correct endpoints', async () => {
    await fileAdminService.getFiles({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('admin/system/files', expect.objectContaining({ 
      params: expect.objectContaining({ page: 0, pageIndex: 1 }) 
    }));
  });

  it('IsmAdminService calls correct endpoints', async () => {
    await ismAdminService.getPendingList({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('admin/system/ism', expect.objectContaining({ 
      params: expect.objectContaining({ page: 0, pageIndex: 1, type: 'received' }) 
    }));
  });
});

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
    // super('/audit') -> /admin/system/audit
    expect(client.get).toHaveBeenCalledWith('/admin/system/audit', expect.any(Object));
  });

  it('FileAdminService calls correct endpoints', async () => {
    await fileAdminService.getFiles({ page: 0 });
    // super('/system/files') -> /admin/system/system/files
    expect(client.get).toHaveBeenCalledWith('/admin/system/system/files', expect.any(Object));
  });

  it('IsmAdminService calls correct endpoints', async () => {
    await ismAdminService.getInfrmlSanctnList({ page: 0 });
    // super('/ism') -> /admin/system/ism
    expect(client.get).toHaveBeenCalledWith('/admin/system/ism', expect.any(Object));
  });
});

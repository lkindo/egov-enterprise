import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { monitoringAdminService } from '../MonitoringAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('MonitoringAdminService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getServerResourceLogs should call correct API', async () => {
    await monitoringAdminService.getServerResourceLogs({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/monitoring/logs', expect.objectContaining({
      params: { page: 0 }
    }));
  });

  it('getHttpMonList should call correct direct API', async () => {
    await monitoringAdminService.getHttpMonList({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/http-monitoring', expect.objectContaining({
      params: { page: 0 }
    }));
  });

  it('checkDbStatus should call post', async () => {
    await monitoringAdminService.checkDbStatus('my-db');
    expect(client.post).toHaveBeenCalledWith('/admin/system/db-monitoring/my-db/check', {}, undefined);
  });
});
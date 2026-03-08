import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { statsAdminService } from '../StatsAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('StatsAdminService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getSummary should call legacy endpoint', async () => {
    await statsAdminService.getSummary();
    expect(client.get).toHaveBeenCalledWith('/admin/dashboard/summary', undefined);
  });

  it('getAdminSummary should call new endpoint', async () => {
    await statsAdminService.getAdminSummary();
    expect(client.get).toHaveBeenCalledWith('/admin/stats/summary', undefined);
  });

  it('getConnectStats should call with params', async () => {
    const params = { startDate: '2024-01-01', endDate: '2024-01-31' };
    await statsAdminService.getConnectStats(params);
    expect(client.get).toHaveBeenCalledWith('/stats/connect', expect.objectContaining({ params }));
  });

  it('getAdminConnectStats should call with params', async () => {
    const params = { startDate: '2024-01-01', endDate: '2024-01-31' };
    await statsAdminService.getAdminConnectStats(params);
    expect(client.get).toHaveBeenCalledWith('/admin/stats/connect', expect.objectContaining({ params }));
  });

  it('getUserStats should call correct API', async () => {
    const params = { searchCondition: '1', searchKeyword: 'test' };
    await statsAdminService.getUserStats(params as any);
    expect(client.get).toHaveBeenCalledWith('/admin/stats/user', expect.objectContaining({ params }));
  });

  it('getScrinStats should call correct API', async () => {
    const params = { searchCondition: '1' };
    await statsAdminService.getScrinStats(params as any);
    expect(client.get).toHaveBeenCalledWith('/admin/stats/screen', expect.objectContaining({ params }));
  });
});

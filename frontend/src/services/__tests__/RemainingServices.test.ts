import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { congratulationService } from '../congratulationService';
import { fileMngService } from '../fileMngService';
import { networkService } from '../networkService';
import { roleService } from '../roleService';
import { serverService } from '../serverService';
import { troubleService } from '../troubleService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  }
}));

describe('Remaining Domain Services', () => {
  beforeEach(() => vi.clearAllMocks());

  it('congratulationService calls correct endpoints', async () => {
    await congratulationService.getCongratulations({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/congratulations', expect.any(Object));
  });

  it('fileMngService calls correct endpoints', async () => {
    await fileMngService.getFileList('ATCH_01');
    expect(client.get).toHaveBeenCalledWith('/files/ATCH_01');
  });

  it('networkService calls correct endpoints', async () => {
    await networkService.getNetworks();
    expect(client.get).toHaveBeenCalledWith('/admin/system/networks', expect.any(Object));
  });

  it('roleService calls correct endpoints', async () => {
    await roleService.getRoles();
    expect(client.get).toHaveBeenCalledWith('/admin/system/roles', expect.any(Object));
  });

  it('serverService calls correct endpoints', async () => {
    await serverService.getServers();
    expect(client.get).toHaveBeenCalledWith('/admin/system/servers', expect.any(Object));
  });

  it('troubleService calls correct endpoints', async () => {
    await troubleService.getTroubles();
    expect(client.get).toHaveBeenCalledWith('/admin/system/troubles', expect.any(Object));
  });
});

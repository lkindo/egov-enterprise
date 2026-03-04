import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { programAdminService } from '../ProgramAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('ProgramAdminService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getProgramList should call correct API', async () => {
    await programAdminService.getProgramList({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/programs', { params: { page: 1 } });
  });

  it('getProgram should call with filename', async () => {
    await programAdminService.getProgram('test.do');
    expect(client.get).toHaveBeenCalledWith('/admin/system/programs/test.do', undefined);
  });
});
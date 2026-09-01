import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { programAdminService } from '../ProgramAdminService';

const rawClient = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

vi.mock('@/lib/api/client', () => ({
  default: rawClient,
}));

describe('ProgramAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rawClient.getRaw.mockImplementation((url: string) => Promise.resolve({
      success: true,
      code: 'S000',
      message: '성공',
      data: url.includes('programs/') ? {} : { list: [] },
    }));
  });

  it('getProgramList should call correct API', async () => {
    await programAdminService.getProgramList({ page: 1 });
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/programs', {
      params: { pageIndex: 2, searchKeyword: '' },
    });
  });

  it('getProgram should call with filename', async () => {
    await programAdminService.getProgram('test.do');
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/programs/test.do', undefined);
  });
});

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
      data: url.includes('programs/') ? { prgrmFileNm: 'test.do' } : { list: [] },
    }));
  });

  it('getProgramList should call correct API', async () => {
    await programAdminService.getProgramList({ page: 1 });
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/programs', {
      params: { pageIndex: 2, searchKeyword: '' },
    });
  });

  it('getProgram should call with filename', async () => {
    await expect(programAdminService.getProgram('test.do')).resolves.toEqual({ prgrmFileNm: 'test.do' });
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/programs/test.do', undefined);
  });

  it.each([undefined, 'forged.do'])('update binds the request identifier to the URL: %s', async (bodyKey) => {
    rawClient.requestRaw.mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: null });
    await programAdminService.updateProgram('test.do', { prgrmFileNm: bodyKey, prgrmKornNm: '수정' });
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/programs/test.do', method: 'put',
      data: { prgrmFileNm: 'test.do', prgrmKornNm: '수정' },
    });
  });

  it('rejects a missing creation key before transport', async () => {
    await expect(programAdminService.createProgram({})).rejects.toThrow('요청이 OpenAPI 계약과 일치하지');
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('rejects detail responses without the persisted identifier', async () => {
    rawClient.getRaw.mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: {} });
    await expect(programAdminService.getProgram('test.do')).rejects.toThrow('응답이 OpenAPI 계약과 일치하지');
  });
});

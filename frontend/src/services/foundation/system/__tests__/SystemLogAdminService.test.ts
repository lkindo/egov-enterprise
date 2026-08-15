import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientGet = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/client', () => ({
  default: {
    get: clientGet,
  },
}));

import { systemLogAdminService } from '../SystemLogAdminService';

const EMPTY_PAGE = {
  list: [],
  total: 0,
  page: 3,
  size: 10,
  totalPage: 0,
};

describe('SystemLogAdminService pagination contract', () => {
  beforeEach(() => {
    clientGet.mockReset();
    clientGet.mockResolvedValue(EMPTY_PAGE);
  });

  it('maps the zero-based USR page 2 to API pageIndex 3', async () => {
    await systemLogAdminService.getUserLogs({
      page: 2,
      size: 25,
      searchWrd: 'alice',
    });

    expect(clientGet).toHaveBeenCalledWith(
      'admin/system/logs/user',
      expect.objectContaining({
        params: expect.objectContaining({
          page: 2,
          pageIndex: 3,
          pageUnit: 25,
          recordCountPerPage: 25,
          searchKeyword: 'alice',
          searchWrd: 'alice',
          size: 25,
        }),
      }),
    );
  });

  it('maps the zero-based WEB page 2 to API pageIndex 3', async () => {
    await systemLogAdminService.getWebLogs({
      page: 2,
      size: 25,
      searchWrd: 'orders',
    });

    expect(clientGet).toHaveBeenCalledWith(
      'admin/system/logs/web',
      expect.objectContaining({
        params: expect.objectContaining({
          page: 2,
          pageIndex: 3,
          pageUnit: 25,
          recordCountPerPage: 25,
          searchKeyword: 'orders',
          searchWrd: 'orders',
          size: 25,
        }),
      }),
    );
  });

  it('does not overwrite explicitly supplied API pagination', async () => {
    await systemLogAdminService.getWebLogs({ page: 2, pageIndex: 9, pageUnit: 40, size: 25 });

    expect(clientGet).toHaveBeenCalledWith(
      'admin/system/logs/web',
      expect.objectContaining({
        params: expect.objectContaining({ page: 2, pageIndex: 9, pageUnit: 40 }),
      }),
    );
  });

  it.each([
    ['system', () => systemLogAdminService.getSystemLogs({ page: 2, size: 25, searchWrd: 'audit' })],
    ['login', () => systemLogAdminService.getLoginLogs({ page: 2, size: 25, searchWrd: 'audit' })],
    ['privacy', () => systemLogAdminService.getPrivacyLogs({ page: 2, size: 25, searchWrd: 'audit' })],
  ])('normalizes %s list pagination and search parameters', async (path, invoke) => {
    await invoke();

    expect(clientGet).toHaveBeenCalledWith(
      `admin/system/logs/${path}`,
      expect.objectContaining({
        params: expect.objectContaining({
          pageIndex: 3,
          pageUnit: 25,
          searchKeyword: 'audit',
        }),
      }),
    );
  });

  it('uses the detail endpoints without list normalization', async () => {
    await systemLogAdminService.getSystemLog(101);
    await systemLogAdminService.getLoginLog(101);

    expect(clientGet).toHaveBeenNthCalledWith(1, 'admin/system/logs/system/101', undefined);
    expect(clientGet).toHaveBeenNthCalledWith(2, 'admin/system/logs/login/101', undefined);
  });
});

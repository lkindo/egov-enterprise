vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { codeAdminService } from '../CodeAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
  }
}));

const success = <T,>(data: T) => ({ success: true as const, code: 'S000', message: 'success', data });
const emptyPage = { list: [], total: 0, page: 1, size: 10, totalPage: 0 };

function codeDetailFor(url: string) {
  if (url.includes('/detail/')) {
    return { cdId: 'GRP01', dtlCd: 'DET01', dtlCdNm: 'Detail', dtlCdExpln: '', useYn: 'Y' };
  }
  if (url.includes('/cmmn/')) {
    return { cdId: 'GRP01', cdIdNm: 'Group', cdIdExpln: '', clsfCd: 'CL01', useYn: 'Y' };
  }
  return { clsfCd: 'CL01', clsfCdNm: 'Class', clsfCdExpln: '', useYn: 'Y' };
}

describe('CodeAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getRaw).mockImplementation(async (url, config) => {
      const data = await vi.mocked(client.get)(url, config);
      return success(data ?? (url.match(/\/(cl|cmmn|detail)$/) ? emptyPage : codeDetailFor(url)));
    });
    vi.mocked(client.requestRaw).mockImplementation(async ({ url, method, data, ...config }) => {
      if (!url) throw new Error('generated request URL is required');
      const requestConfig = Object.keys(config).length > 0 ? config : undefined;
      if (method === 'post') await vi.mocked(client.post)(url, data, requestConfig);
      else if (method === 'put') await vi.mocked(client.put)(url, data, requestConfig);
      else if (method === 'delete') await vi.mocked(client.delete)(url, requestConfig);
      return success(null);
    });
  });

  describe('Classification Code', () => {
    it('getClCodeList should call correct API', async () => {
      await codeAdminService.getClCodeList({ page: 1 });
      expect(client.get).toHaveBeenCalledWith('admin/system/codes/cl', expect.objectContaining({
        params: expect.objectContaining({ pageIndex: 2 })
      }));
    });

    it('createClCode should call post', async () => {
      const data = { clsfCd: 'CL01', clsfCdNm: 'Test', useYn: 'Y' as const };
      await codeAdminService.createClCode(data as any);
      expect(client.post).toHaveBeenCalledWith('admin/system/codes/cl', data, undefined);
    });

    it('updateClCode should handle string clCode', async () => {
      const data = { clsfCd: 'CL01', clsfCdNm: 'Updated', useYn: 'Y' as const };
      await codeAdminService.updateClCode('CL01', data as any);
      expect(client.put).toHaveBeenCalledWith('admin/system/codes/cl/CL01', data, undefined);
    });

    /*
      [2026-09-08] deleteClCode·deleteCmmnCode 계약을 걷었다.

      서버의 두 삭제는 논리 삭제(`useYn='N'`)이고, 화면의 분류·그룹 편집 폼에 있는 사용여부
      토글이 `updateClCode`·`updateCmmnCode` 로 **정확히 같은 결과**를 낸다
      (CommonCodeCategory·CommonCodeGroup 의 delete() 와 update(..., useYn, ...) 를 대조).
      오히려 update 는 lastMdfrId 를 남겨 누가 껐는지 기록된다.

      그래서 죽은 위임 메서드를 제거했다. 서버 API 는 남으며 축 1 원장이
      superseded-surface 로 그 사실과 대체 대상을 기계 검증한다.
    */
  });

  describe('Common Code', () => {
    it('getCmmnCodeList should call correct API', async () => {
      await codeAdminService.getCmmnCodeList({ page: 1 });
      expect(client.get).toHaveBeenCalledWith('admin/system/codes/cmmn', expect.objectContaining({
        params: expect.objectContaining({ pageIndex: 2 })
      }));
    });

    it('updateCmmnCode should use codeId from data', async () => {
      const data = { cdId: 'GRP01', cdIdNm: 'Group', useYn: 'Y' as const };
      await codeAdminService.updateCmmnCode('GRP01', data as any);
      expect(client.put).toHaveBeenCalledWith('admin/system/codes/cmmn/GRP01', data, undefined);
    });
  });

  describe('Detail Code', () => {
    it('getDetailCodeList should call correct API', async () => {
      await codeAdminService.getDetailCodeList({ page: 1 });
      expect(client.get).toHaveBeenCalledWith('admin/system/codes/detail', expect.objectContaining({
        params: expect.objectContaining({ pageIndex: 2 })
      }));
    });

    it('getDetailCode should call with codeId and code', async () => {
      await codeAdminService.getDetailCode('GRP01', 'DET01');
      expect(client.get).toHaveBeenCalledWith('admin/system/codes/detail/GRP01/DET01', undefined);
    });

    it('deleteDetailCode should handle arguments', async () => {
      await codeAdminService.deleteDetailCode('GRP01', 'DET01');
      expect(client.delete).toHaveBeenCalledWith('admin/system/codes/detail/GRP01/DET01', undefined);
    });
  });
});

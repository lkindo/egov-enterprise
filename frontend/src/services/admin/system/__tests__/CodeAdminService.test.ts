import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { codeAdminService } from '../CodeAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('CodeAdminService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('Classification Code', () => {
    it('getClCodes should call correct API', async () => {
      await codeAdminService.getClCodes({ page: 1 });
      expect(client.get).toHaveBeenCalledWith('/admin/codes/cl', { params: { page: 1 } });
    });

    it('createClCode should call post', async () => {
      const data = { clCode: 'CL01', clCodeNm: 'Test' };
      await codeAdminService.createClCode(data as any);
      expect(client.post).toHaveBeenCalledWith('/admin/codes/cl', data);
    });

    it('updateClCode should handle string clCode', async () => {
      const data = { clCode: 'CL01', clCodeNm: 'Updated' };
      await codeAdminService.updateClCode('CL01', data as any);
      expect(client.put).toHaveBeenCalledWith('/admin/codes/cl/CL01', data);
    });

    it('deleteClCode should call delete', async () => {
      await codeAdminService.deleteClCode('CL01');
      expect(client.delete).toHaveBeenCalledWith('/admin/codes/cl/CL01');
    });
  });

  describe('Common Code', () => {
    it('getGroups should call correct API', async () => {
      await codeAdminService.getGroups({ page: 1 });
      expect(client.get).toHaveBeenCalledWith('/admin/codes/cmmn', { params: { page: 1 } });
    });

    it('updateGroup should use codeId from data', async () => {
      const data = { codeId: 'GRP01', codeIdNm: 'Group' };
      await codeAdminService.updateGroup('GRP01', data as any);
      expect(client.put).toHaveBeenCalledWith('/admin/codes/cmmn/GRP01', data);
    });
  });

  describe('Detail Code', () => {
    it('getDetails should call correct API', async () => {
      await codeAdminService.getDetails({ page: 1 });
      expect(client.get).toHaveBeenCalledWith('/admin/codes/detail', { params: { page: 1 } });
    });

    it('getDetailCode should call with codeId and code', async () => {
      await codeAdminService.getDetailCode('GRP01', 'DET01');
      expect(client.get).toHaveBeenCalledWith('/admin/codes/detail/GRP01/DET01');
    });

    it('deleteDetailCode should handle arguments', async () => {
      await codeAdminService.deleteDetailCode('GRP01', 'DET01');
      expect(client.delete).toHaveBeenCalledWith('/admin/codes/detail/GRP01/DET01');
    });
  });
});

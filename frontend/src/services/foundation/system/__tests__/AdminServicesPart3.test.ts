vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

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
    expect(client.get).toHaveBeenCalledWith('admin/system/logs/system', expect.objectContaining({ 
      params: expect.objectContaining({ page: 0, pageIndex: 1 }) 
    }));
  });

  // 종전 이 테스트는 `getFiles()` 가 `admin/system/files` 를 친다고 단언했는데, 백엔드에는
  // 그 매핑이 없다(FileApiController 는 POST 1 + GET 2 가 전부). 목이 응답을 대신 주므로
  // 그린이었지만 실제로는 404 인 경로를 '올바르다' 고 증명하고 있었다 — false-green 이다.
  // 실재하는 계약(업로드: POST /admin/system/files, multipart)으로 바꾼다.
  it('FileAdminService calls correct endpoints', async () => {
    await fileAdminService.uploadFiles([new File(['x'], 'a.txt')]);
    expect(client.post).toHaveBeenCalledWith('admin/system/files', expect.any(FormData), expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' })
    }));
  });

  it('IsmAdminService calls correct endpoints', async () => {
    await ismAdminService.getPendingList({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('admin/system/ism', expect.objectContaining({ 
      params: expect.objectContaining({ page: 0, pageIndex: 1, type: 'received' }) 
    }));
  });
});

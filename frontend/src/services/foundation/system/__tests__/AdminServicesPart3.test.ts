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
 getRaw: vi.fn(),
 requestRaw: vi.fn(),
 }
}));

describe('Admin System Services Part 3 (Specialized)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getRaw).mockResolvedValue({
      success: true,
      code: 'S000',
      message: '성공',
      data: { list: [], total: 0, page: 0, size: 10, totalPage: 0 },
    });
    vi.mocked(client.requestRaw).mockResolvedValue({
      success: true,
      code: 'S000',
      message: '성공',
      data: 101,
    });
  });

  it('AuditAdminService calls correct endpoints', async () => {
    await auditAdminService.getAuditLogs({ page: 0 });
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/logs/system', {
      params: { pageIndex: 1 },
    });
  });

  // 종전 이 테스트는 `getFiles()` 가 `admin/system/files` 를 친다고 단언했는데, 백엔드에는
  // 그 매핑이 없다(FileApiController 는 POST 1 + GET 2 가 전부). 목이 응답을 대신 주므로
  // 그린이었지만 실제로는 404 인 경로를 '올바르다' 고 증명하고 있었다 — false-green 이다.
  // 실재하는 계약(업로드: POST /admin/system/files, multipart)으로 바꾼다.
  it('FileAdminService calls correct endpoints', async () => {
    await fileAdminService.uploadFiles([new File(['x'], 'a.txt')]);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/files',
      method: 'post',
      data: expect.any(FormData),
      headers: { 'Content-Type': undefined },
    });
  });

  it('IsmAdminService calls correct endpoints', async () => {
    await ismAdminService.getPendingList({ page: 0 });
    expect(client.getRaw).toHaveBeenCalledWith('informal-sanctions', {
      params: { page: 0, type: 'received' },
    });
  });
});

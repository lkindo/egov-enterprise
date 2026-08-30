import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { memoReportService } from '../memoReportService';

describe('memoReportService generated instruction contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.patch.mockResolvedValue(undefined);
  });

  it('generated MemoInstructionRequest 객체 본문으로 전송한다', async () => {
    await memoReportService.updateDrctMatter(17, '검토 후 조치');

    expect(client.patch).toHaveBeenCalledWith(
      'memo-reports/17/instr-cn',
      { drctnMttr: '검토 후 조치' },
    );
  });

  it('공백과 2000자 초과 지시사항은 네트워크 전에 거부한다', async () => {
    await expect(memoReportService.updateDrctMatter(17, '   ')).rejects.toThrow();
    await expect(memoReportService.updateDrctMatter(17, '가'.repeat(2001))).rejects.toThrow();
    expect(client.patch).not.toHaveBeenCalled();
  });
});

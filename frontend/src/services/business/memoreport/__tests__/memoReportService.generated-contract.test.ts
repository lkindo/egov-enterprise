import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { memoReportService } from '../memoReportService';

describe('memoReportService generated instruction contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.requestRaw.mockResolvedValue({
      success: true,
      code: 'S000',
      message: '성공',
      data: null,
    });
  });

  it('generated MemoInstructionRequest 객체 본문으로 전송한다', async () => {
    await memoReportService.updateDrctMatter(17, '검토 후 조치');

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'memo-reports/17/instr-cn',
      method: 'patch',
      data: { drctnMttr: '검토 후 조치' },
    });
  });

  it('공백과 2000자 초과 지시사항은 네트워크 전에 거부한다', async () => {
    await expect(memoReportService.updateDrctMatter(17, '   ')).rejects.toThrow();
    await expect(memoReportService.updateDrctMatter(17, '가'.repeat(2001))).rejects.toThrow();
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('목록·상세·CRUD가 operation descriptor의 경로와 메서드로만 실행된다', async () => {
    const report = { memoRptSn: 17, rptTtl: '보고', rptCn: '내용' };
    client.getRaw
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { list: [], total: 0 } })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { list: [], total: 0 } })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { list: [], total: 0 } })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: report });
    client.requestRaw
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: 18 })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: null })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: null });

    await memoReportService.getMemoReports({ searchKeyword: '보고', page: 0, size: 10 });
    await memoReportService.getMyReports({ page: 0, size: 10 });
    await memoReportService.getReceivedReports({ page: 0, size: 10 });
    await memoReportService.getMemoReport(17);
    await memoReportService.createMemoReport(report);
    await memoReportService.updateMemoReport(17, report);
    await memoReportService.deleteMemoReport(17);

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'memo-reports', {
      params: { searchKeyword: '보고', page: 0, size: 10 },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'memo-reports/my', {
      params: { page: 0, size: 10 },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'memo-reports/received', {
      params: { page: 0, size: 10 },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(4, 'memo-reports/17', undefined);
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'memo-reports', method: 'post', data: report,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'memo-reports/17', method: 'put', data: report,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(3, {
      url: 'memo-reports/17', method: 'delete',
    });
  });
});

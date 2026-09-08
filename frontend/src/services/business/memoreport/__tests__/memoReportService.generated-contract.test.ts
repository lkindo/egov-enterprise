import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { memoReportService, type MemoReportInput } from '../memoReportService';
import { createMemoReportOperation, updateMemoReportOperation } from '@/types/generated-operations';
import {
  MemoReportDtoRequestSchema,
  MemoReportDtoResponseSchema,
  MemoReportDtoSchema,
} from '@/types/generated-zod';

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
    const responseReport = { memoRptSn: 17, rptTtl: '보고', rptrId: 'USER', rptCn: '내용' };
    const requestReport = { rptTtl: '보고', rptrId: 'USER', rptCn: '내용' };
    client.getRaw
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { list: [], total: 0 } })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { list: [], total: 0 } })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: { list: [], total: 0 } })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: responseReport });
    client.requestRaw
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: 18 })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: null })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: null });

    await memoReportService.getMemoReports({ searchKeyword: '보고', page: 0, size: 10 });
    await memoReportService.getMyReports({ page: 0, size: 10 });
    await memoReportService.getReceivedReports({ page: 0, size: 10 });
    await memoReportService.getMemoReport(17);
    await memoReportService.createMemoReport(requestReport);
    await memoReportService.updateMemoReport(17, requestReport);
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
      url: 'memo-reports', method: 'post', data: requestReport,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'memo-reports/17', method: 'put', data: requestReport,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(3, {
      url: 'memo-reports/17', method: 'delete',
    });
  });

  it('서버 소유 필드는 생성 요청 타입과 transport 경계에서 모두 거부한다', async () => {
    const serverOwnedFields = [
      'memoRptSn',
      'userId',
      'wrterNm',
      'rptrNm',
      'drctnMttr',
      'drctnMttrRegDt',
      'rptrInqDt',
      'crtDt',
      // [2026-09-08 PD-RPT-001] editable 은 서버 판정(수정·삭제 가능 여부)이라 요청에서 받지 않는다.
      // 클라이언트가 주장할 수 있으면 화면이 자기 권한을 스스로 여는 셈이 된다.
      'editable',
    ] as const;
    type ServerOwnedField = Extract<keyof MemoReportInput, (typeof serverOwnedFields)[number]>;
    expectTypeOf<ServerOwnedField>().toEqualTypeOf<never>();

    const forbiddenPaths = serverOwnedFields.map((field) => [field]);
    expect(createMemoReportOperation.requestForbiddenPaths).toStrictEqual(forbiddenPaths);
    expect(updateMemoReportOperation.requestForbiddenPaths).toStrictEqual(forbiddenPaths);
    expect(Object.keys(MemoReportDtoRequestSchema.shape).sort()).toStrictEqual(
      ['rptTtl', 'memoRptYmd', 'rptrId', 'rptCn', 'atchFileSn'].sort(),
    );
    expect(Object.keys(MemoReportDtoSchema.shape)).toEqual(expect.arrayContaining([...serverOwnedFields]));
    expect(Object.keys(MemoReportDtoResponseSchema.shape).sort()).toStrictEqual(
      Object.keys(MemoReportDtoSchema.shape).sort(),
    );

    for (const field of serverOwnedFields) {
      const forged = { rptTtl: '보고', rptrId: 'USER', [field]: 'forged-value' };
      await expect(memoReportService.createMemoReport(forged as never))
        .rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
      await expect(memoReportService.updateMemoReport(17, forged as never))
        .rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
    }
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeGeneratedOperationMock, legacyGetMock, legacyDeleteMock } = vi.hoisted(() => ({
  executeGeneratedOperationMock: vi.fn(),
  legacyGetMock: vi.fn(),
  legacyDeleteMock: vi.fn(),
}));

vi.mock('@/lib/api/generated-api-client', () => ({
  executeGeneratedOperation: (...args: unknown[]) => executeGeneratedOperationMock(...args),
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    get: (...args: unknown[]) => legacyGetMock(...args),
    delete: (...args: unknown[]) => legacyDeleteMock(...args),
  },
}));

import {
  deleteResponseOperation,
  exportStatsOperation,
  getResponseOperation,
  getResponsesOperation,
  getStatsOperation,
} from '@/types/generated-operations';
import { SurveyResultDtoResponseSchema } from '@/types/generated-zod';
import {
  deleteQustnrRespondInfo,
  downloadSurveyStatsXlsx,
  getQustnrRespondInfoDetail,
  getQustnrRespondInfoList,
  getSurveyStats,
} from '@/lib/api/survey';

const response = {
  srvyRspnsSn: 11,
  srvySn: 2,
  srvyTmpltSn: 3,
  srvyQstnSn: 4,
  srvyArtclSn: 5,
  rspdntAnsCn: '응답',
  rspnsNm: '홍길동',
  etcAnsCn: '',
  frstRgtrId: 'admin',
  crtDt: '2026-08-31T10:00:00',
};

const stats = {
  srvyQstnSn: 4,
  qstnCn: '문항',
  qstnTypeCd: '1',
  srvyArtclSn: 5,
  artclCn: '항목',
  count: 7,
  percentage: 70,
};

describe('survey API generated boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    legacyGetMock.mockRejectedValue(new Error('legacy client boundary was used'));
    legacyDeleteMock.mockRejectedValue(new Error('legacy client boundary was used'));
  });

  it('generated SurveyResultDto response schema가 실제 wire의 명시적 null을 수용한다', () => {
    expect(SurveyResultDtoResponseSchema.safeParse({
      ...response,
      rspdntAnsCn: null,
      rspnsNm: null,
      etcAnsCn: null,
      frstRgtrId: null,
      crtDt: null,
    }).success).toBe(true);
  });

  it('목록·상세·삭제·통계 4건을 exact generated operation으로 실행한다', async () => {
    executeGeneratedOperationMock
      .mockResolvedValueOnce({ list: [response], total: 1, page: 0, size: 10, totalPage: 1 })
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([stats]);

    await expect(getQustnrRespondInfoList({ keyword: '홍', page: 0, size: 10 })).resolves.toEqual({
      list: [response],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    });
    await expect(getQustnrRespondInfoDetail(11)).resolves.toEqual(response);
    await expect(deleteQustnrRespondInfo(11)).resolves.toBeUndefined();
    await expect(getSurveyStats({ srvySn: 2 })).resolves.toEqual([stats]);

    expect(executeGeneratedOperationMock).toHaveBeenNthCalledWith(1, getResponsesOperation, {
      query: { keyword: '홍', page: 0, size: 10 },
    });
    expect(executeGeneratedOperationMock).toHaveBeenNthCalledWith(2, getResponseOperation, {
      path: { srvyRspnsSn: 11 },
    });
    expect(executeGeneratedOperationMock).toHaveBeenNthCalledWith(3, deleteResponseOperation, {
      path: { srvyRspnsSn: 11 },
    });
    expect(executeGeneratedOperationMock).toHaveBeenNthCalledWith(4, getStatsOperation, {
      path: { srvySn: 2 },
    });
  });

  it('생성 DTO의 optional 표현과 달리 공개 필수 필드가 비면 fail-closed 처리한다', async () => {
    executeGeneratedOperationMock.mockResolvedValue({
      list: [{ ...response, srvyRspnsSn: undefined }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    });

    await expect(getQustnrRespondInfoList()).rejects.toThrow(
      '설문 응답이 필수 계약과 일치하지 않습니다.',
    );
  });

  it('DB에서 null일 수 있는 설문 답변·응답자·감사 필드는 빈 문자열로 정규화한다', async () => {
    executeGeneratedOperationMock.mockResolvedValue({
      ...response,
      rspdntAnsCn: null,
      rspnsNm: null,
      etcAnsCn: null,
      frstRgtrId: null,
      crtDt: null,
    });

    await expect(getQustnrRespondInfoDetail(11)).resolves.toEqual({
      ...response,
      rspdntAnsCn: '',
      rspnsNm: '',
      etcAnsCn: '',
      frstRgtrId: '',
      crtDt: '',
    });
  });
});

describe('downloadSurveyStatsXlsx (DIP B5 F6)', () => {
  beforeEach(() => {
    executeGeneratedOperationMock.mockReset();
  });

  it('생성 binary 연산으로 바이트를 받아 survey-<번호>-stats.xlsx 로 저장한다', async () => {
    const blob = new Blob(['xlsx']);
    executeGeneratedOperationMock.mockResolvedValueOnce(blob);
    const createObjectURL = vi.fn(() => 'blob:stats');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('survey-7-stats.xlsx');
      expect(this.href).toContain('blob:stats');
    });

    await downloadSurveyStatsXlsx(7);

    expect(executeGeneratedOperationMock).toHaveBeenCalledWith(exportStatsOperation, { path: { srvySn: 7 } });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('조회가 실패하면 저장하지 않고 오류를 그대로 전파한다', async () => {
    executeGeneratedOperationMock.mockRejectedValueOnce(new Error('403'));
    const createObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL });

    await expect(downloadSurveyStatsXlsx(7)).rejects.toThrow('403');
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});

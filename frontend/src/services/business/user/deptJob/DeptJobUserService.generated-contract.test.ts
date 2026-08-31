import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { deptJobUserService } from './DeptJobUserService';

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

const box = { deptTaskBoxSn: 2, deptTaskBoxNm: '기획함', deptId: 'DEPT01' };
const job = {
  deptTaskSn: 5,
  deptTaskNm: '사업계획',
  deptTaskCn: '계획 수립',
  prrtyRnk: '1',
  deptTaskBoxSn: 2,
};

describe('DeptJobUserService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('10개 경계를 generated operation으로 실행하고 두 페이징 의미를 보존한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(successEnvelope({ list: [box], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(box))
      .mockResolvedValueOnce(successEnvelope({ list: [job], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(job));
    client.requestRaw
      .mockResolvedValueOnce(successEnvelope(2))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(5))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null));

    await expect(deptJobUserService.getDeptJobBoxes({ page: 1, size: 25, deptId: 'DEPT01' }))
      .resolves.toMatchObject({ list: [box], total: 1 });
    await expect(deptJobUserService.getDeptJobBox(2)).resolves.toEqual(box);
    await expect(deptJobUserService.createDeptJobBox(box)).resolves.toBe(2);
    await expect(deptJobUserService.updateDeptJobBox(2, box)).resolves.toBeUndefined();
    await expect(deptJobUserService.deleteDeptJobBox(2)).resolves.toBeUndefined();
    await expect(deptJobUserService.getDeptJobList({
      searchWrd: '계획',
      searchCondition: '0',
    })).resolves.toMatchObject({ list: [job], total: 1 });
    await expect(deptJobUserService.getDeptJob(5)).resolves.toEqual(job);
    await expect(deptJobUserService.createDeptJob(job)).resolves.toBe(5);
    await expect(deptJobUserService.updateDeptJob(5, job)).resolves.toBeUndefined();
    await expect(deptJobUserService.deleteDeptJob(5)).resolves.toBeUndefined();

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'dept-jobs/boxes', {
      params: { pageIndex: 2, pageUnit: 25, deptId: 'DEPT01' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'dept-jobs', {
      params: {
        pageIndex: 1,
        pageUnit: 10,
        scope: 'mine',
        searchWrd: '계획',
        searchCondition: '0',
      },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'dept-jobs/boxes',
      method: 'post',
      data: box,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(4, {
      url: 'dept-jobs',
      method: 'post',
      data: job,
    });
  });

  it('DeptJobDto와 다른 응답은 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({ deptTaskSn: 'not-a-number' }));

    await expect(deptJobUserService.getDeptJob(5)).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('DeptJobDto와 다른 요청은 transport 전에 거부한다', async () => {
    await expect(deptJobUserService.createDeptJob({ deptTaskSn: 'not-a-number' } as never))
      .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});

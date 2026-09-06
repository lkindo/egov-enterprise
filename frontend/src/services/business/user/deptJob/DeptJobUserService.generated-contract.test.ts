import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { deptJobUserService } from './DeptJobUserService';
import type { DeptJobBoxInput, DeptJobInput } from '@/types/business/deptJob';
import {
  createDeptJobBoxOperation,
  createDeptJobOperation,
  updateDeptJobBoxOperation,
  updateDeptJobOperation,
} from '@/types/generated-operations';
import {
  DeptJobBoxDtoRequestSchema,
  DeptJobBoxDtoResponseSchema,
  DeptJobDtoRequestSchema,
  DeptJobDtoResponseSchema,
} from '@/types/generated-zod';

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

const boxResponse = {
  deptTaskBoxSn: 2,
  deptTaskBoxNm: '기획함',
  deptId: 'DEPT01',
  deptNm: '기획부',
  sortOrdr: 1,
  frstRgtrId: 'USER01',
  crtDt: '2026-09-06T01:00:00Z',
  lastMdfrId: null,
  mdfcnDt: null,
};
const boxRequest = { deptTaskBoxNm: '기획함', deptId: 'DEPT01', sortOrdr: 1 };
const jobResponse = {
  deptTaskSn: 5,
  deptTaskNm: '사업계획',
  deptTaskCn: '계획 수립',
  prrtyRnk: '1',
  deptTaskBoxSn: 2,
  deptTaskBoxNm: '기획함',
  deptId: 'DEPT01',
  deptNm: '기획부',
  picId: 'USER01',
  picNm: '담당자',
  atchFileSn: null,
  frstRgtrId: 'USER01',
  crtDt: '2026-09-06T01:00:00Z',
  lastMdfrId: null,
  mdfcnDt: null,
};
const jobRequest = {
  deptTaskBoxSn: 2,
  deptTaskNm: '사업계획',
  deptTaskCn: '계획 수립',
  picId: 'USER01',
  prrtyRnk: '1',
  atchFileSn: 7,
};

describe('DeptJobUserService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('10개 경계를 generated operation으로 실행하고 두 페이징 의미를 보존한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(successEnvelope({ list: [boxResponse], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(boxResponse))
      .mockResolvedValueOnce(successEnvelope({ list: [jobResponse], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(jobResponse));
    client.requestRaw
      .mockResolvedValueOnce(successEnvelope(2))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(5))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null));

    await expect(deptJobUserService.getDeptJobBoxes({ page: 1, size: 25, deptId: 'DEPT01' }))
      .resolves.toMatchObject({ list: [boxResponse], total: 1 });
    await expect(deptJobUserService.getDeptJobBox(2)).resolves.toEqual(boxResponse);
    await expect(deptJobUserService.createDeptJobBox(boxRequest)).resolves.toBe(2);
    await expect(deptJobUserService.updateDeptJobBox(2, boxRequest)).resolves.toBeUndefined();
    await expect(deptJobUserService.deleteDeptJobBox(2)).resolves.toBeUndefined();
    await expect(deptJobUserService.getDeptJobList({
      searchWrd: '계획',
      searchCondition: '0',
    })).resolves.toMatchObject({ list: [jobResponse], total: 1 });
    await expect(deptJobUserService.getDeptJob(5)).resolves.toEqual(jobResponse);
    await expect(deptJobUserService.createDeptJob(jobRequest)).resolves.toBe(5);
    await expect(deptJobUserService.updateDeptJob(5, jobRequest)).resolves.toBeUndefined();
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
      data: boxRequest,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(4, {
      url: 'dept-jobs',
      method: 'post',
      data: jobRequest,
    });
  });

  it('DeptJobDto와 다른 응답은 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({ deptTaskSn: 'not-a-number' }));

    await expect(deptJobUserService.getDeptJob(5)).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('요청·응답 스키마의 방향별 exact key와 서버 소유 필드 차단을 고정한다', async () => {
    const boxReadOnlyFields = [
      'deptTaskBoxSn',
      'deptNm',
      'frstRgtrId',
      'crtDt',
      'lastMdfrId',
      'mdfcnDt',
    ] as const;
    const jobReadOnlyFields = [
      'deptTaskSn',
      'deptTaskBoxNm',
      'deptId',
      'deptNm',
      'picNm',
      'frstRgtrId',
      'crtDt',
      'lastMdfrId',
      'mdfcnDt',
    ] as const;
    type BoxReadOnlyInput = Extract<keyof DeptJobBoxInput, (typeof boxReadOnlyFields)[number]>;
    type JobReadOnlyInput = Extract<keyof DeptJobInput, (typeof jobReadOnlyFields)[number]>;
    expectTypeOf<BoxReadOnlyInput>().toEqualTypeOf<never>();
    expectTypeOf<JobReadOnlyInput>().toEqualTypeOf<never>();

    const boxForbiddenPaths = boxReadOnlyFields.map((field) => [field]);
    const jobForbiddenPaths = jobReadOnlyFields.map((field) => [field]);
    expect(createDeptJobBoxOperation.requestForbiddenPaths).toStrictEqual(boxForbiddenPaths);
    expect(updateDeptJobBoxOperation.requestForbiddenPaths).toStrictEqual(boxForbiddenPaths);
    expect(createDeptJobOperation.requestForbiddenPaths).toStrictEqual(jobForbiddenPaths);
    expect(updateDeptJobOperation.requestForbiddenPaths).toStrictEqual(jobForbiddenPaths);

    expect(Object.keys(DeptJobBoxDtoRequestSchema.shape)).toStrictEqual([
      'deptTaskBoxNm', 'deptId', 'sortOrdr',
    ]);
    expect(Object.keys(DeptJobDtoRequestSchema.shape)).toStrictEqual([
      'deptTaskBoxSn', 'deptTaskNm', 'deptTaskCn', 'picId', 'prrtyRnk', 'atchFileSn',
    ]);
    expect(Object.keys(DeptJobBoxDtoResponseSchema.shape)).toStrictEqual([
      'deptTaskBoxSn', 'deptTaskBoxNm', 'deptId', 'deptNm', 'sortOrdr',
      'frstRgtrId', 'crtDt', 'lastMdfrId', 'mdfcnDt',
    ]);
    expect(Object.keys(DeptJobDtoResponseSchema.shape)).toStrictEqual([
      'deptTaskSn', 'deptTaskBoxSn', 'deptTaskBoxNm', 'deptId', 'deptNm',
      'deptTaskNm', 'deptTaskCn', 'picId', 'picNm', 'prrtyRnk', 'atchFileSn',
      'frstRgtrId', 'crtDt', 'lastMdfrId', 'mdfcnDt',
    ]);

    for (const field of boxReadOnlyFields) {
      const forged = { ...boxRequest, [field]: 'forged-value' };
      await expect(deptJobUserService.createDeptJobBox(forged as never))
        .rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
      await expect(deptJobUserService.updateDeptJobBox(2, forged as never))
        .rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
    }
    for (const field of jobReadOnlyFields) {
      const forged = { ...jobRequest, [field]: 'forged-value' };
      await expect(deptJobUserService.createDeptJob(forged as never))
        .rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
      await expect(deptJobUserService.updateDeptJob(5, forged as never))
        .rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
    }
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});

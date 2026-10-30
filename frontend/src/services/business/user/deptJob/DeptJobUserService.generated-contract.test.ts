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
  DeptJobSaveRequestRequestSchema,
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
      .mockResolvedValueOnce(successEnvelope({ list: [boxResponse], total: 1, page: 1, size: 10, totalPage: 1 }))
      .mockResolvedValueOnce(successEnvelope(boxResponse))
      .mockResolvedValueOnce(successEnvelope({ list: [jobResponse], total: 1, page: 1, size: 10, totalPage: 1 }))
      .mockResolvedValueOnce(successEnvelope(jobResponse));
    client.requestRaw
      .mockResolvedValueOnce(successEnvelope(2))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(5))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null));

    await expect(deptJobUserService.getDeptJobBoxes({ page: 2, size: 25, deptId: 'DEPT01' }))
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
      params: { page: 2, size: 25, deptId: 'DEPT01' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'dept-jobs', {
      params: {
        page: 1,
        size: 10,
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

  it('담당자 재지정은 상세에서 읽은 버전을 PATCH 본문으로 돌려보내고 네 번째 인자의 요청 설정을 보존한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({ ...jobResponse, version: 4 }));
    client.requestRaw.mockResolvedValueOnce(successEnvelope(null));
    const job = await deptJobUserService.getDeptJob(5);
    expect(job.version).toBe(4);

    const config = { timeout: 4500, suppressErrorToast: true };
    await expect(deptJobUserService.reassignDeptJob(5, 'USER02', job.version!, config)).resolves.toBeUndefined();

    expect(client.requestRaw).toHaveBeenCalledTimes(1);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'dept-jobs/5/assignee',
      method: 'patch',
      data: { picId: 'USER02', version: 4 },
      ...config,
    });
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
      // 서버가 판정하는 수정·삭제 힌트(DIP B4 P5) — 요청에 실으면 경계가 거부한다.
      'editable',
      'deletable',
      // 등록자의 담당자 재지정 힌트(결정 22) — 서버가 판정한다.
      'reassignable',
    ] as const;
    type BoxReadOnlyInput = Extract<keyof DeptJobBoxInput, (typeof boxReadOnlyFields)[number]>;
    type JobReadOnlyInput = Extract<keyof DeptJobInput, (typeof jobReadOnlyFields)[number]>;
    expectTypeOf<BoxReadOnlyInput>().toEqualTypeOf<never>();
    expectTypeOf<JobReadOnlyInput>().toEqualTypeOf<never>();

    const boxForbiddenPaths = boxReadOnlyFields.map((field) => [field]);
    expect(createDeptJobBoxOperation.requestForbiddenPaths).toStrictEqual(boxForbiddenPaths);
    expect(updateDeptJobBoxOperation.requestForbiddenPaths).toStrictEqual(boxForbiddenPaths);
    // 요청 전용 DTO에는 조회 필드 자체가 없으므로 strict 요청 스키마가 같은 필드를 거부한다.
    expect(createDeptJobOperation.requestSchema.safeParse(jobRequest).success).toBe(true);
    expect(updateDeptJobOperation.requestSchema.safeParse(jobRequest).success).toBe(true);

    expect(Object.keys(DeptJobBoxDtoRequestSchema.shape)).toStrictEqual([
      'deptTaskBoxNm', 'deptId', 'sortOrdr',
    ]);
    // [2026-10-18 V2_133] version 은 요청·응답 양방향이다 — 수정 요청이 읽은 버전을 그대로 돌려보낸다.
    expect(Object.keys(DeptJobSaveRequestRequestSchema.shape)).toStrictEqual([
      'deptTaskBoxSn', 'deptTaskNm', 'deptTaskCn', 'picId', 'prrtyRnk', 'atchFileSn', 'version',
    ]);
    expect(Object.keys(DeptJobBoxDtoResponseSchema.shape)).toStrictEqual([
      'deptTaskBoxSn', 'deptTaskBoxNm', 'deptId', 'deptNm', 'sortOrdr',
      'frstRgtrId', 'crtDt', 'lastMdfrId', 'mdfcnDt',
    ]);
    expect(Object.keys(DeptJobDtoResponseSchema.shape)).toStrictEqual([
      'deptTaskSn', 'deptTaskBoxSn', 'deptTaskBoxNm', 'deptId', 'deptNm',
      'deptTaskNm', 'deptTaskCn', 'picId', 'picNm', 'prrtyRnk', 'atchFileSn',
      'frstRgtrId', 'crtDt', 'lastMdfrId', 'mdfcnDt', 'editable', 'deletable', 'reassignable', 'version',
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
      expect(createDeptJobOperation.requestSchema.safeParse(forged).success).toBe(false);
      expect(updateDeptJobOperation.requestSchema.safeParse(forged).success).toBe(false);
      await expect(deptJobUserService.createDeptJob(forged as never))
        .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
      await expect(deptJobUserService.updateDeptJob(5, forged as never))
        .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
    }
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it.each(['', ' ', '01', '1.0', '+1', '4', '1\n', 1, true])('우선순위 %j는 등록·수정 요청을 전송하기 전에 거절한다', async (priority) => {
    const data = { deptTaskNm: '정책 시험', prrtyRnk: priority } as DeptJobInput;
    await expect(deptJobUserService.createDeptJob(data)).rejects.toThrow();
    await expect(deptJobUserService.updateDeptJob(5, data)).rejects.toThrow();
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it.each(['1', '2', '3', null, undefined])('우선순위 %j의 현재 null·생략 의미를 보존해 전송한다', async (priority) => {
    client.requestRaw.mockResolvedValueOnce(successEnvelope(5)).mockResolvedValueOnce(successEnvelope(null));
    const data: DeptJobInput = { deptTaskNm: '정책 시험', ...(priority !== undefined ? { prrtyRnk: priority } : {}) };
    await deptJobUserService.createDeptJob(data);
    await deptJobUserService.updateDeptJob(5, data);
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, { url: 'dept-jobs', method: 'post', data });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, { url: 'dept-jobs/5', method: 'put', data });
  });

  it('기존 비정규 우선순위의 상세·목록 조회는 원문을 유지한다', async () => {
    const legacy = { ...jobResponse, prrtyRnk: '01' };
    client.getRaw.mockResolvedValueOnce(successEnvelope(legacy))
      .mockResolvedValueOnce(successEnvelope({ list: [legacy], total: 1, page: 1, size: 10, totalPage: 1 }));
    await expect(deptJobUserService.getDeptJob(5)).resolves.toMatchObject({ prrtyRnk: '01' });
    await expect(deptJobUserService.getDeptJobList({})).resolves.toMatchObject({ list: [{ prrtyRnk: '01' }] });
  });
});

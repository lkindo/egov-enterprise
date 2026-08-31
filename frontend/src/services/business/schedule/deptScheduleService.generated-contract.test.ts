import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { deptScheduleService } from './deptScheduleService';

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

const schedule = {
  schdlSn: 7,
  schdlSeCd: '1',
  schdlDeptId: 'DEPT01',
  schdlBgngYmd: '20260831',
  schdlEndYmd: '20260831',
  schdlNm: '주간 회의',
  schdlCn: '회의 내용',
};

describe('deptScheduleService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('7개 경계를 generated operation으로 실행하고 공개 반환을 보존한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(successEnvelope({ list: [schedule], total: 1 }))
      .mockResolvedValueOnce(successEnvelope([schedule]))
      .mockResolvedValueOnce(successEnvelope([schedule]))
      .mockResolvedValueOnce(successEnvelope(schedule));
    client.requestRaw
      .mockResolvedValueOnce(successEnvelope(11))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null));

    await expect(deptScheduleService.getDeptScheduleList({
      pageIndex: 2,
      size: 25,
      schdlNm: '회의',
    })).resolves.toMatchObject({ list: [schedule], total: 1 });
    await expect(deptScheduleService.getDeptScheduleMonthList({ yearMonth: '202608' }))
      .resolves.toEqual([schedule]);
    await expect(deptScheduleService.getDeptScheduleByRange('20260801', '20260831'))
      .resolves.toEqual([schedule]);
    await expect(deptScheduleService.getDeptSchedule(7)).resolves.toEqual(schedule);
    await expect(deptScheduleService.createDeptSchedule(schedule)).resolves.toBe(11);
    await expect(deptScheduleService.updateDeptSchedule(7, schedule)).resolves.toBeUndefined();
    await expect(deptScheduleService.deleteDeptSchedule(7)).resolves.toBeUndefined();

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'schedules/dept', {
      params: { pageIndex: 2, pageUnit: 25, schdlNm: '회의' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'schedules/monthly', {
      params: { yearMonth: '202608' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'schedules/range', {
      params: { startDate: '20260801', endDate: '20260831' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(4, 'schedules/7', undefined);
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'schedules',
      method: 'post',
      data: schedule,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'schedules/7',
      method: 'put',
      data: schedule,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(3, {
      url: 'schedules/7',
      method: 'delete',
    });
  });

  it('ScheduleDto와 다른 응답은 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(successEnvelope({ schdlNm: 42 }));

    await expect(deptScheduleService.getDeptSchedule(7)).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('ScheduleDto와 다른 요청은 transport 전에 거부한다', async () => {
    await expect(deptScheduleService.createDeptSchedule({ schdlNm: 42 } as never)).rejects.toThrow(
      '생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.',
    );
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});

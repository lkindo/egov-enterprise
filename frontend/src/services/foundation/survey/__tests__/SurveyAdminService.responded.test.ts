import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-01] 설문 응답을 화면 타입으로 옮기는 매핑이 서버가 판정한 응답 여부(responded)를 버리지 않는다.
 * 종전에는 필드를 골라 옮기며 이 값을 빠뜨려, 목록의 '응답 완료' 가 서버가 true 를 보내도 보이지 않았다.
 */
const client = vi.hoisted(() => ({ getRaw: vi.fn(), requestRaw: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ default: client }));

import { surveyAdminService } from '../SurveyAdminService';

const row = (srvySn: number, responded?: boolean | null) => ({
  srvySn, srvyTtl: `${srvySn}번 설문`, srvyTmpltSn: 1, ...(responded === undefined ? {} : { responded }),
});

describe('설문 목록 매핑 — 응답 여부 보존', () => {
  beforeEach(() => vi.clearAllMocks());

  it('true·false 는 그대로, null·누락은 싣지 않는다', async () => {
    client.getRaw.mockResolvedValueOnce({
      success: true, code: 'S000', message: '성공',
      data: { list: [row(1, true), row(2, false), row(3, null), row(4)], total: 4, page: 0, size: 10, totalPage: 1 },
    });

    const page = await surveyAdminService.getSurveys({ page: 0, size: 10 });

    expect(page.list.map((s) => s.responded)).toEqual([true, false, undefined, undefined]);
  });
});

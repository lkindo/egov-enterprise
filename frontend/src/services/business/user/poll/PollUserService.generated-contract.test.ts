import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { pollUserService } from './PollUserService';

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

const poll = {
  pollSn: 4,
  pollNm: '만족도 조사',
  pollBgngYmd: '20260801',
  pollEndYmd: '20260831',
  pollKndCd: '001',
  pollDsuseYn: 'N',
};
const item = { pollSn: 4, pollArtclSn: 8, pollArtclNm: '찬성' };

describe('PollUserService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('7개 경계를 generated operation으로 실행하고 검색어·update guard를 보존한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(successEnvelope({ list: [poll], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(poll))
      .mockResolvedValueOnce(successEnvelope([item]));
    client.requestRaw
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null))
      .mockResolvedValueOnce(successEnvelope(null));

    await expect(pollUserService.getPollList({
      page: 0,
      size: 20,
      searchCondition: '0',
      searchKeyword: '만족도',
    })).resolves.toMatchObject({ list: [poll], total: 1 });
    await expect(pollUserService.getPollDetail(4)).resolves.toEqual(poll);
    await expect(pollUserService.createPoll(poll)).resolves.toBeUndefined();
    await expect(pollUserService.updatePoll(poll)).resolves.toBeUndefined();
    await expect(pollUserService.deletePoll(4)).resolves.toBeUndefined();
    await expect(pollUserService.getPollItemList(4)).resolves.toEqual([item]);
    await expect(pollUserService.participatePoll({ pollSn: 4, pollArtclSn: 8 }))
      .resolves.toBeUndefined();

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'polls', {
      params: { page: 0, size: 20, keyword: '만족도' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'polls/4', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'polls/4/items', undefined);
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'polls',
      method: 'post',
      data: poll,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'polls/4',
      method: 'put',
      data: poll,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(3, {
      url: 'polls/4',
      method: 'delete',
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(4, {
      url: 'polls/4/vote/8',
      method: 'post',
    });
  });

  it('pollSn 없는 수정은 transport 전에 기존 오류로 거부한다', async () => {
    await expect(pollUserService.updatePoll({ ...poll, pollSn: undefined })).rejects.toThrow(
      'pollSn is required for update',
    );
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('필수 pollNm이 없는 요청은 generated Zod에서 거부한다', async () => {
    await expect(pollUserService.createPoll({ pollBgngYmd: '20260801' } as never))
      .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});

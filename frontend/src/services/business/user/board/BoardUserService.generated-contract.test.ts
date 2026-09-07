import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { boardUserService } from './BoardUserService';

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

const post = {
  pstSn: 9,
  bbsId: 'BBS01',
  pstTtl: '제목',
  pstCn: '본문',
  useYn: 'Y',
  userId: 'writer01',
};

describe('BoardUserService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('6개 경계를 generated operation으로 실행하고 등록 ID 반환을 보존한다', async () => {
    client.getRaw
      .mockResolvedValueOnce(successEnvelope({ list: [post], total: 1 }))
      .mockResolvedValueOnce(successEnvelope(post));
    client.requestRaw.mockResolvedValueOnce(successEnvelope(4));

    await expect(boardUserService.getPosts('BBS01', { page: 0, size: 20 }))
      .resolves.toMatchObject({ list: [post], total: 1 });
    await expect(boardUserService.likePost('BBS01', 9)).resolves.toBe(4);

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'boards/BBS01', {
      params: { page: 0, size: 20 },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'boards/BBS01/posts/9/like',
      method: 'patch',
    });
  });

  /*
    [2026-09-07] 상세 조회·등록·수정·삭제 계약을 이 파일에서 걷었다 — 해당 메서드가
    대체된 표면이라 제거됐기 때문이다(축 2 실측: 호출부 0).

    같은 계약은 정본 경로가 계속 검증한다:
      · 등록·수정·삭제·추천 — app/actions/__tests__/boardActions.test.ts
        (첨부 동반 /with-files 경로와 part 구성 포함, DEC-OPS-044)
      · 저장 payload 경계 — app/actions/__tests__/board-save-payload-contract.test.ts
    커버리지를 지운 것이 아니라 소유자가 옮겨 간 것이다.
  */
});

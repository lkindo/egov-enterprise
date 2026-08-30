import { beforeEach, describe, expect, it, vi } from 'vitest';
import client from '@/lib/api/client';
import { helpUserService } from '../HelpUserService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('HelpUserService FAQ detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps answer content out of the FAQ list projection', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      list: [{
        pstSn: 42,
        bbsId: 'BBSMSTR_AAAAAAAAAAAA',
        pstTtl: '목록 질문',
        pstCn: '<p>목록에는 포함되면 안 되는 답변</p>',
        scrtYn: 'N',
        useYn: 'Y',
        inqCnt: 3,
        crtDt: '2026-08-21T00:00:00Z',
      }],
      total: 1,
      totalPage: 1,
      page: 0,
      size: 10,
    });

    const result = await helpUserService.getFaqs({ keyword: '목록', page: 0, size: 10 });

    expect(client.get).toHaveBeenCalledWith(
      'boards/public-faqs',
      expect.objectContaining({
        params: expect.objectContaining({ keyword: '목록', page: 0, size: 10 }),
      }),
    );
    const listParams = vi.mocked(client.get).mock.calls[0]?.[1]?.params;
    expect(listParams).not.toHaveProperty('searchWrd');
    expect(listParams).not.toHaveProperty('publicOnly');
    expect(result.list[0]).toEqual({
      faqId: '42',
      qstnTtl: '목록 질문',
      inqCnt: 3,
      mdfcnDt: '2026-08-21T00:00:00Z',
    });
    expect(result.list[0]).not.toHaveProperty('ansCn');
    expect(result.list[0]).not.toHaveProperty('qstnCn');
  });

  it('fetches the exact public FAQ detail and converts HTML to semantic plain text', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      pstSn: 42,
      bbsId: 'BBSMSTR_AAAAAAAAAAAA',
      pstTtl: '상세 질문',
      pstCn: '<p>첫째 줄<br>둘째 &amp; 줄</p><ul><li>항목 하나</li><li>항목 둘</li></ul><script>alert("unsafe")</script>',
      scrtYn: 'N',
      useYn: 'Y',
      inqCnt: 4,
      crtDt: '2026-08-21T00:00:00Z',
    });

    const result = await helpUserService.getFaqDetail('42');

    expect(client.get).toHaveBeenCalledWith(
      'boards/public-faqs/42',
      undefined,
    );
    expect(result).toEqual({
      faqId: '42',
      qstnTtl: '상세 질문',
      ansCn: '첫째 줄\n둘째 & 줄\n항목 하나\n항목 둘',
      inqCnt: 4,
      mdfcnDt: '2026-08-21T00:00:00Z',
    });
    expect(result.ansCn).not.toContain('<');
    expect(result.ansCn).not.toContain('alert');
  });

  it.each(['0', '-1', '01', '1.5', '1/../../admin', '9007199254740992'])(
    'rejects non-canonical FAQ id %s before constructing a request',
    async (faqId) => {
      await expect(helpUserService.getFaqDetail(faqId)).rejects.toThrow(
        '유효하지 않은 FAQ 식별자입니다.',
      );
      expect(client.get).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['wrong board', { bbsId: 'BBSMSTR_OTHER', scrtYn: 'N', useYn: 'Y', pstSn: 42 }],
    ['secret post', { bbsId: 'BBSMSTR_AAAAAAAAAAAA', scrtYn: 'Y', useYn: 'Y', pstSn: 42 }],
    ['deleted post', { bbsId: 'BBSMSTR_AAAAAAAAAAAA', scrtYn: 'N', useYn: 'N', pstSn: 42 }],
    ['missing board identity', { scrtYn: 'N', useYn: 'Y', pstSn: 42 }],
    ['missing secret state', { bbsId: 'BBSMSTR_AAAAAAAAAAAA', useYn: 'Y', pstSn: 42 }],
    ['unknown active state', { bbsId: 'BBSMSTR_AAAAAAAAAAAA', scrtYn: 'N', pstSn: 42 }],
    ['different post', { bbsId: 'BBSMSTR_AAAAAAAAAAAA', scrtYn: 'N', useYn: 'Y', pstSn: 43 }],
  ])('rejects %s detail without surfacing raw content', async (_caseName, boundaryFields) => {
    vi.mocked(client.get).mockResolvedValueOnce({
      ...boundaryFields,
      pstTtl: '노출 금지 제목',
      pstCn: '노출 금지 원문 secret-marker',
    });

    let thrown: unknown;
    try {
      await helpUserService.getFaqDetail('42');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('FAQ 상세 정보를 표시할 수 없습니다.');
    expect((thrown as Error).message).not.toContain('secret-marker');
    expect((thrown as Error).message).not.toContain('노출 금지');
  });
});

describe('HelpUserService QNA generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('생성 BoardDto page를 검증한 뒤 UI QNA 모델로 명시적으로 변환한다', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      list: [{
        pstSn: 42,
        bbsId: 'BBSMSTR_QAAAAAAAAAAA',
        pstTtl: '문의 제목',
        pstCn: '문의 본문',
        useYn: 'Y',
        userId: 'writer-1',
        userNm: '작성자',
        qnaSttsCd: 'OPEN',
        scrtYn: 'N',
        crtDt: '2026-08-30T00:00:00Z',
      }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    });

    const result = await helpUserService.getQnas({ page: 0, size: 10, keyword: '문의' });

    expect(result.list[0]).toMatchObject({
      qaId: '42',
      qstnTtl: '문의 제목',
      wrterNm: '작성자',
      qnaSttsCd: 'OPEN',
    });
  });

  it('생성 계약의 필수 userId/useYn이 빠진 응답을 화면에 통과시키지 않는다', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      list: [{ pstSn: 42, pstTtl: '불완전 문의', pstCn: '본문' }],
    });

    await expect(helpUserService.getQnas({ page: 0, size: 10 })).rejects.toThrow();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import client from '@/lib/api/client';
import { QNA_BOARD_ID } from '@/config/board-ids';
import { helpUserService } from '../HelpUserService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

describe('HelpUserService FAQ detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps answer content out of the FAQ list projection', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
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
      page: 1,
      size: 10,
    }));

    const result = await helpUserService.getFaqs({ keyword: '목록', page: 1, size: 10 });

    expect(client.getRaw).toHaveBeenCalledWith(
      'boards/public-faqs',
      expect.objectContaining({
        params: expect.objectContaining({ keyword: '목록', page: 1, size: 10 }),
      }),
    );
    const listParams = vi.mocked(client.getRaw).mock.calls[0]?.[1]?.params;
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
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
      pstSn: 42,
      bbsId: 'BBSMSTR_AAAAAAAAAAAA',
      pstTtl: '상세 질문',
      pstCn: '<p>첫째 줄<br>둘째 &amp; 줄</p><ul><li>항목 하나</li><li>항목 둘</li></ul><script>alert("unsafe")</script>',
      scrtYn: 'N',
      useYn: 'Y',
      inqCnt: 4,
      crtDt: '2026-08-21T00:00:00Z',
    }));

    const result = await helpUserService.getFaqDetail('42');

    expect(client.getRaw).toHaveBeenCalledWith(
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
      expect(client.getRaw).not.toHaveBeenCalled();
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
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
      ...boundaryFields,
      pstTtl: '노출 금지 제목',
      pstCn: '노출 금지 원문 secret-marker',
    }));

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
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
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
      page: 1,
      size: 10,
      totalPage: 1,
    }));

    const result = await helpUserService.getQnas({ page: 1, size: 10, keyword: '문의' });

    expect(client.getRaw).toHaveBeenCalledWith(`boards/${QNA_BOARD_ID}`, {
      params: { page: 1, size: 10, searchWrd: '문의' },
    });
    expect(result.list[0]).toMatchObject({
      qaId: '42',
      qstnTtl: '문의 제목',
      wrterNm: '작성자',
      qnaSttsCd: 'OPEN',
    });
  });

  it('생성 계약의 필수 userId/useYn이 빠진 응답을 화면에 통과시키지 않는다', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
      list: [{ pstSn: 42, pstTtl: '불완전 문의', pstCn: '본문' }],
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    }));

    await expect(helpUserService.getQnas({ page: 1, size: 10 })).rejects.toThrow(
      'Q&A 목록 정보를 표시할 수 없습니다.',
    );
  });

  it('Q&A 작성자 ID null은 공개 필수 모델과 소유권 의미를 만들 수 없어 fail-closed 한다', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
      list: [{
        pstSn: 42,
        pstTtl: '작성자 없는 문의',
        pstCn: '본문',
        userId: null,
        userNm: null,
        useYn: 'Y',
      }],
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    }));

    await expect(helpUserService.getQnas({ page: 1, size: 10 })).rejects.toThrow(
      'Q&A 목록 정보를 표시할 수 없습니다.',
    );
  });

  it('nullable 표시 필드는 작성자 ID fallback과 속성 생략으로 정규화한다', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
      list: [{
        pstSn: 42,
        pstTtl: '문의 제목',
        pstCn: '문의 본문',
        userId: 'writer-1',
        userNm: null,
        useYn: 'Y',
        qnaSttsCd: null,
        scrtYn: null,
      }],
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    }));

    const result = await helpUserService.getQnas({ page: 1, size: 10 });

    expect(result.list[0]).toMatchObject({ wrterNm: 'writer-1' });
    expect(result.list[0]).not.toHaveProperty('qnaSttsCd');
    expect(result.list[0]).not.toHaveProperty('scrtYn');
  });

  it('Q&A 등록을 generated createPost 계약으로 전송하고 공개 반환형은 void로 유지한다', async () => {
    vi.mocked(client.requestRaw).mockResolvedValueOnce(successEnvelope(77));

    await expect(helpUserService.createQna({
      qstnTtl: '문의 제목',
      qstnCn: '문의 본문',
      writngPassword: 'pw',
      wrterNm: '작성자',
    })).resolves.toBeUndefined();

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'boards/posts',
      method: 'post',
      data: {
        bbsId: QNA_BOARD_ID,
        pstTtl: '문의 제목',
        pstCn: '문의 본문',
        pswd: 'pw',
        scrtYn: 'Y',
      },
    });
  });

  it('Q&A 필수 필드가 없으면 transport 전에 거부한다', async () => {
    await expect(helpUserService.createQna({ qstnCn: '문의 본문' })).rejects.toThrow(
      'Q&A 제목과 본문은 필수입니다.',
    );
    expect(client.requestRaw).not.toHaveBeenCalled();
  });
});

/**
 * [2026-10-19] 도움말 센터의 도움말·온라인 매뉴얼 탭은 관리 목록(HELP_READ)이 아니라 로그인 사용자용 열람 연산을 부른다.
 * 응답에는 등록자 ID 가 없고, 화면 모델도 그것을 갖지 않는다. 빈 검색어는 보내지 않는다.
 */
describe('HelpUserService 도움말·온라인 매뉴얼 열람', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('도움말은 열람 연산(help/public-hpcm)을 부르고 제목·설명만 화면 모델로 옮긴다', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
      list: [{ hlpSn: 3, hlpDfn: '비밀번호 변경', hlpExpln: '내 정보에서 바꿉니다.' }, { hlpSn: 4, hlpDfn: '설명 없음', hlpExpln: null }],
      total: 2, totalPage: 1, page: 0, size: 10,
    }));

    const result = await helpUserService.getHelpGuides({ keyword: '', page: 0, size: 10 });

    expect(client.getRaw).toHaveBeenCalledWith('help/public-hpcm', expect.objectContaining({ params: { page: 0, size: 10 } }));
    expect(result).toEqual({
      list: [
        { id: '3', title: '비밀번호 변경', description: '내 정보에서 바꿉니다.' },
        { id: '4', title: '설명 없음', description: '' },
      ],
      total: 2, totalPage: 1, page: 0, size: 10,
    });
  });

  it('온라인 매뉴얼은 열람 연산(help/public-manuals)을 부르고 리소스 경로는 값이 있을 때만 싣는다', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
      list: [
        { onlnMnlSn: 7, onlnMnlNm: '전자결재 사용법', onlnMnlDfn: '/docs/approval', onlnMnlExpln: '상신과 승인' },
        { onlnMnlSn: 8, onlnMnlNm: '쪽지 사용법', onlnMnlDfn: null, onlnMnlExpln: null },
      ],
      total: 2, totalPage: 1, page: 0, size: 10,
    }));

    const result = await helpUserService.getOnlineManuals({ keyword: '사용법', page: 0, size: 10 });

    expect(client.getRaw).toHaveBeenCalledWith('help/public-manuals',
      expect.objectContaining({ params: { keyword: '사용법', page: 0, size: 10 } }));
    expect(result.list).toEqual([
      { id: '7', title: '전자결재 사용법', description: '상신과 승인', resourcePath: '/docs/approval' },
      { id: '8', title: '쪽지 사용법', description: '' },
    ]);
  });

  it('필수 제목이 빠진 열람 응답은 화면에 통과시키지 않는다', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce(successEnvelope({
      list: [{ hlpSn: 3, hlpExpln: '제목이 없다' }], total: 1, totalPage: 1, page: 0, size: 10,
    }));

    await expect(helpUserService.getHelpGuides({ page: 0, size: 10 })).rejects.toThrow();
  });
});

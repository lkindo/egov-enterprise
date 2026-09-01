/**
 * SatisfactionService 계약 테스트
 *
 * [왜 필요한가]
 * 이 서비스는 커버리지 0% 였다 — 게시글 만족도 등록/삭제라는 쓰기 경로를 포함하는데도
 * 어떤 테스트도 이 파일을 통과하지 않았다. 이 서비스가 하는 일은 "URL 을 조립하고
 * client 에 넘기는 것" 이 전부라, 조립이 틀어져도 타입 검사·컴파일은 전부 초록이고
 * 런타임에서만 조용히 어긋난다. 그래서 여기서 고정하는 것은 **조립 결과 그 자체**다.
 *
 * [여기서 조용히 틀어질 수 있는 것]
 *  1. 경로 조립 — `/boards/{bbsId}/posts/{pstSn}/satisfactions`. 세그먼트 오타나 슬래시
 *     하나가 빠지면 404 인데, 화면에는 "조회 실패" 토스트만 뜬다. 원인이 보이지 않는다.
 *  2. `/average` 접미 — 목록 경로와 평균 경로는 한 글자 차이다. 평균이 목록 경로로 나가면
 *     배열이 `{ average }` 자리에 앉아 별점이 NaN 으로 그려진다.
 *  3. 경로 변수 치환 — remove 는 `pstSn` 과 `dgstfnSn` 두 개의 숫자를 받는다. 이 둘이
 *     뒤바뀌면 **다른 사람의 만족도를 지운다**. 되돌릴 수 없는 오작동이라 값이 서로 다른
 *     픽스처로 자리까지 고정한다.
 *  4. `encodeURIComponent` — bbsId 는 외부에서 들어오는 문자열이다. 인코딩이 빠지면
 *     `../` 나 `?` 가 경로 구조를 바꿔 다른 리소스를 때린다.
 *  5. `pswd` 조건부 params — 익명 작성분의 소유 증명이다. 빈 문자열을 `pswd=` 로 실어
 *     보내면 백엔드가 "빈 비밀번호로 대조" 하는 상황이 되므로, falsy 는 params 자체를
 *     보내지 않아야 한다. 이 분기는 삼항 한 줄이라 리팩터링 때 가장 먼저 뭉개진다.
 *  6. 요청 본문 — create 에 실리는 payload 는 서비스가 손대지 않고 그대로 전달해야 한다
 *     (pswd 를 흘려 지우거나 필드를 주입하면 익명 삭제가 영영 불가능해진다).
 *
 * [의도적으로 고정하지 않는 것]
 * 이 서비스는 AxiosRequestConfig 를 받는 매개변수를 노출하지 않는다(ApiService 상속이
 * 아니라 client 직호출이다). 따라서 config 전달 계약은 remove 의 `params` 한 곳뿐이며,
 * 페이징 파라미터 변환(page -> pageIndex)도 ApiService 경유가 아니라 적용되지 않는다.
 * 없는 메서드를 지어내지 않기 위해 그 둘은 테스트하지 않는다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => {
  const get = vi.fn();
  const post = vi.fn();
  const remove = vi.fn();

  return {
    get,
    post,
    delete: remove,
    getRaw: vi.fn(async (url: string, config?: unknown) => ({
      success: true,
      code: 'S000',
      message: '성공',
      data: config === undefined ? await get(`/${url}`) : await get(`/${url}`, config),
    })),
    requestRaw: vi.fn(async (request: Record<string, unknown>) => {
      const url = `/${String(request.url)}`;
      const method = request.method;
      let data: unknown;

      if (method === 'post') {
        data = await post(url, request.data);
      } else if (method === 'delete') {
        data = await remove(url, { params: request.params });
      }

      return { success: true, code: 'S000', message: '성공', data };
    }),
  };
});

vi.mock('@/lib/api/client', () => ({ default: client }));

import { satisfactionService, type Satisfaction } from '../SatisfactionService';

/** 게시판 ID 와 게시글 일련번호는 서로 다른 값으로 둬 자리 뒤바뀜이 즉시 드러나게 한다. */
const BBS_ID = 'BBSMSTR_000000000001';
const PST_SN = 42;
/** 만족도 일련번호는 게시글 일련번호와 반드시 달라야 한다 — 뒤바뀌면 다른 자원을 지운다. */
const DGSTFN_SN = 7;
const BASE = `/boards/${BBS_ID}/posts/${PST_SN}/satisfactions`;

describe('satisfactionService 경로 조립 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  it('목록 조회는 생성 operation의 raw envelope 경계를 사용한다', async () => {
    client.getRaw.mockResolvedValueOnce({
      success: true,
      code: 'S000',
      message: '성공',
      data: [],
    });

    await satisfactionService.list(BBS_ID, PST_SN);

    expect(client.getRaw).toHaveBeenCalledWith(
      'boards/BBSMSTR_000000000001/posts/42/satisfactions',
      undefined,
    );
  });

  it('평균·등록·삭제도 생성 operation의 method/path/body/query 계약을 사용한다', async () => {
    client.getRaw.mockResolvedValueOnce({
      success: true,
      code: 'S000',
      message: '성공',
      data: { average: 4.5 },
    });
    client.requestRaw
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: 101 })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: undefined })
      .mockResolvedValueOnce({ success: true, code: 'S000', message: '성공', data: undefined });

    await satisfactionService.average(BBS_ID, PST_SN);
    await satisfactionService.create(BBS_ID, PST_SN, { useYn: 'Y', dgstfnScr: 5 });
    await satisfactionService.remove(BBS_ID, PST_SN, DGSTFN_SN, 'secret1234');
    await satisfactionService.remove(BBS_ID, PST_SN, DGSTFN_SN);

    expect(client.getRaw).toHaveBeenCalledWith(
      'boards/BBSMSTR_000000000001/posts/42/satisfactions/average',
      undefined,
    );
    expect(client.requestRaw.mock.calls).toEqual([
      [{
        url: 'boards/BBSMSTR_000000000001/posts/42/satisfactions',
        method: 'post',
        data: { useYn: 'Y', dgstfnScr: 5 },
      }],
      [{
        url: 'boards/BBSMSTR_000000000001/posts/42/satisfactions/7',
        method: 'delete',
        params: { pswd: 'secret1234' },
      }],
      [{
        url: 'boards/BBSMSTR_000000000001/posts/42/satisfactions/7',
        method: 'delete',
        params: {},
      }],
    ]);
  });

  it('목록 조회는 게시글에 종속된 satisfactions 경로로 GET 한다', async () => {
    client.get.mockResolvedValueOnce([]);

    await satisfactionService.list(BBS_ID, PST_SN);

    expect(client.get).toHaveBeenCalledWith(
      '/boards/BBSMSTR_000000000001/posts/42/satisfactions',
    );
    expect(client.post).not.toHaveBeenCalled();
    expect(client.delete).not.toHaveBeenCalled();
  });

  it('평균 조회는 목록 경로에 /average 를 덧붙인 별도 엔드포인트로 GET 한다', async () => {
    client.get.mockResolvedValueOnce({ average: 4.5 });

    await satisfactionService.average(BBS_ID, PST_SN);

    expect(client.get).toHaveBeenCalledWith(
      '/boards/BBSMSTR_000000000001/posts/42/satisfactions/average',
    );
    // 목록 경로로 잘못 나가면 배열이 { average } 자리에 앉는다 — 접미가 빠졌는지 명시 확인.
    expect(client.get).not.toHaveBeenCalledWith(BASE);
  });

  it('등록은 목록과 동일한 base 경로로 POST 하며 average 경로를 타지 않는다', async () => {
    client.post.mockResolvedValueOnce(101);
    const body: Satisfaction = { useYn: 'Y', dgstfnScr: 5 };

    await satisfactionService.create(BBS_ID, PST_SN, body);

    expect(client.post).toHaveBeenCalledWith(
      '/boards/BBSMSTR_000000000001/posts/42/satisfactions',
      body,
    );
  });

  it('삭제 경로에는 게시글 일련번호가 아니라 만족도 일련번호가 마지막 세그먼트로 붙는다', async () => {
    client.delete.mockResolvedValueOnce(undefined);

    await satisfactionService.remove(BBS_ID, PST_SN, DGSTFN_SN);

    // 두 숫자가 뒤바뀌면 다른 자원을 지운다. 자리까지 통째로 고정한다.
    expect(client.delete).toHaveBeenCalledWith(
      '/boards/BBSMSTR_000000000001/posts/42/satisfactions/7',
      { params: {} },
    );
    expect(client.delete).not.toHaveBeenCalledWith(
      `${BASE}/${PST_SN}`,
      expect.anything(),
    );
  });

  it('네 메서드 모두 동일한 게시글 종속 base 경로 위에서 동작한다', async () => {
    client.get
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ average: 0 });
    client.post.mockResolvedValue(1);
    client.delete.mockResolvedValue(undefined);

    await satisfactionService.list(BBS_ID, PST_SN);
    await satisfactionService.average(BBS_ID, PST_SN);
    await satisfactionService.create(BBS_ID, PST_SN, { useYn: 'Y' });
    await satisfactionService.remove(BBS_ID, PST_SN, DGSTFN_SN);

    const urls = [
      ...client.get.mock.calls.map((call) => String(call[0])),
      ...client.post.mock.calls.map((call) => String(call[0])),
      ...client.delete.mock.calls.map((call) => String(call[0])),
    ];

    expect(urls).toHaveLength(4);
    for (const url of urls) {
      expect(url.startsWith(BASE)).toBe(true);
    }
  });
});

describe('satisfactionService 경로 변수 인코딩', () => {
  beforeEach(() => vi.clearAllMocks());

  it('게시판 ID 의 경로 구분자와 쿼리 문자를 인코딩해 경로 구조를 바꾸지 못하게 한다', async () => {
    client.get.mockResolvedValueOnce([]);

    await satisfactionService.list('../admin?x=1', PST_SN);

    expect(client.get).toHaveBeenCalledWith(
      '/boards/..%2Fadmin%3Fx%3D1/posts/42/satisfactions',
    );
  });

  it('공백이 든 게시판 ID 도 인코딩되어 잘린 경로가 만들어지지 않는다', async () => {
    client.get.mockResolvedValueOnce({ average: 0 });

    await satisfactionService.average('BBS 01', PST_SN);

    expect(client.get).toHaveBeenCalledWith(
      '/boards/BBS%2001/posts/42/satisfactions/average',
    );
  });

  it('게시글 일련번호는 숫자 그대로 경로에 놓이며 삭제 경로에서도 동일하다', async () => {
    client.delete.mockResolvedValueOnce(undefined);

    await satisfactionService.remove(BBS_ID, 1234567890123, DGSTFN_SN);

    expect(client.delete).toHaveBeenCalledWith(
      '/boards/BBSMSTR_000000000001/posts/1234567890123/satisfactions/7',
      { params: {} },
    );
  });
});

describe('satisfactionService 삭제 시 비밀번호 파라미터 분기', () => {
  beforeEach(() => vi.clearAllMocks());

  it('비밀번호를 주면 쿼리 파라미터 pswd 로 실어 보낸다', async () => {
    client.delete.mockResolvedValueOnce(undefined);

    await satisfactionService.remove(BBS_ID, PST_SN, DGSTFN_SN, 'secret1234');

    expect(client.delete).toHaveBeenCalledWith(
      '/boards/BBSMSTR_000000000001/posts/42/satisfactions/7',
      { params: { pswd: 'secret1234' } },
    );
  });

  it('비밀번호를 생략하면 빈 query만 전달해 로그인 작성분의 소유자/관리자 판정 경로를 탄다', async () => {
    client.delete.mockResolvedValueOnce(undefined);

    await satisfactionService.remove(BBS_ID, PST_SN, DGSTFN_SN);

    const config = client.delete.mock.calls[0][1] as { params?: unknown };
    expect(config.params).toEqual({});
  });

  it('빈 문자열 비밀번호는 pswd= 로 전송하지 않고 params 를 생략한다', async () => {
    client.delete.mockResolvedValueOnce(undefined);

    await satisfactionService.remove(BBS_ID, PST_SN, DGSTFN_SN, '');

    // 빈 값을 실어 보내면 백엔드가 "빈 비밀번호로 대조" 하는 상황이 된다.
    expect(client.delete).toHaveBeenCalledWith(
      '/boards/BBSMSTR_000000000001/posts/42/satisfactions/7',
      { params: {} },
    );
  });
});

describe('satisfactionService 요청 본문과 응답 전달', () => {
  beforeEach(() => vi.clearAllMocks());

  it('등록 본문을 가공하지 않고 동일 객체 그대로 전달한다', async () => {
    client.post.mockResolvedValueOnce(55);
    const body: Satisfaction = {
      useYn: 'Y',
      dgstfnCn: '도움이 되었습니다',
      dgstfnScr: 4,
      userNm: '홍길동',
      pswd: 'anonymous-proof',
    };
    const snapshot = { ...body };

    await satisfactionService.create(BBS_ID, PST_SN, body);

    // 참조 동일성 — 얕은 복사·필드 주입·pswd 제거가 끼어들면 익명 삭제가 불가능해진다.
    expect(client.post.mock.calls[0][1]).toEqual(body);
    expect(body).toEqual(snapshot);
  });

  it('등록은 생성된 만족도 일련번호를 변형 없이 반환한다', async () => {
    client.post.mockResolvedValueOnce(9001);

    await expect(satisfactionService.create(BBS_ID, PST_SN, { useYn: 'Y' })).resolves.toBe(9001);
  });

  it('목록 응답 배열을 재가공 없이 그대로 반환한다', async () => {
    const rows: Satisfaction[] = [
      { dgstfnSn: 1, useYn: 'Y', dgstfnScr: 5 },
      { dgstfnSn: 2, useYn: 'Y', dgstfnScr: 3 },
    ];
    client.get.mockResolvedValueOnce(rows);

    await expect(satisfactionService.list(BBS_ID, PST_SN)).resolves.toEqual(rows);
  });

  it('평균 응답의 0 을 falsy 로 뭉개지 않고 그대로 반환한다', async () => {
    client.get.mockResolvedValueOnce({ average: 0 });

    await expect(satisfactionService.average(BBS_ID, PST_SN)).resolves.toEqual({ average: 0 });
  });

  it('client 오류는 삼키지 않고 호출부로 전파한다', async () => {
    client.delete.mockRejectedValueOnce(new Error('비밀번호가 일치하지 않습니다.'));

    await expect(
      satisfactionService.remove(BBS_ID, PST_SN, DGSTFN_SN, 'wrong'),
    ).rejects.toThrow('비밀번호가 일치하지 않습니다.');
  });
});

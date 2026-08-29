/**
 * knowledgeService 계약 테스트
 *
 * [왜 필요한가]
 * `src/services/business/knowledge/knowledgeService.ts` 는 커버리지 0% 였다. 지식 허브(공지·FAQ·QNA·
 * WIKI·커뮤니티) 화면 전체가 이 파일 하나를 통해 백엔드와 대화하는데, 여기서 틀어지는 것들은
 * **컴파일도 통과하고 타입도 맞은 채 조용히 깨진다**. 화면에는 "조회 실패" 나 빈 목록만 뜨고,
 * 원인은 네트워크 탭을 열기 전까지 보이지 않는다. 아래 5가지를 고정한다.
 *
 *  1. URL 조합 — `super('/boards')` 는 ApiService 생성자에서 선행 슬래시가 제거돼 basePath 가
 *     `'boards'` 가 되고, 최종 URL 은 `boards/{bbsId}` 형태로 조합된다. 여기에 슬래시가 하나
 *     붙거나 빠지면 axios baseURL(`/api/v1`) 결합 결과가 달라져 404 가 된다.
 *  2. 게시판 ID 매핑 — 카테고리(FAQ/QNA/WIKI/COMMUNITY)별 BBSMSTR_* 상수는 하드코딩 문자열이다.
 *     한 글자만 틀려도(A/B/C/D/E 반복 문자열이라 오타가 눈에 띄지 않는다) **다른 게시판의 글이
 *     아무 오류 없이 정상 조회**된다. 가장 발견이 늦는 종류의 사고다.
 *  3. 페이징 변환 — ApiService.get 이 0-based `page` 를 1-based `pageIndex` 로, `size` 를
 *     `recordCountPerPage` 로 변환해 보낸다. 이 오프셋이 뒤집히면 첫 페이지가 통째로 비거나
 *     목록이 한 페이지씩 밀린다. 원본 `page`/`size` 도 Spring Data Pageable 용으로 함께 남아야 한다.
 *  4. 경로 변수 치환 — 상세(`/{bbsId}/posts/{pstSn}`)·통계(`/{bbsId}/stats`)는 식별자가 잘못
 *     끼워지면 **다른 자원을 읽거나 건드린다**.
 *  5. 응답 정규화 — getHotArticles/getActivities 는 레거시 필드(`nttId`/`nttSj`)를 신규
 *     필드(`pstSn`/`pstTtl`)로 접어 넣는다. 이 폴백이 사라지면 카드 제목이 전부 빈 문자열이 된다.
 *
 * [검증 방식] HTTP 클라이언트(`@/lib/api/client`)를 모킹해 **실제로 나가는 URL 과 파라미터**를
 * 단언한다. 프로덕션 코드는 일절 수정하지 않는다.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => ({
  default: (await import('@/test-utils/api-client-test-double')).apiClientTestDouble,
}));

import { knowledgeService } from '../knowledgeService';
import {
  apiClientTestDouble as client,
  resetApiClientTestDouble,
} from '@/test-utils/api-client-test-double';

/** 소스에 하드코딩된 게시판 ID 상수 (private 이라 테스트에서 리터럴로 재선언해 고정한다) */
const BBS = {
  NOTICE: 'BBSMSTR_AAAAAAAAAAAA',
  FAQ: 'BBSMSTR_BBBBBBBBBBBB',
  COMMUNITY: 'BBSMSTR_CCCCCCCCCCCC',
  QNA: 'BBSMSTR_DDDDDDDDDDDD',
  WIKI: 'BBSMSTR_EEEEEEEEEEEE',
} as const;

describe('knowledgeService — 지식 허브 게시판 API 계약', () => {
  beforeEach(() => {
    // 정규화 메서드(getHotArticles/getActivities)가 res.list 를 읽으므로 기본 응답을 깔아둔다.
    resetApiClientTestDouble({ get: { list: [] } });
  });

  describe('getArticles — 목록 조회', () => {
    it('카테고리를 지정하지 않으면 공지사항 게시판 경로로 요청한다', async () => {
      await knowledgeService.getArticles();

      expect(client.get).toHaveBeenCalledWith(
        `boards/${BBS.NOTICE}`,
        expect.objectContaining({ params: expect.any(Object) }),
      );
    });

    it.each([
      ['FAQ', BBS.FAQ],
      ['QNA', BBS.QNA],
      ['WIKI', BBS.WIKI],
      ['COMMUNITY', BBS.COMMUNITY],
    ])('카테고리 %s 는 게시판 %s 경로로 정확히 매핑된다', async (category, expectedBbsId) => {
      await knowledgeService.getArticles({ category });

      expect(client.get).toHaveBeenCalledWith(
        `boards/${expectedBbsId}`,
        expect.objectContaining({
          params: expect.objectContaining({ qnaCatCd: category }),
        }),
      );
    });

    it('매핑 표에 없는 카테고리는 공지사항 게시판으로 폴백하되 qnaCatCd 는 원문을 유지한다', async () => {
      await knowledgeService.getArticles({ category: 'NOTICE' });

      expect(client.get).toHaveBeenCalledWith(
        `boards/${BBS.NOTICE}`,
        expect.objectContaining({
          params: expect.objectContaining({ qnaCatCd: 'NOTICE' }),
        }),
      );
    });

    it('bbsId 를 명시하면 카테고리 매핑보다 우선해 그 게시판을 조회한다', async () => {
      await knowledgeService.getArticles({ bbsId: 'BBSMSTR_CUSTOM000001', category: 'FAQ' });

      expect(client.get).toHaveBeenCalledWith(
        'boards/BBSMSTR_CUSTOM000001',
        expect.objectContaining({
          params: expect.objectContaining({ qnaCatCd: 'FAQ' }),
        }),
      );
    });

    it('기본 페이징(page 0 · size 20)을 pageIndex 1 · recordCountPerPage 20 으로 변환해 보낸다', async () => {
      await knowledgeService.getArticles();

      expect(client.get).toHaveBeenCalledWith(`boards/${BBS.NOTICE}`, {
        params: {
          qnaCatCd: undefined,
          searchWrd: undefined,
          searchCnd: '0',
          page: 0,
          size: 20,
          pageIndex: 1,
          recordCountPerPage: 20,
        },
      });
    });

    it('0-based page 2 는 1-based pageIndex 3 으로 나가며 원본 page·size 도 함께 유지된다', async () => {
      await knowledgeService.getArticles({ page: 2, size: 50 });

      expect(client.get).toHaveBeenCalledWith(`boards/${BBS.NOTICE}`, {
        params: {
          qnaCatCd: undefined,
          searchWrd: undefined,
          searchCnd: '0',
          page: 2,
          size: 50,
          pageIndex: 3,
          recordCountPerPage: 50,
        },
      });
    });

    it('검색어·검색조건을 그대로 싣고, 검색조건 미지정 시 기본값 "0" 을 채운다', async () => {
      await knowledgeService.getArticles({ searchWrd: '전자정부', searchCnd: '1', category: 'FAQ' });
      await knowledgeService.getArticles({ searchWrd: '전자정부' });

      expect(client.get).toHaveBeenNthCalledWith(
        1,
        `boards/${BBS.FAQ}`,
        expect.objectContaining({
          params: expect.objectContaining({ searchWrd: '전자정부', searchCnd: '1' }),
        }),
      );
      expect(client.get).toHaveBeenNthCalledWith(
        2,
        `boards/${BBS.NOTICE}`,
        expect.objectContaining({
          params: expect.objectContaining({ searchWrd: '전자정부', searchCnd: '0' }),
        }),
      );
    });

    it('호출자가 넘긴 파라미터 객체를 변형(mutate)하지 않는다', async () => {
      // ApiService.get 은 전달받은 params 객체에 pageIndex/recordCountPerPage 를 **제자리 주입**한다.
      // 호출부의 객체(예: React 상태)를 그대로 넘기게 바뀌면 화면 상태가 조용히 오염된다.
      const callerParams = { category: 'FAQ', page: 1, size: 10 };

      await knowledgeService.getArticles(callerParams);

      expect(callerParams).toEqual({ category: 'FAQ', page: 1, size: 10 });
    });

    it('백엔드 PageResponse 를 가공 없이 그대로 반환한다', async () => {
      const pageResponse = {
        list: [{ pstSn: 1, pstTtl: '제목', pstCn: '본문' }],
        total: 1,
        page: 1,
        size: 20,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(pageResponse);

      await expect(knowledgeService.getArticles()).resolves.toBe(pageResponse);
    });
  });

  describe('getArticle / getStats — 경로 변수 치환', () => {
    it('상세 조회는 boards/{bbsId}/posts/{pstSn} 경로로 정확히 나간다', async () => {
      client.get.mockResolvedValueOnce({ pstSn: 42, pstTtl: '제목', pstCn: '본문' });

      await knowledgeService.getArticle(BBS.QNA, 42);

      expect(client.get).toHaveBeenCalledWith(`boards/${BBS.QNA}/posts/42`, undefined);
    });

    it('상세 조회는 쿼리 파라미터를 붙이지 않는다(페이징 변환이 개입하지 않는다)', async () => {
      await knowledgeService.getArticle(BBS.NOTICE, 7);

      const [, config] = client.get.mock.calls[0];
      expect(config).toBeUndefined();
    });

    it('통계 조회는 boards/{bbsId}/stats 경로로 나가고 bbsId 생략 시 공지 게시판을 본다', async () => {
      await knowledgeService.getStats(BBS.WIKI);
      await knowledgeService.getStats();

      expect(client.get).toHaveBeenNthCalledWith(1, `boards/${BBS.WIKI}/stats`, undefined);
      expect(client.get).toHaveBeenNthCalledWith(2, `boards/${BBS.NOTICE}/stats`, undefined);
    });
  });

  describe('getHotArticles — 인기 게시물', () => {
    /*
     * [2026-08-29] 정렬 파라미터를 `sort` 에서 `orderBy` 로 바꿨다.
     *
     * 종전 계약은 `sort: 'inqCnt,desc'` 를 보내는 것을 고정했고 테스트 이름도 '조회수
     * 내림차순' 이었지만, **서버는 그 파라미터를 읽지 않는다.** 게시판 목록 API 가 해석하는
     * 정렬 키는 `orderBy` 이고 값 도메인은 date·views·comments 다(BoardSearchCondition:16,
     * BoardRepositoryImpl 의 switch). 그래서 조회수 정렬이 걸린 적이 없고 결과는 기본
     * 정렬(sortOrdr desc) 상위 5건이었다 — 화면은 그것을 순위 숫자·조회수와 함께
     * '인기 문서 / 조회수가 높은 문서' 라고 불렀다.
     *
     * 계약이 서버가 읽지 않는 이름을 고정하고 있었으므로 그 이름을 바꿔도 red 가 나지
     * 않았어야 하는데, 오히려 이 red 가 "계약이 무엇을 고정하고 있었는지" 를 드러냈다.
     */
    it('서버가 해석하는 정렬 키로 조회수 상위 5건을 요청한다', async () => {
      await knowledgeService.getHotArticles();

      expect(client.get).toHaveBeenCalledWith(`boards/${BBS.NOTICE}`, {
        params: { size: 5, orderBy: 'views', recordCountPerPage: 5 },
      });
    });

    it('bbsId 를 주면 해당 게시판의 인기글을 조회한다', async () => {
      await knowledgeService.getHotArticles(BBS.COMMUNITY);

      expect(client.get).toHaveBeenCalledWith(
        `boards/${BBS.COMMUNITY}`,
        expect.objectContaining({ params: expect.objectContaining({ orderBy: 'views' }) }),
      );
    });

    it('레거시 nttId·nttSj 를 pstSn·pstTtl 로 정규화하고 나머지 필드는 보존한다', async () => {
      client.get.mockResolvedValueOnce({
        list: [
          { nttId: 11, nttSj: '레거시 제목', inqCnt: 300 },
          { pstSn: 22, pstTtl: '신규 제목', nttId: 99, nttSj: '무시되어야 함' },
        ],
      });

      const result = await knowledgeService.getHotArticles();

      expect(result.list[0]).toMatchObject({ pstSn: 11, pstTtl: '레거시 제목', inqCnt: 300 });
      expect(result.list[1]).toMatchObject({ pstSn: 22, pstTtl: '신규 제목' });
    });

    it('응답에 list 가 없으면 예외 대신 빈 배열을 돌려준다', async () => {
      client.get.mockResolvedValueOnce({});

      await expect(knowledgeService.getHotArticles()).resolves.toEqual({ list: [] });
    });
  });

  describe('getActivities — 최근 활동 피드', () => {
    it('활동 피드는 10건을 요청한다(size 10 → recordCountPerPage 10)', async () => {
      await knowledgeService.getActivities();

      expect(client.get).toHaveBeenCalledWith(`boards/${BBS.NOTICE}`, {
        params: { size: 10, recordCountPerPage: 10 },
      });
    });

    it('bbsId 를 주면 해당 게시판의 활동을 조회한다', async () => {
      await knowledgeService.getActivities(BBS.QNA);

      expect(client.get).toHaveBeenCalledWith(
        `boards/${BBS.QNA}`,
        expect.objectContaining({ params: expect.objectContaining({ size: 10 }) }),
      );
    });

    it('피드 항목을 id·type·title·user·time·impact 규칙대로 변환한다', async () => {
      client.get.mockResolvedValueOnce({
        list: [
          {
            pstSn: 5,
            pstTtl: '표준 프레임워크 5.0 공지',
            userNm: '홍길동',
            frstRgtrId: 'USER0001',
            crtDt: '2026-08-15T10:20:30',
            inqCnt: 250,
          },
        ],
      });

      const [activity] = await knowledgeService.getActivities();

      expect(activity).toEqual({
        id: 5,
        type: 'SHARE',
        title: '표준 프레임워크 5.0 공지',
        user: '홍길동',
        time: '2026-08-15',
        impact: '+50 Reach',
      });
    });

    it('레거시 필드만 있는 항목도 nttId·nttSj·frstRgtrId 로 채워진다', async () => {
      client.get.mockResolvedValueOnce({
        list: [{ nttId: 77, nttSj: '레거시 활동', frstRgtrId: 'USER0002', crtDt: '2026-01-02T00:00:00' }],
      });

      const [activity] = await knowledgeService.getActivities();

      expect(activity).toMatchObject({ id: 77, title: '레거시 활동', user: 'USER0002', time: '2026-01-02' });
    });

    it('작성일이 없으면 "Just now", 조회수가 없으면 "+0 Reach" 로 채운다', async () => {
      client.get.mockResolvedValueOnce({ list: [{ pstSn: 9, pstTtl: '방금 등록' }] });

      const [activity] = await knowledgeService.getActivities();

      expect(activity).toMatchObject({ time: 'Just now', impact: '+0 Reach' });
    });

    it('응답에 list 가 없으면 예외 대신 빈 배열을 돌려준다', async () => {
      client.get.mockResolvedValueOnce({});

      await expect(knowledgeService.getActivities()).resolves.toEqual([]);
    });
  });
});

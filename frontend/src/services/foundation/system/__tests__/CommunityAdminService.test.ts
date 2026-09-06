/**
 * CommunityAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/CommunityAdminService.ts` 는 커뮤니티(개설·수정·폐쇄)
 * 관리자 API 의 유일한 진입점이다. 기존 검증은 `AdminServicesPart2.test.ts` 의 목록 1건
 * (`expect.objectContaining` 느슨한 단언)뿐이라 아래 항목들이 전부 무방비였다.
 * 이 서비스의 코드는 얇지만, 얇은 코드일수록 **틀어져도 컴파일·타입 검사를 모두 통과한 채
 * 런타임에서만 조용히 깨진다** — 화면에는 "조회 실패" 토스트 한 줄만 뜬다.
 *
 * 1) URL 접두 — 이 서비스는 `super('/community', 'content')` 로 **category 를 명시**한다.
 *    `AdminService` 가 `admin/{category}/{path}` 를 합성하고 `ApiService` 가 선행 슬래시를
 *    제거하므로 최종 접두는 `admin/content/community` 다. 같은 디렉터리의 다른 서비스들이
 *    쓰는 기본값 'system'(→ `admin/system/...`)과 **다르다**. 이 한 글자가 바뀌면 전 메서드가
 *    동시에 404 가 되고, 반대로 category 인자가 실수로 빠져도 타입은 통과한다(기본값이 있다).
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size`/`pageSize` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 에 맞춘다.
 *    이 +1 이 사라지거나 두 번 적용되면 목록이 한 페이지씩 밀리거나 첫 페이지가 빈다.
 *    타입은 그대로 number 라 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 검색 파라미터 이름 변환 — 이 서비스는 검색 조건·검색어를 **백엔드 레거시 키**로 갈아끼운다.
 *    `searchCondition` → `searchCnd`, `searchKeyword || searchWrd` → `searchWrd`.
 *    (같은 디렉터리의 SurveyAdminService 가 `keyword` 로 승격하는 것과 목적지 키가 다르다.)
 *    폴백 순서가 뒤집히면 레거시 화면(searchWrd)이나 신규 화면(searchKeyword) 중 한쪽의
 *    검색이 통째로 무력화된다. 두 키가 함께 오면 결과 `searchWrd` 는 searchKeyword 값으로
 *    **덮어써진다** — 이 파괴적 동작이 의도임을 아래에서 명시적으로 고정한다.
 *
 * 4) 경로 변수 치환 — `updateCommunity(cmntySn, …)` / `deleteCommunity(cmntySn)` 는 경로의
 *    숫자 하나가 대상 자원을 결정한다. 본문(payload)에 든 `cmntySn` 을 따라가거나 경로 변수가
 *    누락되면 **다른 커뮤니티를 고치거나 컬렉션 전체를 지운다** — 되돌릴 수 없는 사고다.
 *
 * 5) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal)가 유실되면 화면
 *    이탈 시 요청 취소가 동작하지 않고 타임아웃이 기본값(15초)으로 되돌아간다. 유실돼도
 *    요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchParams } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { communityAdminService } from '../CommunityAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/community', 'content')` → `admin/` + category(`content`) + `community`
 * → `admin/content/community` (선행 슬래시 없음).
 */
const BASE = 'admin/content/community';

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
const fallbackCommunity = { cmntySn: 1, cmntyNm: '커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' };
const emptyPage = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };

// Community 인터페이스는 export 되지 않는다. 서비스 시그니처에서 역으로 끌어와 `any` 없이 타입을 얻는다.
type CommunityPayload = Parameters<typeof communityAdminService.createCommunity>[0];

describe('CommunityAdminService — 커뮤니티 관리자 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockImplementation(async (url: string, config?: unknown) => {
      const data = await client.get(url, config);
      const fallback = url === BASE ? emptyPage : url === `${BASE}/portlet` ? [] : fallbackCommunity;
      return envelope(data ?? fallback);
    });
    client.requestRaw.mockImplementation(async (request: Record<string, unknown>) => {
      const { url, method, data, ...config } = request;
      const forwardedConfig = Object.keys(config).length === 0 ? undefined : config;
      let result: unknown;
      if (method === 'post') result = await client.post(url, data, forwardedConfig);
      else if (method === 'put') result = await client.put(url, data, forwardedConfig);
      else if (method === 'delete') result = await client.delete(url, forwardedConfig);
      return envelope(result ?? (method === 'post' ? fallbackCommunity : undefined));
    });
  });

  describe('URL 조합', () => {
    it('목록은 admin/content/community 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await communityAdminService.getCommunityList();

      // path='' 이므로 `${basePath}${path}` 는 접두 그대로다. 'admin/system/...' 이 아님에 주의.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchCnd: '', searchWrd: '' },
      });
      expect(client.get).not.toHaveBeenCalledWith('admin/system/community', expect.anything());
    });

    it('검색과 무관한 params 만 넘겨도 searchCnd·searchWrd 는 빈 문자열로 항상 채워진다', async () => {
      await communityAdminService.getCommunityList({ size: 5 });

      // 백엔드 @RequestParam 이 필수라면 키 자체가 빠지는 순간 400 이 된다 — 기본값 충전이 계약이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { size: 5, searchCnd: '', searchWrd: '' },
      });
    });

    it('모든 요청 경로는 admin/content/community 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로로 해석).
      await communityAdminService.getCommunity(7);
      await communityAdminService.getCommunityPortlet();
      await communityAdminService.createCommunity({ cmntyNm: '신규 커뮤니티', useYn: 'Y' });
      await communityAdminService.updateCommunity(7, { cmntyNm: '이름 변경', useYn: 'Y' });
      await communityAdminService.deleteCommunity(7);

      const paths = [client.get, client.post, client.put, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(5);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });
  });

  describe('목록 조회 — 페이징 변환', () => {
    it('첫 페이지(page 0)는 생성 Pageable 계약의 page 0으로 유지된다', async () => {
      await communityAdminService.getCommunityList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, searchCnd: '', searchWrd: '' },
      });
    });

    it('page 3·size 20 은 생성 Pageable 계약의 두 키만 전달된다', async () => {
      await communityAdminService.getCommunityList({ page: 3, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: {
          page: 3,
          size: 20,
          searchCnd: '',
          searchWrd: '',
        },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      await communityAdminService.getCommunityList({ page: 9, pageIndex: 1 });

      // page 9 였다면 +1 규칙상 10 이지만, 명시된 pageIndex 가 우선한다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, searchCnd: '', searchWrd: '' },
      });
    });

    it('pageSize 는 생성 Pageable 계약의 size로 변환된다', async () => {
      await communityAdminService.getCommunityList({ pageSize: 15 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: {
          size: 15,
          searchCnd: '',
          searchWrd: '',
        },
      });
    });

    it('호출부가 넘긴 params 객체는 변형되지 않는다 — 재사용 시 pageIndex 가 누적 오염되면 안 된다', async () => {
      // ApiService.get 은 넘겨받은 params 객체에 직접 pageIndex 를 써넣는다(파괴적).
      // 서비스가 스프레드로 사본을 만들기 때문에 호출부(React Query key 등)의 객체는 무사하다.
      const callerParams: SearchParams = { page: 1, size: 10 };

      await communityAdminService.getCommunityList(callerParams);

      expect(callerParams).toEqual({ page: 1, size: 10 });
    });
  });

  describe('목록 조회 — 검색 키 변환', () => {
    it('searchCondition 은 생성 계약의 searchCnd 로 승격된다', async () => {
      await communityAdminService.getCommunityList({ searchCondition: 'cmntyNm' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchCnd: 'cmntyNm', searchWrd: '' },
      });
    });

    it('searchKeyword 는 searchWrd 로 승격되어 백엔드 @RequestParam 에 도달한다', async () => {
      await communityAdminService.getCommunityList({ searchKeyword: '개발자' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchWrd: '개발자', searchCnd: '' },
      });
    });

    it('searchKeyword 가 없으면 레거시 키 searchWrd 를 폴백으로 그대로 실어 보낸다', async () => {
      await communityAdminService.getCommunityList({ searchWrd: '레거시검색' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchWrd: '레거시검색', searchCnd: '' },
      });
    });

    it('두 검색 키가 함께 오면 searchKeyword 가 우선해 searchWrd 값을 덮어쓴다', async () => {
      await communityAdminService.getCommunityList({ searchKeyword: '우선', searchWrd: '후순위' });

      // 목적지 키가 searchWrd 하나뿐이라 레거시 값('후순위')은 소실된다 — 이것이 현재 계약이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchWrd: '우선', searchCnd: '' },
      });
      // 폴백 순서가 뒤집히면 아래 형태로 나간다 — 신규 화면의 검색어가 무시된다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchWrd: '후순위', searchCnd: '' },
      });
    });

    it('빈 문자열 검색어는 폴백을 통과해 최종적으로 빈 문자열이 된다', async () => {
      await communityAdminService.getCommunityList({ searchKeyword: '', searchWrd: '' });

      // '' 는 falsy 이므로 `||` 사슬을 끝까지 흘러 기본값 '' 에 도달한다(undefined 가 아니다).
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchWrd: '', searchCnd: '' },
      });
    });

    it('검색·페이징이 함께 오면 두 변환이 서로를 지우지 않고 모두 적용된다', async () => {
      await communityAdminService.getCommunityList({
        page: 2,
        size: 10,
        searchCondition: 'cmntyNm',
        searchKeyword: '스터디',
      });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: {
          page: 2,
          size: 10,
          searchCnd: 'cmntyNm',
          searchWrd: '스터디',
        },
      });
    });
  });

  describe('config 전달 · 응답 무가공 전달', () => {
    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await communityAdminService.getCommunityList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0, searchCnd: '', searchWrd: '' },
      });
    });

    it('단건 조회는 config 를 생략하면 undefined 를 그대로 전달한다 — 빈 객체로 바꿔치지 않는다', async () => {
      await communityAdminService.getCommunity(7);

      // params 가 없으므로 ApiService 의 페이징 정규화 분기 자체가 개입하지 않는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/7`, {});
    });

    it('목록 응답의 wire 필드를 기존 공개 필드명으로 어댑트한다', async () => {
      const page = {
        list: [
          {
            cmntySn: 7,
            cmntyNm: '개발자 커뮤니티',
            cmntyIntroCn: '사내 개발자 정보 공유 공간',
            useYn: 'Y',
            regSeCd: '01',
            frstRgtrId: 'admin',
            crtDt: '2026-08-01T09:00:00',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(communityAdminService.getCommunityList()).resolves.toEqual({
        ...page,
        list: [{ ...page.list[0], cmntyIntrcn: '사내 개발자 정보 공유 공간', rgstrSeCd: '01' }],
      });
    });

    it('단건 응답도 wire 필드를 기존 공개 필드명으로 어댑트한다', async () => {
      const community = {
        cmntySn: 7,
        cmntyNm: '개발자 커뮤니티',
        cmntyIntroCn: '사내 개발자 정보 공유 공간',
        useYn: 'N',
      } as const;
      client.get.mockResolvedValueOnce(community);

      await expect(communityAdminService.getCommunity(7)).resolves.toEqual({
        ...community,
        cmntyIntrcn: '사내 개발자 정보 공유 공간',
        rgstrSeCd: undefined,
      });
    });
  });

  describe('단건 CRUD — 경로 변수 치환', () => {
    it('단건 조회는 cmntySn 을 경로 변수로 붙이고 config 를 그대로 넘긴다', async () => {
      await communityAdminService.getCommunity(7, { timeout: 1000 });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, { timeout: 1000 });
    });

    it('개설(등록)은 공개 필드명을 생성 wire 필드명으로 변환해 POST 한다', async () => {
      const payload: CommunityPayload = {
        cmntyNm: '신규 커뮤니티',
        cmntyIntrcn: '신규 개설 소개문',
        useYn: 'Y',
      };

      await communityAdminService.createCommunity(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, {
        cmntyNm: '신규 커뮤니티',
        cmntyIntroCn: '신규 개설 소개문',
        useYn: 'Y',
      }, undefined);
    });

    it('개설 시 config(signal)가 세 번째 인자로 유실 없이 전달된다', async () => {
      const { signal } = new AbortController();

      await communityAdminService.createCommunity({ cmntyNm: '신규 커뮤니티', useYn: 'Y' }, { signal });

      expect(client.post).toHaveBeenCalledWith(BASE, { cmntyNm: '신규 커뮤니티', useYn: 'Y' }, { signal });
    });

    it('수정은 인자로 받은 cmntySn 이 경로를 결정한다 — 본문의 cmntySn 이 아니다', async () => {
      // 본문에 다른 cmntySn(99)을 심어 두고, 경로는 인자(7)만 따르는지 확인한다.
      const payload: CommunityPayload = { cmntySn: 99, cmntyNm: '이름만 수정', useYn: 'Y' };

      await communityAdminService.updateCommunity(7, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, { timeout: 2000 });
      // 본문을 따라갔다면 99번 커뮤니티를 고친다 — 남의 자원을 덮어쓰는 사고다.
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/99`, payload, { timeout: 2000 });
    });

    it('수정은 컬렉션 경로가 아니라 반드시 단건 경로로 나간다', async () => {
      // [2026-09-06 DEC-OPS-037] cmntyNm 은 서버 @NotBlank 라 생성 요청 계약에서 필수다 — 이름 없는 수정 본문은 런타임 계약 검증이 거부한다.
      const payload: CommunityPayload = { cmntyNm: '폐쇄할 커뮤니티', useYn: 'N' };

      await communityAdminService.updateCommunity(7, payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, undefined);
      // 경로 변수가 누락되면 컬렉션 전체를 대상으로 하는 요청이 된다.
      expect(client.put).not.toHaveBeenCalledWith(BASE, payload, undefined);
    });

    it('삭제(폐쇄)는 지정한 cmntySn 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await communityAdminService.deleteCommunity(7);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('삭제 시 config(timeout)도 그대로 전달되며 본문 인자는 존재하지 않는다', async () => {
      await communityAdminService.deleteCommunity(7, { timeout: 5000 });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7`, { timeout: 5000 });
      // DELETE 는 (url, config) 2인자다 — 사이에 body 가 끼면 config 가 body 자리로 밀린다.
      expect(client.delete.mock.calls[0]).toHaveLength(2);
    });
  });

  describe('포틀릿 조회', () => {
    it('포틀릿 목록은 고정 경로 /portlet 로 나가며 목록 경로와 겹치지 않는다', async () => {
      await communityAdminService.getCommunityPortlet();

      expect(client.get).toHaveBeenCalledWith(`${BASE}/portlet`, undefined);
      // 접두만 남으면 페이지 목록 엔드포인트를 때린다(응답 형태가 배열이 아니라 PageResponse 다).
      expect(client.get).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('포틀릿 조회도 config(signal)를 유실하지 않는다', async () => {
      const { signal } = new AbortController();

      await communityAdminService.getCommunityPortlet({ signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/portlet`, { signal });
    });

    it('포틀릿 응답도 배열 형태를 유지하며 공개 필드명으로 어댑트한다', async () => {
      const portlets = [
        { cmntySn: 7, cmntyNm: '개발자 커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' as const },
        { cmntySn: 8, cmntyNm: '디자인 커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' as const },
      ];
      client.get.mockResolvedValueOnce(portlets);

      await expect(communityAdminService.getCommunityPortlet()).resolves.toEqual(
        portlets.map((item) => ({ ...item, cmntyIntrcn: '소개', rgstrSeCd: undefined })),
      );
    });
  });

  describe('메서드 간 경로 격리', () => {
    it('조회 3종의 경로는 서로 겹치지 않는다 — 하나라도 겹치면 다른 자원을 조작하게 된다', async () => {
      await communityAdminService.getCommunityList();
      await communityAdminService.getCommunity(7);
      await communityAdminService.getCommunityPortlet();

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/content/community',
        'admin/content/community/7',
        'admin/content/community/portlet',
      ]);
    });

    it('목록 조회는 HTTP 동사를 넘나들지 않는다 — GET 1회만 발생한다', async () => {
      await communityAdminService.getCommunityList({ page: 0 });

      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.post).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
      expect(client.delete).not.toHaveBeenCalled();
    });
  });
});

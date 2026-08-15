/**
 * BannerAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/BannerAdminService.ts` 는 관리자 배너 화면
 * (`/admin/system/banner`)이 배너 자원에 접근하는 유일한 통로다. 메서드 본문이 한 줄씩이라
 * "테스트할 게 없다"고 보이지만, 아래 항목들은 **틀어져도 컴파일·타입 검사를 모두 통과한 채
 * 런타임에서만 조용히 깨진다** — 화면에는 "조회 실패" 토스트 한 줄만 뜬다.
 *
 * 1) URL 조합 — `AdminService('/banners', 'system')` 는 `ApiService` 에서 선행 슬래시가
 *    제거되고 `admin/{category}/` 접두가 붙어 최종 `admin/system/banners` 가 된다.
 *    이 서비스는 접두를 스스로 쓰지 않으므로, 접두 규칙이나 생성자 인자가 한 글자만 어긋나도
 *    전 메서드가 동시에 404 가 된다. 또 경로에 선행 슬래시가 붙으면 axios `baseURL` 의 경로
 *    세그먼트가 통째로 날아간다(절대 경로로 해석).
 *
 * 2) 페이징 파라미터 변환 — 화면은 `getBannerList({ page: bannerPage - 1, size: PAGE_SIZE })`
 *    처럼 **0-based page** 로 호출하고, `ApiService.get` 이 `page` → `pageIndex`(+1, 1-based),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 에 맞춘다. 이 +1 이
 *    사라지거나 두 번 적용되면 목록이 한 페이지씩 밀리거나 첫 페이지가 빈다. 값이 숫자인 것은
 *    변함이 없어 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 검색어 승격 — 목록은 `searchKeyword || searchWrd || ''` 를 `keyword` 로 승격해 보낸다.
 *    이 폴백 순서가 뒤집히면 레거시 화면(searchWrd)이나 신규 화면(searchKeyword) 중 한쪽의
 *    검색이 통째로 무력화된다.
 *
 * 4) 목록과 반영 배너의 **호출 규약 차이** — `getBannerList` 는 config 를 펼친 뒤 `params` 를
 *    합성해 넘기지만, `getReflectedBanners` 는 config 를 **가공 없이 그대로** 넘긴다.
 *    즉 반영 배너 조회에는 `keyword` 가 붙지 않는다. 이 둘을 "통일"하겠다며 손대면
 *    한쪽은 불필요한 파라미터를 흘리고 다른 쪽은 검색이 죽는다.
 *
 * 5) 경로 변수 치환 — `updateBanner`/`deleteBanner` 가 잘못된 `bnrSn` 으로 나가면
 *    **다른 배너를 고치거나 지운다.** 삭제는 되돌릴 수 없다. 인자로 받은 `bnrSn` 만이 경로를
 *    결정해야 하며, 요청 본문에 실린 `bnrSn` 은 경로에 영향을 주지 않아야 한다.
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal)가 유실되면
 *    화면 이탈 시 요청 취소가 동작하지 않고 타임아웃이 기본값으로 되돌아간다. 유실돼도
 *    요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * 7) 응답 무가공 전달 — 특히 `createBanner` 는 생성된 `bnrSn`(number)을 **스칼라 그대로**
 *    반환한다. 호출부가 이 값으로 후속 이동/파일 연결을 하므로, 재포장하거나 falsy 값을
 *    기본값으로 바꿔치면 조용히 엉뚱한 배너를 가리킨다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';
import type { Banner } from '@/types/foundation/banner';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { bannerAdminService } from '../BannerAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/banners', 'system')` → `admin/` + `system/` + `banners` = `admin/system/banners`
 * (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 */
const BASE = 'admin/system/banners';

describe('BannerAdminService — 배너 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('배너 목록 조회(getBannerList)', () => {
    it('목록은 admin/system/banners 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await bannerAdminService.getBannerList();

      // params 를 안 넘겨도 keyword 는 빈 문자열로 항상 채워져 나간다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: { keyword: '' } });
    });

    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await bannerAdminService.getBannerList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, keyword: '', pageIndex: 1 },
      });
    });

    it('page 1·size 10 은 pageIndex 2·recordCountPerPage 10 이 되고 원본 키도 함께 남는다', async () => {
      // 화면(BannerAdminClient)은 `page: bannerPage - 1` 로 0-based 를 넘긴다.
      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      await bannerAdminService.getBannerList({ page: 1, size: 10 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 1, size: 10, keyword: '', pageIndex: 2, recordCountPerPage: 10 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      await bannerAdminService.getBannerList({ page: 9, pageIndex: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 1, keyword: '' },
      });
    });

    it('pageSize 는 recordCountPerPage 와 size 양쪽으로 확장된다 — 공통 DTO 호환 축이다', async () => {
      await bannerAdminService.getBannerList({ pageSize: 15 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 15, keyword: '', recordCountPerPage: 15, size: 15 },
      });
    });

    it('searchKeyword 는 keyword 로 승격되어 백엔드 @RequestParam 에 도달한다', async () => {
      await bannerAdminService.getBannerList({ searchKeyword: '메인배너' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '메인배너', keyword: '메인배너' },
      });
    });

    it('searchKeyword 가 없으면 레거시 키 searchWrd 를 폴백으로 승격한다', async () => {
      await bannerAdminService.getBannerList({ searchWrd: '레거시검색' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchWrd: '레거시검색', keyword: '레거시검색' },
      });
    });

    it('두 검색 키가 함께 오면 searchKeyword 가 searchWrd 보다 우선한다', async () => {
      await bannerAdminService.getBannerList({ searchKeyword: '우선', searchWrd: '후순위' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '우선', searchWrd: '후순위', keyword: '우선' },
      });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await bannerAdminService.getBannerList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0, keyword: '', pageIndex: 1 },
      });
    });

    it('호출부가 넘긴 params 객체는 변형되지 않는다 — 재사용 시 pageIndex 가 누적 오염되면 안 된다', async () => {
      // ApiService.get 은 넘겨받은 params 객체에 직접 pageIndex 를 써넣는다(파괴적).
      // 서비스가 스프레드로 사본을 만들기 때문에 호출부(React Query key 등)의 객체는 무사하다.
      const callerParams: SearchParams = { page: 1, size: 10 };

      await bannerAdminService.getBannerList(callerParams);

      expect(callerParams).toEqual({ page: 1, size: 10 });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<Banner> = {
        list: [
          {
            bnrSn: 7,
            bnrNm: '메인 상단 배너',
            linkUrl: 'https://example.gov/notice',
            bnrImgNm: 'main-top.png',
            bnrExpln: '공지 연결 배너',
            sortOrdr: 1,
            rfltYn: 'Y',
            atchFileSn: 4321,
            crtDt: '2026-08-01T09:00:00',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(bannerAdminService.getBannerList()).resolves.toBe(page);
    });
  });

  describe('반영 배너 조회(getReflectedBanners)', () => {
    it('반영 배너는 고정 경로 /reflected 로 조회하며 config 를 가공 없이 그대로 넘긴다', async () => {
      await bannerAdminService.getReflectedBanners();

      expect(client.get).toHaveBeenCalledWith(`${BASE}/reflected`, undefined);
    });

    it('반영 배너 조회에는 목록과 달리 keyword 파라미터가 붙지 않는다 — 두 메서드의 규약이 다르다', async () => {
      await bannerAdminService.getReflectedBanners();

      // 목록 규약(params.keyword 합성)을 여기까지 확장하면 백엔드에 없는 파라미터를 흘린다.
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/reflected`, { params: { keyword: '' } });
    });

    it('반영 배너 경로는 /reflected 세그먼트를 잃지 않는다 — 컬렉션 루트로 떨어지면 목록이 온다', async () => {
      await bannerAdminService.getReflectedBanners();

      expect(client.get).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('반영 배너 조회에서도 config(timeout·signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await bannerAdminService.getReflectedBanners({ timeout: 1500, signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/reflected`, { timeout: 1500, signal });
    });

    it('반영 배너 응답은 배열 그대로 반환된다 — 정렬·필터를 서비스가 다시 하지 않는다', async () => {
      const banners: Banner[] = [
        {
          bnrSn: 7,
          bnrNm: '메인 상단 배너',
          linkUrl: 'https://example.gov/notice',
          bnrImgNm: 'main-top.png',
          sortOrdr: 2,
          rfltYn: 'Y',
        },
        {
          bnrSn: 8,
          bnrNm: '메인 하단 배너',
          linkUrl: 'https://example.gov/event',
          bnrImgNm: 'main-bottom.png',
          sortOrdr: 1,
          rfltYn: 'Y',
        },
      ];
      client.get.mockResolvedValueOnce(banners);

      await expect(bannerAdminService.getReflectedBanners()).resolves.toBe(banners);
    });
  });

  describe('배너 상세 조회·등록', () => {
    it('상세 조회는 bnrSn 을 경로 변수로 붙이고 config 를 그대로 넘긴다', async () => {
      await bannerAdminService.getBanner(7, { timeout: 1000 });

      // 단건 조회는 params 가 없으므로 페이징 정규화가 개입하지 않는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await bannerAdminService.getBanner(7);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, undefined);
    });

    it('배너 등록은 컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      const payload: Partial<Banner> = {
        bnrNm: '신규 배너',
        linkUrl: 'https://example.gov/new',
        bnrImgNm: 'new.png',
        sortOrdr: 3,
        rfltYn: 'N',
      };

      await bannerAdminService.createBanner(payload, { timeout: 5000 });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { timeout: 5000 });
      // 상세 경로로 POST 하면 백엔드 라우팅이 성립하지 않는다.
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/3`, payload, { timeout: 5000 });
    });

    it('배너 등록은 생성된 bnrSn(number)을 재포장 없이 그대로 반환한다', async () => {
      // 호출부가 이 값으로 첨부파일 연결·상세 이동을 하므로 스칼라가 그대로 와야 한다.
      client.post.mockResolvedValueOnce(4242);

      await expect(bannerAdminService.createBanner({ bnrNm: '신규 배너' })).resolves.toBe(4242);
    });
  });

  describe('배너 수정·삭제 — 경로 변수 치환', () => {
    it('배너 수정은 인자로 받은 bnrSn 이 경로를 결정한다 — 본문의 bnrSn 이 아니다', async () => {
      // 본문에 다른 bnrSn(99)을 심어 두고, 경로는 인자(7)만 따르는지 확인한다.
      const payload: Partial<Banner> = { bnrSn: 99, bnrNm: '이름만 수정' };

      await bannerAdminService.updateBanner(7, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/99`, payload, { timeout: 2000 });
    });

    it('배너 수정은 본문을 손대지 않고 그대로 전달한다 — rfltYn 같은 플래그가 유실되면 노출이 뒤집힌다', async () => {
      const payload: Partial<Banner> = { rfltYn: 'N', sortOrdr: 5 };

      await bannerAdminService.updateBanner(7, payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, undefined);
    });

    it('배너 삭제는 지정한 bnrSn 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await bannerAdminService.deleteBanner(7);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      // 경로 변수가 비면 컬렉션 전체 삭제로 나간다 — 되돌릴 수 없는 사고다.
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('배너 삭제 시에도 config(signal)가 보존된다', async () => {
      const { signal } = new AbortController();

      await bannerAdminService.deleteBanner(7, { signal });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/7`, { signal });
    });
  });

  describe('경로 격리', () => {
    it('조회 3종(목록·반영·상세)의 경로는 서로 겹치지 않는다', async () => {
      await bannerAdminService.getBannerList();
      await bannerAdminService.getReflectedBanners();
      await bannerAdminService.getBanner(7);

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/banners',
        'admin/system/banners/reflected',
        'admin/system/banners/7',
      ]);
    });

    it('모든 요청 경로는 admin/system/banners 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL 의 경로 세그먼트가 통째로 날아간다(절대 경로로 해석).
      await bannerAdminService.getBannerList();
      await bannerAdminService.getReflectedBanners();
      await bannerAdminService.getBanner(7);
      await bannerAdminService.createBanner({ bnrNm: '신규 배너' });
      await bannerAdminService.updateBanner(7, { bnrNm: '이름만 수정' });
      await bannerAdminService.deleteBanner(7);

      const paths = [client.get, client.post, client.put, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(6);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });
  });
});

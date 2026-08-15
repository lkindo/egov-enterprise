/**
 * PopupAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/PopupAdminService.ts` 는 관리자 배너/팝업 화면
 * (`/admin/system/banner`)이 팝업 자원에 접근하는 통로다. 팝업은 **공개 첫 화면(`/`)에 모달로
 * 떠오르는 자산**이라, 이 서비스가 엉뚱한 경로·엉뚱한 popupSn 으로 나가면 그 피해가 관리자
 * 화면이 아니라 일반 사용자 화면에 나타난다. 메서드 본문이 한 줄씩이라 "테스트할 게 없다"고
 * 보이지만, 아래 항목들은 **틀어져도 컴파일·타입 검사를 모두 통과한 채 런타임에서만 조용히
 * 깨진다** — 화면에는 "조회 실패" 토스트 한 줄만 뜨거나, 아예 아무 신호도 없다.
 *
 * 1) URL 조합 — `AdminService('/popups', 'system')` 는 `ApiService` 생성자에서 선행 슬래시가
 *    제거되고 `admin/{category}/` 접두가 붙어 최종 `admin/system/popups` 가 된다. 백엔드
 *    `PopupApiController` 의 `@RequestMapping("/api/v1/admin/system/popups")` 와 맞물리는
 *    지점이며, 접두가 한 글자만 어긋나도 5개 메서드가 동시에 404 가 된다. 경로에 선행
 *    슬래시가 되살아나면 axios `baseURL`('/api/v1') 의 경로 세그먼트가 통째로 날아간다
 *    (절대 경로로 해석). 이 서비스는 접두를 스스로 쓰지 않고 전적으로 생성자 인자에 의존한다.
 *
 * 2) 페이징 파라미터 변환 — 화면은 `getPopupList({ page: popupPage - 1, size: PAGE_SIZE })`
 *    처럼 **0-based page** 로 호출하고(BannerAdminClient), SSR 진입점(page.tsx)도
 *    `{ page: 0, size: 20 }` 으로 부른다. `ApiService.get` 이 `page` → `pageIndex`(+1, 1-based),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 에 맞춘다. 이 +1 이
 *    사라지거나 두 번 적용되면 목록이 한 페이지씩 밀리거나 첫 페이지가 통째로 빈다. 값이
 *    숫자인 것은 변함이 없으므로 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 검색어 축 — 이 서비스는 **형제인 `BannerAdminService` 와 달리** `searchKeyword`/`searchWrd`
 *    를 `keyword` 로 승격하지 **않고**, 받은 params 를 그대로 흘린다. 같은 화면(배너/팝업 탭)에
 *    나란히 놓인 두 서비스라 "통일하자"는 손질이 들어오기 쉬운 자리다. 승격 로직이 이식되면
 *    호출부가 보내지도 않은 `keyword` 가 매 요청에 동승해 서버 바인딩이 흔들린다.
 *
 * 4) params 인자와 config.params 의 우선순위 — 목록만 `this.get('', { ...config, params })` 로
 *    **config 를 먼저 펼치고 params 를 나중에 덮는다.** spread 순서가 뒤집히면 호출부가 config
 *    안에 남겨 둔 낡은 params 가 이겨서, 화면이 요청한 페이지와 다른 페이지가 조회된다.
 *
 * 5) 경로 변수 치환 — `updatePopup`/`deletePopup` 은 **인자 `popupSn` 만이** 경로를 결정한다.
 *    본문에 실린 `popupSn` 을 따라가도록 바뀌면 **다른 팝업을 고치거나 지운다.** 삭제는
 *    되돌릴 수 없고, 공개 화면에서 팝업이 사라지는 형태로만 드러난다.
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal·Authorization 헤더)가
 *    유실되면 화면 이탈 시 요청 취소가 동작하지 않고, SSR 서버 컴포넌트(page.tsx)가 쿠키에서
 *    뽑아 실어 준 Bearer 토큰이 빠져 401 이 된다. 브라우저 경로에서는 인터셉터가 토큰을 다시
 *    붙여 주므로 **SSR 에서만** 깨진다 — 로컬에서 아무도 눈치채지 못하는 종류의 회귀다.
 *
 * 7) 응답 무가공 전달 — `createPopup` 은 서버가 채번한 `popupSn`(number)을 **스칼라 그대로**
 *    반환한다. 재포장하거나 기본값으로 바꿔치면 후속 처리가 조용히 엉뚱한 팝업을 가리킨다.
 *    목록/상세도 마찬가지로 재포장 없이 그대로 넘겨야 `res.list` 를 읽는 호출부가 산다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse } from '@/types/foundation/system';
import type { Popup } from '@/types/foundation/banner';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { popupAdminService } from '../PopupAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * 소스 확인값: `super('/popups', 'system')` → AdminService 가 `admin/` + `system/` + `popups`
 * 로 합성 → `admin/system/popups` (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 */
const BASE = 'admin/system/popups';

/** 응답 픽스처용 팝업 1건 (Popup 인터페이스 필수 필드 전량). */
const popupFixture = (popupSn: number, popupTtlNm: string): Popup => ({
  popupSn,
  popupTtlNm,
  fileUrl: `/files/popup-${popupSn}.png`,
  popupWdthPstn: '100',
  popupVrtcPstn: '120',
  popupWdthSz: '400',
  popupVrtcSz: '300',
  ntceBgnde: '2026-08-01',
  ntceEndde: '2026-08-31',
  stopvewSetupYn: 'Y',
  ntceYn: 'Y',
});

describe('PopupAdminService — 팝업 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('팝업 목록 조회 (getPopupList)', () => {
    it('목록은 admin/system/popups 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await popupAdminService.getPopupList();

      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: undefined });
    });

    it('params 를 생략하면 params: undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      // 빈 객체({})로 바꾸면 axios 가 `?` 만 붙은 URL 을 만들 수 있고, 무엇보다
      // 페이징 정규화 분기(config?.params 가 truthy 일 때만 동작)의 전제가 달라진다.
      await popupAdminService.getPopupList(undefined);

      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: {} });
    });

    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await popupAdminService.getPopupList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('page 3·size 20 은 pageIndex 4·recordCountPerPage 20 이 되고 원본 키도 함께 남는다', async () => {
      await popupAdminService.getPopupList({ page: 3, size: 20 });

      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 3, size: 20, pageIndex: 4, recordCountPerPage: 20 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // page 9 였다면 변환 결과는 pageIndex 10 이겠지만, 명시값 1 이 그대로 유지돼야 한다.
      await popupAdminService.getPopupList({ page: 9, pageIndex: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 1 },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 10 },
      });
    });

    it('pageSize 만 오면 recordCountPerPage 와 size 를 함께 채운다 (Common DTO 호환 축)', async () => {
      await popupAdminService.getPopupList({ pageSize: 25 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 25, recordCountPerPage: 25, size: 25 },
      });
    });

    it('SSR 진입점의 { page: 0, size: 20 } + Authorization 헤더가 온전히 전달된다', async () => {
      // page.tsx 가 쿠키의 accessToken 을 Bearer 로 실어 보내는 형태 그대로다.
      // 헤더가 유실되면 SSR 초기 데이터만 401 이 되어 첫 페인트가 비고, 브라우저 재조회로
      // 화면은 결국 채워지므로 아무도 원인을 눈치채지 못한다.
      const headers = { Authorization: 'Bearer test-token' };

      await popupAdminService.getPopupList({ page: 0, size: 20 }, { headers });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        headers,
        params: { page: 0, size: 20, pageIndex: 1, recordCountPerPage: 20 },
      });
    });

    it('화면 2페이지(popupPage 2 → page 1)는 pageIndex 2 로 나간다', async () => {
      // BannerAdminClient 는 1-based UI 페이지를 `page: popupPage - 1` 로 0-based 변환해 넘기고,
      // 서비스단이 다시 +1 해 1-based pageIndex 를 만든다. 즉 UI 2페이지 → page 1 → pageIndex 2.
      await popupAdminService.getPopupList({ page: 1, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 1, size: 20, pageIndex: 2, recordCountPerPage: 20 },
      });
      // +1 이 사라지면 pageIndex 1(=첫 페이지)이 되어 2페이지에서도 1페이지가 보인다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 1, size: 20, pageIndex: 1, recordCountPerPage: 20 },
      });
    });

    it('searchKeyword 를 keyword 로 승격하지 않는다 — 형제 BannerAdminService 와 다른 지점이다', async () => {
      // BannerAdminService.getBannerList 는 `keyword: searchKeyword || searchWrd || ''` 를
      // 항상 덧붙이지만, 팝업 목록은 params 를 가공 없이 흘린다. 같은 화면의 두 탭이라
      // "통일" 명목의 손질이 들어오기 쉬우므로 차이 자체를 고정한다.
      await popupAdminService.getPopupList({ searchKeyword: '공지' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '공지' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '공지', keyword: '공지' },
      });
    });

    it('keyword 는 가공 없이 그대로 실린다 — 빈 문자열 기본값을 끼워 넣지 않는다', async () => {
      await popupAdminService.getPopupList({ keyword: '점검' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { keyword: '점검' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { keyword: '점검', searchKeyword: '점검' },
      });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await popupAdminService.getPopupList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('params 인자가 config.params 를 덮는다 — spread 순서가 뒤집히면 낡은 페이지가 조회된다', async () => {
      // `{ ...config, params }` 라서 나중에 오는 params 인자가 항상 이긴다.
      // config 쪽 값(ntceYn)은 살아남지 못하고, config 의 다른 키(timeout)는 그대로 유지된다.
      await popupAdminService.getPopupList({ page: 0 }, { params: { ntceYn: 'N' }, timeout: 1000 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 1000,
        params: { page: 0, pageIndex: 1 },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        timeout: 1000,
        params: { ntceYn: 'N' },
      });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      // 호출부(page.tsx / BannerAdminClient)가 `res.list`·`res.total` 을 직접 읽는다.
      const page: PageResponse<Popup> = {
        list: [popupFixture(1, '시스템 점검 안내'), popupFixture(2, '개인정보 처리방침 개정')],
        total: 2,
        page: 1,
        size: 20,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(popupAdminService.getPopupList()).resolves.toBe(page);
    });

    it('목록 조회 실패는 삼키지 않고 그대로 전파한다 — 화면이 0건으로 굳으면 안 된다', async () => {
      // 실패를 빈 배열로 바꿔치면 "팝업 0건"이 정상 상태처럼 보이고 재시도 UI 가 뜨지 않는다.
      const failure = new Error('Network Error');
      client.get.mockRejectedValueOnce(failure);

      await expect(popupAdminService.getPopupList({ page: 0 })).rejects.toBe(failure);
    });
  });

  describe('팝업 상세 조회 (getPopup)', () => {
    it('popupSn 이 경로 변수로 붙고 config 는 그대로 전달된다', async () => {
      await popupAdminService.getPopup(7, { timeout: 1000 });

      // 상세 조회는 params 가 없으므로 페이징 정규화가 개입하지 않는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, { timeout: 1000 });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/8`, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await popupAdminService.getPopup(7);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/7`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/7`, {});
    });

    it('상세 응답은 무가공으로 반환된다', async () => {
      const popup = popupFixture(7, '추석 연휴 고객센터 운영 안내');
      client.get.mockResolvedValueOnce(popup);

      await expect(popupAdminService.getPopup(7)).resolves.toBe(popup);
    });
  });

  describe('팝업 등록 (createPopup)', () => {
    it('컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      const payload: Partial<Popup> = {
        popupTtlNm: '신규 팝업',
        fileUrl: '/files/popup-new.png',
        popupWdthSz: '400',
        popupVrtcSz: '300',
        ntceYn: 'Y',
      };

      await popupAdminService.createPopup(payload);

      // popupSn 은 서버가 채번하므로 본문에 없어도 되고, 경로에도 붙지 않는다.
      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, payload, undefined);
    });

    it('등록 시 config(timeout)가 유실되지 않는다', async () => {
      const payload: Partial<Popup> = { popupTtlNm: '신규 팝업' };

      await popupAdminService.createPopup(payload, { timeout: 5000 });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { timeout: 5000 });
    });

    it('서버가 채번한 popupSn(number)을 스칼라 그대로 반환한다', async () => {
      // 재포장하거나 기본값으로 바꿔치면 후속 처리가 엉뚱한 팝업을 가리킨다.
      client.post.mockResolvedValueOnce(31);

      await expect(popupAdminService.createPopup({ popupTtlNm: '신규 팝업' })).resolves.toBe(31);
    });
  });

  describe('팝업 수정 (updatePopup)', () => {
    it('인자로 받은 popupSn 이 경로를 결정한다 — 본문의 popupSn 이 아니다', async () => {
      // 본문에 다른 popupSn(99)을 심어 두고, 경로는 인자(7)만 따르는지 확인한다.
      // 본문을 따라가도록 바뀌면 화면에서 고른 팝업이 아닌 엉뚱한 팝업이 수정된다.
      const payload: Partial<Popup> = { popupSn: 99, popupTtlNm: '제목만 수정' };

      await popupAdminService.updatePopup(7, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/99`, payload, { timeout: 2000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다', async () => {
      const payload: Partial<Popup> = { popupTtlNm: '제목만 수정' };

      await popupAdminService.updatePopup(7, payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/7`, payload, undefined);
    });

    it('수정은 PUT 단독이다 — POST(등록)나 DELETE 로 새지 않는다', async () => {
      await popupAdminService.updatePopup(7, { popupTtlNm: '제목만 수정' });

      expect(client.put).toHaveBeenCalledTimes(1);
      expect(client.post).not.toHaveBeenCalled();
      expect(client.delete).not.toHaveBeenCalled();
    });
  });

  describe('팝업 삭제 (deletePopup)', () => {
    it('지정한 popupSn 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await popupAdminService.deletePopup(9);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/9`, undefined);
      // 경로 변수가 빠지면 컬렉션 경로로 나가 전량 삭제 요청이 된다 — 되돌릴 수 없다.
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('삭제 시 config(signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await popupAdminService.deletePopup(9, { signal });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/9`, { signal });
    });

    it('클라이언트는 삭제 가능 여부를 자체 판단하지 않는다 — 서버 오류를 그대로 전파한다', async () => {
      // 이를 삼키면 화면이 성공으로 오인해 목록을 갱신하고, 지워지지 않은 팝업이 계속 뜬다.
      const failure = new Error('삭제할 수 없는 팝업입니다');
      client.delete.mockRejectedValueOnce(failure);

      await expect(popupAdminService.deletePopup(9)).rejects.toBe(failure);
    });
  });

  describe('경로 격리', () => {
    it('조회 2종의 경로는 서로 겹치지 않는다 — 상세가 목록 경로로 흡수되면 전량 조회가 된다', async () => {
      await popupAdminService.getPopupList({ page: 0 });
      await popupAdminService.getPopup(7);

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/popups',
        'admin/system/popups/7',
      ]);
    });

    it('쓰기 3종은 HTTP 메서드와 경로가 각각 하나씩만 대응된다', async () => {
      await popupAdminService.createPopup({ popupTtlNm: '신규 팝업' });
      await popupAdminService.updatePopup(7, { popupTtlNm: '제목만 수정' });
      await popupAdminService.deletePopup(9);

      expect(client.post.mock.calls.map((call) => call[0])).toEqual(['admin/system/popups']);
      expect(client.put.mock.calls.map((call) => call[0])).toEqual(['admin/system/popups/7']);
      expect(client.delete.mock.calls.map((call) => call[0])).toEqual(['admin/system/popups/9']);
    });

    it('모든 요청 경로는 admin/system/popups 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로 해석).
      await popupAdminService.getPopupList({ page: 0, size: 20 });
      await popupAdminService.getPopup(7);
      await popupAdminService.createPopup({ popupTtlNm: '신규 팝업' });
      await popupAdminService.updatePopup(7, { popupTtlNm: '제목만 수정' });
      await popupAdminService.deletePopup(9);

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
});

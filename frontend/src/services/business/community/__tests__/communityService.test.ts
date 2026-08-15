/**
 * communityService 계약 테스트 (contract test)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 이 테스트가 필요한가]
 *
 * `src/services/business/community/communityService.ts` 는 이 파일이 생기기 전까지
 * **커버리지 0%** 였다. 한 줄도 실행된 적이 없다는 뜻이고, 곧 아래의 조용한 파손을
 * 아무것도 막아 주지 못했다는 뜻이다.
 *
 * 이 서비스는 `ApiService`(core)를 상속하며, 실제로 나가는 URL 과 파라미터는
 * **여기 소스에 적혀 있지 않다**. 생성자 인자 `'/communities'` 가 `ApiService` 에서
 * 선행 슬래시가 제거되어 `basePath = 'communities'` 가 되고, `this.get('')` 은
 * `client.get('communities', config)` 로 조합된다. 즉 **호출부에서 눈으로 확인할 수 없는
 * 조합 규칙**이 계약의 실체다. 이런 코드는 틀어져도 컴파일이 통과한다.
 *
 * 여기서 조용히 틀어질 수 있는 것들:
 *
 *  1. **URL 경로 조합** — `'/communities'` 의 오타나 `AdminService` 로의 상속 변경 하나면
 *     `communities` → `admin/system/communities` 가 되어 전부 404 다. 그런데 화면에는
 *     "조회 실패" 한 줄만 뜨고 타입 에러도, 빌드 에러도 없다.
 *
 *  2. **페이징 파라미터 변환** — `ApiService.get()` 이 프런트의 0-based `page` 를 백엔드
 *     `BaseSearchDto` 의 1-based `pageIndex` 로 **암묵 변환**한다(`page + 1`). 이 변환이
 *     뒤집히거나 사라지면 첫 페이지가 통째로 비거나 목록이 한 페이지씩 밀린다 —
 *     에러는 안 나고 데이터만 틀린, 가장 발견이 늦는 종류의 버그다. 또한 변환 후에도
 *     원본 `page`·`size` 를 **지우지 않는 것**이 계약이다(Spring Data Pageable 병행 지원).
 *     누군가 "중복이니 정리하자"며 지우면 Pageable 을 쓰는 엔드포인트가 죽는다.
 *
 *  3. **경로 변수 치환** — `updateCommunity`/`deleteCommunity` 가 잘못된 `cmntySn` 으로
 *     나가면 **다른 커뮤니티를 수정하거나 삭제한다**. 되돌릴 수 없는 파손이며, 인자 순서가
 *     바뀌어도 둘 다 숫자·객체라 타입 검사에 걸리지 않는다.
 *
 *  4. **요청 본문** — post/put 에 실리는 payload 가 재가공·필드 누락 없이 그대로 나가는가.
 *
 *  5. **config 전달** — 이 서비스의 공개 메서드들은 의도적으로 `AxiosRequestConfig` 를
 *     노출하지 않는다(= 항상 `undefined` 가 넘어간다). 그 사실 자체를 고정해 두어야,
 *     나중에 timeout/signal 같은 config 를 실어야 할 때 "이미 되는 줄 알았다"는 오해가 없다.
 *
 *  6. **바인딩된 named export** — 파일 하단의 `export const getCommunityList = ....bind(...)`
 *     에서 `.bind()` 가 빠지면 호출 시 `this` 가 유실되어 런타임에 터진다. 정적 검사로는
 *     절대 잡히지 않는다.
 *
 * ⚠ 대상 서비스 소스는 수정하지 않는다. 이 테스트는 **현재 동작을 기술(describe)** 하며,
 *   위 항목이 바뀌면 의도적 변경이든 사고든 반드시 red 로 드러나게 하는 것이 목적이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunitySearchParams, CommunityVO } from '@/types/business/community';
import type { PageResponse } from '@/types/foundation/system';

// `@/lib/api/client` 는 axios 인스턴스와 401 재발급 인터셉터를 들고 있어 단위 테스트에서
// 실제로 적재하면 안 된다. vi.hoisted 로 mock 객체를 먼저 만들어 vi.mock 팩토리와 테스트 본문이
// **같은 참조**를 보게 한다(저장소 기존 관례: services/foundation/operation/__tests__/eventService.test.ts).
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  communityService,
  getCommunityList,
  getCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity,
} from '../communityService';

/** 기대 URL 상수 — 조합 결과를 문자열로 못 박아, 상속 경로가 바뀌면 즉시 red 가 되게 한다. */
// CommunityService 는 AdminService 가 아니라 ApiService 를 직접 상속하고 super('/communities') 를
// 넘긴다. 따라서 최종 경로는 'communities' 이며 'admin/system/' 접두가 붙지 않는다
// (백엔드 CommunityApiController = /api/v1/communities). 위 파일 주석이 경고하는 그 회귀다.
const 목록_URL = 'communities';

describe('communityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('URL 경로 조합', () => {
    it('목록 조회는 관리자 도메인 접두 없이 정확히 "communities" 를 호출한다', async () => {
      await communityService.getCommunityList();

      // 선행 슬래시가 제거된 상대 경로여야 한다. 'admin/system/communities' 나 '/communities' 가
      // 되면 이 단언이 깨진다 — 실서비스에서는 404 로만 나타날 파손이다.
      expect(client.get).toHaveBeenCalledWith(목록_URL, { params: {} });
    });

    it('상세 조회는 커뮤니티 일련번호를 경로 변수로 이어붙여 "communities/{cmntySn}" 을 호출한다', async () => {
      await communityService.getCommunity(4242);

      expect(client.get).toHaveBeenCalledWith('communities/4242', undefined);
    });

    it('경로에 슬래시가 중복되거나 누락되지 않는다', async () => {
      await communityService.getCommunity(7);

      const [실제URL] = client.get.mock.calls[0];
      expect(실제URL).toBe('communities/7');
      expect(실제URL).not.toContain('//');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('페이징 파라미터 변환 (ApiService 암묵 규칙)', () => {
    it('0-based page 를 1-based pageIndex 로 변환하되 원본 page 를 지우지 않는다', async () => {
      await communityService.getCommunityList({ page: 1 });

      // page 1 -> pageIndex 2. 이 +1 이 사라지거나 뒤집히면 목록이 한 페이지씩 밀린다.
      // page 를 삭제하지 않는 것도 계약이다(Spring Data Pageable 병행 지원).
      expect(client.get).toHaveBeenCalledWith(목록_URL, {
        params: { page: 1, pageIndex: 2 },
      });
    });

    it('첫 페이지(page=0)는 pageIndex=1 로 변환되어 빈 목록이 되지 않는다', async () => {
      await communityService.getCommunityList({ page: 0 });

      // page=0 을 falsy 로 흘려보내면 pageIndex 가 누락되어 첫 화면이 비는 전형적 오프바이원이다.
      expect(client.get).toHaveBeenCalledWith(목록_URL, {
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 로 덮어쓰지 않는다', async () => {
      await communityService.getCommunityList({ page: 5, pageIndex: 3 });

      expect(client.get).toHaveBeenCalledWith(목록_URL, {
        params: { page: 5, pageIndex: 3 },
      });
    });

    it('size 를 recordCountPerPage 로 복사하되 size 자체는 유지한다', async () => {
      await communityService.getCommunityList({ page: 0, size: 10 });

      expect(client.get).toHaveBeenCalledWith(목록_URL, {
        params: { page: 0, size: 10, pageIndex: 1, recordCountPerPage: 10 },
      });
    });

    it('pageSize 는 recordCountPerPage 와 size 양쪽으로 확장된다', async () => {
      await communityService.getCommunityList({ pageSize: 20 });

      expect(client.get).toHaveBeenCalledWith(목록_URL, {
        params: { pageSize: 20, recordCountPerPage: 20, size: 20 },
      });
    });

    it('검색 조건·검색어는 가공 없이 원형 그대로 전달된다', async () => {
      const 검색조건: CommunitySearchParams = {
        page: 2,
        size: 15,
        searchCondition: 'cmntyNm',
        searchKeyword: '개발 & 운영',
        useYn: 'Y',
      };

      await communityService.getCommunityList(검색조건);

      // 검색어를 서비스 계층에서 임의로 인코딩/트림하면 이중 인코딩이나 검색 누락이 된다.
      expect(client.get).toHaveBeenCalledWith(목록_URL, {
        params: {
          page: 2,
          size: 15,
          pageIndex: 3,
          recordCountPerPage: 15,
          searchCondition: 'cmntyNm',
          searchKeyword: '개발 & 운영',
          useYn: 'Y',
        },
      });
    });

    it('인자 없이 호출하면 빈 params 객체를 보내며 페이징 키를 임의로 만들어내지 않는다', async () => {
      await communityService.getCommunityList();

      const [, 실제config] = client.get.mock.calls[0];
      expect(실제config).toEqual({ params: {} });
      expect(Object.keys(실제config.params)).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('경로 변수 치환 — 다른 자원 오염 방지', () => {
    it('수정과 삭제가 서로 다른 일련번호를 각자의 경로로 정확히 실어 보낸다', async () => {
      await communityService.updateCommunity(11, { cmntyNm: '수정 대상' });
      await communityService.deleteCommunity(22);

      // 인자 순서가 바뀌거나 id 가 교차되면 "다른 커뮤니티를 수정/삭제"하는 되돌릴 수 없는 사고가 된다.
      expect(client.put).toHaveBeenCalledWith('communities/11', { cmntyNm: '수정 대상' }, undefined);
      expect(client.delete).toHaveBeenCalledWith('communities/22', undefined);
      // 교차 차단 — 수정이 삭제 대상 경로로, 삭제가 수정 대상 경로로 나가지 않았다.
      expect(client.put).not.toHaveBeenCalledWith('communities/22', expect.anything(), undefined);
      expect(client.delete).not.toHaveBeenCalledWith('communities/11', undefined);
    });

    it('일련번호는 문자열 변환 시 부호·자릿수가 보존된다', async () => {
      await communityService.getCommunity(9007199254740991);

      expect(client.get).toHaveBeenCalledWith('communities/9007199254740991', undefined);
    });

    it('등록은 경로 변수 없이 컬렉션 URL 로 나간다', async () => {
      await communityService.createCommunity({ cmntyNm: '신규' });

      expect(client.post).toHaveBeenCalledWith(목록_URL, { cmntyNm: '신규' }, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('요청 본문 (payload)', () => {
    const 신규커뮤니티: Partial<CommunityVO> = {
      cmntyNm: '개발자 커뮤니티',
      cmntyIntroCn: '사내 개발자 정보 공유 공간',
      useYn: 'Y',
      tmpltId: 'TMPL_001',
    };

    it('등록 본문은 필드 누락이나 추가 없이 그대로 전송된다', async () => {
      await communityService.createCommunity(신규커뮤니티);

      expect(client.post).toHaveBeenCalledWith(목록_URL, 신규커뮤니티, undefined);
      // 서비스 계층에서 사본을 만들어 필드를 골라 담지 않는다(= 새 필드 추가 시 조용히 유실되지 않는다).
      expect(client.post.mock.calls[0][1]).toBe(신규커뮤니티);
    });

    it('수정 본문은 부분 갱신 형태 그대로 전송된다', async () => {
      const 부분수정: Partial<CommunityVO> = { useYn: 'N' };

      await communityService.updateCommunity(3, 부분수정);

      expect(client.put).toHaveBeenCalledWith('communities/3', 부분수정, undefined);
      expect(client.put.mock.calls[0][1]).toBe(부분수정);
    });

    it('삭제는 본문을 싣지 않는다 (두 번째 인자는 config 자리이며 undefined 다)', async () => {
      await communityService.deleteCommunity(5);

      expect(client.delete).toHaveBeenCalledWith('communities/5', undefined);
      expect(client.delete.mock.calls[0]).toHaveLength(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('AxiosRequestConfig 노출 범위', () => {
    it('현재 공개 메서드들은 호출부 config 를 받지 않으므로 항상 undefined 가 전달된다', async () => {
      await communityService.getCommunity(1);
      await communityService.createCommunity({ cmntyNm: 'x' });
      await communityService.updateCommunity(1, { cmntyNm: 'x' });
      await communityService.deleteCommunity(1);

      // timeout·signal 등을 실을 수 있다고 오해하지 않도록 "아직 통로가 없다"는 사실을 고정한다.
      // 나중에 config 인자를 뚫는 변경을 하면 이 테스트가 red 가 되어 의도적 확장임을 드러낸다.
      expect(client.get.mock.calls[0][1]).toBeUndefined();
      expect(client.post.mock.calls[0][2]).toBeUndefined();
      expect(client.put.mock.calls[0][2]).toBeUndefined();
      expect(client.delete.mock.calls[0][1]).toBeUndefined();
    });

    it('목록 조회만 params 를 담은 config 를 만들어 전달한다', async () => {
      await communityService.getCommunityList({ page: 0 });

      const [, 실제config] = client.get.mock.calls[0];
      expect(실제config).toHaveProperty('params');
      // params 외의 축(headers·timeout 등)을 서비스가 임의로 주입하지 않는다.
      expect(Object.keys(실제config)).toEqual(['params']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('응답 전달', () => {
    it('목록 응답을 재가공 없이 그대로 반환한다', async () => {
      const 페이지응답: PageResponse<CommunityVO> = {
        list: [{ cmntySn: 1, cmntyNm: '개발자 커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' }],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(페이지응답);

      await expect(communityService.getCommunityList({ page: 0 })).resolves.toBe(페이지응답);
    });

    it('상세 응답을 재가공 없이 그대로 반환한다', async () => {
      const 상세: CommunityVO = { cmntySn: 9, cmntyNm: '운영팀', cmntyIntroCn: '소개', useYn: 'Y' };
      client.get.mockResolvedValueOnce(상세);

      await expect(communityService.getCommunity(9)).resolves.toBe(상세);
    });

    it('클라이언트가 던진 오류를 삼키지 않고 그대로 전파한다', async () => {
      client.delete.mockRejectedValueOnce(new Error('삭제 권한이 없습니다.'));

      await expect(communityService.deleteCommunity(1)).rejects.toThrow('삭제 권한이 없습니다.');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('바인딩된 named export', () => {
    it('싱글턴에 바인딩되어 this 유실 없이 각자의 메서드로 위임한다', async () => {
      // `.bind(communityService)` 가 빠지면 `this.get` 접근에서 런타임 TypeError 가 난다.
      // 정적 타입 검사로는 절대 잡히지 않는 파손이라 호출 자체가 유일한 증거다.
      await getCommunityList({ page: 0 });
      await getCommunity(1);
      await createCommunity({ cmntyNm: 'a' });
      await updateCommunity(2, { cmntyNm: 'b' });
      await deleteCommunity(3);

      expect(client.get).toHaveBeenNthCalledWith(1, 목록_URL, { params: { page: 0, pageIndex: 1 } });
      expect(client.get).toHaveBeenNthCalledWith(2, 'communities/1', undefined);
      expect(client.post).toHaveBeenCalledWith(목록_URL, { cmntyNm: 'a' }, undefined);
      expect(client.put).toHaveBeenCalledWith('communities/2', { cmntyNm: 'b' }, undefined);
      expect(client.delete).toHaveBeenCalledWith('communities/3', undefined);
    });

    it('named export 는 싱글턴 인스턴스의 동일 메서드를 가리킨다', async () => {
      const 스파이 = vi.spyOn(communityService, 'getCommunity');

      await getCommunity(77);

      // 바인딩 시점(모듈 로드) 때문에 스파이는 호출되지 않는다 — 대신 실제로 나간 요청으로 동일성을 확인한다.
      expect(client.get).toHaveBeenCalledWith('communities/77', undefined);
      스파이.mockRestore();
    });
  });
});

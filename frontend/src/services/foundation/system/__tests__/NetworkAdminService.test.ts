/**
 * NetworkAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/NetworkAdminService.ts` 는 네트워크 노드(장비) 관리 화면
 * (`admin/system/network`)의 유일한 API 진입점이다. 메서드 4개가 전부 한 줄씩이라 "테스트할 게
 * 없다"고 보이지만, 아래 항목들은 **틀어져도 컴파일·타입 검사를 모두 통과한 채 런타임에서만 조용히
 * 깨진다**.
 *
 * 1) URL 조합 — `AdminService('/ntwrksvc-monitoring')` 는 `ApiService` 생성자에서 선행 슬래시가
 *    제거되고 `admin/{category}/` 접두가 붙어 최종 `admin/system/ntwrksvc-monitoring` 이 된다
 *    (category 기본값 'system'). 백엔드 `NetworkMonitoringApiController` 의
 *    `@RequestMapping("/api/v1/admin/system/ntwrksvc-monitoring")` 와 정확히 맞물리는 지점이다.
 *    **`/admin/system/networks` 경로를 매핑하는 컨트롤러는 저장소에 존재하지 않는다**(백엔드 전량
 *    grep 결과 네트워크 관련 컨트롤러는 위 한 개뿐). 경로 이름이 "monitoring 인데 CRUD 라니
 *    이상하다"는 직관으로 이쪽을 `networks` 로 "정정"하면 4개 메서드가 동시에 404 가 된다. 선행
 *    슬래시가 되살아나는 경우도
 *    마찬가지로 치명적이다 — axios `baseURL`('/api/v1')의 경로 세그먼트가 통째로 날아가 절대 경로로
 *    해석된다.
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto`(pageIndex 1-based 기본 1,
 *    recordCountPerPage 기본 10) 규약에 맞춘다. 유일한 호출부인 서버 컴포넌트
 *    `admin/system/network/page.tsx` 가 `{ page: 0, size: 100 }` 을 넘기므로, +1 이 사라지면 첫
 *    페이지가 통째로 비고 `size` 매핑이 끊기면 기본 10건에서 잘려 **11번째 노드부터 화면에서
 *    사라진다**. 타입은 그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 경로 변수 치환 — `updateNetwork`/`deleteNetwork` 는 **인자 `id`** 가 경로를 결정한다. 본문에
 *    실린 `ntwrkId` 를 따라가도록 바뀌면 화면에서 고른 장비가 아닌 **다른 노드를 고치거나 지운다**.
 *    삭제가 컬렉션 경로로 새면 전량 삭제 요청이 되므로 되돌리기 어렵다.
 *
 * 4) config 전달 — SSR 경로(`page.tsx`, `networkActions.ts`)는 쿠키에서 뽑은 accessToken 을
 *    `{ headers: { Authorization: 'Bearer …' } }` 로 직접 실어 보낸다. 브라우저 경로에서는 미들웨어가
 *    헤더를 주입해 주므로 이 config 가 유실돼도 **아무도 눈치채지 못하다가 서버 렌더링에서만 401** 이
 *    된다. timeout·AbortSignal 유실도 같은 부류다.
 *
 * 5) 오류 전파 — 이 도메인은 엔티티·물리 테이블이 아직 없어 백엔드 쓰기 3종이 **501
 *    NOT_IMPLEMENTED** 를 반환한다(`NetworkMonitoringApiController.notImplemented()`). 즉 이 서비스의
 *    쓰기 경로는 **상시 실패가 정상 동작**이며, 서비스가 오류를 삼키고 resolve 하면 화면이
 *    "저장되었습니다"라고 거짓 보고한다(종전 백엔드가 저장 없이 200 을 주던 사고와 동형). 따라서
 *    reject 가 호출부까지 그대로 도달하는지가 이 서비스에서 가장 중요한 축이다.
 *
 * 6) 응답 무가공 전달 — 서비스는 응답을 정규화하지 않는다. 정규화 책임은 호출부
 *    (`page.tsx` 의 `toNetworkList`)에 있고, 서비스가 형태를 손대기 시작하면 이중 처리가 된다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { networkAdminService, type Network } from '../NetworkAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/ntwrksvc-monitoring')` + category 기본값 'system'
 * → `admin/system/ntwrksvc-monitoring` (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 */
const BASE = 'admin/system/ntwrksvc-monitoring';

/** 백엔드 매핑이 없는 금지 경로 — 이쪽으로 새면 404 다. */
const FORBIDDEN_BASE = 'admin/system/networks';

describe('NetworkAdminService — 네트워크 노드 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('노드 목록 조회 (getNetworks)', () => {
    it('목록은 admin/system/ntwrksvc-monitoring 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await networkAdminService.getNetworks();

      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: undefined });
    });

    it('미매핑 경로(admin/system/networks)로 새지 않는다 — 그 경로엔 컨트롤러가 없다', async () => {
      // 백엔드 매핑은 ntwrksvc-monitoring 하나뿐이다. 이름이 자연스러워 보인다는 이유로
      // networks로 옮기면 전 메서드가 404 다.
      await networkAdminService.getNetworks();

      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(FORBIDDEN_BASE, { params: undefined });
    });

    it('params 없이 config 만 넘겨도 timeout 이 유실되지 않는다', async () => {
      // `{ ...config, params }` 를 `params ? {...} : undefined` 로 바꾸는 식의 회귀를 막는다.
      await networkAdminService.getNetworks(undefined, { timeout: 3000 });

      expect(client.get).toHaveBeenCalledWith(BASE, { timeout: 3000, params: undefined });
    });

    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await networkAdminService.getNetworks({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('page 3·size 20 은 pageIndex 4·recordCountPerPage 20 이 되고 원본 키도 함께 남는다', async () => {
      await networkAdminService.getNetworks({ page: 3, size: 20 });

      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 3, size: 20, pageIndex: 4, recordCountPerPage: 20 },
      });
    });

    it('실제 화면이 쓰는 { page: 0, size: 100 } 조합이 온전히 변환된다', async () => {
      // admin/system/network/page.tsx 의 서버 컴포넌트가 이 형태로 전량 로딩한다.
      // size 매핑이 끊기면 BaseSearchDto 기본 10건으로 잘려 11번째 노드부터 화면에서 사라진다.
      await networkAdminService.getNetworks({ page: 0, size: 100 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, size: 100, pageIndex: 1, recordCountPerPage: 100 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // page 9 였다면 변환 결과는 pageIndex 10 이겠지만, 명시값 2 가 그대로 유지돼야 한다.
      await networkAdminService.getNetworks({ page: 9, pageIndex: 2 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 2 },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 10 },
      });
    });

    it('recordCountPerPage 를 직접 지정하면 size 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // size 20 이었다면 변환 결과는 recordCountPerPage 20 이겠지만, 명시값 50 이 이겨야 한다.
      await networkAdminService.getNetworks({ size: 20, recordCountPerPage: 50 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { size: 20, recordCountPerPage: 50 },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { size: 20, recordCountPerPage: 20 },
      });
    });

    it('pageSize 만 오면 recordCountPerPage 와 size 를 함께 채운다 (Common DTO 호환 축)', async () => {
      await networkAdminService.getNetworks({ pageSize: 25 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 25, recordCountPerPage: 25, size: 25 },
      });
    });

    it('searchKeyword 를 keyword 로 승격하지 않는다 — 검색어 축을 임의로 늘리지 않는다', async () => {
      // 형제 서비스(SurveyAdminService)는 승격하지만 이 서비스는 하지 않는다.
      // 승격 로직이 잘못 이식되면 두 키가 동시에 나가 서버 바인딩이 흔들린다.
      await networkAdminService.getNetworks({ searchKeyword: '10.0.0.1' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '10.0.0.1' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '10.0.0.1', keyword: '10.0.0.1' },
      });
    });

    it('SSR 호출부가 넘기는 Authorization 헤더가 params 와 함께 보존된다', async () => {
      // page.tsx 는 쿠키의 accessToken 을 Bearer 로 실어 보낸다. 유실되면 서버 렌더링에서만 401 이다.
      const headers = { Authorization: 'Bearer test-token' };

      await networkAdminService.getNetworks({ page: 0, size: 100 }, { headers });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        headers,
        params: { page: 0, size: 100, pageIndex: 1, recordCountPerPage: 100 },
      });
    });

    it('AbortSignal 이 params 변환과 무관하게 보존된다', async () => {
      const { signal } = new AbortController();

      await networkAdminService.getNetworks({ page: 1 }, { signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        signal,
        params: { page: 1, pageIndex: 2 },
      });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const nodes: Network[] = [
        {
          ntwrkId: 'N1',
          manageIem: '코어 스위치',
          ntwrkIp: '10.0.0.1',
          gtwy: '10.0.0.254',
          subnet: '255.255.255.0',
          domnServer: 'ns1.local',
          userNm: '홍길동',
          useYn: 'Y',
        },
      ];
      client.get.mockResolvedValueOnce(nodes);

      await expect(networkAdminService.getNetworks()).resolves.toBe(nodes);
    });

    it('응답이 PageResponse 형태로 내려와도 서비스는 정규화하지 않고 그대로 넘긴다', async () => {
      // 선언 타입은 Network[] 지만 백엔드 getStatus 는 PageResponse 를 반환한다.
      // 형태를 좁히는 책임은 호출부(page.tsx 의 toNetworkList)에 있다 — 서비스가 손대면 이중 처리가 된다.
      const paged: unknown = { list: [], total: 0, page: 1, size: 100, totalPage: 0 };
      client.get.mockResolvedValueOnce(paged);

      const result: unknown = await networkAdminService.getNetworks({ page: 0, size: 100 });

      expect(result).toBe(paged);
    });

    it('목록 조회 실패는 삼키지 않고 그대로 전파된다 — 화면이 "0건"이라고 거짓말하지 않도록', async () => {
      // page.tsx 는 이 예외를 잡아 fetchError 로 노출한다. 서비스가 빈 배열로 바꿔치면 그 분기가 죽는다.
      const failure = new Error('네트워크 노드 목록을 불러오지 못했습니다.');
      client.get.mockRejectedValueOnce(failure);

      await expect(networkAdminService.getNetworks({ page: 0 })).rejects.toBe(failure);
    });
  });

  describe('노드 등록 (createNetwork)', () => {
    const payload: Partial<Network> = {
      manageIem: '엣지 라우터',
      ntwrkIp: '10.0.1.1',
      gtwy: '10.0.1.254',
      subnet: '255.255.255.0',
      domnServer: 'ns2.local',
      userNm: '김철수',
      useYn: 'Y',
    };

    it('컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      await networkAdminService.createNetwork(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, payload, undefined);
    });

    it('본문에 ntwrkId 가 섞여 있어도 경로 변수로 승격하지 않는다 — 등록은 항상 컬렉션 경로다', async () => {
      // ntwrkId 를 경로에 붙이면 등록 요청이 단건 수정 엔드포인트로 나가 버린다.
      const withId: Partial<Network> = { ...payload, ntwrkId: 'N7' };

      await networkAdminService.createNetwork(withId);

      expect(client.post).toHaveBeenCalledWith(BASE, withId, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/N7`, withId, undefined);
    });

    it('서버 액션이 넘긴 Authorization 헤더가 유실되지 않는다', async () => {
      // saveNetworkAction 은 쿠키의 accessToken 을 헤더로 실어 보낸다. 유실되면 401 이다.
      const config = { headers: { Authorization: 'Bearer test-token' } };

      await networkAdminService.createNetwork(payload, config);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, config);
    });

    it('백엔드 501(미구현)을 삼키지 않고 그대로 던진다 — 저장되지 않았는데 성공으로 보이면 안 된다', async () => {
      // 이 도메인은 저장소가 없어 서버가 항상 501 을 준다. 서비스가 resolve 로 바꾸면
      // saveNetworkAction 이 success:true 를 반환해 "저장되었습니다" 토스트가 뜬다.
      const notImplemented = new Error('네트워크 노드 관리는 아직 구현되지 않았습니다. (저장소·계측 소스 미연결)');
      client.post.mockRejectedValueOnce(notImplemented);

      await expect(networkAdminService.createNetwork(payload)).rejects.toBe(notImplemented);
    });
  });

  describe('노드 수정 (updateNetwork)', () => {
    it('인자로 받은 id 가 경로를 결정한다 — 본문의 ntwrkId 가 아니다', async () => {
      // 본문에 다른 ntwrkId(N9)를 심어 두고, 경로는 인자(N1)만 따르는지 확인한다.
      // 본문을 따라가도록 바뀌면 화면에서 고른 장비가 아닌 엉뚱한 노드가 수정된다.
      const payload: Partial<Network> = { ntwrkId: 'N9', manageIem: '이름만 수정' };

      await networkAdminService.updateNetwork('N1', payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/N1`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/N9`, payload, { timeout: 2000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      const payload: Partial<Network> = { manageIem: '이름만 수정' };

      await networkAdminService.updateNetwork('N1', payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/N1`, payload, undefined);
    });

    it('수정 시 Authorization 헤더가 유실되지 않는다', async () => {
      const config = { headers: { Authorization: 'Bearer test-token' } };
      const payload: Partial<Network> = { manageIem: '코어 스위치', useYn: 'N' };

      await networkAdminService.updateNetwork('N1', payload, config);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/N1`, payload, config);
    });

    it('수정 실패(501)를 그대로 전파한다', async () => {
      const notImplemented = new Error('네트워크 노드 관리는 아직 구현되지 않았습니다. (저장소·계측 소스 미연결)');
      client.put.mockRejectedValueOnce(notImplemented);

      await expect(networkAdminService.updateNetwork('N1', { useYn: 'N' })).rejects.toBe(notImplemented);
    });
  });

  describe('노드 삭제 (deleteNetwork)', () => {
    it('지정한 id 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await networkAdminService.deleteNetwork('N2');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/N2`, undefined);
      // 경로 변수가 사라지면 컬렉션 전량 삭제 요청이 된다 — 되돌릴 수 없다.
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('삭제 대상 id 가 다른 노드로 바뀌지 않는다', async () => {
      await networkAdminService.deleteNetwork('N2');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/N2`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/N1`, undefined);
    });

    it('삭제 시 config(Authorization)가 유실되지 않는다', async () => {
      const config = { headers: { Authorization: 'Bearer test-token' } };

      await networkAdminService.deleteNetwork('N2', config);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/N2`, config);
    });

    it('삭제 시 AbortSignal 도 그대로 전달된다', async () => {
      const { signal } = new AbortController();

      await networkAdminService.deleteNetwork('N2', { signal });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/N2`, { signal });
    });

    it('클라이언트는 삭제 가능 여부를 자체 판단하지 않는다 — 서버 오류를 그대로 전파한다', async () => {
      const notImplemented = new Error('네트워크 노드 관리는 아직 구현되지 않았습니다. (저장소·계측 소스 미연결)');
      client.delete.mockRejectedValueOnce(notImplemented);

      await expect(networkAdminService.deleteNetwork('N2')).rejects.toBe(notImplemented);
    });
  });

  describe('경로·메서드 격리', () => {
    it('4개 메서드는 각자의 HTTP 메서드를 정확히 한 번씩만 쓴다', async () => {
      await networkAdminService.getNetworks();
      await networkAdminService.createNetwork({ manageIem: '신규' });
      await networkAdminService.updateNetwork('N1', { manageIem: '수정' });
      await networkAdminService.deleteNetwork('N2');

      // 예: 삭제를 POST 로 구현하면 백엔드 매핑이 없어 조용히 405/404 가 된다.
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.post).toHaveBeenCalledTimes(1);
      expect(client.put).toHaveBeenCalledTimes(1);
      expect(client.delete).toHaveBeenCalledTimes(1);
    });

    it('쓰기 3종의 경로는 등록=컬렉션, 수정/삭제=단건으로 갈린다', async () => {
      await networkAdminService.createNetwork({ manageIem: '신규' });
      await networkAdminService.updateNetwork('N1', { manageIem: '수정' });
      await networkAdminService.deleteNetwork('N2');

      expect([
        ...client.post.mock.calls.map((call) => call[0]),
        ...client.put.mock.calls.map((call) => call[0]),
        ...client.delete.mock.calls.map((call) => call[0]),
      ]).toEqual([BASE, `${BASE}/N1`, `${BASE}/N2`]);
    });

    it('모든 요청 경로는 admin/system/ntwrksvc-monitoring 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로 해석).
      await networkAdminService.getNetworks({ page: 0, size: 100 });
      await networkAdminService.createNetwork({ manageIem: '신규' });
      await networkAdminService.updateNetwork('N1', { manageIem: '수정' });
      await networkAdminService.deleteNetwork('N2');

      const paths = [client.get, client.post, client.put, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(4);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
        expect(path.startsWith(FORBIDDEN_BASE)).toBe(false);
      });
    });
  });
});

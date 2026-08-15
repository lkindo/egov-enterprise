/**
 * networkService 계약 테스트 (Contract Test)
 *
 * ── 이 서비스가 형제와 다른 점 (실측) ─────────────────────────────────────────
 * `src/services/foundation/system/networkService.ts` 는 같은 디렉터리의 형제들과 달리
 * **`ApiService`/`AdminService` 를 상속하지 않는다.** 클래스가 아니라 객체 리터럴이며
 * `@/lib/api/client` 를 직접 호출한다. 그래서 형제 서비스가 상속으로 얻는 두 가지가
 * 이 서비스에는 **아예 없다**.
 *
 *  (a) 접두 정규화 — `ApiService` 생성자는 선행 슬래시를 제거해 `admin/system/...` 를 만든다.
 *      이 서비스의 `BASE_URL` 은 `'/admin/system/networks'` 로 **선행 슬래시를 그대로 유지**한다.
 *      axios 는 `buildFullPath` 에서 `isAbsoluteURL(url)` 이 거짓일 때만 `combineURLs(baseURL, url)`
 *      로 합치는데(실측: node_modules/axios/lib/helpers/{isAbsoluteURL,combineURLs}.js), 그 정규식은
 *      `/^([a-z][a-z\d+\-.]*:)?\/\//i` 다. 즉 **슬래시 하나는 안전**(→ `/api/v1/admin/system/networks`)
 *      이지만 **두 개가 되면 프로토콜 상대 절대 URL 로 판정**돼 `baseURL` 이 통째로 버려지고
 *      `admin` 이라는 외부 호스트로 요청이 나간다. 슬래시 개수가 계약인 이유다.
 *
 *  (b) 페이징 변환 — `ApiService.get` 의 `page`(0-based) → `pageIndex`(+1), `size` →
 *      `recordCountPerPage` 승격이 **일어나지 않는다**. 실제 호출부(`lib/hooks/use-topology-data.ts`)는
 *      `{ page: 0, size: 50 }` 을 넘기므로 백엔드 `BaseSearchDto` 에는 기본값이 걸린다.
 *      아래 테스트는 이 부재를 **옳다고 승인하는 것이 아니라** 현 상태를 고정해, 상속 구조로
 *      옮겨가는 변경이 조용히(타입 변화 없이) 섞여 들어오는 것을 red 로 드러내려는 것이다.
 *
 * ── 백엔드 대응 관계 (실측) ──────────────────────────────────────────────────
 * 저장소 전량 grep 결과 `/api/v1/admin/system/networks` 를 매핑한 컨트롤러는 **존재하지 않는다**.
 * 네트워크 관련 유일한 엔드포인트는 `NetworkMonitoringApiController` 의
 * `/api/v1/admin/system/ntwrksvc-monitoring` 이며, 그 쓰기 3종(POST/PUT/DELETE)은 저장소가 없어
 * 501 을 반환한다. 즉 이 파일의 CRUD 5종은 오늘 대응 백엔드가 없는 경로를 향한다.
 * 본 테스트는 **모듈이 무엇을 내보내는지**를 고정할 뿐 그 경로가 옳다고 승인하지 않는다.
 * 경로가 정정되면 아래 `BASE` 상수 한 줄만 고치면 된다(리터럴은 그 한 곳에만 있다).
 *
 * ── 그래서 무엇을 고정하는가 ─────────────────────────────────────────────────
 * 1) 경로 조합 — 접두, 선행 슬래시 1개, 후행 슬래시 없음, `//` 없음.
 * 2) 경로 변수 치환 — `updateNetwork`/`deleteNetwork` 는 **인자 id** 가 경로를 결정한다.
 *    본문의 `ntwrkId` 를 따라가도록 바뀌면 다른 자원을 고치거나 지운다. 타입은 그대로다.
 * 3) 모니터링 경로 분리 — 상태/로그 2종은 `BASE` 하위가 아니라 별개 리터럴 경로다.
 *    "정리"한다며 `${BASE}/status` 로 합치면 즉시 404 다.
 * 4) 요청 본문·응답·오류 무가공 전달 — 폴백 목록을 서비스가 대신 만들어 주지 않는다.
 *
 * ── 다루지 않는 축 ──────────────────────────────────────────────────────────
 * 이 서비스의 메서드는 `AxiosRequestConfig` 를 **인자로 받지 않는다.** timeout·AbortSignal·
 * Authorization 헤더를 전달할 통로 자체가 없으므로 "config 유실" 축은 성립하지 않는다.
 * 대신 두 번째 인자의 정확한 형태(`{ params }` 한 키뿐 / 인자 자체가 없음)를 고정한다.
 *
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  networkService,
  type NetworkInfo,
  type NetworkStatusDetailed,
} from '../networkService';

/** 소스 실측값 — `networkService.ts` 의 `BASE_URL` 상수 그대로(선행 슬래시 포함). */
const BASE = '/admin/system/networks';

/**
 * 소스 실측값 — 상태/로그 조회만 쓰는 별개 리터럴 경로.
 * 백엔드 `NetworkMonitoringApiController(@RequestMapping("/api/v1/admin/system/ntwrksvc-monitoring"))`
 * 와 1:1 로 맞물리는 유일한 경로다.
 */
const MONITORING = '/admin/system/ntwrksvc-monitoring';

/** 모든 mock 에 쌓인 요청 경로를 호출 순서대로 모은다. */
const collectPaths = (): string[] =>
  [client.get, client.post, client.put, client.delete].flatMap((fn) =>
    fn.mock.calls.map((call) => String(call[0]))
  );

describe('networkService — 네트워크 관리/모니터링 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('네트워크 목록 조회 (getNetworks)', () => {
    it('목록은 /admin/system/networks 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await networkService.getNetworks();

      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      // Spring Boot 3 은 후행 슬래시 매칭을 기본 비활성화했다 — `/networks/` 는 404 다.
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: undefined });
    });

    it('params 를 생략해도 두 번째 인자는 { params: undefined } 한 키짜리 객체 그대로다', async () => {
      await networkService.getNetworks();

      // toStrictEqual 이라야 `{}`(키 소멸)와 `{ params: undefined }` 가 구분되고,
      // 배열 길이 비교로 세 번째 인자(config)가 새로 끼어드는 것도 red 가 된다.
      expect(client.get.mock.calls[0]).toStrictEqual([BASE, { params: undefined }]);
    });

    it('검색 조건은 키 이름을 바꾸거나 승격하지 않고 그대로 실린다', async () => {
      await networkService.getNetworks({ searchCondition: 'ntwrkIp', searchWrd: '10.0.' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchCondition: 'ntwrkIp', searchWrd: '10.0.' },
      });
      // 형제 서비스처럼 searchWrd → keyword 승격이 이식되면 두 키가 동시에 나가 서버 바인딩이 흔들린다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchCondition: 'ntwrkIp', searchWrd: '10.0.', keyword: '10.0.' },
      });
    });

    it('page·size 는 pageIndex·recordCountPerPage 로 변환되지 않는다 (ApiService 미상속)', async () => {
      await networkService.getNetworks({ page: 0, size: 50 });

      // 이 서비스는 client 를 직접 호출하므로 BaseSearchDto 정규화 분기를 아예 지나지 않는다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 0, size: 50 } });
      // 변환이 새로 생기면(상속 구조 이관 등) 아래 형태가 되어 이 단언이 red 로 알린다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 0, size: 50, pageIndex: 1, recordCountPerPage: 50 },
      });
    });

    it('호출부가 넘긴 params 객체를 변형하지 않는다 — 원본이 오염되지 않는다', async () => {
      // `ApiService.get` 은 넘겨받은 params 객체에 pageIndex 를 **직접 써 넣는다**(공유 상태 오염).
      // 이 서비스는 감싸기만 하므로 호출부의 객체가 그대로 남아야 한다.
      const params: SearchParams = { page: 2, size: 10 };

      await networkService.getNetworks(params);

      expect(params).toStrictEqual({ page: 2, size: 10 });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<NetworkInfo> = {
        list: [
          {
            ntwrkId: 'NT_001',
            manageIem: '본사 백본',
            ntwrkIp: '10.0.0.1',
            userNm: '홍길동',
            subnet: '255.255.255.0',
            gtwy: '10.0.0.254',
            domnServer: '10.0.0.53',
            useYn: 'Y',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(networkService.getNetworks()).resolves.toBe(page);
    });

    it('서버 오류를 삼키지 않고 그대로 전파한다 — 화면이 빈 목록으로 오인하지 않는다', async () => {
      const failure = new Error('네트워크 목록 조회 실패');
      client.get.mockRejectedValueOnce(failure);

      await expect(networkService.getNetworks()).rejects.toBe(failure);
    });
  });

  describe('네트워크 상세 조회 (getNetwork)', () => {
    it('ntwrkId 는 경로 변수로 붙고 두 번째 인자는 아예 전달되지 않는다', async () => {
      await networkService.getNetwork('NT_001');

      // 상세 조회만 유일하게 인자가 1개다. `{ params: undefined }` 가 새로 붙어도 red 가 된다.
      expect(client.get.mock.calls[0]).toStrictEqual([`${BASE}/NT_001`]);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/NT_002`);
    });

    it('id 를 쿼리 파라미터로 흘려보내지 않는다 — 컬렉션 경로를 때리면 전체 목록이 온다', async () => {
      await networkService.getNetwork('NT_001');

      // SearchParams 에 ntwrkId 축이 있어 실수하기 쉬운 지점이다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/NT_001`);
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { ntwrkId: 'NT_001' } });
    });

    it('상세 응답은 무가공으로 반환된다', async () => {
      const info: NetworkInfo = {
        ntwrkId: 'NT_002',
        manageIem: '지사 회선',
        ntwrkIp: '10.0.1.1',
        userNm: '김철수',
        subnet: '255.255.255.0',
        gtwy: '10.0.1.254',
        domnServer: '10.0.0.53',
        useYn: 'N',
      };
      client.get.mockResolvedValueOnce(info);

      await expect(networkService.getNetwork('NT_002')).resolves.toBe(info);
    });
  });

  describe('네트워크 등록 (createNetwork)', () => {
    it('컬렉션 경로로 요청 본문을 무가공 POST 한다 — id 세그먼트도 config 인자도 없다', async () => {
      const payload: Partial<NetworkInfo> = {
        manageIem: '신규 회선',
        ntwrkIp: '10.0.2.1',
        subnet: '255.255.255.0',
        useYn: 'Y',
      };

      await networkService.createNetwork(payload);

      expect(client.post.mock.calls[0]).toStrictEqual([BASE, payload]);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, payload);
    });

    it('본문을 다른 키로 감싸지 않는다 — 백엔드가 NetworkDto 를 통째로 받는다', async () => {
      const payload: Partial<NetworkInfo> = { manageIem: '신규 회선' };

      await networkService.createNetwork(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload);
      expect(client.post).not.toHaveBeenCalledWith(BASE, { data: payload });
    });

    it('서버가 채번한 ntwrkId 문자열을 가공 없이 반환한다', async () => {
      client.post.mockResolvedValueOnce('NT_010');

      await expect(networkService.createNetwork({ manageIem: '신규 회선' })).resolves.toBe('NT_010');
    });

    it('등록 실패(백엔드 미구현 501 등)를 성공으로 바꿔치지 않는다', async () => {
      // 실측: NetworkMonitoringApiController 의 쓰기 3종은 저장소가 없어 501 을 반환한다.
      // 이 오류를 서비스가 삼키면 화면이 "등록됨" 으로 오인한다.
      const notImplemented = new Error('네트워크 노드 관리는 아직 구현되지 않았습니다.');
      client.post.mockRejectedValueOnce(notImplemented);

      await expect(networkService.createNetwork({ manageIem: '신규 회선' })).rejects.toBe(
        notImplemented
      );
    });
  });

  describe('네트워크 수정 (updateNetwork)', () => {
    it('인자로 받은 ntwrkId 가 경로를 결정한다 — 본문의 ntwrkId 가 아니다', async () => {
      // 본문에 다른 id(NT_999)를 심어 두고 경로가 인자(NT_001)만 따르는지 확인한다.
      // 본문을 따라가면 화면에서 고른 회선이 아닌 엉뚱한 회선이 수정된다.
      const payload: Partial<NetworkInfo> = { ntwrkId: 'NT_999', useYn: 'N' };

      await networkService.updateNetwork('NT_001', payload);

      expect(client.put.mock.calls[0]).toStrictEqual([`${BASE}/NT_001`, payload]);
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/NT_999`, payload);
    });

    it('수정 대상 id 를 본문에만 싣고 컬렉션 경로로 보내지 않는다', async () => {
      const payload: Partial<NetworkInfo> = { ntwrkId: 'NT_001', useYn: 'N' };

      await networkService.updateNetwork('NT_001', payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/NT_001`, payload);
      expect(client.put).not.toHaveBeenCalledWith(BASE, payload);
    });

    it('클라이언트 결과를 그대로 돌려준다 — 성공값을 지어내지 않는다', async () => {
      await expect(networkService.updateNetwork('NT_001', { useYn: 'N' })).resolves.toBeUndefined();
    });

    it('수정 실패를 그대로 전파한다', async () => {
      const failure = new Error('수정 실패');
      client.put.mockRejectedValueOnce(failure);

      await expect(networkService.updateNetwork('NT_001', { useYn: 'N' })).rejects.toBe(failure);
    });
  });

  describe('네트워크 삭제 (deleteNetwork)', () => {
    it('지정한 id 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await networkService.deleteNetwork('NT_002');

      // 인자가 1개다 — config 를 붙이는 변경도 red 로 드러난다.
      expect(client.delete.mock.calls[0]).toStrictEqual([`${BASE}/NT_002`]);
      // 경로 변수가 빠지면 컬렉션 전체 삭제 요청이 된다 — 되돌릴 수 없는 사고다.
      expect(client.delete).not.toHaveBeenCalledWith(BASE);
    });

    it('서로 다른 id 로 부르면 서로 다른 경로가 나간다', async () => {
      await networkService.deleteNetwork('NT_002');
      await networkService.deleteNetwork('NT_003');

      expect(client.delete.mock.calls.map((call) => String(call[0]))).toStrictEqual([
        `${BASE}/NT_002`,
        `${BASE}/NT_003`,
      ]);
    });

    it('삭제 실패를 삼키지 않는다 — 화면이 삭제된 것으로 오인하지 않는다', async () => {
      const conflict = new Error('참조 중인 네트워크입니다');
      client.delete.mockRejectedValueOnce(conflict);

      await expect(networkService.deleteNetwork('NT_001')).rejects.toBe(conflict);
    });
  });

  describe('서비스 상태 목록 조회 (getStatus)', () => {
    it('상태 조회는 networks 하위가 아니라 별개 경로 ntwrksvc-monitoring 으로 나간다', async () => {
      await networkService.getStatus();

      expect(client.get).toHaveBeenCalledWith(MONITORING, { params: undefined });
      // "경로를 정리한다"며 BASE 하위로 합치면 대응 컨트롤러가 없어 즉시 404 다.
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/status`, { params: undefined });
    });

    it('params 생략 시에도 두 번째 인자는 { params: undefined } 한 키짜리 객체다', async () => {
      await networkService.getStatus();

      expect(client.get.mock.calls[0]).toStrictEqual([MONITORING, { params: undefined }]);
    });

    it('실제 호출부(use-topology-data)의 { page: 0, size: 50 } 이 변환 없이 그대로 나간다', async () => {
      await networkService.getStatus({ page: 0, size: 50 });

      expect(client.get).toHaveBeenCalledWith(MONITORING, { params: { page: 0, size: 50 } });
      expect(client.get).not.toHaveBeenCalledWith(MONITORING, {
        params: { page: 0, size: 50, pageIndex: 1, recordCountPerPage: 50 },
      });
    });

    it('상태 응답을 재포장 없이 그대로 반환한다', async () => {
      const page: PageResponse<NetworkStatusDetailed> = {
        list: [
          {
            sysNm: 'API-GATEWAY',
            sysIp: '10.0.0.10',
            sysPort: '8080',
            svcSttus: 'UP',
            logDt: '2026-08-15 10:00:00',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(networkService.getStatus()).resolves.toBe(page);
    });

    it('list 가 없는 응답에 빈 배열 폴백을 끼워 넣지 않는다 — 방어는 호출부 몫이다', async () => {
      // 백엔드는 계측 소스가 붙기 전까지 빈 목록을 준다. 서비스가 임의로 형태를 보정하면
      // 호출부(`response.list || []`)의 전제가 조용히 달라지고, "데이터 없음"이 가짜 정상으로 보인다.
      const noList = { total: 0, page: 1, size: 10, totalPage: 0 } as unknown as PageResponse<
        NetworkStatusDetailed
      >;
      client.get.mockResolvedValueOnce(noList);

      await expect(networkService.getStatus()).resolves.toBe(noList);
    });

    it('상태 조회 실패를 그대로 전파한다 — 폴백은 호출부가 판단한다', async () => {
      const failure = new Error('모니터링 소스 연결 실패');
      client.get.mockRejectedValueOnce(failure);

      await expect(networkService.getStatus()).rejects.toBe(failure);
    });
  });

  describe('네트워크 로그 조회 (getNetworkLogs — getStatus 별칭)', () => {
    it('로그 조회도 같은 모니터링 경로를 쓴다 — 전용 /logs 경로를 만들지 않는다', async () => {
      await networkService.getNetworkLogs();

      expect(client.get).toHaveBeenCalledWith(MONITORING, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(`${MONITORING}/logs`, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/logs`, { params: undefined });
    });

    it('같은 인자로 부르면 getStatus 와 호출 인자가 완전히 일치한다 (별칭임의 증명)', async () => {
      const params: SearchParams = { page: 1, size: 20, searchCondition: 'sysNm' };

      await networkService.getStatus(params);
      await networkService.getNetworkLogs(params);

      expect(client.get.mock.calls).toHaveLength(2);
      expect(client.get.mock.calls[1]).toStrictEqual(client.get.mock.calls[0]);
    });

    it('로그 응답도 무가공으로 반환된다', async () => {
      const page: PageResponse<NetworkStatusDetailed> = {
        list: [],
        total: 0,
        page: 1,
        size: 10,
        totalPage: 0,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(networkService.getNetworkLogs()).resolves.toBe(page);
    });
  });

  describe('경로 격리 및 형태', () => {
    it('7개 메서드가 내보내는 경로 조합이 호출 순서대로 고정된다', async () => {
      await networkService.getNetworks();
      await networkService.getNetwork('NT_001');
      await networkService.getStatus();
      await networkService.getNetworkLogs();
      await networkService.createNetwork({ manageIem: '신규 회선' });
      await networkService.updateNetwork('NT_001', { useYn: 'N' });
      await networkService.deleteNetwork('NT_002');

      expect(client.get.mock.calls.map((call) => String(call[0]))).toStrictEqual([
        BASE,
        `${BASE}/NT_001`,
        MONITORING,
        MONITORING,
      ]);
      expect(client.post.mock.calls.map((call) => String(call[0]))).toStrictEqual([BASE]);
      expect(client.put.mock.calls.map((call) => String(call[0]))).toStrictEqual([
        `${BASE}/NT_001`,
      ]);
      expect(client.delete.mock.calls.map((call) => String(call[0]))).toStrictEqual([
        `${BASE}/NT_002`,
      ]);
    });

    it('CRUD 5종은 모두 /admin/system/networks 접두를 벗어나지 않는다', async () => {
      await networkService.getNetworks();
      await networkService.getNetwork('NT_001');
      await networkService.createNetwork({ manageIem: '신규 회선' });
      await networkService.updateNetwork('NT_001', { useYn: 'N' });
      await networkService.deleteNetwork('NT_002');

      const paths = collectPaths();

      expect(paths).toHaveLength(5);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
      });
    });

    it('모니터링 2종은 CRUD 접두 아래로 들어가지 않는다', async () => {
      await networkService.getStatus();
      await networkService.getNetworkLogs();

      const paths = collectPaths();

      expect(paths).toStrictEqual([MONITORING, MONITORING]);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(false);
      });
    });

    it('모든 요청 경로는 선행 슬래시가 정확히 1개이며 어디에도 // 를 포함하지 않는다', async () => {
      // `//` 로 시작하면 axios 가 프로토콜 상대 절대 URL 로 판정해 baseURL('/api/v1')을 버리고
      // 호스트 `admin` 으로 요청을 보낸다(실측: isAbsoluteURL 정규식). 중간의 `//` 는 404 를 만든다.
      await networkService.getNetworks({ page: 0 });
      await networkService.getNetwork('NT_001');
      await networkService.getStatus({ page: 0 });
      await networkService.getNetworkLogs();
      await networkService.createNetwork({ manageIem: '신규 회선' });
      await networkService.updateNetwork('NT_001', { useYn: 'N' });
      await networkService.deleteNetwork('NT_002');

      const paths = collectPaths();

      expect(paths).toHaveLength(7);
      paths.forEach((path) => {
        expect(path.startsWith('/')).toBe(true);
        expect(path.includes('//')).toBe(false);
      });
    });
  });
});

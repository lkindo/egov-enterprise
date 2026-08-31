/**
 * StatsAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/StatsAdminService.ts` 는 관리자 통계 화면
 * (`/admin/stats` 인텔리전스 허브, `/admin/survey/hub`, 통합 대시보드)이 쓰는 **유일한**
 * 통계 데이터 진입점인데도 커버리지 0% 였다. 메서드가 전부 한 줄짜리 GET 위임이라
 * "테스트할 게 없다"고 보이지만, 아래 항목들은 **틀어져도 컴파일·타입 검사를 모두 통과한 채
 * 런타임에서만 조용히 깨진다** — 차트가 빈 채로 그려지거나, 접속 통계 자리에 게시물 통계가
 * 표시돼도 숫자가 나오기 때문에 아무도 눈치채지 못한다.
 *
 * 1) URL 조합 — `AdminService('/statistics')` 는 `ApiService` 생성자에서 선행 슬래시가 제거되고
 *    `admin/{category}/` 접두가 붙어 최종 `admin/system/statistics` 가 된다(category 기본값 'system').
 *    이 서비스는 접두를 스스로 쓰지 않으므로, 접두 규칙이나 생성자 인자가 한 글자만 어긋나도
 *    6개 엔드포인트가 동시에 404 가 된다. 특히 `/data-usage` 는 **케밥케이스**로,
 *    메서드명(`getDataUsageStats`)을 따라 camelCase 로 "정리"하면 백엔드
 *    `StatisticsApiController#getDataUsageStats` 의 `@GetMapping("/data-usage")` 와 어긋난다.
 *
 * 2) 엔드포인트 격리 — 6종(summary·connect·bbs·user·report·data-usage)은 응답 스키마가
 *    `StatsDto[]` 로 **전부 동일**하다. 경로가 하나만 뒤바뀌어도 타입 오류 없이 통과하고,
 *    화면에는 "그럴듯한 다른 지표"가 그려진다. 그래서 경로 6종을 통째로 고정한다.
 *
 * 3) params 무가공 전달 — 기간 파라미터(fromDate/toDate)를 넘기지 않는 것이 **의도된 호출**이다
 *    (백엔드 `setDefaultDates` 가 최근 1개월을 기본 적용한다. `/admin/stats/page.tsx` 주석 참조).
 *    따라서 서비스가 임의의 기본값을 끼워 넣거나 키를 덧붙이지 않는다는 사실 자체가 계약이다.
 *
 * 4) config 전달 — SSR 경로(`/admin/stats/page.tsx`)가 쿠키에서 꺼낸 Bearer 토큰을
 *    `config.headers` 로만 실어 보낸다. 이 config 가 유실되면 서버 컴포넌트 렌더링이 통째로
 *    401 이 된다. 클라이언트 측에서는 timeout·AbortSignal 이 유실돼도 요청 자체는 성공하므로
 *    역시 눈에 띄지 않는다.
 *
 * 5) 응답·오류 무가공 전달 — 감사 P0-22 는 통계 호출을 `.catch(() => [])` 로 삼켜 장애를
 *    "데이터 0건"으로 위장하는 패턴을 금지했다. 서비스 계층이 폴백을 주입하지 않고 성공값·예외를
 *    그대로 흘려보내는지 고정한다(정규화 책임은 페이지가 진다).
 *
 * ⚠ 페이징 축은 이 서비스에 **적용 대상이 아니다** — 6개 메서드 어디에도 page/size 파라미터가
 *   없고 백엔드 컨트롤러도 페이징하지 않는다. 대신 `ApiService.get` 의 페이징 정규화가
 *   **끼어들지 않는다**는 사실(pageIndex/recordCountPerPage 미주입)을 반대 방향으로 고정한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·config 로 나가고 무엇이 돌아오는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<unknown>>(),
  post: vi.fn<(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<unknown>>(),
  put: vi.fn<(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<unknown>>(),
  patch: vi.fn<(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<unknown>>(),
  delete: vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<unknown>>(),
  getRaw: vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<unknown>>(),
  requestRaw: vi.fn<(config: AxiosRequestConfig) => Promise<unknown>>(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { statsAdminService, type StatsDto } from '../StatsAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/statistics')` + category 기본값 'system' → `admin/system/statistics` (선행 슬래시 없음).
 */
const BASE = 'admin/system/statistics';

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });

describe('StatsAdminService — 통계 관리자 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockImplementation(async (url, config) => {
      const data = await client.get(url, config);
      return envelope(data ?? (url === `${BASE}/summary`
        ? { totalUsers: 0, totalPosts: 0, todayConnects: 0 }
        : []));
    });
  });

  describe('엔드포인트 URL 조합', () => {
    it('6종 통계 경로는 서로 겹치지 않는다 — 응답 스키마가 모두 StatsDto[] 라 뒤바뀌어도 타입으로는 못 잡는다', async () => {
      await statsAdminService.getSummary();
      await statsAdminService.getConnectStats();
      await statsAdminService.getBbsStats();
      await statsAdminService.getUserStats();
      await statsAdminService.getReportStats();
      await statsAdminService.getDataUsageStats();

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/statistics/summary',
        'admin/system/statistics/connect',
        'admin/system/statistics/bbs',
        'admin/system/statistics/user',
        'admin/system/statistics/report',
        'admin/system/statistics/data-usage',
      ]);
    });

    it('모든 요청 경로는 admin/system/statistics 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL 의 경로 세그먼트가 통째로 날아간다(절대 경로로 해석).
      await statsAdminService.getSummary();
      await statsAdminService.getConnectStats({ fromDate: '20260801' });
      await statsAdminService.getDataUsageStats();

      const paths = client.get.mock.calls.map((call) => call[0]);

      expect(paths).toHaveLength(3);
      paths.forEach((path) => {
        expect(path.startsWith(`${BASE}/`)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });

    it('자료이용현황 경로는 케밥케이스 data-usage 다 — camelCase 로 "정리"하면 백엔드 매핑과 어긋나 404 가 된다', async () => {
      await statsAdminService.getDataUsageStats({ fromDate: '20260801', toDate: '20260831' });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/data-usage`, {
        params: { fromDate: '20260801', toDate: '20260831' },
      });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/dataUsage`, expect.anything());
    });

    it('요약 통계는 접속 통계와 다른 경로(/summary)로 나가며 config 를 감싸지 않고 그대로 넘긴다', async () => {
      await statsAdminService.getSummary();

      // getSummary 만 params 인자가 없어 config 를 있는 그대로(undefined 포함) 전달한다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/summary`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/connect`, undefined);
    });
  });

  describe('파라미터 전달', () => {
    it('접속 통계는 fromDate·toDate·statsKind 를 가공 없이 그대로 실어 보낸다', async () => {
      await statsAdminService.getConnectStats({
        fromDate: '20260801',
        toDate: '20260831',
        statsKind: 'D',
      });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/connect`, {
        params: { fromDate: '20260801', toDate: '20260831', statsKind: 'D' },
      });
    });

    it('기간 파라미터에 페이징 키가 덧붙지 않는다 — ApiService 의 pageIndex/recordCountPerPage 정규화는 개입하지 않는다', async () => {
      // ApiService.get 은 params 에 page/size/pageSize 가 있을 때만 변환 키를 주입한다.
      // 통계 API 는 페이징을 쓰지 않으므로 보낸 키가 그대로여야 한다(백엔드는 미선언 파라미터를 무시하지만,
      // 키가 늘어나면 React Query 캐시 키와 URL 이 갈라져 캐시 히트가 사라진다).
      await statsAdminService.getUserStats({ fromDate: '20260801', toDate: '20260831' });

      const sentParams = client.get.mock.calls[0]?.[1]?.params as Record<string, unknown> | undefined;

      expect(Object.keys(sentParams ?? {})).toEqual(['fromDate', 'toDate']);
    });

    it('params 를 생략하면 빈 생성 query로 나가며 서비스가 기본 기간을 지어내지 않는다', async () => {
      // 기간 미지정은 의도된 호출이다: 백엔드 setDefaultDates 가 "최근 1개월"을 적용한다.
      await statsAdminService.getReportStats();

      const [url, sentConfig] = client.get.mock.calls[0];

      expect(url).toBe(`${BASE}/report`);
      expect(sentConfig).toBeDefined();
      expect(sentConfig?.params).toEqual({});
    });

    it('config.params 로 생성 query를 덮어쓰려 하면 fail-closed 한다', async () => {
      await expect(statsAdminService.getUserStats(
        { fromDate: '20260801' },
        { params: { fromDate: '19990101' }, timeout: 1000 }
      )).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
      expect(client.get).not.toHaveBeenCalled();
    });

    it('호출부가 넘긴 params 객체는 변형되지 않는다 — React Query key 로 재사용해도 오염되지 않는다', async () => {
      // ApiService.get 은 페이징 키가 있을 때 넘겨받은 params 객체에 직접 써넣는(파괴적) 구현이다.
      // 통계 호출에는 그 키가 없으므로 호출부 객체가 원형 그대로 남아야 한다.
      const callerParams = { fromDate: '20260801', toDate: '20260831' };

      await statsAdminService.getConnectStats(callerParams);

      expect(callerParams).toEqual({ fromDate: '20260801', toDate: '20260831' });
    });
  });

  describe('config 전달', () => {
    it('SSR 호출 형태(params 생략 + Authorization 헤더)에서 헤더가 유실되지 않는다', async () => {
      // /admin/stats/page.tsx 의 실사용 형태다. 이 config 가 사라지면 서버 렌더링이 통째로 401 이 된다.
      const config: AxiosRequestConfig = { headers: { Authorization: 'Bearer test-token' } };

      await statsAdminService.getConnectStats(undefined, config);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/connect`, {
        headers: { Authorization: 'Bearer test-token' },
        params: {},
      });
    });

    it('요약 통계도 Authorization 헤더를 그대로 전달한다', async () => {
      const config: AxiosRequestConfig = { headers: { Authorization: 'Bearer test-token' } };

      await statsAdminService.getSummary(config);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/summary`, {
        headers: { Authorization: 'Bearer test-token' },
      });
    });

    it('timeout·AbortSignal 이 params 와 함께 보존된다 — 유실돼도 요청은 성공하므로 눈에 띄지 않는다', async () => {
      const { signal } = new AbortController();

      await statsAdminService.getBbsStats({ fromDate: '20260801' }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/bbs`, {
        timeout: 3000,
        signal,
        params: { fromDate: '20260801' },
      });
    });

    it('자료이용현황 조회에서도 config 가 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await statsAdminService.getDataUsageStats({ toDate: '20260831' }, { signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/data-usage`, {
        signal,
        params: { toDate: '20260831' },
      });
    });
  });

  describe('응답·오류 전달', () => {
    it('통계 배열은 재포장·필드 보정 없이 클라이언트 결과를 그대로 반환한다', async () => {
      // 백엔드 convertToStatsDto 는 statsDate·statsCo 2개 필드만 채운다(StatsAdminService 상단 주석 참조).
      const rows: StatsDto[] = [
        { statsDate: '20260801', statsCo: 128 },
        { statsDate: '20260802', statsCo: 96 },
      ];
      client.get.mockResolvedValueOnce(rows);

      await expect(statsAdminService.getConnectStats()).resolves.toBe(rows);
    });

    it('빈 배열도 그대로 반환한다 — 서비스가 더미 데이터나 기본 구간을 채워 넣지 않는다', async () => {
      const empty: StatsDto[] = [];
      client.get.mockResolvedValueOnce(empty);

      await expect(statsAdminService.getBbsStats()).resolves.toBe(empty);
    });

    it('요약 통계 응답은 정규화 없이 원본 객체로 반환된다 — 숫자 변환은 화면(page.tsx)의 책임이다', async () => {
      const summary = { totalUsers: 12, totalPosts: 34, todayConnects: 5 };
      client.get.mockResolvedValueOnce(summary);

      await expect(statsAdminService.getSummary()).resolves.toBe(summary);
    });

    it('오류는 빈 배열로 삼켜지지 않고 그대로 전파된다 — 장애를 "데이터 0건"으로 위장하면 안 된다(감사 P0-22)', async () => {
      const failure = new Error('503 Service Unavailable');
      client.get.mockRejectedValueOnce(failure);

      await expect(statsAdminService.getConnectStats()).rejects.toBe(failure);
    });
  });

  describe('읽기 전용 보장', () => {
    it('6종 메서드는 전부 GET 만 사용한다 — 통계 조회가 쓰기 동사로 나가면 감사 로그와 권한 판정이 어긋난다', async () => {
      await statsAdminService.getSummary();
      await statsAdminService.getConnectStats();
      await statsAdminService.getBbsStats();
      await statsAdminService.getUserStats();
      await statsAdminService.getReportStats();
      await statsAdminService.getDataUsageStats();

      expect(client.get).toHaveBeenCalledTimes(6);
      expect(client.post).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
      expect(client.delete).not.toHaveBeenCalled();
    });
  });
});

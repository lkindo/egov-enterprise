/**
 * MonitoringAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/MonitoringAdminService.ts` 는 커버리지 0% 였다.
 * 그런데 이 파일은 형제 서비스들과 **구조 자체가 다르다** — 아래 항목들은 전부
 * 타입 검사·빌드를 통과한 채 런타임에서만 조용히 어긋난다.
 *
 * 1) 이 서비스는 `ApiService`/`AdminService` 를 **상속하지 않는다.**
 *    `axios.create({ baseURL: '/actuator/' })` 로 **자체 인스턴스**를 만들어 쓴다.
 *    즉 최종 경로는 `/actuator/health` 이지 `/api/v1/admin/system/...` 이 **아니다**.
 *    스프링 액추에이터는 `/api/v1` 컨텍스트 밖에 붙어 있기 때문이다. 누군가 "서비스 계층
 *    표준화" 명목으로 `AdminService` 상속으로 갈아끼우면 전 엔드포인트가 404 가 되는데,
 *    tsc·next build 는 전부 그린이다. 그 변경을 여기서 red 로 만든다.
 *
 * 2) axios 인스턴스 설정 — `withCredentials: true` 가 빠지면 HttpOnly `accessToken`
 *    쿠키가 동일출처 `/actuator` 로 전송되지 않는다. 그러면 Next.js 미들웨어가
 *    `Authorization: Bearer` 를 주입할 근거를 잃어 **모든 모니터링 요청이 401** 이 된다.
 *    `timeout: 10000` 이 사라지면 액추에이터가 느려질 때 대시보드가 무한 로딩에 갇힌다.
 *
 * 3) SSR/CSR baseURL 분기 — 서버에서는 상대경로 `/actuator/` 로 요청이 성립하지 않아
 *    절대 URL(`BACKEND_ACTUATOR_URL` 또는 localhost 기본값)로 갈라진다. 이 분기가 무너지면
 *    서버 컴포넌트 렌더링에서만 실패한다 — 브라우저 개발 중에는 절대 재현되지 않는다.
 *
 * 4) 단위 변환 — `getCpuUsage` 는 액추에이터가 주는 **0~1 비율**에 100 을 곱해 퍼센트로 바꾼다.
 *    이 곱이 빠지면 CPU 45% 가 화면에 **0.45%** 로 표시되어 경보 임계치를 영원히 넘지 못한다.
 *    `getMemoryUsage` 는 `used / max * 100` 이다 — 피연산자가 뒤집히면 400% 같은 값이 뜬다.
 *    `getUptime` 은 **초(seconds) 원값을 그대로** 돌려준다(ms 변환 없음).
 *
 * 5) 실패 처리의 **비대칭**이 곧 계약이다 —
 *    `getCpuUsage`/`getMemoryUsage`/`getUptime` 은 예외를 삼키고 `0` 으로 폴백한다(대시보드
 *    위젯 하나가 전체 화면을 깨뜨리지 않게). 반대로 `getHealth`/`getMetric` 은 예외를
 *    **그대로 던진다** — 여기에 폴백을 넣으면 장애 중인 서버가 화면상 정상으로 보인다.
 *    어느 쪽이든 반대로 바뀌면 아무도 눈치채지 못한 채 관측이 죽는다.
 *
 * 따라서 본 테스트는 "호출됐다" 가 아니라 **어떤 인스턴스 설정·경로·변환·폴백으로
 * 동작하는지**를 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 *
 * ※ 참고: 이 서비스에는 목록/페이징 API 가 없다. 따라서 형제 계약 테스트들이 고정하는
 *   `page → pageIndex(+1)` · `size → recordCountPerPage` 변환은 여기서 적용 대상이 아니다
 *   (그 변환은 `ApiService.get` 소유인데 이 서비스는 그 경로를 타지 않는다).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// axios 를 통째로 대체한다. 대상 모듈은 **import 시점에** axios.create() 를 호출하므로
// hoisted 로 선언해 모듈 평가보다 먼저 목이 준비되도록 한다.
const { axiosMock, actuatorClient } = vi.hoisted(() => {
  const actuatorClient = { get: vi.fn() };
  const axiosMock = {
    create: vi.fn((_config?: unknown) => actuatorClient),
  };
  return { axiosMock, actuatorClient };
});

vi.mock('axios', () => ({ default: axiosMock }));

import { monitoringAdminService } from '../MonitoringAdminService';

/** 소스가 인터페이스를 export 하지 않으므로 검증에 필요한 최소 형태만 테스트에서 재정의한다. */
interface ActuatorClientConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  timeout?: number;
}

// axios.create 는 **모듈 로드 시점에 한 번** 호출된다.
// beforeEach 의 clearAllMocks 가 그 기록을 지우기 전에 스냅샷해 둔다.
const bootstrapCreateCallCount = axiosMock.create.mock.calls.length;
const bootstrapConfig = axiosMock.create.mock.calls[0]?.[0] as ActuatorClientConfig | undefined;

/** 액추에이터 `/metrics/{name}` 응답 봉투(axios response)를 흉내낸다. */
const metricEnvelope = (name: string, value: number) => ({
  data: {
    name,
    description: `${name} 측정값`,
    baseUnit: 'none',
    measurements: [{ statistic: 'VALUE', value }],
    availableTags: [],
  },
  status: 200,
});

/** 실제 호출된 요청 경로만 뽑아낸다. */
const requestedPaths = (): string[] =>
  actuatorClient.get.mock.calls.map((call) => String(call[0]));

describe('MonitoringAdminService — 액추에이터 모니터링 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('axios 인스턴스 부트스트랩', () => {
    it('모듈 로드 시 액추에이터 전용 인스턴스를 정확히 한 번만 생성한다 — 호출마다 새로 만들면 커넥션 재사용과 설정이 흩어진다', () => {
      expect(bootstrapCreateCallCount).toBe(1);
    });

    it('브라우저에서는 동일출처 상대경로 /actuator/ 를 baseURL 로 쓴다 — /api/v1 컨텍스트 밖이다', () => {
      expect(bootstrapConfig).toEqual({
        baseURL: '/actuator/',
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
        timeout: 10000,
      });
    });

    it('withCredentials 가 켜져 있어야 HttpOnly accessToken 쿠키가 실린다 — 꺼지면 전 요청이 401 이다', () => {
      expect(bootstrapConfig?.withCredentials).toBe(true);
    });

    it('timeout 10초가 걸려 있다 — 사라지면 액추에이터 지연 시 대시보드가 무한 로딩에 갇힌다', () => {
      expect(bootstrapConfig?.timeout).toBe(10000);
    });
  });

  describe('getHealth (전체 헬스 체크)', () => {
    it('baseURL 에 이어붙는 상대경로 health 로 GET 한다 — 선행 슬래시나 api/v1 접두가 붙지 않는다', async () => {
      actuatorClient.get.mockResolvedValueOnce({ data: { status: 'UP' } });

      await monitoringAdminService.getHealth();

      expect(actuatorClient.get).toHaveBeenCalledWith('health');
    });

    it('응답 봉투가 아니라 res.data 를 반환한다 — .data 를 빠뜨리면 화면이 HTTP status 200 을 헬스 상태로 읽는다', async () => {
      const health = { status: 'UP', components: { db: { status: 'UP' } } };
      actuatorClient.get.mockResolvedValueOnce({ data: health, status: 200 });

      await expect(monitoringAdminService.getHealth()).resolves.toBe(health);
    });

    it('DOWN 상태도 가공 없이 그대로 통과시킨다 — 여기서 정규화하면 장애가 감춰진다', async () => {
      const health = { status: 'DOWN', components: { db: { status: 'DOWN' } } };
      actuatorClient.get.mockResolvedValueOnce({ data: health });

      await expect(monitoringAdminService.getHealth()).resolves.toBe(health);
    });

    it('조회 실패는 삼키지 않고 그대로 전파한다 — 0/UP 으로 폴백하면 장애 중 서버가 정상으로 보인다', async () => {
      actuatorClient.get.mockRejectedValueOnce(new Error('actuator 503'));

      await expect(monitoringAdminService.getHealth()).rejects.toThrow('actuator 503');
    });
  });

  describe('getMetric (개별 메트릭 조회)', () => {
    it('metrics/{name} 형태로 경로를 조합한다', async () => {
      actuatorClient.get.mockResolvedValueOnce(metricEnvelope('jvm.memory.used', 1));

      await monitoringAdminService.getMetric('jvm.memory.used');

      expect(actuatorClient.get).toHaveBeenCalledWith('metrics/jvm.memory.used');
    });

    it('메트릭 이름의 점(.)을 인코딩하지 않고 원문 그대로 경로에 박는다 — 인코딩하면 액추에이터가 404 를 준다', async () => {
      actuatorClient.get.mockResolvedValueOnce(metricEnvelope('http.server.requests', 7));

      await monitoringAdminService.getMetric('http.server.requests');

      const [path] = requestedPaths();
      expect(path).toBe('metrics/http.server.requests');
      expect(path).not.toContain('%2E');
    });

    it('res.data 를 반환한다 — 측정값 배열 구조를 그대로 노출한다', async () => {
      const envelope = metricEnvelope('process.uptime', 120);
      actuatorClient.get.mockResolvedValueOnce(envelope);

      await expect(monitoringAdminService.getMetric('process.uptime')).resolves.toBe(envelope.data);
    });

    it('조회 실패는 그대로 전파한다 — 폴백은 이 계층이 아니라 호출부(getCpuUsage 등)의 책임이다', async () => {
      actuatorClient.get.mockRejectedValueOnce(new Error('metric not found'));

      await expect(monitoringAdminService.getMetric('unknown.metric')).rejects.toThrow('metric not found');
    });
  });

  describe('getCpuUsage (CPU 사용률)', () => {
    it('system.cpu.usage 메트릭을 조회한다 — 다른 메트릭을 집으면 엉뚱한 수치가 대시보드에 뜬다', async () => {
      actuatorClient.get.mockResolvedValueOnce(metricEnvelope('system.cpu.usage', 0.25));

      await monitoringAdminService.getCpuUsage();

      expect(actuatorClient.get).toHaveBeenCalledWith('metrics/system.cpu.usage');
      expect(actuatorClient.get).toHaveBeenCalledTimes(1);
    });

    it('0~1 비율에 100 을 곱해 퍼센트로 변환한다 — 0.25 는 25 다 (곱이 빠지면 25% 가 0.25% 로 보인다)', async () => {
      actuatorClient.get.mockResolvedValueOnce(metricEnvelope('system.cpu.usage', 0.25));

      await expect(monitoringAdminService.getCpuUsage()).resolves.toBe(25);
    });

    it('사용률 0 은 0 으로 반환한다 — 폴백 값과 구분되지 않지만 예외 없이 정상 경로로 나온다', async () => {
      actuatorClient.get.mockResolvedValueOnce(metricEnvelope('system.cpu.usage', 0));

      await expect(monitoringAdminService.getCpuUsage()).resolves.toBe(0);
    });

    it('measurements 가 비어 있으면 예외를 던지지 않고 0 으로 폴백한다 — 위젯 하나가 대시보드 전체를 깨뜨리지 않는다', async () => {
      actuatorClient.get.mockResolvedValueOnce({
        data: { name: 'system.cpu.usage', description: '', baseUnit: '', measurements: [], availableTags: [] },
      });

      await expect(monitoringAdminService.getCpuUsage()).resolves.toBe(0);
    });

    it('조회 자체가 실패해도 0 으로 폴백한다', async () => {
      actuatorClient.get.mockRejectedValueOnce(new Error('network down'));

      await expect(monitoringAdminService.getCpuUsage()).resolves.toBe(0);
    });
  });

  describe('getMemoryUsage (메모리 사용률)', () => {
    it('jvm.memory.max 를 먼저, jvm.memory.used 를 나중에 — 두 메트릭을 순서대로 조회한다', async () => {
      actuatorClient.get
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.max', 4_294_967_296))
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.used', 1_073_741_824));

      await monitoringAdminService.getMemoryUsage();

      expect(requestedPaths()).toEqual(['metrics/jvm.memory.max', 'metrics/jvm.memory.used']);
    });

    it('used / max * 100 을 반환한다 — 1GiB/4GiB 는 25 다 (피연산자가 뒤집히면 400 이 나온다)', async () => {
      actuatorClient.get
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.max', 4_294_967_296))
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.used', 1_073_741_824));

      await expect(monitoringAdminService.getMemoryUsage()).resolves.toBe(25);
    });

    it('max 가 0 이면 0 을 반환한다 — 0 으로 나눠 Infinity 를 화면에 내보내지 않기 위한 가드다', async () => {
      actuatorClient.get
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.max', 0))
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.used', 512));

      await expect(monitoringAdminService.getMemoryUsage()).resolves.toBe(0);
    });

    it('max 가 음수(-1, 측정 불가)여도 0 을 반환한다 — 음수 퍼센트가 대시보드에 뜨지 않는다', async () => {
      actuatorClient.get
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.max', -1))
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.used', 512));

      await expect(monitoringAdminService.getMemoryUsage()).resolves.toBe(0);
    });

    it('두 번째 조회(used)가 실패하면 0 으로 폴백한다 — 첫 조회만 성공한 반쪽 상태를 노출하지 않는다', async () => {
      actuatorClient.get
        .mockResolvedValueOnce(metricEnvelope('jvm.memory.max', 4_294_967_296))
        .mockRejectedValueOnce(new Error('used metric unavailable'));

      await expect(monitoringAdminService.getMemoryUsage()).resolves.toBe(0);
    });

    it('첫 조회(max)가 실패하면 used 는 조회하지 않고 곧바로 0 으로 폴백한다', async () => {
      actuatorClient.get.mockRejectedValueOnce(new Error('max metric unavailable'));

      await expect(monitoringAdminService.getMemoryUsage()).resolves.toBe(0);
      expect(requestedPaths()).toEqual(['metrics/jvm.memory.max']);
    });
  });

  describe('getUptime (가동 시간)', () => {
    it('process.uptime 메트릭을 조회한다', async () => {
      actuatorClient.get.mockResolvedValueOnce(metricEnvelope('process.uptime', 86_400));

      await monitoringAdminService.getUptime();

      expect(actuatorClient.get).toHaveBeenCalledWith('metrics/process.uptime');
    });

    it('초 단위 원값을 변환 없이 그대로 반환한다 — ms 나 분으로 바꾸면 화면 표기가 통째로 어긋난다', async () => {
      actuatorClient.get.mockResolvedValueOnce(metricEnvelope('process.uptime', 86_400));

      await expect(monitoringAdminService.getUptime()).resolves.toBe(86_400);
    });

    it('조회 실패 시 0 으로 폴백한다', async () => {
      actuatorClient.get.mockRejectedValueOnce(new Error('actuator unreachable'));

      await expect(monitoringAdminService.getUptime()).resolves.toBe(0);
    });
  });

  describe('요청 경로 격리 — 액추에이터는 /api/v1 관리자 API 가 아니다', () => {
    it('모든 요청 경로에 선행 슬래시·api/v1·admin 접두가 없다 — AdminService 상속으로 갈아끼우는 회귀를 차단한다', async () => {
      actuatorClient.get
        .mockResolvedValueOnce({ data: { status: 'UP' } })
        .mockResolvedValueOnce(metricEnvelope('system.cpu.usage', 0.5))
        .mockResolvedValueOnce(metricEnvelope('process.uptime', 10));

      await monitoringAdminService.getHealth();
      await monitoringAdminService.getCpuUsage();
      await monitoringAdminService.getUptime();

      expect(requestedPaths()).toEqual([
        'health',
        'metrics/system.cpu.usage',
        'metrics/process.uptime',
      ]);
      for (const path of requestedPaths()) {
        expect(path).not.toMatch(/^\//);
        expect(path).not.toContain('api/v1');
        expect(path).not.toContain('admin/');
      }
    });

    it('모든 호출은 부트스트랩 때 만든 단일 인스턴스를 재사용한다 — 호출 중 axios.create 가 다시 불리지 않는다', async () => {
      actuatorClient.get.mockResolvedValueOnce({ data: { status: 'UP' } });

      await monitoringAdminService.getHealth();

      expect(axiosMock.create).not.toHaveBeenCalled();
    });
  });

  describe('SSR(서버) 환경의 baseURL 분기', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    /** window 를 지운 뒤 모듈을 새로 적재하고, 그때 axios.create 에 전달된 설정을 돌려준다. */
    const loadOnServer = async (): Promise<ActuatorClientConfig | undefined> => {
      vi.resetModules();
      vi.stubGlobal('window', undefined);
      axiosMock.create.mockClear();
      await import('../MonitoringAdminService');
      return axiosMock.create.mock.calls[0]?.[0] as ActuatorClientConfig | undefined;
    };

    it('window 가 없으면 상대경로가 아니라 절대 URL 을 쓴다 — 서버에서 /actuator/ 상대경로 요청은 성립하지 않는다', async () => {
      const config = await loadOnServer();

      expect(config?.baseURL).toBe('http://localhost:8080/actuator/');
      expect(config?.baseURL).not.toBe('/actuator/');
    });

    it('BACKEND_ACTUATOR_URL 이 설정돼 있으면 localhost 기본값보다 우선한다', async () => {
      vi.stubEnv('BACKEND_ACTUATOR_URL', 'http://backend.internal:9090/actuator/');

      const config = await loadOnServer();

      expect(config?.baseURL).toBe('http://backend.internal:9090/actuator/');
    });

    it('서버 분기에서도 withCredentials·timeout 등 나머지 설정은 동일하게 유지된다', async () => {
      const config = await loadOnServer();

      expect(config?.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(config?.withCredentials).toBe(true);
      expect(config?.timeout).toBe(10000);
    });
  });
});

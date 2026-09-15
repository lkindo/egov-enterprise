import axios from 'axios';
import { z } from 'zod';

// Get Base URL for Actuator (without /api/v1 prefix)
const getActuatorBaseURL = () => {
  if (typeof window === 'undefined') {
    return process.env.BACKEND_ACTUATOR_URL || 'http://localhost:8080/actuator/';
  }
  return '/actuator/';
};

const actuatorInstance = axios.create({
  baseURL: getActuatorBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  // 브라우저: withCredentials 로 HttpOnly accessToken 쿠키가 동일출처 /actuator 로 전송되고
  // Next.js 미들웨어가 이를 Authorization: Bearer 로 주입한다(클라이언트 헤더 주입 불필요).
  // (localStorage 토큰 읽기는 HttpOnly 전환으로 항상 null 이라 제거함)
  withCredentials: true,
  timeout: 10000,
});

export interface HealthResponse {
  status: 'UP' | 'DOWN' | 'OUT_OF_SERVICE' | 'UNKNOWN';
  components?: Record<string, HealthComponent>;
}

export interface HealthComponent {
  status?: string;
  details?: Record<string, unknown>;
  components?: Record<string, HealthComponent>;
}

export interface MetricResponse {
  name: string;
  description?: string;
  baseUnit?: string;
  measurements: Array<{ statistic: string; value: number }>;
  availableTags?: Array<{ tag: string; values: string[] }>;
}

// Actuator는 `/api/v1` OpenAPI 문서 밖의 별도 transport다. generated descriptor로 가장하지 않고,
// 이 특수 경계가 실제로 노출하는 두 응답만 로컬 strict schema로 검증한다.
const HealthComponentSchema: z.ZodType<HealthComponent> = z.lazy(() => z.strictObject({
  status: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  components: z.record(z.string(), HealthComponentSchema).optional(),
}));

const HealthResponseSchema: z.ZodType<HealthResponse> = z.strictObject({
  status: z.enum(['UP', 'DOWN', 'OUT_OF_SERVICE', 'UNKNOWN']),
  components: z.record(z.string(), HealthComponentSchema).optional(),
});

const MetricResponseSchema: z.ZodType<MetricResponse> = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  baseUnit: z.string().optional(),
  measurements: z.array(z.strictObject({
    statistic: z.string(),
    value: z.number(),
  })),
  availableTags: z.array(z.strictObject({
    tag: z.string(),
    values: z.array(z.string()),
  })).optional(),
});

function parseHealthResponse(value: unknown): HealthResponse {
  const parsed = HealthResponseSchema.safeParse(value);
  if (!parsed.success) throw new Error('Actuator health 응답이 계약과 일치하지 않습니다.');
  return parsed.data;
}

function parseMetricResponse(value: unknown): MetricResponse {
  const parsed = MetricResponseSchema.safeParse(value);
  if (!parsed.success) throw new Error('Actuator metric 응답이 계약과 일치하지 않습니다.');
  return parsed.data;
}

/**
 * 액추에이터 모니터링 서비스
 */
class MonitoringAdminService {
  /**
   * 전체 시스템 헬스 체크
   */
  async getHealth(): Promise<HealthResponse> {
    const res = await actuatorInstance.get<unknown>('health');
    return parseHealthResponse(res.data);
  }

  /**
   * 특정 메트릭 조회
   */
  async getMetric(name: string, tag?: string): Promise<MetricResponse> {
    const res = tag
      ? await actuatorInstance.get<unknown>(`metrics/${name}`, { params: { tag } })
      : await actuatorInstance.get<unknown>(`metrics/${name}`);
    return parseMetricResponse(res.data);
  }

  /**
   * CPU 사용률 조회
   */
  async getCpuUsage(): Promise<number | null> {
    // [2026-09-15 DEC-OPS-100] 조회 실패·측정값 부재를 0% 로 돌려주지 않는다 — 유휴와 실패가 같은 값이 된다.
    try {
      const data = await this.getMetric('system.cpu.usage');
      const ratio = data.measurements[0]?.value;
      return typeof ratio === 'number' && Number.isFinite(ratio) ? ratio * 100 : null;
    } catch {
      return null;
    }
  }

  /**
   * 메모리 사용률 조회
   */
  async getMemoryUsage(): Promise<number | null> {
    try {
      const max = await this.getMetric('jvm.memory.max');
      const used = await this.getMetric('jvm.memory.used');
      const maxValue = max.measurements[0]?.value;
      const usedValue = used.measurements[0]?.value;
      // max 가 0 이하(-1 = 측정 불가)거나 값이 없으면 사용률을 계산할 수 없다 — 0% 가 아니라 측정값 없음이다.
      if (typeof maxValue !== 'number' || !(maxValue > 0) || typeof usedValue !== 'number' || !Number.isFinite(usedValue)) {
        return null;
      }
      return (usedValue / maxValue) * 100;
    } catch {
      return null;
    }
  }

  /**
   * 가동 시간(Uptime) 조회
   */
  async getUptime(): Promise<number> {
    try {
      const data = await this.getMetric('process.uptime');
      return data.measurements[0].value; // seconds
    } catch {
      return 0;
    }
  }
}

export const monitoringAdminService = new MonitoringAdminService();

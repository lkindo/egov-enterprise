import axios from 'axios';

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

/**
 * 액추에이터 모니터링 서비스
 */
class MonitoringAdminService {
  /**
   * 전체 시스템 헬스 체크
   */
  async getHealth(): Promise<HealthResponse> {
    const res = await actuatorInstance.get<HealthResponse>('health');
    return res.data;
  }

  /**
   * 특정 메트릭 조회
   */
  async getMetric(name: string, tag?: string): Promise<MetricResponse> {
    const res = tag
      ? await actuatorInstance.get<MetricResponse>(`metrics/${name}`, { params: { tag } })
      : await actuatorInstance.get<MetricResponse>(`metrics/${name}`);
    return res.data;
  }

  /**
   * CPU 사용률 조회
   */
  async getCpuUsage(): Promise<number> {
    try {
      const data = await this.getMetric('system.cpu.usage');
      return (data.measurements[0].value * 100) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * 메모리 사용률 조회
   */
  async getMemoryUsage(): Promise<number> {
    try {
      const max = await this.getMetric('jvm.memory.max');
      const used = await this.getMetric('jvm.memory.used');
      const maxValue = max.measurements[0].value;
      const usedValue = used.measurements[0].value;
      if (maxValue <= 0) return 0;
      return (usedValue / maxValue) * 100;
    } catch {
      return 0;
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

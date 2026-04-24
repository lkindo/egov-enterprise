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
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor for token (same as client.ts)
actuatorInstance.interceptors.request.use(
  async (config) => {
    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('accessToken');
    }
    if (token && token !== 'null' && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface HealthResponse {
  status: 'UP' | 'DOWN' | 'OUT_OF_SERVICE' | 'UNKNOWN';
  components?: Record<string, any>;
}

export interface MetricResponse {
  name: string;
  description: string;
  baseUnit: string;
  measurements: Array<{ statistic: string; value: number }>;
  availableTags: Array<{ tag: string; values: string[] }>;
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
  async getMetric(name: string): Promise<MetricResponse> {
    const res = await actuatorInstance.get<MetricResponse>(`metrics/${name}`);
    return res.data;
  }

  /**
   * CPU 사용률 조회
   */
  async getCpuUsage(): Promise<number> {
    try {
      const data = await this.getMetric('system.cpu.usage');
      return (data.measurements[0].value * 100) || 0;
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
      return 0;
    }
  }
}

export const monitoringAdminService = new MonitoringAdminService();

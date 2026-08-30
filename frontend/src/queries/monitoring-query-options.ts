import { queryOptions } from '@tanstack/react-query';
import {
  monitoringAdminService,
  type HealthResponse,
  type MetricResponse,
} from '@/services/foundation/system/MonitoringAdminService';

export const PLACEHOLDER = '—';

export interface MetricsState {
  traffic: string;
  latency: string;
  errorRate: string;
  cpuUsage: string;
  healthStatus: string;
  live: boolean;
}

export const IDLE_METRICS: MetricsState = {
  traffic: PLACEHOLDER,
  latency: PLACEHOLDER,
  errorRate: PLACEHOLDER,
  cpuUsage: PLACEHOLDER,
  healthStatus: 'UNKNOWN',
  live: false,
};

export const monitoringKeys = {
  all: ['monitoring'] as const,
  health: () => [...monitoringKeys.all, 'health'] as const,
  metrics: () => [...monitoringKeys.all, 'metric'] as const,
  cpu: () => [...monitoringKeys.metrics(), 'cpu'] as const,
  memory: () => [...monitoringKeys.metrics(), 'memory'] as const,
  dashboard: () => [...monitoringKeys.all, 'actuator-dashboard'] as const,
};

async function available<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch {
    return null;
  }
}

function measurementValue(metric: MetricResponse | null, statistic: string): number | null {
  return metric?.measurements.find((measurement) => measurement.statistic === statistic)?.value ?? null;
}

async function loadDashboardMetrics(): Promise<MetricsState> {
  const [health, cpu, httpRequests, uptime, serverErrors] = await Promise.all([
    available<HealthResponse>(monitoringAdminService.getHealth()),
    available<MetricResponse>(monitoringAdminService.getMetric('system.cpu.usage')),
    available<MetricResponse>(monitoringAdminService.getMetric('http.server.requests')),
    available<MetricResponse>(monitoringAdminService.getMetric('process.uptime')),
    available<MetricResponse>(monitoringAdminService.getMetric(
      'http.server.requests',
      'outcome:SERVER_ERROR',
    )),
  ]);

  const cpuValue = measurementValue(cpu, 'VALUE');
  const requestCount = measurementValue(httpRequests, 'COUNT');
  const uptimeSeconds = measurementValue(uptime, 'VALUE');
  const totalTime = measurementValue(httpRequests, 'TOTAL_TIME');
  const errorCount = measurementValue(serverErrors, 'COUNT');

  return {
    traffic: requestCount !== null && uptimeSeconds !== null && uptimeSeconds > 0
      ? (requestCount / uptimeSeconds).toFixed(2)
      : PLACEHOLDER,
    latency: totalTime !== null && requestCount !== null && requestCount > 0
      ? Math.round((totalTime / requestCount) * 1000).toString()
      : PLACEHOLDER,
    errorRate: requestCount !== null && requestCount > 0
      ? (((errorCount ?? 0) / requestCount) * 100).toFixed(2)
      : PLACEHOLDER,
    cpuUsage: cpuValue !== null ? (cpuValue * 100).toFixed(1) : PLACEHOLDER,
    healthStatus: health?.status ?? 'UNKNOWN',
    live: Boolean(health || cpu || httpRequests || uptime || serverErrors),
  };
}

export const monitoringQueryOptions = {
  health: () => queryOptions({
    queryKey: monitoringKeys.health(),
    queryFn: () => monitoringAdminService.getHealth(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  }),
  cpu: () => queryOptions({
    queryKey: monitoringKeys.cpu(),
    queryFn: () => monitoringAdminService.getCpuUsage(),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  }),
  memory: () => queryOptions({
    queryKey: monitoringKeys.memory(),
    queryFn: () => monitoringAdminService.getMemoryUsage(),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  }),
  dashboard: () => queryOptions({
    queryKey: monitoringKeys.dashboard(),
    queryFn: loadDashboardMetrics,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 4_000,
  }),
};

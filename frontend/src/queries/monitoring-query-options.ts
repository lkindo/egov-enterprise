import { queryOptions } from '@tanstack/react-query';
import { monitoringAdminService } from '@/services/foundation/system/MonitoringAdminService';

// [2026-10-18] actuator 대시보드 지표(dashboard)는 걷었다 — 그것을 그리던 /admin/observability 는 next.config 가 먼저
//   감시 허브로 보내 실행될 수 없었고, 화면을 redirect 스텁으로 바꾸며 전용 코드를 지웠다(DEC-OPS-350).
export const monitoringKeys = {
  all: ['monitoring'] as const,
  health: () => [...monitoringKeys.all, 'health'] as const,
  metrics: () => [...monitoringKeys.all, 'metric'] as const,
  cpu: () => [...monitoringKeys.metrics(), 'cpu'] as const,
  memory: () => [...monitoringKeys.metrics(), 'memory'] as const,
};

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
};

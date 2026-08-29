import { describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  getCpuUsage: vi.fn(),
  getHealth: vi.fn(),
  getMemoryUsage: vi.fn(),
  getMetric: vi.fn(),
}));

vi.mock('@/services/foundation/system/MonitoringAdminService', () => ({
  monitoringAdminService: service,
}));

import {
  monitoringKeys,
  monitoringQueryOptions,
} from '../monitoring-query-options';

describe('monitoring query ownership', () => {
  it('health·cpu·memory·dashboard key와 폴링 옵션을 한 도메인에서 소유한다', () => {
    expect(monitoringKeys.health()).toEqual(['monitoring', 'health']);
    expect(monitoringKeys.cpu()).toEqual(['monitoring', 'metric', 'cpu']);
    expect(monitoringKeys.memory()).toEqual(['monitoring', 'metric', 'memory']);
    expect(monitoringKeys.dashboard()).toEqual(['monitoring', 'actuator-dashboard']);
    expect(monitoringQueryOptions.dashboard().refetchInterval).toBe(5000);
  });

  it('dashboard query가 actuator 호출과 지표 계산을 소유한다', async () => {
    service.getHealth.mockResolvedValueOnce({ status: 'UP' });
    service.getMetric.mockImplementation(async (name: string, tag?: string) => {
      if (name === 'system.cpu.usage') {
        return { name, measurements: [{ statistic: 'VALUE', value: 0.125 }] };
      }
      if (name === 'process.uptime') {
        return { name, measurements: [{ statistic: 'VALUE', value: 50 }] };
      }
      return {
        name,
        measurements: tag
          ? [{ statistic: 'COUNT', value: 5 }]
          : [{ statistic: 'COUNT', value: 100 }, { statistic: 'TOTAL_TIME', value: 20 }],
      };
    });

    const options = monitoringQueryOptions.dashboard();
    const result = await options.queryFn?.({ queryKey: options.queryKey } as never);

    expect(result).toEqual({
      traffic: '2.00',
      latency: '200',
      errorRate: '5.00',
      cpuUsage: '12.5',
      healthStatus: 'UP',
      live: true,
    });
    expect(service.getMetric).toHaveBeenCalledWith(
      'http.server.requests',
      'outcome:SERVER_ERROR',
    );
  });

  it('actuator 전체가 미가용이면 fabricated 0 대신 미가용 상태를 반환한다', async () => {
    service.getHealth.mockRejectedValueOnce(new Error('403'));
    service.getMetric.mockRejectedValue(new Error('unavailable'));

    const options = monitoringQueryOptions.dashboard();
    await expect(options.queryFn?.({ queryKey: options.queryKey } as never)).resolves.toEqual({
      traffic: '—',
      latency: '—',
      errorRate: '—',
      cpuUsage: '—',
      healthStatus: 'UNKNOWN',
      live: false,
    });
  });
});

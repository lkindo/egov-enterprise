import { describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  getCpuUsage: vi.fn(),
  getHealth: vi.fn(),
  getMemoryUsage: vi.fn(),
}));

vi.mock('@/services/foundation/system/MonitoringAdminService', () => ({
  monitoringAdminService: service,
}));

import {
  monitoringKeys,
  monitoringQueryOptions,
} from '../monitoring-query-options';

describe('monitoring query ownership', () => {
  it('health·cpu·memory key와 폴링 옵션을 한 도메인에서 소유한다', () => {
    expect(monitoringKeys.health()).toEqual(['monitoring', 'health']);
    expect(monitoringKeys.cpu()).toEqual(['monitoring', 'metric', 'cpu']);
    expect(monitoringKeys.memory()).toEqual(['monitoring', 'metric', 'memory']);
    expect(monitoringQueryOptions.health().refetchInterval).toBe(30_000);
    expect(monitoringQueryOptions.cpu().refetchInterval).toBe(5000);
    expect(monitoringQueryOptions.memory().refetchInterval).toBe(5000);
  });
});

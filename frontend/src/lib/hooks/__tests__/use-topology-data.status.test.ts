import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/foundation/system/networkService', () => ({ networkService: { getStatus: vi.fn() } }));

import { toNodeStatus } from '../use-topology-data';

/**
 * [2026-09-15 DEC-OPS-100] 계측 행의 상태 값은 아는 값만 정상·장애로 옮긴다.
 * 종전에는 UP·정상이 아니면 전부 장애(down)로 단정했다 — 모르는 값은 상태 미확인이다(term-operational-status).
 */
describe('toNodeStatus', () => {
  it('UP·정상은 정상이다', () => {
    expect(toNodeStatus('UP')).toBe('up');
    expect(toNodeStatus(' up ')).toBe('up');
    expect(toNodeStatus('정상')).toBe('up');
  });

  it('DOWN·장애·OUT_OF_SERVICE 는 장애다', () => {
    expect(toNodeStatus('DOWN')).toBe('down');
    expect(toNodeStatus('장애')).toBe('down');
    expect(toNodeStatus('OUT_OF_SERVICE')).toBe('down');
  });

  it('비었거나 모르는 값은 장애로 단정하지 않고 상태 미확인이다', () => {
    expect(toNodeStatus(undefined)).toBe('unknown');
    expect(toNodeStatus('')).toBe('unknown');
    expect(toNodeStatus('MAINTENANCE')).toBe('unknown');
  });
});

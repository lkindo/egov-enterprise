/**
 * 네트워크 토폴로지 화면이 실제로 사용하는 모니터링 조회 계약만 검증한다.
 * 매핑이 없는 `/admin/system/networks` CRUD를 다시 노출하면 공개 표면 테스트가 실패한다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  getRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { networkService, type NetworkStatusDetailed } from '../networkService';

const MONITORING_PATH = 'admin/system/ntwrksvc-monitoring';
const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });

describe('networkService — 네트워크 모니터링 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockResolvedValue(envelope({
      list: [], total: 0, page: 1, size: 10, totalPage: 0,
    }));
  });

  it('실사용 getStatus만 공개한다', () => {
    expect(Object.keys(networkService)).toStrictEqual(['getStatus']);
  });

  it('상태 목록을 실제 백엔드 모니터링 경로에서 조회한다', async () => {
    await networkService.getStatus({ page: 0, size: 50 });

    expect(client.getRaw).toHaveBeenCalledWith(MONITORING_PATH, {
      params: { pageIndex: 1, pageUnit: 50 },
    });
    expect(client.get).not.toHaveBeenCalled();
  });

  it('params를 생략해도 호출 형태를 바꾸지 않는다', async () => {
    await networkService.getStatus();

    expect(client.getRaw).toHaveBeenCalledWith(MONITORING_PATH, { params: {} });
  });

  it('호출부의 검색 객체를 변형하지 않는다', async () => {
    const params: SearchParams = { page: 2, size: 20 };

    await networkService.getStatus(params);

    expect(params).toStrictEqual({ page: 2, size: 20 });
  });

  it('모니터링 응답을 재포장하지 않는다', async () => {
    const response: PageResponse<NetworkStatusDetailed> = {
      list: [
        {
          sysNm: 'API-GATEWAY',
          sysIp: '10.0.0.10',
          sysPort: '8080',
          svcSttus: 'UP',
          logDt: '2026-08-16 00:00:00',
        },
      ],
      total: 1,
      page: 1,
      size: 50,
      totalPage: 1,
    };
    client.getRaw.mockResolvedValueOnce(envelope(response));

    await expect(networkService.getStatus()).resolves.toStrictEqual(response);
  });

  it('필수 네트워크 상태 필드가 빠진 응답은 경계에서 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(envelope({
      list: [{ sysNm: 'API-GATEWAY' }],
      total: 1,
      page: 1,
      size: 50,
      totalPage: 1,
    }));

    await expect(networkService.getStatus()).rejects.toThrow(/필수 계약/);
  });

  it('조회 실패를 빈 목록으로 숨기지 않는다', async () => {
    const failure = new Error('모니터링 소스 연결 실패');
    client.getRaw.mockRejectedValueOnce(failure);

    await expect(networkService.getStatus()).rejects.toBe(failure);
  });
});

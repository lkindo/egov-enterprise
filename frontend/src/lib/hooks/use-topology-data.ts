import { useQuery } from '@tanstack/react-query';
import { networkService } from '@/services/foundation/system/networkService';

export type TopologyNodeStatus = 'up' | 'down' | 'unknown';

/**
 * 실시간 토폴로지 데이터 연동용 후크
 *
 * [2026-09-15 DEC-OPS-100] 조회 실패를 빈 목록으로 삼키지 않는다. 빈 목록은 "계측 소스 없음"으로 그려져 실패가
 * 연동 부재로 읽혔다. 알 수 없는 상태 값도 장애로 단정하지 않고 상태 미확인으로 둔다.
 */
export const useTopologyData = () => {
    return useQuery({
        queryKey: ['topology-data'],
        queryFn: async () => {
            const response = await networkService.getStatus({ page: 0, size: 50 });
            const rawData = response.list || [];
            return rawData.map(item => ({
                id: item.sysNm,
                label: item.sysNm,
                ip: item.sysIp,
                port: item.sysPort,
                status: toNodeStatus(item.svcSttus),
                type: inferNodeType(item.sysNm)
            }));
        },
        refetchInterval: 5000,
    });
};

export function toNodeStatus(value: unknown): TopologyNodeStatus {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized === 'UP' || normalized === '정상') return 'up';
    if (normalized === 'DOWN' || normalized === '장애' || normalized === 'OUT_OF_SERVICE') return 'down';
    return 'unknown';
}

function inferNodeType(name: string): 'api' | 'db' | 'cache' | 'ext' | 'lb' {
    const n = String(name || '').toUpperCase();
    if (n.includes('LB') || n.includes('GATEWAY')) return 'lb';
    if (n.includes('DB') || n.includes('POSTGRES')) return 'db';
    if (n.includes('REDIS') || n.includes('CACHE')) return 'cache';
    if (n.includes('EXT') || n.includes('AUTH')) return 'ext';
    return 'api';
}

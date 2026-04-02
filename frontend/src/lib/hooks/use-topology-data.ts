import { useQuery } from '@tanstack/react-query';
import { networkService } from '@/services/foundation/system/networkService';

/**
 * 실시간 토폴로지 데이터 연동용 후크
 */
export const useTopologyData = () => {
    return useQuery({
        queryKey: ['topology-data'],
        queryFn: async () => {
            try {
                const response = await networkService.getStatus({ page: 0, size: 50 });
                const rawData = response.list || [];
                
                // 실제 데이터를 기반으로 노드 상태 매핑
                return rawData.map(item => ({
                    id: item.sysNm,
                    label: item.sysNm,
                    ip: item.sysIp,
                    port: item.sysPort,
                    status: (item.svcSttus === 'UP' || item.svcSttus === '정상') ? 'up' : 'down',
                    type: inferNodeType(item.sysNm)
                }));
            } catch (error) {
                console.warn('Topology data fetch failed, using fallback', error);
                return [];
            }
        },
        refetchInterval: 5000,
    });
};

function inferNodeType(name: string): 'api' | 'db' | 'cache' | 'ext' | 'lb' {
    const n = name.toUpperCase();
    if (n.includes('LB') || n.includes('GATEWAY')) return 'lb';
    if (n.includes('DB') || n.includes('POSTGRES')) return 'db';
    if (n.includes('REDIS') || n.includes('CACHE')) return 'cache';
    if (n.includes('EXT') || n.includes('AUTH')) return 'ext';
    return 'api';
}

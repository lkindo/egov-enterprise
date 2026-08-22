import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { networkAdminService, Network } from '@/services/foundation/system/NetworkAdminService';
import NetworkAdminClient from './NetworkAdminClient';

export const metadata = {
  title: '네트워크 인프라 지형 관리 및 최적화 | 전자정부 표준프레임워크',
  description: '시스템 전반의 네트워크 토폴로지 정보를 관리하고 최적의 연결성을 보장합니다',
};

/**
 * 응답을 노드 배열로 정규화한다.
 * `NetworkAdminService.getNetworks` 의 선언 타입은 `Network[]` 지만 실제 응답은
 * `PageResponse`(`{ list, total, ... }`) 형태로 내려온다(서비스 타입 정정은 서비스 파일 소유자 몫).
 * 여기서는 `as any` 로 덮지 않고 런타임 형태를 좁혀서 두 계약 모두를 안전하게 수용한다.
 */
function toNetworkList(response: unknown): Network[] {
  if (Array.isArray(response)) return response as Network[];
  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    for (const key of ['list', 'content'] as const) {
      if (Array.isArray(record[key])) return record[key] as Network[];
    }
  }
  return [];
}

async function NetworkDataContainer() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 서버 사이드 초기 데이터 페칭
  let initialNetworks: Network[] = [];
  // [P1-1] 실패를 빈 배열로 삼키면 화면이 '등록된 노드 0건'이라고 거짓말한다.
  //        사유를 클라이언트로 내려 오류 상태 + 재시도로 노출한다.
  let fetchError: string | null = null;

  try {
    const response = await networkAdminService.getNetworks({ page: 0, size: 100 }, axiosConfig);
    initialNetworks = toNetworkList(response);
  } catch (error) {
    fetchError = error instanceof Error && error.message
      ? error.message
      : '네트워크 노드 목록을 불러오지 못했습니다.';
  }

  return <NetworkAdminClient initialNetworks={initialNetworks} fetchError={fetchError} />;
}

export default function AdminNetworkPage() {
  return (
    <Suspense fallback={<NetworkAdminLoading />}>
      <NetworkDataContainer />
    </Suspense>
  );
}

function NetworkAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col text-left">
      <h1 className="sr-only">네트워크 관리를 불러오는 중</h1>
      <div className="h-11 w-96 bg-muted rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 shrink-0">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-muted rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 shrink-0">
        <div className="md:col-span-2 h-64 bg-muted/70 rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
      <div className="flex-1 bg-muted/50 rounded-lg p-12 mt-8" />
    </div>
  );
}

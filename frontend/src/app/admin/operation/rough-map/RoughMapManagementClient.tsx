'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Navigation, Layers } from 'lucide-react';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { roughMapService, RoughMapInfo } from '@/services/business/roughmap/roughMapService';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

export default function RoughMapManagementClient() {
  const [keyword, setKeyword] = useState('');
  // 타이핑 한 글자마다 서버 요청이 나가지 않도록 디바운스 값만 queryKey 에 넣는다.
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const { data: roughMapsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rough-maps-list', debouncedKeyword],
    queryFn: () => roughMapService.getRoughMaps({ keyword: debouncedKeyword, size: 20 }),
  });

  const displayItems: RoughMapInfo[] = roughMapsData?.list ?? [];
  const totalItems = roughMapsData?.total ?? 0;

  const columns: Column<RoughMapInfo>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {(index !== undefined ? index + 1 : 0).toString().padStart(2, '0')}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '거점 명칭',
      accessor: (map) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {map.roughMapSj}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            ID: {map.roughMapId}
          </span>
        </div>
      )
    },
    {
      header: '주소',
      accessor: (map) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">{map.roughMapAddress}</span>
      )
    },
    {
      header: '좌표 (위도/경도)',
      accessor: (map) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">
          {map.lat} / {map.lng}
        </span>
      ),
      className: 'w-48'
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="약도 및 거점 관리"
        breadcrumbs={[{ label: '운영지원' }, { label: '공간관리' }]}
      />

      {/*
        주의: 이 화면이 호출하는 `/api/v1/rough-maps` 백엔드 컨트롤러는 현재 저장소에 존재하지 않는다(감사 ops-04).
        따라서 조회는 실패하며, 아래 StandardDataTable 의 error/onRetry 배선이 그 실패를 화면에 그대로 드러낸다.
        (기존에는 실패가 '거점 없음' 빈 상태로 위장되어 유령 화면임이 은폐됐다.)
        등록/수정/삭제 버튼은 핸들러가 없는 死버튼이었으므로 제거했다.
        화면 존치 여부(백엔드 신설 vs 라우트 폐기)는 제품 결정 사항이다.
      */}
      <HubHeader
        title="약도"
        highlight="Intelligence"
        subtitle="사내 주요 거점 및 시설의 지리 정보와 약도를 조회합니다."
        icon={Navigation}
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 거점" value={totalItems} icon={Layers} color="primary" />
      </HubMetricGrid>

      <HubSectionCard
        title="거점 자산 매트릭스"
        description="시스템에 등록된 모든 지리 공간 자산의 상세 명세입니다."
        icon={MapPin}
        className="bg-card/60 backdrop-blur-md border border-border/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
            <div className="relative group max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} aria-hidden="true" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="거점 명칭 또는 주소 검색"
                className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="거점 명칭 또는 주소 검색.."
              />
            </div>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={displayItems}
              loading={isLoading}
              error={isError ? (error as Error) : null}
              onRetry={() => refetch()}
              emptyMessage="등록된 거점이 없습니다."
              keyField="roughMapId"
              isPremium={true}
              className="border-none bg-transparent shadow-none"
            />
          </div>
        </div>
      </HubSectionCard>
    </div>
  );
}

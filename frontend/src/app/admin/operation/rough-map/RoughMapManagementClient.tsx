'use client';

import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { roughMapService, RoughMapInfo } from '@/services/business/roughmap/roughMapService';
import { Input } from '@/components/ui/input';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';

/**
 * A1(조회형 목록) archetype 이행 — docs/02-architecture/work-screen-grammar-catalog.md §5 A1.
 *
 * 조회 조건은 입력 즉시(디바운스) 반영되는 화면이라 공용 KeywordFilter(명시 제출) 대신
 * 자체 입력을 조회 조건 영역에 둔다 — 조회 시점 계약이 화면마다 달라지지 않도록 라벨과
 * 위치는 다른 A1 화면과 동일하게 맞춘다.
 */
export default function RoughMapManagementClient() {
  const keywordInputId = useId();
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
      // G4 — 행을 식별하는 열이다(상세 화면은 아직 없다).
      header: '거점 명칭',
      accessor: (map) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {map.roughMapSj}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest opacity-60">
            ID: {map.roughMapId}
          </span>
        </div>
      ),
      sortKey: 'roughMapSj'
    },
    {
      header: '주소',
      accessor: (map) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">{map.roughMapAddress}</span>
      ),
      sortKey: 'roughMapAddress'
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
    /*
      주의: 이 화면이 호출하는 `/api/v1/rough-maps` 백엔드 컨트롤러는 현재 저장소에 존재하지 않는다(감사 ops-04).
      따라서 조회는 실패하며, 아래 StandardDataTable 의 error/onRetry 배선이 그 실패를 화면에 그대로 드러낸다.
      (기존에는 실패가 '거점 없음' 빈 상태로 위장되어 유령 화면임이 은폐됐다.)
      등록/수정/삭제 버튼은 핸들러가 없는 死버튼이었으므로 제거했다.
      화면 존치 여부(백엔드 신설 vs 라우트 폐기)는 제품 결정 사항이다.
    */
    <WorkListPage
      title="약도 및 거점 관리"
      description="사내 주요 거점 및 시설의 지리 정보를 조회합니다."
      breadcrumbItems={[{ label: '운영지원' }, { label: '공간관리' }]}
      filterStateKey="operation-rough-map"
      // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
      totalCount={isError ? undefined : totalItems}
      filter={
        <div className="min-w-60 max-w-xl space-y-1">
          <label htmlFor={keywordInputId} className="text-[length:var(--font-size-body)] font-medium">
            거점 명칭 · 주소
          </label>
          <Input
            id={keywordInputId}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            aria-label="거점 명칭 또는 주소 검색"
            placeholder="입력하면 바로 조회됩니다"
          />
        </div>
      }
    >
      <StandardDataTable
        accessibleLabel="거점 목록"
        columns={columns}
        data={displayItems}
        loading={isLoading}
        error={isError ? (error as Error) : null}
        onRetry={() => refetch()}
        emptyMessage={emptyResultMessage(debouncedKeyword, '등록된 거점이 없습니다.')}
        keyField="roughMapId"
      />
    </WorkListPage>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Activity,
  BarChart3,
  Clock,
  AlertTriangle,
  RefreshCcw,
  Layers } from 'lucide-react';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import {
  IDLE_METRICS,
  PLACEHOLDER,
  monitoringQueryOptions,
} from '@/queries/monitoring-query-options';

// P2: Dynamic Import for the heavy Topology visualization
const ServiceTopology = dynamic(() => import('./components/ServiceTopology'), {
  ssr: false,
  loading: () => <div className="w-full h-[450px] bg-surface-inverse/40 rounded-[2.5rem] animate-pulse flex items-center justify-center text-muted-foreground font-bold uppercase tracking-widest">맵 초기화 중...</div>
});

/** CSV 반출 컬럼(현재 화면에 표시 중인 실측 지표 그대로) */
const METRIC_EXPORT_HEADERS = [
  { label: '수집시각', key: 'collectedAt' },
  { label: '글로벌 트래픽(Req/s)', key: 'traffic' },
  { label: '시스템 지연시간(ms)', key: 'latency' },
  { label: '에러 발생률(%)', key: 'errorRate' },
  { label: '노드 부하율(%)', key: 'cpuUsage' },
  { label: 'Health', key: 'healthStatus' },
  { label: '실측여부', key: 'live' },
];

export default function ObservabilityPage() {
  const { data: metrics = IDLE_METRICS, refetch, isFetching } = useQuery(
    monitoringQueryOptions.dashboard(),
  );

  // fabricated delta('+12.4%' 등)를 제거하고, 실측 여부를 정직하게 표기한다.
  // 값이 플레이스홀더면 '미가용', 실측이면 'LIVE' 배지를 노출한다.
  const statusFor = (value: string, liveLabel: string) =>
    value === PLACEHOLDER ? '미가용' : liveLabel;

  return (
    <div className="space-y-12 pb-24">
      {/* [2026-08-26] 페이지 헤더가 두 겹이었다 — PageHeader 아래 HubHeader(`실시간 지능형 관제`
          히어로 + 마케팅 문구)가 한 번 더 있었고 주요 액션이 그쪽에 붙어 있었다.
          한 화면의 페이지 헤더는 하나다. */}
      <PageHeader
        title="시스템 통합 관제"
        breadcrumbs={[{ label: '운영환경' }, { label: '옵저버빌리티' }]}
        actions={
          // [P1-6] '데이터 익스포트'는 onClick 이 없는 死버튼이었다.
          //        동작 검증된 DataExportExcel(UTF-8 BOM CSV)로 현재 실측 지표를 반출하도록 배선한다.
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { void refetch(); }}
              disabled={isFetching}
              variant="outline"
              size="sm"
            >
              <RefreshCcw size={16} aria-hidden="true" /> 지표 새로고침
            </Button>
            <DataExportExcel
              scope="loaded"
              data={[{
                collectedAt: new Date().toISOString(),
                traffic: metrics.traffic,
                latency: metrics.latency,
                errorRate: metrics.errorRate,
                cpuUsage: metrics.cpuUsage,
                healthStatus: metrics.healthStatus,
                live: metrics.live ? '실측' : '미가용',
              }]}
              headers={METRIC_EXPORT_HEADERS}
              filename="관제지표"
              className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
            />
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="글로벌 트래픽" value={metrics.traffic} unit="Req/s" icon={BarChart3} color="primary" status={statusFor(metrics.traffic, 'LIVE')} />
        <HubMetricCard title="시스템 지연시간" value={metrics.latency} unit="ms" icon={Clock} color="emerald" status={statusFor(metrics.latency, 'LIVE')} />
        <HubMetricCard title="에러 발생률" value={metrics.errorRate} unit="%" icon={AlertTriangle} color="rose" status={statusFor(metrics.errorRate, 'LIVE')} />
        <HubMetricCard title="노드 부하율" value={metrics.cpuUsage} unit="%" icon={Activity} color="amber" status={metrics.cpuUsage === PLACEHOLDER ? '미가용' : `Health: ${metrics.healthStatus}`} />
      </HubMetricGrid>

      {/* [P1-5] '실시간 트래픽 플로우'는 사실이 아니다 — 토폴로지는 실측 API 미연동 상태의 구성도다. */}
      <HubSectionCard
        title="서비스 토폴로지 맵 (샘플 구성도)"
        description="분산 마이크로서비스 간의 구성 관계를 나타낸 참고용 구성도입니다. 실측 트래픽/지연 데이터는 아직 연동되지 않았습니다."
        icon={Layers}
        className="bg-surface-inverse border-none shadow-2xl rounded-[2.5rem] overflow-hidden"
      >
        <div className="relative group min-h-[500px]">
           <ServiceTopology />
        </div>
      </HubSectionCard>

      {/* Decorative Branding */}
      <div className="text-center pt-8">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">
          eGov Enterprise Observability Engine v5.0.0
        </p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Activity,
  BarChart3,
  Clock,
  AlertTriangle,
  RefreshCcw,
  Zap,
  Layers } from 'lucide-react';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';

// P2: Dynamic Import for the heavy Topology visualization
const ServiceTopology = dynamic(() => import('./components/ServiceTopology'), {
  ssr: false,
  loading: () => <div className="w-full h-[450px] bg-surface-inverse/40 rounded-[2.5rem] animate-pulse flex items-center justify-center text-muted-foreground font-bold uppercase tracking-widest">맵 초기화 중...</div>
});

// 실측 데이터 미가용 시(백엔드/액추에이터 미기동) fabricated number 대신 노출할 플레이스홀더.
const PLACEHOLDER = '—';

// Spring Boot Actuator 메트릭 응답 형태: { name, measurements: [{ statistic, value }] }
interface ActuatorMeasurement {
  statistic: string;
  value: number;
}
interface ActuatorMetric {
  name: string;
  measurements?: ActuatorMeasurement[];
}
interface ActuatorHealth {
  status?: string;
}

interface MetricsState {
  traffic: string;
  latency: string;
  errorRate: string;
  cpuUsage: string;
  healthStatus: string;
  /** 액추에이터가 실제로 응답했는지 여부(추정값이 아닌 실측인지 구분). */
  live: boolean;
}

// 모든 조회는 same-origin '/actuator' 프록시(next.config rewrites → 백엔드)를 통과한다.
// 실패(백엔드 미기동/404 등) 시 null 을 반환하여 상위에서 플레이스홀더로 폴백한다.
async function fetchMetric(name: string, query = ''): Promise<ActuatorMetric | null> {
  try {
    const res = await fetch(`/actuator/metrics/${name}${query}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as ActuatorMetric;
  } catch {
    return null;
  }
}

// measurements 배열에서 특정 통계치(statistic)의 value 를 추출한다.
function measurementValue(metric: ActuatorMetric | null, statistic: string): number | null {
  const m = metric?.measurements?.find((x) => x.statistic === statistic);
  return m ? m.value : null;
}

const IDLE_METRICS: MetricsState = {
  traffic: PLACEHOLDER,
  latency: PLACEHOLDER,
  errorRate: PLACEHOLDER,
  cpuUsage: PLACEHOLDER,
  healthStatus: 'UNKNOWN',
  live: false,
};

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
  const fetchMetrics = React.useCallback(async (): Promise<MetricsState> => {
    // same-origin /actuator 프록시를 통해 실측 액추에이터 메트릭을 병렬 조회한다.
    const [health, cpu, httpReq, uptime, httpErr] = await Promise.all([
      fetch('/actuator/health', { cache: 'no-store' })
        .then((r) => r.json() as Promise<ActuatorHealth>)
        .catch(() => null),
      fetchMetric('system.cpu.usage'),
      fetchMetric('http.server.requests'),
      fetchMetric('process.uptime'),
      // 5xx 요청 수(태그 필터). 서버 에러 태그가 없으면 404 → null(=0건으로 간주).
      fetchMetric('http.server.requests', '?tag=outcome:SERVER_ERROR'),
    ]);

    const live = Boolean(health || cpu || httpReq || uptime);

    // 노드 부하율: system.cpu.usage (0~1 비율) → %
    const cpuVal = measurementValue(cpu, 'VALUE');
    const cpuUsage = cpuVal != null ? (cpuVal * 100).toFixed(1) : PLACEHOLDER;

    // 글로벌 트래픽: 누적 요청 수 / 가동시간(s) → 평균 Req/s
    const reqCount = measurementValue(httpReq, 'COUNT');
    const uptimeSec = measurementValue(uptime, 'VALUE');
    const traffic =
      reqCount != null && uptimeSec != null && uptimeSec > 0
        ? (reqCount / uptimeSec).toFixed(2)
        : PLACEHOLDER;

    // 시스템 지연시간: 총 처리시간(s) / 요청 수 → 평균 지연(ms)
    const totalTime = measurementValue(httpReq, 'TOTAL_TIME');
    const latency =
      totalTime != null && reqCount != null && reqCount > 0
        ? Math.round((totalTime / reqCount) * 1000).toString()
        : PLACEHOLDER;

    // 에러 발생률: 5xx 요청 수 / 전체 요청 수 → % (요청 실측치가 있을 때만 산출)
    const errCount = measurementValue(httpErr, 'COUNT');
    const errorRate =
      reqCount != null && reqCount > 0
        ? (((errCount ?? 0) / reqCount) * 100).toFixed(2)
        : PLACEHOLDER;

    return {
      traffic,
      latency,
      errorRate,
      cpuUsage,
      // [W1-12 보완] 액추에이터가 응답하지 않는 것은 **시스템이 죽었다는 증거가 아니다**.
      //   운영(prod)에서는 management.server.port 가 9090/내부망으로 분리되어 브라우저가
      //   same-origin /actuator 프록시로 도달할 수 없는 것이 정상 형상이다. 종전에는 그 상태를
      //   'DOWN' 으로 표기해 멀쩡한 시스템을 장애로 보고했다 — 미도달과 장애를 구분한다.
      healthStatus: health?.status || 'UNKNOWN',
      live,
    };
  }, []);

  // [P2] 수기 setInterval(5s) 은 탭이 백그라운드여도 액추에이터를 계속 두드렸다.
  //      TanStack Query 로 이관해 백그라운드 폴링 중단·중복 요청 dedup 을 확보한다
  //      (FE 헌법 제4조: 서버 상태는 TanStack Query 전용).
  const { data: metrics = IDLE_METRICS, refetch, isFetching } = useQuery({
    queryKey: ['observability-actuator-metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  });

  // fabricated delta('+12.4%' 등)를 제거하고, 실측 여부를 정직하게 표기한다.
  // 값이 플레이스홀더면 '미가용', 실측이면 'LIVE' 배지를 노출한다.
  const statusFor = (value: string, liveLabel: string) =>
    value === PLACEHOLDER ? '미가용' : liveLabel;

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="시스템 통합 관제"
        breadcrumbs={[{ label: '운영환경' }, { label: '옵저버빌리티' }]}
      />

      <HubHeader
        title="실시간"
        highlight="지능형 관제"
        subtitle="전체 분산 아키텍처의 흐름과 인프라 상태를 실시간으로 모니터링합니다."
        icon={Zap}
        actions={
          // [P1-6] '데이터 익스포트'는 onClick 이 없는 死버튼이었다.
          //        동작 검증된 DataExportExcel(UTF-8 BOM CSV)로 현재 실측 지표를 반출하도록 배선한다.
          <div className="flex gap-4">
            <Button
              onClick={() => { void refetch(); }}
              disabled={isFetching}
              variant="outline"
              className="h-11 px-8 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm"
            >
                <RefreshCcw size={18} aria-hidden="true" /> 지표 새로고침
            </Button>
            <DataExportExcel
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
              className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl flex items-center gap-2"
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

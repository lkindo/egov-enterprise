'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCcw,
  ExternalLink,
  Zap,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/components/ui/button';

// P2: Dynamic Import for the heavy Topology visualization
const ServiceTopology = dynamic(() => import('./components/ServiceTopology'), {
  ssr: false,
  loading: () => <div className="w-full h-[450px] bg-slate-900/40 rounded-[2.5rem] animate-pulse flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest">맵 초기화 중...</div>
});

export default function ObservabilityPage() {
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
          <div className="flex gap-4">
            <Button variant="outline" className="h-11 px-8 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm">
                <RefreshCcw size={18} /> 실시간 동기화
            </Button>
            <Button className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
                <ExternalLink size={18} /> 데이터 익스포트
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="글로벌 트래픽" value="2.4k" unit="Req/s" icon={BarChart3} color="primary" status="+12.4%" />
        <HubMetricCard title="시스템 지연시간" value="42" unit="ms" icon={Clock} color="emerald" status="-4ms" />
        <HubMetricCard title="에러 발생률" value="0.02" unit="%" icon={AlertTriangle} color="rose" status="안정적" />
        <HubMetricCard title="노드 부하율" value="68.4" unit="%" icon={Activity} color="amber" />
      </HubMetricGrid>

      <HubSectionCard 
        title="서비스 토폴로지 맵" 
        description="분산 마이크로서비스 간의 상관관계 및 실시간 트래픽 플로우를 시각화합니다." 
        icon={Layers}
        className="bg-slate-900 border-none shadow-2xl rounded-[2.5rem] overflow-hidden"
      >
        <div className="relative group min-h-[500px]">
           <ServiceTopology />
        </div>
      </HubSectionCard>

      {/* Decorative Branding */}
      <div className="text-center pt-8">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 opacity-40">
          eGov Enterprise Observability Engine v5.0.0
        </p>
      </div>
    </div>
  );
}

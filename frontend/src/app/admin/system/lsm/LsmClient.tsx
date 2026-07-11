'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { LeaderSchedule,  LeaderStatus } from '@/services/foundation/system/LeaderScheduleAdminService';
import { Calendar,  UserCheck,  Clock,  Shield,  Plus,  Activity,  Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LsmClient({ 
 initialSchedules, 
 initialStatuses 
}: { 
 initialSchedules: LeaderSchedule[], 
 initialStatuses: LeaderStatus[] 
}) {
 const [loading, setLoading] = useState(false);

 const scheduleColumns: Column<LeaderSchedule>[] = [
 {
 header: '일정명 및 구분',
 accessor: (item) => (
 <div className="flex items-center gap-4 py-3">
 <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-primary/60">
 <Calendar size={18} />
 </div>
 <div className="flex flex-col">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{item.scheduleSe}</span>
 <span className="font-bold text-foreground">{item.scheduleNm}</span>
 </div>
 </div>
 )
 },
 {
 header: '대상 간부',
 accessor: (item) => (
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
 {item.leaderNm?.charAt(0)}
 </div>
 <span className="font-semibold">{item.leaderNm || 'Unknown'}</span>
 </div>
 )
 },
 {
 header: '일정 장소',
 accessor: (item) => (
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold bg-muted text-foreground px-3 py-1.5 rounded-lg border border-border shadow-sm font-sans">
 {item.schdlPlcNm || '장소 미지정'}
 </span>
 </div>
 )
 },
 {
 header: '기간',
 accessor: (item) => (
 <div className="flex flex-col text-xs font-mono text-muted-foreground">
 <span>{item.schdlBgngYmd}</span>
 <span className="opacity-40">~ {item.schdlEndYmd}</span>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="간부 일정 관리 시스템"
 breadcrumbs={[{ label: '워크스페이스' }, { label: 'LSM' }]}
 />

 <HubHeader 
 title="LSM" 
 highlight="Leader Schedule" 
 subtitle="조직 핵심 의사결정권자의 일정을 실시간으로 조율하고 최적의 가용성을 확보합니다." 
 icon={UserCheck} 
 actions={
 <Button className="h-12 px-8 bg-slate-900 text-white rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-primary transition-all">
 <Plus size={16} className="mr-2" /> 일정 등록
 </Button>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="전체_등록_일정" value={initialSchedules.length} icon={Calendar} color="primary" status="NOMINAL" />
 <HubMetricCard title="활성_간부_수" value={initialStatuses.length} icon={UserCheck} color="emerald" status="OPTIMIZED" />
 <HubMetricCard title="금일_의사결정_시퀀스" value={3} icon={Clock} color="amber" status="ACTIVE" />
 </HubMetricGrid>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
 <HubSectionCard title="실시간 일정 매트릭스" description="현재 클러스터 내 모든 간부의 일정 현황입니다." icon={Activity}>
 <StandardDataTable columns={scheduleColumns} data={initialSchedules} loading={loading} />
 </HubSectionCard>

 <HubSectionCard title="간부 상태 모니터링" description="주요 리더의 현재 업무 가용성 및 위치 상태입니다." icon={Shield}>
 <div className="space-y-4">
 {initialStatuses.map(status => (
 <div key={status.leaderId} className="p-4 bg-muted rounded-lg flex items-center justify-between border border-border group hover:bg-white hover:shadow-xl transition-all">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center text-muted-foreground">
 <Star size={20} />
 </div>
 <div>
 <h5 className="font-bold text-foreground leading-tight">{status.leaderNm}</h5>
 <p className="text-xs text-muted-foreground font-bold uppercase">{status.positionNm} | {status.ognzNm}</p>
 </div>
 </div>
 <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-tighter">
 {status.status}
 </div>
 </div>
 ))}
 {initialStatuses.length === 0 && <p className="text-center py-10 text-muted-foreground font-bold uppercase ">No Active Leaders Detected</p>}
 </div>
 </HubSectionCard>
 </div>
 </div>
 );
}


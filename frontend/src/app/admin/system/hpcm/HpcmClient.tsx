'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Hpcm } from '@/services/foundation/system/HpcmAdminService';
import { HelpCircle,  FileText,  Search,  Plus,  Terminal,  Zap,  BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HpcmClient({ initialData }: { initialData: { list: Hpcm[] } }) {
 const [loading, setLoading] = useState(false);
 const hpcmList = initialData.list || [];

 const columns: Column<Hpcm>[] = [
 {
 header: '콘텐츠 명세',
 accessor: (item) => (
 <div className="flex items-center gap-5 py-4">
 <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
 <BookOpen size={18} />
 </div>
 <div className="flex flex-col gap-1 text-left">
 <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold tracking-tight border border-slate-200 w-fit">
 {item.hpcmSe || 'SYSTEM'}
 </span>
 <span className="font-bold tracking-tighter text-foreground text-md uppercase leading-tight mt-1">{item.hpcmNm}</span>
 </div>
 </div>
 )
 },
 {
 header: 'ID / 레퍼런스',
 accessor: (item) => (
 <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.3em] font-mono ">
 ID: {item.hpcmId}
 </span>
 ),
 className: 'w-48'
 },
 {
 header: '요약 설명',
 accessor: (item) => (
 <p className="text-sm text-slate-500 font-medium line-clamp-1 max-w-md">
 {item.hpcmDc || '설명이 존재하지 않는 아카이브입니다.'}
 </p>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="도움말 콘텐츠 아키텍처"
 breadcrumbs={[{ label: '시스템관리' }, { label: 'HPCM' }]}
 />

 <HubHeader 
 title="HPCM" 
 highlight="Help Content" 
 subtitle="사용자 경험 최적화를 위해 모든 시스템 가이드와 도움말 콘텐츠를 중앙 집중식으로 관리합니다." 
 icon={HelpCircle} 
 actions={
 <Button className="h-12 px-8 bg-slate-900 text-white rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-primary transition-all">
 <Plus size={16} className="mr-2" /> 콘텐츠 등록
 </Button>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="전체_도움말_자산" value={hpcmList.length} icon={FileText} color="primary" status="SYNCED" />
 <HubMetricCard title="최근_업데이트_로그" value={2} icon={Zap} color="amber" />
 <HubMetricCard title="시스템_무결성" value="99.9%" icon={Terminal} color="emerald" status="OPTIMIZED" />
 </HubMetricGrid>

 <HubSectionCard title="콘텐츠 인벤토리" description="현재 클러스터에 배포된 모든 도움말 콘텐츠 명세입니다." icon={Search}>
 <div className="overflow-hidden min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={hpcmList}
 loading={loading}
 emptyMessage="조회된 도움말 콘텐츠가 현재 클러스터에 존재하지 않습니다."
 className="border-none bg-transparent"
 />
 </div>
 </HubSectionCard>
 </div>
 );
}


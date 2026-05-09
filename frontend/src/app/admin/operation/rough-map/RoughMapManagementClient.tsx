'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
 Map, Search, Plus, MapPin, Navigation, Edit3, Trash2, 
 Layers, Settings2, Sparkles, Activity, Clock, Globe,
 ArrowRight, MoreHorizontal, Zap, RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { roughMapService, RoughMapInfo } from '@/services/business/roughmap/roughMapService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

export default function RoughMapManagementClient() {
 const { toast } = useToast();
 const [keyword, setKeyword] = useState('');
 
 const { data: roughMapsData, isLoading } = useQuery({
 queryKey: ['rough-maps-list', keyword],
 queryFn: () => roughMapService.getRoughMaps({ keyword, size: 20 }),
 });

 const displayItems = roughMapsData?.list || [];

 const columns: Column<RoughMapInfo>[] = [
 {
 header: '번호',
 accessor: (_, index) => (
 <span className="font-mono text-xs font-bold text-slate-400">
 {(index !== undefined ? index + 1 : 0).toString().padStart(2, '0')}
 </span>
 ),
 className: 'w-20 text-center'
 },
 {
 header: '거점 명칭',
 accessor: (map) => (
 <div className="flex flex-col gap-1 py-1">
 <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">
 {map.roughMapSj}
 </span>
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
 ID: {map.roughMapId}
 </span>
 </div>
 )
 },
 {
 header: '주소',
 accessor: (map) => (
 <span className="text-xs font-bold text-slate-500 tracking-tight">{map.roughMapAddress}</span>
 )
 },
 {
 header: '좌표 (LAT/LNG)',
 accessor: (map) => (
 <span className="text-xs font-bold text-slate-400 tabular-nums tracking-tighter">
 {map.lat} / {map.lng}
 </span>
 ),
 className: 'w-48'
 },
 {
 header: '관리',
 accessor: () => (
 <div className="flex items-center justify-end pr-4">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-slate-100">
 <Edit3 size={16} className="text-slate-400" />
 </Button>
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors">
 <Trash2 size={16} />
 </Button>
 </div>
 ),
 className: 'w-32 text-right'
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="약도 및 거점 관리"
 breadcrumbs={[{ label: '운영지원' }, { label: '공간관리' }]}
 />

 <HubHeader 
 title="Rough Map" 
 highlight="Intelligence" 
 subtitle="사내 주요 거점 및 시설의 지리 정보와 약도를 체계적으로 관리합니다." 
 icon={Navigation} 
 actions={
 <div className="flex gap-4">
 <Button className="h-11 px-8 rounded-xl bg-white border-2 border-slate-100 text-slate-400 font-bold tracking-widest text-xs uppercase hover:text-primary transition-all shadow-sm">
 <Globe size={18} /> 서비스 연동
 </Button>
 <Button className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl">
 <Plus size={18} /> 거점 등록
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="전체 거점" value={displayItems.length} icon={Layers} color="primary" />
 <HubMetricCard title="공간 인덱스" value="OPTIMIZED" icon={Zap} color="emerald" status="최적" />
 <HubMetricCard title="데이터 무결성" value="100%" icon={Activity} color="indigo" />
 <HubMetricCard title="최근 업데이트" value="DAILY" icon={Clock} color="amber" />
 </HubMetricGrid>

 <HubSectionCard 
 title="거점 자산 매트릭스" 
 description="시스템에 등록된 모든 지리 공간 자산의 상세 명세입니다." 
 icon={MapPin}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
 <div className="relative group max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
 <Input 
 value={keyword}
 onChange={(e) => setKeyword(e.target.value)}
 className="h-11 bg-slate-50/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
 placeholder="거점 명칭 또는 주소 검색.." 
 />
 </div>
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={displayItems}
 loading={isLoading}
 emptyMessage="식별된 거점 자산이 존재하지 않습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 />
 </div>
 </div>
 </HubSectionCard>
 </div>
 );
}

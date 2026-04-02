'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { codeAdminService, AdministCode } from '@/services/foundation/system/CodeAdminService';
import { useToast } from '@/app/components/ui/toast';
import { 
  Plus, 
  MapPin, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Database,
  SearchCode,
  Milestone,
  Monitor,
  BarChart3,
  RefreshCcw,
  Maximize2,
  Settings,
  Map,
  Compass
} from 'lucide-react';
import { PagePagination } from '@/components/common/PagePagination';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdministCodeClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData?.list || []);
  const [total, setTotal] = useState(initialData?.total || 0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [searchWrd, setSearchWrd] = useState('');
  const [pageNumber, setPageNumber] = useState(1);

  const loadData = async (wrd: string = searchWrd, page: number = pageNumber) => {
    try {
      setLoading(true);
      const res = await codeAdminService.getAdministCodeList({ searchWrd: wrd, pageNo: page });
      setData(res.list || []);
      setTotal(res.total || 0);
      setPageNumber(page);
    } catch (error) {
      toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalCount = total;
    const legalDist = data.filter((item: any) => item.administZoneSe === '1').length;
    const adminDist = data.filter((item: any) => item.administZoneSe === '2').length;
    const syncStatus = (data.filter((item: any) => item.useAt === 'Y').length / (data.length || 1) * 100).toFixed(0);
    
    return { totalCount, legalDist, adminDist, syncStatus };
  }, [total, data]);

  const columns: Column<AdministCode>[] = [
    { 
        header: '행정 식별자', 
        accessor: (item: any) => (
            <div className="flex items-center gap-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <MapPin size={18} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="font-mono font-black text-foreground tracking-tighter text-sm uppercase">{item.administZoneCode}</span>
                    <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40">구역 식별코드</span>
                </div>
            </div>
        ),
        className: 'w-56' 
    },
    { 
      header: '도메인 구분', 
      accessor: (item: any) => (
        <div className={cn(
            "px-3 py-1.5 rounded-lg border w-fit text-[9px] font-black tracking-widest uppercase shadow-sm",
            item.administZoneSe === '1' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200'
        )}>
            {item.administZoneSe === '1' ? '법정동' : '행정동'}
        </div>
      ),
      className: 'w-32'
    },
    { 
        header: '행정구역명', 
        accessor: (item: any) => (
            <div className="flex flex-col gap-1 py-4">
                <span className="font-black text-foreground tracking-tight text-md uppercase leading-tight">{item.administZoneNm}</span>
                <div className="flex items-center gap-2">
                    <Compass size={10} className="text-primary opacity-40" />
                    <span className="text-[9px] font-black text-muted-foreground/50 tracking-[0.2em] font-mono uppercase italic leading-none">지리적 네임스페이스</span>
                </div>
            </div>
        )
    },
    { 
        header: '상위 노드 ID', 
        accessor: (item: any) => (
            <div className="flex items-center gap-2 font-mono text-[10px] font-black text-muted-foreground/60 tabular-nums tracking-tighter italic">
                {item.upperAdministZoneCode || '최상위 루트'}
            </div>
        ), 
        className: 'w-32' 
    },
    { 
      header: '사용여부', 
      accessor: (item: any) => (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border w-fit shadow-sm",
            item.useAt === 'Y' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
        )}>
            <div className={cn("w-1.5 h-1.5 rounded-full shadow-sm", item.useAt === 'Y' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
            <span className="text-[9px] font-black tracking-widest uppercase">{item.useAt === 'Y' ? '활성' : '중단됨'}</span>
        </div>
      ),
      className: 'w-32'
    },
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      
      <HubHeader 
        title="행정 구역" 
        highlight="인벤토리" 
        subtitle="전국 행정 구역에 따른 법정동 및 행정동 코드 체계를 공간 인텔리전스 통합 관리" 
        icon={Milestone} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
                variant="ghost"
                onClick={() => loadData()}
                className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
            >
                <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
             <Button className="h-14 px-10 rounded-2xl bg-primary border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:brightness-110 transition-all hover:-translate-y-1 gap-3 group">
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" /> 신규 행정 코드 인스턴스 등록
             </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 구역 수" value={stats.totalCount} icon={Database} color="primary" />
        <HubMetricCard title="법정동 노드" value={stats.legalDist} icon={Map} color="indigo" />
        <HubMetricCard title="행정동 노드" value={stats.adminDist} icon={Compass} color="amber" />
        <HubMetricCard title="동기화 지수" value={`${stats.syncStatus}%`} icon={ShieldCheck} color="emerald" status="최적" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Navigation Sidebar */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <div className="rounded-[4rem] bg-white/80 backdrop-blur-xl text-slate-900 p-12 shadow-2xl relative overflow-hidden group h-full border border-slate-200/50 ring-1 ring-slate-100 min-h-[500px]">
                <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                    <Milestone size={240} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-12">
                    <div className="space-y-4">
                        <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                            <Monitor size={36} className="text-primary" />
                        </div>
                        <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase">공간 인텔리전스<br />허브</h4>
                    </div>
                    
                    <p className="text-sm text-slate-500 font-bold leading-relaxed italic border-l-4 border-primary pl-8">
                        행정구역코드 체계(KAS)는 데이터 무결성을 보장하며, 전국 공간정보 통합 관리 체계와 실시간으로 동기화됩니다.
                    </p>

                    <div className="space-y-6 pt-12 border-t border-slate-100">
                        <div className="flex items-center justify-between group/stat">
                            <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase group-hover/stat:text-primary transition-colors">데이터 수집 엔진</span>
                            <span className="text-lg font-black font-mono tracking-tighter text-emerald-500">정상</span>
                        </div>
                        <div className="flex items-center justify-between group/stat">
                            <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase group-hover/stat:text-amber-500 transition-colors">동기화 빈도</span>
                            <span className="text-lg font-black font-mono tracking-tighter">매일 00시</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Data Area */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-10">
            <HubSectionCard title="행정 코드 매트릭스 탐색기" description="시스템에 등록된 모든 행정 구역 및 법정동 메타데이터의 레이턴시 프로토콜 상세입니다" icon={SearchCode}>
                <form onSubmit={(e) => { e.preventDefault(); loadData(searchWrd, 1); }} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="relative group/search flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={18} />
                        <Input
                            placeholder="행정구역명을 입력하여 메타데이터 엔티티를 조회하세요.."
                            value={searchWrd}
                            onChange={(e) => setSearchWrd(e.target.value)}
                            className="h-14 pl-14 pr-6 w-full bg-slate-50 border-none rounded-2xl text-[11px] font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                        />
                    </div>
                    <Button type="submit" size="lg" className="h-14 px-10 rounded-2xl bg-primary border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:brightness-110 transition-all gap-3 group">
                        <Layers size={18} className="group-hover:rotate-180 transition-transform duration-500" /> 데이터 필터링 실행
                    </Button>
                </form>

                <div className="overflow-hidden min-h-[600px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={searchWrd + pageNumber}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                        >
                            <StandardDataTable
                                columns={columns}
                                data={data}
                                loading={loading}
                                emptyMessage="등록된 행정코드 데이터가 존재하지 않습니다."
                                className="border-none bg-transparent"
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="mt-12 flex justify-center pt-10 border-t border-slate-100">
                    <PagePagination
                        total={total}
                        size={10}
                        page={pageNumber}
                        onPageChange={(p) => loadData(searchWrd, p)}
                    />
                </div>
            </HubSectionCard>
        </div>
      </div>
    </div>
  );
}

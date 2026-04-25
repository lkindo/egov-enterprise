'use client';

import React, { useState, useEffect } from 'react';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { codeAdminService, InstitutionCode, InstitutionCodeRecptn } from '@/services/foundation/system/CodeAdminService';
import { useToast } from '@/app/components/ui/toast';
import { 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Database, 
  Search, 
  Plus, 
  Filter, 
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  Activity, 
  Building2, 
  History, 
  Server,
  Download,
  FileCode,
  Globe,
  Zap,
  ChevronRight,
  MonitorCheck,
  CheckCircle2,
  XCircle,
  Network
} from 'lucide-react';
import { PagePagination } from '@/components/common/PagePagination';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstitutionCodeClient({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState<'list' | 'reception'>('list');
  const [data, setData] = useState<InstitutionCode[]>(initialData?.list || []);
  const [receptionData, setReceptionData] = useState<InstitutionCodeRecptn[]>([]);
  const [total, setTotal] = useState(initialData?.total || 0);
  const [loading, setLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [searchWrd, setSearchWrd] = useState('');
  const { toast } = useToast();

  const loadListData = async (wrd: string = searchWrd, page: number = pageNo) => {
    try {
      setLoading(true);
      const res = await codeAdminService.getInstitutionCodeList({ searchWrd: wrd, pageNo: page });
      setData(res.list || []);
      setTotal(res.total || 0);
      setPageNo(page);
    } catch (error) {
      toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReceptionData = async (wrd: string = searchWrd, page: number = pageNo) => {
    try {
      setLoading(true);
      const res = await codeAdminService.getInstitutionCodeRecptnList({ searchWrd: wrd, pageNo: page });
      setReceptionData(res.list || []);
      setTotal(res.total || 0);
      setPageNo(page);
    } catch (error) {
      toast('수신 내역을 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (item: InstitutionCodeRecptn) => {
    if (!confirm(`${item.allInsttNm} 코드를 반영하시겠습니까?`)) return;
    
    try {
      await codeAdminService.processInstitutionCodeRecptn({
        occrrncDe: item.occrrncDe,
        insttCode: item.insttCode,
        opertSn: item.opertSn
      });
      toast('성공적으로 반영되었습니다.', 'success');
      loadReceptionData();
    } catch (error) {
      toast('반영 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      loadListData(searchWrd, 1);
    } else {
      loadReceptionData(searchWrd, 1);
    }
  }, [activeTab]);

  const listColumns: Column<InstitutionCode>[] = [
    { 
      header: '기관 식별자', 
      accessor: (item: InstitutionCode) => (
        <div className="flex items-center gap-4 py-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
            <Building2 size={20} />
          </div>
          <div>
            <span className="font-black tracking-tighter text-foreground block text-lg uppercase leading-none">{item.insttCode}</span>
            <span className="text-[9px] font-black text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40">기관 식별코드</span>
          </div>
        </div>
      )
    },
    { 
      header: '기관 명칭 (Full Name)', 
      accessor: (item: InstitutionCode) => (
        <span className="font-black text-foreground text-sm tracking-tight">{item.allInsttNm}</span>
      )
    },
    { 
      header: '최하위 기관명', 
      accessor: (item: InstitutionCode) => (
        <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
            <span className="text-[10px] font-black text-primary tracking-tight font-mono">{item.lowestInsttNm}</span>
        </div>
      ),
      className: 'w-48'
    },
    { 
      header: '연락처 정보', 
      accessor: (item: InstitutionCode) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tracking-tighter tabular-nums">
            <Network size={12} className="opacity-30" />
            {item.telno || '---'}
        </div>
      ),
      className: 'w-40' 
    },
    { 
      header: '폐지여부', 
      accessor: (item: InstitutionCode) => (
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm",
          item.ablEnnc === '0' 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
            : "bg-slate-100 text-slate-400 border-border/50"
        )}>
          {item.ablEnnc === '0' ? <Activity size={12} className="animate-pulse" /> : <ShieldCheck size={12} className="opacity-40" />}
          <span className="text-[9px] font-black tracking-[0.2em] uppercase">{item.ablEnnc === '0' ? '활성' : '폐지됨'}</span>
        </div>
      ),
      className: 'w-32 text-center'
    },
  ];

  const receptionColumns: Column<InstitutionCodeRecptn>[] = [
    { 
      header: '발생일자', 
      accessor: (item: InstitutionCodeRecptn) => (
        <div className="flex items-center gap-2 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
          <History size={14} className="text-primary opacity-40" />
          {item.occrrncDe}
        </div>
      ),
      className: 'w-48' 
    },
    { 
        header: '대상 식별자', 
        accessor: (item: InstitutionCodeRecptn) => (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner">
              <Database size={18} />
            </div>
            <span className="font-black tracking-tighter text-foreground uppercase">{item.insttCode}</span>
          </div>
        ),
        className: 'w-40' 
    },
    { header: '기관 명칭', accessor: 'allInsttNm', className: 'font-black' },
    { 
      header: '동기화 구분', 
      accessor: (item: InstitutionCodeRecptn) => {
        const typeMap: any = {
            '1': { label: '신규 등록', color: 'bg-primary/20 text-primary border-primary/20', icon: <Plus size={12} /> },
            '2': { label: '수정 업데이트', color: 'bg-amber-500/20 text-amber-600 border-amber-500/20', icon: <RefreshCw size={12} /> },
            '3': { label: '데이터 정제', color: 'bg-rose-500/20 text-rose-600 border-rose-500/20', icon: <ShieldCheck size={12} /> }
        };
        const config = typeMap[item.changeSeCode] || typeMap['1'];
        return (
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-lg border w-fit font-black text-[9px] tracking-widest uppercase", config.color)}>
            {config.icon}
            {config.label}
          </div>
        );
      },
      className: 'w-40'
    },
    { 
      header: '파이프라인 결과', 
      accessor: (item: InstitutionCodeRecptn) => (
        <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm",
            item.processSe === '1' 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            {item.processSe === '1' ? <CheckCircle2 size={12} /> : <Clock size={12} className="animate-spin duration-[3s]" />}
            <span className="text-[9px] font-black tracking-[0.2em] uppercase">{item.processSe === '1' ? '동기화됨' : '대기 중'}</span>
          </div>
      ),
      className: 'w-32'
    },
    {
      header: '데이터 작업',
      accessor: (item: InstitutionCodeRecptn) => (
        item.processSe !== '1' && (
          <Button 
            onClick={() => handleProcess(item)}
            className="h-10 px-6 rounded-xl bg-primary border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:brightness-110 transition-all gap-2"
          >
            <MonitorCheck size={14} /> 반영 적용
          </Button>
        )
      ),
      className: 'w-32 text-right'
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 pb-10">
        <div className="space-y-1">
            <h4 className="text-3xl font-black tracking-tighter text-foreground uppercase">{activeTab === 'list' ? '기관 마스터 리스트' : '동기화 파이프라인'}</h4>
            <p className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">{activeTab === 'list' ? '활성 노드 인벤토리 및 식별 체계 관리' : '실시간 데이터 수집 및 충돌 해결'}</p>
        </div>
        <div className="flex bg-slate-100/80 backdrop-blur-md p-2 rounded-xl border border-slate-200/50 shadow-inner">
            <button 
                onClick={() => setActiveTab('list')}
                className={cn(
                    "px-8 h-12 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
                    activeTab === 'list' ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-100" : "text-muted-foreground hover:bg-white/50"
                )}>
                <Server size={14} /> 노드 인벤토리
            </button>
            <button 
                onClick={() => setActiveTab('reception')}
                className={cn(
                    "px-8 h-12 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
                    activeTab === 'reception' ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-100" : "text-muted-foreground hover:bg-white/50"
                )}>
                <History size={14} /> 수신 파이프라인
            </button>
        </div>
      </div>

      <HubMetricGrid>
        <HubMetricCard title="인벤토리 총합" value={total} icon={Database} color="primary" />
        <HubMetricCard title="활성 노드 수" value={data.filter(i => i.ablEnnc === '0').length || 0} icon={ShieldCheck} color="emerald" />
        <HubMetricCard title="대기 중인 커밋" value={receptionData.filter(i => i.processSe !== '1').length || 0} icon={Clock} color="amber" status={receptionData.filter(i => i.processSe !== '1').length > 0 ? "주의" : "정상"} />
        <HubMetricCard title="동기화 처리망" value="안전" icon={Zap} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
        title={activeTab === 'list' ? "기관 인벤토리 라이브러리" : "데이터 수집 파이프라인 감사"}
        description={activeTab === 'list' ? "시스템 전반에서 참조하는 모든 공공기관 노드 식별자의 활성 마스터 리스트입니다." : "외부 시스템 연동을 통해 지속적으로 유입되는 코드 변동 데이터의 수신 및 반영 이력입니다."}
        icon={activeTab === 'list' ? Globe : Zap}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="flex-1">
            <div className="relative group/search max-w-xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input
                  placeholder="활성 노드 및 파이프라인 기록 검색.."
                  value={searchWrd}
                  onChange={(e) => setSearchWrd(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        activeTab === 'list' ? loadListData(searchWrd, 1) : loadReceptionData(searchWrd, 1);
                    }
                  }}
                  className="h-16 pl-16 pr-8 w-full bg-slate-50/50 border-none rounded-xl text-xs font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                />
            </div>
          </div>
          <Button variant="outline" size="lg" className="h-16 px-10 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2 hover:bg-slate-50 transition-all group">
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> 데이터 내보내기
          </Button>
        </div>

        <div className="overflow-hidden">
          <StandardDataTable
            columns={(activeTab === 'list' ? listColumns : receptionColumns) as any}
            data={(activeTab === 'list' ? data : receptionData) as any}
            loading={loading}
            emptyMessage={activeTab === 'list' ? "조회된 기관 노드가 없습니다." : "수신된 동기화 로그가 존재하지 않습니다."}
            className="border-none bg-transparent"
          />
        </div>

        <AnimatePresence>
            {total > 10 && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 flex justify-center border-t border-slate-100 pt-10"
                >
                  <PagePagination
                    total={total}
                    size={10}
                    page={pageNo}
                    onPageChange={(p) => activeTab === 'list' ? loadListData(searchWrd, p) : loadReceptionData(searchWrd, p)}
                  />
                </motion.div>
            )}
        </AnimatePresence>
      </HubSectionCard>
    </div>
  );
}

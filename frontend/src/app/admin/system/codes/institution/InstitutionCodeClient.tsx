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
      const res = await codeAdminService.getInstitutionCodeList({ searchWrd: wrd, page踰덊샇: page });
      setData(res.list || []);
      setTotal(res.total || 0);
      setPageNo(page);
    } catch {
      toast('?곗씠?곕? 遺덈윭?ㅻ뒗 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReceptionData = async (wrd: string = searchWrd, page: number = pageNo) => {
    try {
      setLoading(true);
      const res = await codeAdminService.getInstitutionCodeRecptnList({ searchWrd: wrd, page踰덊샇: page });
      setReceptionData(res.list || []);
      setTotal(res.total || 0);
      setPageNo(page);
    } catch {
      toast('?섏떊 ?댁뿭님遺덈윭?ㅻ뒗 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (item: InstitutionCodeRecptn) => {
    if (!confirm(`${item.allInsttNm} 肄붾뱶瑜?諛섏쁺?섏떆寃좎뒿?덇퉴?`)) return;
    
    try {
      await codeAdminService.processInstitutionCodeRecptn({
        occrrncDe: item.occrrncDe,
        insttCode: item.insttCode,
        opertSn: item.opertSn
      });
      toast('?깃났?곸쑝濡?諛섏쁺?섏뿀?듬땲님', 'success');
      loadReceptionData();
    } catch {
      toast('諛섏쁺 泥섎━ 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
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
      header: '湲곌? ?뷀떚님, 
      accessor: (item: InstitutionCode) => (
        <div className="flex items-center gap-4 py-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
            <Building2 size={20} />
          </div>
          <div>
            <span className="font-black tracking-tighter text-foreground block text-lg uppercase leading-none">{item.insttCode}</span>
            <span className="text-[9px] font-black text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40">湲곌? ?앸퀎님/span>
          </div>
        </div>
      )
    },
    { 
      header: '湲곌? 紐낆묶 (?꾨줈님', 
      accessor: (item: InstitutionCode) => (
        <span className="font-black text-foreground text-sm tracking-tight">{item.allInsttNm}</span>
      )
    },
    { 
      header: '理쒗븯님?덈꺼', 
      accessor: (item: InstitutionCode) => (
        <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
            <span className="text-[10px] font-black text-primary tracking-tight font-mono">{item.lowestInsttNm}</span>
        </div>
      ),
      className: 'w-48'
    },
    { 
      header: '?ㅽ듃?뚰겕 ?묒젏', 
      accessor: (item: InstitutionCode) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tracking-tighter tabular-nums">
            <Network size={12} className="opacity-30" />
            {item.telno || '---'}
        </div>
      ),
      className: 'w-40' 
    },
    { 
      header: '?곹깭', 
      accessor: (item: InstitutionCode) => (
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm",
          item.ablEnnc === '0' 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
            : "bg-slate-100 text-slate-400 border-border/50"
        )}>
          {item.ablEnnc === '0' ? <Activity size={12} className="animate-pulse" /> : <ShieldCheck size={12} className="opacity-40" />}
          <span className="text-[9px] font-black tracking-[0.2em] uppercase">{item.ablEnnc === '0' ? '활성' : '님젣님}</span>
        </div>
      ),
      className: 'w-32 text-center'
    },
  ];

  const receptionColumns: Column<InstitutionCodeRecptn>[] = [
    { 
      header: '?섏떊 ??꾩뒪?ы봽', 
      accessor: (item: InstitutionCodeRecptn) => (
        <div className="flex items-center gap-2 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
          <History size={14} className="text-primary opacity-40" />
          {item.occrrncDe}
        </div>
      ),
      className: 'w-48' 
    },
    { 
        header: '?님?앸퀎님, 
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
    { header: '湲곌? ?꾨줈님, accessor: 'allInsttNm', className: 'font-black' },
    { 
      header: '?숆린님援щ텇', 
      accessor: (item: InstitutionCodeRecptn) => {
        const typeMap: any = {
            '1': { label: '신규 등록', color: 'bg-primary/20 text-primary border-primary/20', icon: <Plus size={12} /> },
            '2': { label: '?⑥튂 ?낅뜲?댄듃', color: 'bg-amber-500/20 text-amber-600 border-amber-500/20', icon: <RefreshCw size={12} /> },
            '3': { label: '?곗씠님?뺤젣', color: 'bg-rose-500/20 text-rose-600 border-rose-500/20', icon: <ShieldCheck size={12} /> }
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
      header: '?뚯씠?꾨씪님寃곌낵', 
      accessor: (item: InstitutionCodeRecptn) => (
        <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm",
            item.processSe === '1' 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            {item.processSe === '1' ? <CheckCircle2 size={12} /> : <Clock size={12} className="animate-spin duration-[3s]" />}
            <span className="text-[9px] font-black tracking-[0.2em] uppercase">{item.processSe === '1' ? '?숆린?붾맖' : '?湲?以?}</span>
          </div>
      ),
      className: 'w-32'
    },
    {
      header: 'ACTIONS',
      accessor: (item: InstitutionCodeRecptn) => (
        item.processSe !== '1' && (
          <Button 
            onClick={() => handleProcess(item)}
            className="h-10 px-6 rounded-xl bg-primary border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:brightness-110 transition-all gap-2"
          >
            <MonitorCheck size={14} /> 諛섏쁺 ?곸슜
          </Button>
        )
      ),
      className: 'w-32 text-right'
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      
      {/* Sub-Hub Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 pb-10">
        <div className="space-y-1">
            <h4 className="text-3xl font-black tracking-tighter text-foreground uppercase">{activeTab === 'list' ? '湲곌? ?덉님ㅽ듃由? : '?숆린님?뚯씠?꾨씪님}</h4>
            <p className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">{activeTab === 'list' ? '활성 노드 ?몃깽?좊━ 諛님앸퀎 泥닿퀎 愿由? : '?ㅼ떆媛님곗씠님?섏쭛 諛?異⑸룎 ?닿껐'}</p>
        </div>
        <div className="flex bg-slate-100/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200/50 shadow-inner">
            <button 
                onClick={() => setActiveTab('list')}
                className={cn(
                    "px-8 h-12 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
                    activeTab === 'list' ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-100" : "text-muted-foreground hover:bg-white/50"
                )}>
                <Server size={14} /> 노드 ?몃깽?좊━
            </button>
            <button 
                onClick={() => setActiveTab('reception')}
                className={cn(
                    "px-8 h-12 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
                    activeTab === 'reception' ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-100" : "text-muted-foreground hover:bg-white/50"
                )}>
                <History size={14} /> ?섏떊 ?뚯씠?꾨씪님            </button>
        </div>
      </div>

      <HubMetricGrid>
        <HubMetricCard title="?뷀떚님珥앺빀" value={total} icon={Database} color="primary" />
        <HubMetricCard title="활성 노드 님 value={data.filter(i => i.ablEnnc === '0').length || 1} icon={ShieldCheck} color="emerald" />
        <HubMetricCard title="?湲?以묒씤 而ㅻ컠" value={receptionData.filter(i => i.processSe !== '1').length || 0} icon={Clock} color="amber" status={receptionData.filter(i => i.processSe !== '1').length > 0 ? "二쇱쓽" : "?뺤긽"} />
        <HubMetricCard title="?숆린님泥섎━님 value="?덉쟾" icon={Zap} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
        title={activeTab === 'list' ? "湲곌? ?몃깽?좊━ ?쇱씠釉님ㅽ듃由? : "?곗씠님?섏쭛 ?뚯씠?꾨씪님媛먯궗"}
        description={activeTab === 'list' ? "?쒖뒪님?꾨컲?먯꽌 李몄“?섎뒗 紐⑤뱺 怨듦났湲곌? 노드 ?앸퀎?먯쓽 활성 留덉뒪님由ъ뒪?몄엯?덈떎." : "?몃? ?쒖뒪님?곕룞님?듯빐 吏?띿쟻?쇰줈 ?좎엯?섎뒗 肄붾뱶 蹂님?곗씠?곗쓽 ?섏떊 諛?諛섏쁺 ?대젰?낅땲님"}
        icon={activeTab === 'list' ? Globe : Zap}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="flex-1">
            <div className="relative group/search max-w-xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input
                  placeholder="활성 노드 諛님뚯씠?꾨씪님湲곕줉 寃님.."
                  value={searchWrd}
                  onChange={(e) => setSearchWrd(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        activeTab === 'list' ? loadListData(searchWrd, 1) : loadReceptionData(searchWrd, 1);
                    }
                  }}
                  className="h-16 pl-16 pr-8 w-full bg-slate-50/50 border-none rounded-[1.25rem] text-xs font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                />
            </div>
          </div>
          <Button variant="outline" size="lg" className="h-16 px-10 rounded-[1.25rem] border-2 font-black text-[10px] tracking-widest uppercase gap-2 hover:bg-slate-50 transition-all group">
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> ?곗씠님?대낫?닿린
          </Button>
        </div>

        <div className="overflow-hidden">
          <StandardDataTable
            columns={(activeTab === 'list' ? listColumns : receptionColumns) as any}
            data={(activeTab === 'list' ? data : receptionData) as any}
            loading={loading}
            emptyMessage={activeTab === 'list' ? "?곗씠?곕? ?먯깋님님?놁뒿?덈떎." : "?섏떊님?숆린님濡쒓렇媛 議댁옱?섏? ?딆뒿?덈떎."}
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


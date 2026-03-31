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
      const res = await codeAdminService.getInstitutionCodeList({ searchWrd: wrd, pageÎ≤àÌò∏: page });
      setData(res.list || []);
      setTotal(res.total || 0);
      setPageNo(page);
    } catch {
      toast('?∞Ïù¥?∞Î? Î∂àÎü¨?§Îäî Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReceptionData = async (wrd: string = searchWrd, page: number = pageNo) => {
    try {
      setLoading(true);
      const res = await codeAdminService.getInstitutionCodeRecptnList({ searchWrd: wrd, pageÎ≤àÌò∏: page });
      setReceptionData(res.list || []);
      setTotal(res.total || 0);
      setPageNo(page);
    } catch {
      toast('?òÏã† ?¥Ïó≠??Î∂àÎü¨?§Îäî Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (item: InstitutionCodeRecptn) => {
    if (!confirm(`${item.allInsttNm} ÏΩîÎìúÎ•?Î∞òÏòÅ?òÏãúÍ≤†Ïäµ?àÍπå?`)) return;
    
    try {
      await codeAdminService.processInstitutionCodeRecptn({
        occrrncDe: item.occrrncDe,
        insttCode: item.insttCode,
        opertSn: item.opertSn
      });
      toast('?±Í≥µ?ÅÏúºÎ°?Î∞òÏòÅ?òÏóà?µÎãà??', 'success');
      loadReceptionData();
    } catch {
      toast('Î∞òÏòÅ Ï≤òÎ¶¨ Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
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
      header: 'Í∏∞Í? ?îÌã∞??, 
      accessor: (item: InstitutionCode) => (
        <div className="flex items-center gap-4 py-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
            <Building2 size={20} />
          </div>
          <div>
            <span className="font-black tracking-tighter text-foreground block text-lg uppercase leading-none">{item.insttCode}</span>
            <span className="text-[9px] font-black text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40">Í∏∞Í? ?ùÎ≥Ñ??/span>
          </div>
        </div>
      )
    },
    { 
      header: 'Í∏∞Í? Î™ÖÏπ≠ (?ÑÎ°ú??', 
      accessor: (item: InstitutionCode) => (
        <span className="font-black text-foreground text-sm tracking-tight">{item.allInsttNm}</span>
      )
    },
    { 
      header: 'ÏµúÌïò???àÎ≤®', 
      accessor: (item: InstitutionCode) => (
        <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
            <span className="text-[10px] font-black text-primary tracking-tight font-mono">{item.lowestInsttNm}</span>
        </div>
      ),
      className: 'w-48'
    },
    { 
      header: '?§Ìä∏?åÌÅ¨ ?ëÏ†ê', 
      accessor: (item: InstitutionCode) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tracking-tighter tabular-nums">
            <Network size={12} className="opacity-30" />
            {item.telno || '---'}
        </div>
      ),
      className: 'w-40' 
    },
    { 
      header: '?ÅÌÉú', 
      accessor: (item: InstitutionCode) => (
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm",
          item.ablEnnc === '0' 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
            : "bg-slate-100 text-slate-400 border-border/50"
        )}>
          {item.ablEnnc === '0' ? <Activity size={12} className="animate-pulse" /> : <ShieldCheck size={12} className="opacity-40" />}
          <span className="text-[9px] font-black tracking-[0.2em] uppercase">{item.ablEnnc === '0' ? '?úÏÑ±' : '??†ú??}</span>
        </div>
      ),
      className: 'w-32 text-center'
    },
  ];

  const receptionColumns: Column<InstitutionCodeRecptn>[] = [
    { 
      header: '?òÏã† ?Ä?ÑÏä§?¨ÌîÑ', 
      accessor: (item: InstitutionCodeRecptn) => (
        <div className="flex items-center gap-2 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
          <History size={14} className="text-primary opacity-40" />
          {item.occrrncDe}
        </div>
      ),
      className: 'w-48' 
    },
    { 
        header: '?Ä???ùÎ≥Ñ??, 
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
    { header: 'Í∏∞Í? ?ÑÎ°ú??, accessor: 'allInsttNm', className: 'font-black' },
    { 
      header: '?ôÍ∏∞??Íµ¨Î∂Ñ', 
      accessor: (item: InstitutionCodeRecptn) => {
        const typeMap: any = {
            '1': { label: '?†Í∑ú ?±Î°ù', color: 'bg-primary/20 text-primary border-primary/20', icon: <Plus size={12} /> },
            '2': { label: '?®Ïπò ?ÖÎç∞?¥Ìä∏', color: 'bg-amber-500/20 text-amber-600 border-amber-500/20', icon: <RefreshCw size={12} /> },
            '3': { label: '?∞Ïù¥???ïÏ†ú', color: 'bg-rose-500/20 text-rose-600 border-rose-500/20', icon: <ShieldCheck size={12} /> }
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
      header: '?åÏù¥?ÑÎùº??Í≤∞Í≥º', 
      accessor: (item: InstitutionCodeRecptn) => (
        <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm",
            item.processSe === '1' 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            {item.processSe === '1' ? <CheckCircle2 size={12} /> : <Clock size={12} className="animate-spin duration-[3s]" />}
            <span className="text-[9px] font-black tracking-[0.2em] uppercase">{item.processSe === '1' ? '?ôÍ∏∞?îÎê®' : '?ÄÍ∏?Ï§?}</span>
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
            <MonitorCheck size={14} /> Î∞òÏòÅ ?ÅÏö©
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
            <h4 className="text-3xl font-black tracking-tighter text-foreground uppercase">{activeTab === 'list' ? 'Í∏∞Í? ?àÏ??§Ìä∏Î¶? : '?ôÍ∏∞???åÏù¥?ÑÎùº??}</h4>
            <p className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">{activeTab === 'list' ? '?úÏÑ± ?∏Îìú ?∏Î≤§?†Î¶¨ Î∞??ùÎ≥Ñ Ï≤¥Í≥Ñ Í¥ÄÎ¶? : '?§ÏãúÍ∞??∞Ïù¥???òÏßë Î∞?Ï∂©Îèå ?¥Í≤∞'}</p>
        </div>
        <div className="flex bg-slate-100/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200/50 shadow-inner">
            <button 
                onClick={() => setActiveTab('list')}
                className={cn(
                    "px-8 h-12 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
                    activeTab === 'list' ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-100" : "text-muted-foreground hover:bg-white/50"
                )}>
                <Server size={14} /> ?∏Îìú ?∏Î≤§?†Î¶¨
            </button>
            <button 
                onClick={() => setActiveTab('reception')}
                className={cn(
                    "px-8 h-12 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
                    activeTab === 'reception' ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-100" : "text-muted-foreground hover:bg-white/50"
                )}>
                <History size={14} /> ?òÏã† ?åÏù¥?ÑÎùº??            </button>
        </div>
      </div>

      <HubMetricGrid>
        <HubMetricCard title="?îÌã∞??Ï¥ùÌï©" value={total} icon={Database} color="primary" />
        <HubMetricCard title="?úÏÑ± ?∏Îìú ?? value={data.filter(i => i.ablEnnc === '0').length || 1} icon={ShieldCheck} color="emerald" />
        <HubMetricCard title="?ÄÍ∏?Ï§ëÏù∏ Ïª§Î∞ã" value={receptionData.filter(i => i.processSe !== '1').length || 0} icon={Clock} color="amber" status={receptionData.filter(i => i.processSe !== '1').length > 0 ? "Ï£ºÏùò" : "?ïÏÉÅ"} />
        <HubMetricCard title="?ôÍ∏∞??Ï≤òÎ¶¨?? value="?àÏ†Ñ" icon={Zap} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
        title={activeTab === 'list' ? "Í∏∞Í? ?∏Î≤§?†Î¶¨ ?ºÏù¥Î∏??§Ìä∏Î¶? : "?∞Ïù¥???òÏßë ?åÏù¥?ÑÎùº??Í∞êÏÇ¨"}
        description={activeTab === 'list' ? "?úÏä§???ÑÎ∞ò?êÏÑú Ï∞∏Ï°∞?òÎäî Î™®Îì† Í≥µÍ≥µÍ∏∞Í? ?∏Îìú ?ùÎ≥Ñ?êÏùò ?úÏÑ± ÎßàÏä§??Î¶¨Ïä§?∏ÏûÖ?àÎã§." : "?∏Î? ?úÏä§???∞Îèô???µÌï¥ ÏßÄ?çÏ†Å?ºÎ°ú ?†ÏûÖ?òÎäî ÏΩîÎìú Î≥Ä???∞Ïù¥?∞Ïùò ?òÏã† Î∞?Î∞òÏòÅ ?¥Î†•?ÖÎãà??"}
        icon={activeTab === 'list' ? Globe : Zap}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="flex-1">
            <div className="relative group/search max-w-xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input
                  placeholder="?úÏÑ± ?∏Îìú Î∞??åÏù¥?ÑÎùº??Í∏∞Î°ù Í≤Ä??.."
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
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> ?∞Ïù¥???¥Î≥¥?¥Í∏∞
          </Button>
        </div>

        <div className="overflow-hidden">
          <StandardDataTable
            columns={(activeTab === 'list' ? listColumns : receptionColumns) as any}
            data={(activeTab === 'list' ? data : receptionData) as any}
            loading={loading}
            emptyMessage={activeTab === 'list' ? "?∞Ïù¥?∞Î? ?êÏÉâ?????ÜÏäµ?àÎã§." : "?òÏã†???ôÍ∏∞??Î°úÍ∑∏Í∞Ä Ï°¥Ïû¨?òÏ? ?äÏäµ?àÎã§."}
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

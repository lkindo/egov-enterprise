'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Activity,
  Plus,
  ChevronRight,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PageHeader } from '@/app/components/layout/page-header';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkHubClientProps {
  jobs?: any[];
  reports?: any[];
  defaultTab?: 'job' | 'report' | 'calendar' | string;
}

export default function WorkHubClient({ jobs = [], reports = [], defaultTab = 'job' }: WorkHubClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryTab = searchParams.get('tab');
  const initialTab = (queryTab === 'calendar' ? 'calendar' :
    queryTab === 'report' ? 'report' :
      defaultTab.toLowerCase().includes('report') ? 'report' :
        defaultTab.toLowerCase().includes('calendar') ? 'calendar' : 'job') as 'job' | 'report' | 'calendar';

  const [activeTab, setTabState] = useState<'job' | 'report' | 'calendar'>(initialTab);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const setTab = (tab: 'job' | 'report' | 'calendar') => {
    setTabState(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`/admin/work-hub?${params.toString()}`, { scroll: false });
    setSelectedItemId(null);
  };

  const WorkListItem = ({ title, subtitle, icon, selected, onClick }: any) => (
    <div
      onClick={onClick}
      className={cn(
        "group p-6 rounded-[var(--radius-hub-item)] border transition-all cursor-pointer relative overflow-hidden",
        selected
          ? "bg-slate-900 text-white border-slate-900 shadow-2xl scale-[1.02] z-10"
          : "bg-white border-border/50 hover:border-primary/50 text-foreground shadow-sm"
      )}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-[var(--radius-hub-widget)] flex items-center justify-center transition-transform group-hover:rotate-6 shadow-lg",
          selected ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
        <HubStatusBadge
          label="?ㅼ떆媛님숆린님
          variant={selected ? 'default' : 'success'}
          className={selected ? 'border-white/20' : 'text-[8px] font-black tracking-widest'}
        />
      </div>

      <div className="space-y-1 relative z-10">
        <h4 className={cn("text-xl font-black tracking-tighter truncate leading-none", selected ? "text-white" : "text-foreground")}>{title}</h4>
        <p className={cn(
          "text-[10px] font-bold tracking-tight opacity-40 uppercase mt-2",
          selected ? "text-white/60" : "text-muted-foreground"
        )}>{subtitle}</p>
      </div>

      <div className={cn(
        "absolute right-[-10%] bottom-[-10%] opacity-[0.03] transition-all duration-700",
        selected ? "scale-150 rotate-12" : "group-hover:rotate-12"
      )}>
        {React.cloneElement(icon, { size: 120 })}
      </div>
    </div>
  );

  const renderJobList = () => (
    <div className="space-y-4">
      {jobs.length === 0 ? (
        <div className="p-10 text-center opacity-30 font-black text-xs tracking-widest border-2 border-dashed border-border rounded-3xl">등록님업무媛 ?놁뒿?덈떎.</div>
      ) : jobs.map((item) => (
        <WorkListItem
          key={item.deptJobBxId}
          id={item.deptJobBxId}
          title={item.deptJobBxNm}
          subtitle={`遺님 ${item.deptId || '湲濡쒕쾶'} 님ID: ${item.deptJobBxId}`}
          icon={<ClipboardList size={22} />}
          selected={selectedItemId === item.deptJobBxId}
          onClick={() => setSelectedItemId(item.deptJobBxId)}
        />
      ))}
    </div>
  );

  const renderReportList = () => (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <div className="p-10 text-center opacity-30 font-black text-xs tracking-widest border-2 border-dashed border-border rounded-3xl">등록님蹂닿퀬?쒓? ?놁뒿?덈떎.</div>
      ) : reports.map((item) => (
        <WorkListItem
          key={item.reprtId}
          id={item.reprtId}
          title={item.reprtSj}
          subtitle={`?묒꽦님 ${item.wrterNm} 님${item.reprtDe}`}
          icon={<FileText size={22} />}
          selected={selectedItemId === item.reprtId}
          onClick={() => setSelectedItemId(item.reprtId)}
        />
      ))}
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-8 rounded-[2rem] bg-white border-2 border-slate-100 shadow-xl space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tighter uppercase">?듯빀 ?ㅻ쭏님罹섎┛님/h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full text-[9px] font-black">媛쒖씤 ?쇱젙</Button>
            <Button size="sm" variant="default" className="rounded-full text-[9px] font-black bg-slate-900 text-white">遺님?쇱젙</Button>
          </div>
        </div>
        <div className="aspect-[4/3] bg-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 p-12 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary mb-2">
            <Calendar size={32} />
          </div>
          <p className="text-sm font-black text-slate-900 tracking-tighter uppercase">??뷀삎 ?ㅼ?以꾨쭅 ?쒖뒪님/p>
          <p className="text-[10px] font-bold text-slate-400 max-w-[200px] text-center leading-relaxed">以鍮꾨맂 罹섎┛님?붿쭊님鍮꾩쫰?덉뒪 ?쇱젙님?ㅼ떆媛꾩쑝濡님숆린?뷀빀?덈떎.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="?뚰겕?뚮줈님?덈툕"
        breadcrumbs={[{ label: '업무愿由? }, { label: '硫붿씤 ?뚰겕?ㅽ뀒?댁뀡' }]}
      />

      <HubHeader
        title="업무 諛님명뀛由ъ쟾님
        highlight="?덈툕"
        subtitle="?꾩궗 遺님업무 泥섎━ 諛?鍮꾩쫰?덉뒪 ?곗씠님?먯궛 ?듯빀 愿由님쇳꽣"
        icon={Briefcase}
        actions={
          <div className="flex gap-4 p-2">
            <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">
              <Filter size={16} /> 酉고룷님?꾪꽣
            </Button>
            <Button size="lg" className="h-12 px-8 rounded-xl font-black text-[10px] tracking-widest air-shadow-primary hover:-translate-y-1 transition-all gap-2 bg-slate-900 text-white border-none">
              <Plus size={18} /> 님업무 ?앹꽦
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-10 px-2 min-h-[850px]">
        {/* --- List Column --- */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="hub-table-container flex-1 flex flex-col p-10 space-y-8">
            <div className="bg-slate-50 dark:bg-muted/30 p-2 rounded-2xl flex gap-1 shadow-inner border border-border/20">
              <button
                onClick={() => setTab('job')}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all duration-300",
                  activeTab === 'job'
                    ? "bg-white dark:bg-slate-900 shadow-xl text-primary scale-[1.02] border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                WORKFLOW
              </button>
              <button
                onClick={() => setTab('report')}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all duration-300",
                  activeTab === 'report'
                    ? "bg-white dark:bg-slate-900 shadow-xl text-primary scale-[1.02] border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                ASSETS
              </button>
              <button
                onClick={() => setTab('calendar')}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all duration-300",
                  activeTab === 'calendar'
                    ? "bg-white dark:bg-slate-900 shadow-xl text-primary scale-[1.02] border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                CALENDAR
              </button>
            </div>

            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={16} />
              <Input
                className="pl-12 h-14 bg-muted/30 border-none rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-[10px] placeholder:font-black placeholder:tracking-widest uppercase"
                placeholder="PROCURING DATABASE ASSETS..."
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                >
                  {activeTab === 'job' ? renderJobList() : activeTab === 'report' ? renderReportList() : renderCalendar()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* --- Detail/Dashboard Column --- */}
        <div className="col-span-12 lg:col-span-7 space-y-10">
          <HubSectionCard
            title={selectedItemId ? "ASSET DEEP ANALYSIS" : activeTab === 'calendar' ? "SCHEDULE INTELLIGENCE" : "WAITING FOR FOCUS"}
            description={selectedItemId
              ? `?좎텧님?뷀떚님#${selectedItemId})님?님?ㅼ떆媛님곕룞 諛?鍮꾩쫰?덉뒪 濡쒖쭅 분석님활성?붾릺?덉뒿?덈떎.`
              : activeTab === 'calendar' ? "?꾩궗 諛?媛쒖씤 ?쇱젙님?듯빀?섏뿬 鍮꾩쫰?덉뒪 媛?⑹꽦님?쒕늿님?뚯븙?⑸땲님"
                : "?쇱そ 由ъ뒪?몄뿉님분석님업무 媛쒖껜 ?먮뒗 蹂닿퀬 ?먮즺瑜님좏깮?섏뿬 ?곗씠님?붿빟님?쒖옉?섏떗?쒖삤."}
            icon={selectedItemId ? Sparkles : activeTab === 'calendar' ? Calendar : Activity}
            statusBadges={
              <>
                <HubStatusBadge label="?쒖뒪님?뺤긽" icon={CheckCircle2} variant="success" className="text-[9px] font-black tracking-widest" />
                <HubStatusBadge label="?ㅽ듃由щ컢 활성" icon={Clock} variant="default" className="text-[9px] font-black tracking-widest" />
              </>
            }
          >
            <AnimatePresence mode="wait">
              {selectedItemId ? (
                <motion.div
                  key={selectedItemId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="h-96 rounded-[var(--radius-hub-section)] bg-slate-50 dark:bg-muted/10 border-2 border-dashed border-border/50 shadow-inner flex flex-col items-center justify-center p-12 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] grayscale transition-transform group-hover:scale-110 duration-1000" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center shadow-xl border border-border/20 mb-6 relative z-10 transition-transform group-hover:rotate-12">
                      <Database size={32} className="text-primary" />
                    </div>
                    <p className="text-xs font-black text-muted-foreground tracking-[0.4em] uppercase relative z-10">?명뀛由ъ쟾님?붿쭊 ?쒓컖님/p>
                    <p className="text-xl font-black text-foreground tracking-tighter mt-4 max-w-sm relative z-10">?곗씠님援ъ“ 분석 諛님뚰겕?뚮줈님?쒓컖님而댄룷?뚰듃 以鍮꾨맖</p>
                  </div>
                  <Button className="w-full h-18 text-base rounded-[var(--radius-hub-item)] bg-slate-900 border-none text-white font-black tracking-[0.4em] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all uppercase">
                    Launch Full Analytics
                  </Button>
                </motion.div>
              ) : (
                <div className="p-20 border-4 border-dashed border-border/20 rounded-[var(--radius-hub-section)] flex flex-col items-center justify-center text-center space-y-8 bg-slate-50/50 dark:bg-muted/5 grayscale">
                  <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[var(--radius-hub-widget)] flex items-center justify-center text-muted-foreground/20 shadow-inner border border-border/10">
                    <Briefcase size={48} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase opacity-40">{activeTab === 'calendar' ? 'Ready to Sync' : '?쒖뒪님?湲?}</h3>
                    <p className="text-[11px] font-bold text-muted-foreground/40 max-w-xs mx-auto tracking-[0.3em] uppercase leading-relaxed">
                      {activeTab === 'calendar' ? 'Connect Calendar Service for Insights' : 'Select Object to Capture Stream'}
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </HubSectionCard>

          <div className="grid grid-cols-2 gap-8">
            <SummaryBlock
              title="ACTIVE WORKFLOWS"
              value="12"
              icon={<Activity size={24} />}
              status="?덉젙"
              color="text-emerald-500"
            />
            <SummaryBlock
              title="ARCHIVED ASSETS"
              value="12,504"
              icon={<Layers size={24} />}
              status="PROTECTED"
              color="text-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({ title, value, icon, status, color }: any) {
  return (
    <div className="hub-table-container p-10 group hover:scale-[1.02] transition-all relative overflow-hidden bg-white">
      <div className="flex justify-between items-start mb-10">
        <div className={cn("w-14 h-14 rounded-[var(--radius-hub-widget)] bg-slate-50 flex items-center justify-center shadow-inner border border-border/10 group-hover:rotate-12 transition-transform", color)}>
          {icon}
        </div>
        <HubStatusBadge label={`HUB STATUS: ${status}`} variant="default" className="text-[8px] font-black tracking-widest" />
      </div>
      <div>
        <h3 className="text-4xl font-black tracking-tighter text-foreground leading-none">{value}</h3>
        <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase mt-4">{title}</p>
      </div>
      <div className="absolute bottom-[-10%] right-[-10%] opacity-[0.02] group-hover:scale-125 transition-transform duration-1000">
        {React.cloneElement(icon, { size: 100 })}
      </div>
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
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
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WorkHubClientProps {
  jobs?: any[];
  reports?: any[];
  defaultTab?: 'job' | 'report' | string;
}

export default function WorkHubClient({ jobs = [], reports = [], defaultTab = 'job' }: WorkHubClientProps) {
  const initialTab = (defaultTab.toLowerCase().includes('job') ? 'job' : 
                      defaultTab.toLowerCase().includes('report') ? 'report' : 'job') as 'job' | 'report';
  const [activeTab, setTab] = useState<'job' | 'report'>(initialTab);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const WorkListItem = ({ title, subtitle, icon, selected, onClick }: any) => (
    <div 
      onClick={onClick}
      className={cn(
        "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative overflow-hidden",
        selected 
          ? "bg-slate-900 text-white border-slate-900 shadow-2xl scale-[1.02] dark:bg-card dark:text-foreground dark:border-border" 
          : "bg-card border-border hover:border-primary/50 text-foreground"
      )}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6",
          selected ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
        <div className={cn(
          "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase italic border",
          selected ? "bg-white/10 border-white/20 text-white" : "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800"
        )}>
          Live Cache
        </div>
      </div>
      
      <div className="space-y-1 relative z-10">
        <h4 className="text-xl font-black italic tracking-tighter truncate">{title}</h4>
        <p className={cn(
          "text-[10px] font-black tracking-widest uppercase opacity-60",
          selected ? "text-white" : "text-muted-foreground"
        )}>{subtitle}</p>
      </div>

      <div className={cn(
        "absolute right-[-10%] bottom-[-10%] opacity-[0.05] transition-all duration-700",
        selected ? "scale-110 rotate-12" : "group-hover:rotate-12"
      )}>
        {React.cloneElement(icon, { size: 100 })}
      </div>
    </div>
  );

  const renderJobList = () => (
    <div className="space-y-3">
      {jobs.map((item) => (
        <WorkListItem 
          key={item.deptJobBxId}
          id={item.deptJobBxId}
          title={item.deptJobBxNm}
          subtitle={`Dept: ${item.deptId || 'Global'}`}
          icon={<ClipboardList size={20} />}
          selected={selectedItemId === item.deptJobBxId}
          onClick={() => setSelectedItemId(item.deptJobBxId)}
        />
      ))}
    </div>
  );

  const renderReportList = () => (
    <div className="space-y-3">
      {reports.map((item) => (
        <WorkListItem 
          key={item.reprtId}
          id={item.reprtId}
          title={item.reprtSj}
          subtitle={`By: ${item.wrterNm} • ${item.reprtDe}`}
          icon={<FileText size={20} />}
          selected={selectedItemId === item.reprtId}
          onClick={() => setSelectedItemId(item.reprtId)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl -rotate-2 dark:bg-slate-100 dark:text-slate-900">
            <Briefcase size={28} className="text-white dark:text-slate-900" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-foreground tracking-tighter italic leading-none">
              업무 및 프로젝트 <span className="text-primary italic">워크스페이스</span>
            </h2>
            <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] mt-2 italic">
              통합 생산성 및 인텔리전스
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-black tracking-tight gap-2">
            <Filter size={18} /> 뷰포트 설정
          </Button>
          <Button className="h-14 px-8 rounded-2xl bg-primary text-white font-black tracking-tight shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all gap-2">
            <Plus size={20} /> 새 항목 생성
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-card border-2 border-border p-8 rounded-[3rem] shadow-sm">
            <div className="flex bg-muted/50 p-1.5 rounded-2xl gap-2 mb-8">
              <button 
                onClick={() => setTab('job')}
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase italic transition-all",
                  activeTab === 'job' ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Workflow Units
              </button>
              <button 
                onClick={() => setTab('report')}
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase italic transition-all",
                  activeTab === 'report' ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Intelligence Assets
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="PROCURING ASSETS..." 
                className="h-14 pl-12 pr-6 rounded-2xl border-2 border-border font-black text-[10px] tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-background"
              />
            </div>

            <div className="max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {activeTab === 'job' ? renderJobList() : renderReportList()}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-10">
          <div className="bg-slate-900 text-white dark:bg-card dark:text-foreground p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <div className="w-24 h-24 bg-white/10 dark:bg-primary/5 rounded-[2rem] flex items-center justify-center p-6 backdrop-blur-3xl border border-white/20">
                <Activity size={48} className="text-primary-foreground dark:text-primary" />
              </div>
              <div className="space-y-3 flex-1 text-center md:text-left">
                <h2 className="text-4xl font-black italic tracking-tighter leading-none">
                  {selectedItemId ? "ASSET DETAILS" : "WAITING FOR FOCUS"}
                </h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-muted rounded-full text-[10px] font-black tracking-widest uppercase italic">
                    <CheckCircle2 size={12} className="text-emerald-400" /> Integrity System Active
                  </div>
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-muted rounded-full text-[10px] font-black tracking-widest uppercase italic">
                    <Clock size={12} className="text-primary" /> Real-time Streaming
                  </div>
                </div>
                <p className="text-slate-400 font-bold leading-relaxed max-w-xl">
                  {selectedItemId 
                    ? `선택된 항목(#${selectedItemId})에 대한 정밀 분석 데이터를 로드하고 있습니다. 실시간 연동이 활성화되었습니다.`
                    : "위 항목 중 하나를 선택하여 상세 사양 및 워크플로우를 분석하십시오."}
                </p>
              </div>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-primary/30 blur-[120px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SummaryBlock title="Active Processes" value="12" icon={<Activity />} />
            <SummaryBlock title="Total Archives" value="12,504" icon={<Activity />} />
          </div>

          {!selectedItemId && (
            <div className="p-16 border-4 border-dashed border-border rounded-[4rem] flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center text-muted-foreground/30">
                <Briefcase size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground tracking-tighter italic">항목이 선택되지 않음</h3>
                <p className="text-sm font-bold text-muted-foreground/60 max-w-xs mx-auto">
                  왼쪽 리스트에서 분석할 업무 상자 또는 일일 보고 항목을 선택하십시오.
                </p>
              </div>
            </div>
          )}

          {selectedItemId && (
            <div className="animate-in zoom-in-95 duration-500 space-y-6">
               <div className="h-96 rounded-[3.5rem] bg-card border-2 border-border shadow-sm p-12 flex items-center justify-center italic text-muted-foreground font-black tracking-widest uppercase text-xs">
                 Detail Engine Visualization Component
               </div>
               <Button className="w-full h-16 rounded-2xl bg-primary text-white font-black italic tracking-widest shadow-2xl hover:-translate-y-1 transition-all">
                  EXECUTE FULL ANALYTICS
               </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({ title, value, icon }: any) {
  return (
    <div className="p-8 rounded-[3rem] bg-card border-2 border-border group hover:scale-[1.02] transition-all relative overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
          {icon}
        </div>
        <div className="text-[10px] font-black text-muted-foreground tracking-widest uppercase italic">Status: Nom</div>
      </div>
      <h3 className="text-3xl font-black italic tracking-tighter text-foreground">{value}</h3>
      <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mt-1 opacity-60 italic">{title}</p>
    </div>
  );
}

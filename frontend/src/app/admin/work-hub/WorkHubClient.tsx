'use client';

import React, { useState, useMemo } from 'react';
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
  Sparkles,
  RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PageHeader } from '@/app/components/layout/page-header';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '@/services/business/user/ScheduleService';
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';

import { reportService } from '@/services/business/user/ReportService';

interface WorkHubClientProps {
  jobs?: any[];
  reports?: any[];
  defaultTab?: 'job' | 'report' | 'calendar' | string;
}

export default function WorkHubClient({ jobs: initialJobs = [], reports: initialReports = [], defaultTab = 'job' }: WorkHubClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const queryTab = searchParams.get('tab');
  const initialTab = (queryTab === 'calendar' ? 'calendar' :
    queryTab === 'report' ? 'report' :
      (defaultTab || '').toLowerCase().includes('report') ? 'report' :
        (defaultTab || '').toLowerCase().includes('calendar') || (defaultTab || '').toLowerCase().includes('schedule') ? 'calendar' : 'job') as 'job' | 'report' | 'calendar';

  const [activeTab, setTabState] = useState<'job' | 'report' | 'calendar'>(initialTab);
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  const setTab = (tab: 'job' | 'report' | 'calendar') => {
    setTabState(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`/admin/work-hub?${params.toString()}`, { scroll: false });
    setSelectedItemId(null);
  };

  // --- Queries ---
  const { data: scheduleData } = useQuery({
    queryKey: ['work-schedule', searchKeyword],
    queryFn: () => scheduleService.getScheduleList({ pageIndex: 1 }),
    enabled: activeTab === 'calendar'
  });
  const schedules = scheduleData?.list || [];

  const { data: jobData } = useQuery({
    queryKey: ['work-jobs', searchKeyword],
    queryFn: () => deptJobUserService.getDeptJobBoxes({ searchWrd: searchKeyword }),
    enabled: activeTab === 'job'
  });
  const jobs = jobData?.list || [];

  const { data: reportData } = useQuery({
    queryKey: ['work-reports', searchKeyword],
    queryFn: () => reportService.getReports({ page: 0, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'report'
  });
  const reports = reportData?.list || [];

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'job') return jobs.find(j => j.deptJobbxId === selectedItemId);
    if (activeTab === 'report') return reports.find(r => r.reprtId === selectedItemId);
    if (activeTab === 'calendar') return schedules.find(s => s.schdulId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, jobs, reports, schedules]);

  const WorkListItem = ({ title, subtitle, icon, selected, onClick }: any) => (
    <div
      onClick={onClick}
      className={cn(
        "group p-6 rounded-[0.1rem] border transition-all cursor-pointer relative overflow-hidden",
        selected
          ? "bg-slate-900 text-white border-slate-900 shadow-2xl scale-[1.02] z-10"
          : "bg-white border-border/50 hover:border-primary/50 text-foreground shadow-sm"
      )}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-[0.1rem] flex items-center justify-center transition-transform group-hover:rotate-6 shadow-lg",
          selected ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
        <HubStatusBadge
          label="실시간 동기화"
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
      {!(jobs || []).length ? (
        <div className="p-10 text-center opacity-30 font-black text-xs tracking-widest border-2 border-dashed border-border rounded-[0.1rem]">등록된 업무가 없습니다.</div>
      ) : (jobs || []).map((item: any) => (
        <WorkListItem
          key={item.deptJobbxId}
          title={item.deptJobbxNm}
          subtitle={`부서: ${item.deptId || '글로벌'} • ID: ${item.deptJobbxId}`}
          icon={<ClipboardList size={22} />}
          selected={selectedItemId === item.deptJobbxId}
          onClick={() => setSelectedItemId(item.deptJobbxId)}
        />
      ))}
    </div>
  );

  const renderReportList = () => (
    <div className="space-y-4">
      {!(reports || []).length ? (
        <div className="p-10 text-center opacity-30 font-black text-xs tracking-widest border-2 border-dashed border-border rounded-[0.1rem]">등록된 보고서가 없습니다.</div>
      ) : (reports || []).map((item: any) => (
        <WorkListItem
          key={item.reprtId}
          title={item.reprtSj}
          subtitle={`작성자: ${item.wrterNm} • ${item.reprtDe}`}
          icon={<FileText size={22} />}
          selected={selectedItemId === item.reprtId}
          onClick={() => setSelectedItemId(item.reprtId)}
        />
      ))}
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-8 rounded-[0.1rem] bg-white border-2 border-slate-100 shadow-xl space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tighter uppercase">통합 스마트 캘린더</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full text-[9px] font-black">개인 일정</Button>
            <Button size="sm" variant="default" className="rounded-full text-[9px] font-black bg-slate-900 text-white">부서 일정</Button>
          </div>
        </div>
        <div className="aspect-[4/3] bg-slate-50 rounded-[0.1rem] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 p-12 space-y-4">
          <div className="w-16 h-16 rounded-[0.1rem] bg-white shadow-lg flex items-center justify-center text-primary mb-2">
            <Calendar size={32} />
          </div>
          <p className="text-sm font-black text-slate-900 tracking-tighter uppercase">대화형 스케줄링 시스템</p>
          <p className="text-[10px] font-bold text-slate-400 max-w-[200px] text-center leading-relaxed">준비된 캘린더 엔진이 비즈니스 일정을 실시간으로 동기화합니다.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="워크플로우 허브"
        breadcrumbs={[{ label: '업무관리' }, { label: '메인 워크스테이션' }]}
      />

      <HubHeader
        title="Works & Intelligence"
        highlight="Hub"
        subtitle="전사 부서별 업무 처리 및 비즈니스 데이터 자산 통합 관리 센터"
        icon={Briefcase}
        actions={
          <div className="flex gap-4 p-2">
            <Button variant="outline" size="lg" className="h-12 rounded-[0.1rem] border-2 font-black text-[10px] tracking-widest uppercase gap-2">
              <Filter size={16} /> 뷰포트 필터
            </Button>
            <Button size="lg" className="h-12 px-8 rounded-[0.1rem] font-black text-[10px] tracking-widest air-shadow-primary hover:-translate-y-1 transition-all gap-2 bg-slate-900 text-white border-none">
              <Plus size={18} /> 새 업무 생성
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-10 px-2 min-h-[850px]">
        {/* --- List Column --- */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="hub-table-container flex-1 flex flex-col p-10 space-y-8">
            <div className="bg-slate-50 dark:bg-muted/30 p-2 rounded-[0.1rem] flex gap-1 shadow-inner border border-border/20">
              <button
                onClick={() => setTab('job')}
                className={cn(
                  "flex-1 px-4 py-3 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase transition-all duration-300",
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
                  "flex-1 px-4 py-3 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase transition-all duration-300",
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
                  "flex-1 px-4 py-3 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase transition-all duration-300",
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
                className="pl-12 h-14 bg-muted/30 border-none rounded-[0.1rem] text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-[10px] placeholder:font-black placeholder:tracking-widest uppercase"
                placeholder="PROCURING DATABASE ASSETS..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
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
              ? `자산 엔티티 #${selectedItemId}에 대한 실시간 연동 및 비즈니스 로직 분석이 활성화되었습니다.`
              : activeTab === 'calendar' ? "전사 및 개인 일정을 통합하여 비즈니스 가용성을 한눈에 파악합니다."
                : "오른쪽 리스트에서 분석할 업무 객체 또는 보고 자료를 선택하여 데이터 요약을 시작하십시오."}
            icon={selectedItemId ? Sparkles : activeTab === 'calendar' ? Calendar : Activity}
            statusBadges={
              <>
                <HubStatusBadge label="시스템 정상" icon={CheckCircle2} variant="success" className="text-[9px] font-black tracking-widest" />
                <HubStatusBadge label="스트림 활성" icon={Clock} variant="default" className="text-[9px] font-black tracking-widest" />
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
                  <div className="h-96 rounded-[0.1rem] bg-slate-50 dark:bg-muted/10 border-2 border-dashed border-border/50 shadow-inner flex flex-col items-center justify-center p-12 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] grayscale transition-transform group-hover:scale-110 duration-1000" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[0.1rem] flex items-center justify-center shadow-xl border border-border/20 mb-6 relative z-10 transition-transform group-hover:rotate-12">
                      <Database size={32} className="text-primary" />
                    </div>
                    <p className="text-xs font-black text-muted-foreground tracking-[0.4em] uppercase relative z-10">인텔리전스 엔진 시각화</p>
                    <p className="text-xl font-black text-foreground tracking-tighter mt-4 max-w-sm relative z-10">데이터 구조 분석 및 워크플로우 시각화 컴포넌트 준비됨</p>
                    <pre className="text-[10px] font-mono mt-6 p-4 bg-white/50 rounded-[0.1rem] overflow-hidden max-w-full truncate">
                      {JSON.stringify(selectedItem, null, 1)}
                    </pre>
                  </div>
                  <Button className="w-full h-18 text-base rounded-[0.1rem] bg-slate-900 border-none text-white font-black tracking-[0.4em] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all uppercase">
                    Launch Full Analytics
                  </Button>
                </motion.div>
              ) : (
                <div className="p-20 border-4 border-dashed border-border/20 rounded-[0.1rem] flex flex-col items-center justify-center text-center space-y-8 bg-slate-50/50 dark:bg-muted/5 grayscale">
                  <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[0.1rem] flex items-center justify-center text-muted-foreground/20 shadow-inner border border-border/10">
                    <Briefcase size={48} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase opacity-40">{activeTab === 'calendar' ? 'Ready to Sync' : '시스템 대기'}</h3>
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
              status="안정"
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
        <div className={cn("w-14 h-14 rounded-[0.1rem] bg-slate-50 flex items-center justify-center shadow-inner border border-border/10 group-hover:rotate-12 transition-transform", color)}>
          {icon}
        </div>
        <HubStatusBadge label={`HUB STATUS: ${status}`} variant="default" className="text-[8px] font-black tracking-widest" />
      </div>
      <div>
        <h3 className="text-4xl font-black tracking-tighter text-foreground leading-none">{value}</h3>
        <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase mt-4">{title}</p>
      </div>
      <div className="absolute bottom-[-10%] right-[-10%] opacity-[0.02] group-hover:scale-125 transition-transform duration-1000">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 100 })}
      </div>
    </div>
  );
}

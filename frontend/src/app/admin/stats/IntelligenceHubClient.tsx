'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, 
  Activity, 
  Users, 
  Monitor, 
  Database, 
  FileText, 
  Filter, 
  Download, 
  ChevronRight, 
  RefreshCcw, 
  Zap, 
  Box, 
  LayoutDashboard, 
  Vote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { statsAdminService } from '@/services/foundation/system/StatsAdminService';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { XAxis,  
  YAxis,  
  CartesianGrid,  
  Tooltip as RechartsTooltip, 
  AreaChart, 
  Area } from 'recharts';
import { HubMetricSkeleton, HubListSkeleton } from '@/components/ui/hub/HubSkeleton';
import { SafeResponsiveContainer } from '@/components/features/observability-charts';

// --- Types ---
type StatsTab = 'DASHBOARD' | 'USER_STATS' | 'CONTENT_STATS' | 'SYSTEM_STATS' | 'SURVEYS' | 'REPORTS';

export default function IntelligenceHubClient({ defaultTab = 'DASHBOARD' }: { defaultTab?: StatsTab }) {
  const [activeTab, setActiveTab] = useState<StatsTab>(defaultTab);
  const [nowStr, setNowStr] = useState<string>('');

  React.useEffect(() => {
    setNowStr(new Date().toISOString());
  }, []);

  // --- Data Fetching ---
  const { data: userStats, isLoading: isUserLoading } = useQuery({
    queryKey: ['admin-stats-user'],
    queryFn: () => statsAdminService.getUserStats(),
    enabled: activeTab === 'USER_STATS' || activeTab === 'DASHBOARD'
  });

  const { data: bbsStats, isLoading: isBbsLoading } = useQuery({
    queryKey: ['admin-stats-bbs'],
    queryFn: () => statsAdminService.getBbsStats(),
    enabled: activeTab === 'CONTENT_STATS' || activeTab === 'DASHBOARD'
  });

  const { data: screenStats, isLoading: isScreenLoading } = useQuery({
    queryKey: ['admin-stats-screen'],
    queryFn: () => statsAdminService.getScreenStats(),
    enabled: activeTab === 'SYSTEM_STATS' || activeTab === 'DASHBOARD'
  });

  const { data: dataUsage, isLoading: isDataLoading } = useQuery({
    queryKey: ['admin-stats-data-usage'],
    queryFn: () => statsAdminService.getDataUsageStats(),
    enabled: activeTab === 'SYSTEM_STATS' || activeTab === 'DASHBOARD'
  });

  const { data: surveys, isLoading: isSurveyLoading } = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => surveyAdminService.getSurveyList({}),
    enabled: activeTab === 'SURVEYS'
  });

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
      {/* --- Header --- */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-11 bg-slate-900 rounded-lg flex items-center justify-center shadow-2xl skew-x-2">
            <BarChart3 size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tighter">
              Intelligence <span className="text-primary">_ Hub</span>
            </h2>
            <p className="text-xs font-bold text-slate-600 tracking-tight mt-2">
              거버넌스 인사이트 및 데이터 분석
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="h-11 px-6 rounded-lg border-2 font-bold tracking-tight gap-2">
            <Download size={18} /> 데이터셋 내보내기
          </Button>
          <Button className="h-11 px-8 rounded-lg bg-slate-900 text-white font-bold tracking-tight shadow-xl shadow-slate-200 hover:-translate-y-1 transition-all gap-2">
            <RefreshCcw size={20} /> 강제 새로고침
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 px-2">

        {/* --- Left Column: Navigation (20%) --- */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <Card className="rounded-lg border-0 bg-white shadow-2xl p-4 ring-1 ring-slate-100">
            <NavButton icon={<LayoutDashboard size={20} />} label="글로벌 개요" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} />
            <NavButton icon={<Users size={20} />} label="사용자 통계" active={activeTab === 'USER_STATS'} onClick={() => setActiveTab('USER_STATS')} />
            <NavButton icon={<Box size={20} />} label="콘텐츠 지표" active={activeTab === 'CONTENT_STATS'} onClick={() => setActiveTab('CONTENT_STATS')} />
            <NavButton icon={<Database size={20} />} label="시스템 활성" active={activeTab === 'SYSTEM_STATS'} onClick={() => setActiveTab('SYSTEM_STATS')} />
            <NavButton icon={<Vote size={20} />} label="설문조사 분석" active={activeTab === 'SURVEYS'} onClick={() => setActiveTab('SURVEYS')} />
            <NavButton icon={<FileText size={20} />} label="운영 보고서" active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} />
          </Card>

          <Card className="rounded-lg border-0 bg-slate-900 text-white shadow-2xl p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-xs font-bold text-white/70 tracking-tight leading-tight">_ 예상 효율성</h3>
              <div className="flex items-center gap-4">
                <span className="text-6xl font-bold tracking-tighter tabular-nums">+{userStats?.length || 24}%</span>
                <Zap size={32} className="text-primary fill-primary" />
              </div>
              <p className="text-xs text-white/60 font-bold tracking-tight">인텔리전스 엔진 v4.2 최적화</p>
            </div>
          </Card>
        </div>

        {/* --- Center/Right Columns: Interactive Data (80%) --- */}
        <div className="col-span-12 lg:col-span-9 space-y-8">

          {isUserLoading || isBbsLoading || isScreenLoading ? (
            <HubMetricSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatSummaryCard icon={<Activity size={24} />} label="활성 세션" value={`${userStats?.length || 0}`} trend="+12%" />
              <StatSummaryCard icon={<Monitor size={24} />} label="화면 요청" value={`${screenStats?.length || 0}k`} trend="+5.4k" color="primary" />
              <StatSummaryCard icon={<Database size={24} />} label="데이터 사용량" value={`${dataUsage?.length || 0}GB`} trend="-2.1%" />
            </div>
          )}

          <Card className="rounded-lg border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-100 min-h-[500px] flex flex-col">
            <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-600 tracking-tight">_ 심층 분석 뷰포트</h3>
                <CardTitle className="text-2xl font-bold text-slate-900 tracking-tighter">
                  {activeTab === 'DASHBOARD' ? '글로벌 개요' :
                    activeTab === 'USER_STATS' ? '사용자 통계 분석' :
                      activeTab === 'CONTENT_STATS' ? '콘텐츠 지표 분석' :
                        activeTab === 'SYSTEM_STATS' ? '시스템 활성 지표' :
                          activeTab === 'SURVEYS' ? '설문조사 결과 분석' :
                            activeTab === 'REPORTS' ? '운영 보고서 아카이브' : activeTab}
                </CardTitle>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="rounded-lg h-10 px-4 text-xs font-bold tracking-tight">최근 30일</Button>
                <Button size="default" variant="ghost" className="rounded-lg h-10 px-4 text-xs font-bold tracking-tight" aria-label="데이터 필터 설정"><Filter size={18} className="mr-2" /> 필터</Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full"
                >
                  {isUserLoading || isBbsLoading || isScreenLoading ? (
                    <HubListSkeleton />
                  ) : activeTab === 'SURVEYS' ? (
                    <div className="space-y-4">
                      {surveys?.list?.map((s: any) => (
                        <div 
                          key={s.qestnrId} 
                          className="group p-8 rounded-xl bg-white border-2 border-slate-50 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all flex items-center justify-between relative overflow-hidden"
                        >
                          <div className="flex items-center gap-8 relative z-10">
                            <div className="w-16 h-12 bg-slate-50 group-hover:bg-primary/10 rounded-xl flex items-center justify-center shadow-inner transition-colors">
                              <Vote className="text-slate-400 group-hover:text-primary transition-colors" size={24} />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter",
                                  (nowStr && s.qestnrEndDe > nowStr)
                                    ? "bg-emerald-500/10 text-emerald-500" 
                                    : "bg-slate-500/10 text-slate-500"
                                )}>
                                  {(nowStr && s.qestnrEndDe > nowStr) ? 'Active' : 'Archived'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 font-mono">END: {s.qestnrEndDe}</span>
                              </div>
                              <h4 className="text-lg font-bold text-slate-900 tracking-tighter group-hover:text-primary transition-colors">
                                {s.qestnrSj}
                              </h4>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            className="rounded-lg h-12 px-6 text-xs font-bold tracking-tight gap-2 transition-all hover:bg-slate-900 hover:text-white border-2 border-transparent hover:border-slate-900 group-hover:translate-x-2"
                          >
                            인텔리전스 리포트 <ChevronRight size={16} />
                          </Button>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[400px] w-full">
                      <SafeResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                        <AreaChart
                          data={activeTab === 'USER_STATS' ? userStats : activeTab === 'CONTENT_STATS' ? bbsStats : screenStats}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="statsDate" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }}
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                                fontWeight: 900,
                                fontSize: '12px'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="creatCo" 
                            stroke="#3b82f6" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="inqCnt" 
                            stroke="#10b981" 
                            strokeWidth={4}
                            fillOpacity={0}
                          />
                        </AreaChart>
                      </SafeResponsiveContainer>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

// --- Sub-components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full group p-6 rounded-lg border-2 transition-all flex items-center gap-5 mb-2",
        active
          ? "bg-slate-900 border-slate-900 text-white shadow-xl"
          : "bg-white border-transparent hover:border-slate-50 text-slate-600 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center transition-all",
        active ? "bg-white/10 text-white" : "bg-slate-50 text-slate-600 group-hover:bg-slate-100"
      )}>
        {icon}
      </div>
      <span className="text-xs font-bold tracking-tight">_ {label}</span>
    </button>
  );
}

function StatSummaryCard({ icon, label, value, trend, color = 'slate' }: { icon: React.ReactNode, label: string, value: string, trend: string, color?: string }) {
  return (
    <Card className="rounded-lg border-0 bg-white shadow-2xl p-10 ring-1 ring-slate-100 hover:scale-[1.05] transition-all">
      <div className="space-y-6">
        <div className={cn(
          "w-14 h-11 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:rotate-12",
          color === 'primary' ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-600"
        )}>
          {icon}
        </div>
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-slate-600 tracking-tight leading-tight">_ {label}</h5>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold tracking-tighter text-slate-900 tabular-nums">{value}</span>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

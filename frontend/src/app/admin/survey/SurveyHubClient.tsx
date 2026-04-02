
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PageHeader } from '@/app/components/layout/page-header';
import {
  ClipboardCheck,
  BarChart3,
  FileText,
  Users,
  Plus,
  Search,
  Filter,
  Clock,
  Calendar,
  ChevronRight,
  Trophy,
  TrendingUp,
  PieChart,
  CheckCircle,
  Target,
  Activity,
  BookOpen,
  Settings,
  Layout,
  Database,
  ArrowRight,
  Download,
  Share2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type SurveyTab = 'SURVEYS' | 'TEMPLATES' | 'STATS';

interface SurveyItem {
  id: string | number;
  title: string;
  participants: number;
  status: '활성' | 'PENDING' | 'CLOSED';
  startDate: string;
  endDate: string;
}

export default function SurveyHubClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- States ---
  const [activeTab, setActiveTab] = useState<SurveyTab>('SURVEYS');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Mock Data ---
  const surveys: SurveyItem[] = [
    { id: 1, title: '2024년 상반기 직원 만족도 조사', participants: 450, status: '활성', startDate: '2024-03-01', endDate: '2024-03-31' },
    { id: 2, title: '신규 기업 보안 정책 피드백', participants: 120, status: '활성', startDate: '2024-03-10', endDate: '2024-03-24' },
    { id: 3, title: '복지 포인트 사용처 선호도 조사', participants: 856, status: 'CLOSED', startDate: '2024-02-15', endDate: '2024-03-01' },
    { id: 4, title: '사내 어학 교육 수요 조사', participants: 32, status: 'PENDING', startDate: '2024-04-01', endDate: '2024-04-15' },
  ];

  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="조사 마스터 허브"
        breadcrumbs={[{ label: '커뮤니티' }, { label: '설문 인텔리전스' }]}
      />

      <HubHeader
        title="설문 인텔리전스"
        highlight="매트릭스"
        subtitle="전사 피드백 및 성능 분석 데이터 통합 매니지먼트 허브"
        icon={ClipboardCheck}
        actions={
          <div className="flex gap-4 p-2">
            <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">
              <Database size={16} /> 분석 아카이브
            </Button>
            <Button size="lg" className="h-12 px-8 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all gap-2">
              <Plus size={18} /> 신규 설문 생성
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-10 px-2 min-h-[850px]">

        {/* --- Sidebar Controller --- */}
        <div className="col-span-12 lg:col-span-3 space-y-8">
          <div className="hub-table-container p-6 bg-slate-50 shadow-inner">
            <NavButton icon={<Layout size={20} />} label="전체 " active={activeTab === 'SURVEYS'} onClick={() => setActiveTab('SURVEYS')} />
            <div className="h-4" />
            <NavButton icon={<BookOpen size={20} />} label="템플릿" active={activeTab === 'TEMPLATES'} onClick={() => setActiveTab('TEMPLATES')} />
            <div className="h-4" />
            <NavButton icon={<BarChart3 size={20} />} label="고급 통계" active={activeTab === 'STATS'} onClick={() => setActiveTab('STATS')} />
          </div>

          <div className="hub-table-container p-10 bg-slate-900 border-none text-white relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-primary/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-[2s]" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary shadow-2xl border border-white/5">
                  <TrendingUp size={24} />
                </div>
                <HubStatusBadge label="동기화됨" variant="success" className="bg-emerald-500/20 border-emerald-500/20 text-emerald-400 text-[8px] font-black tracking-widest uppercase" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase leading-none">총 참여</p>
                <h4 className="text-4xl font-black tracking-tighter text-white leading-none tabular-nums">1,458<span className="text-sm opacity-20 ml-2">명</span></h4>
                <div className="flex items-center gap-2 text-[9px] font-black text-emerald-400 mt-4 bg-emerald-400/10 w-fit px-3 py-1 rounded-full border border-emerald-400/20">
                  <Activity size={10} /> +12.4% INCREMENTAL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Survey Board --- */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <HubSectionCard
            title="설문 인벤토리"
            description="현재 시스템에서 이용 중인 데이터 수집 목록입니다."
            icon={Database}
          >
            <div className="relative group mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within:opacity-100 transition-opacity" size={16} />
              <Input
                className="h-14 pl-12 pr-6 bg-muted/30 border-none rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all pointer-events-auto"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {surveys.map((survey) => (
                  <motion.div
                    layout
                    key={survey.id}
                    onClick={() => setSelectedSurveyId(survey.id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "group p-6 rounded-[var(--radius-hub-item)] border transition-all cursor-pointer flex items-center justify-between relative overflow-hidden",
                      selectedSurveyId === survey.id
                        ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
                        : "bg-white border-border/50 hover:border-primary/50 text-foreground shadow-sm"
                    )}
                  >
                    <div className="space-y-2 max-w-[75%] relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        {survey.status === '활성' ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-emerald-500 tracking-widest uppercase">활성</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-full border border-border/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase">{survey.status}</span>
                          </div>
                        )}
                        <span className="text-[9px] font-black text-muted-foreground/30 tracking-widest uppercase opacity-60">ID: #{survey.id}</span>
                      </div>
                      <h4 className={cn("text-lg font-black tracking-tighter leading-none truncate uppercase", selectedSurveyId === survey.id ? "text-white" : "text-foreground")}>
                        {survey.title}
                      </h4>
                      <div className={cn("flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-tight", selectedSurveyId === survey.id ? "text-white/60" : "text-muted-foreground")}>
                        <Calendar size={12} /> {survey.startDate} ~ {survey.endDate}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 relative z-10">
                      <span className={cn("text-xl font-black tracking-tighter tabular-nums leading-none", selectedSurveyId === survey.id ? "text-white" : "text-primary")}>
                        {survey.participants.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-black tracking-[0.2em] opacity-40 uppercase">명</span>
                    </div>

                    <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.02] grayscale transition-all duration-700">
                      <ClipboardCheck size={80} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </HubSectionCard>
        </div>

        {/* --- Analytical Insights --- */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-10">
          <AnimatePresence mode="wait">
            {selectedSurveyId ? (
              <motion.div
                key={selectedSurveyId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <HubSectionCard
                  title="실시간 지능 분석"
                  description="선택된 설문 프로파일 및 응답 데이터 시각화 및 트렌드 분석입니다."
                  icon={BarChart3}
                  statusBadges={
                    <div className="flex gap-2">
                      <HubStatusBadge label="스트림" icon={Activity} variant="default" className="text-[8px] font-black tracking-widest" />
                      <HubStatusBadge label="확인됨" icon={CheckCircle} variant="success" className="text-[8px] font-black tracking-widest" />
                    </div>
                  }
                >
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase flex items-center gap-3">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                          Temporal Flow Analysis
                        </h4>
                        <span className="text-[9px] font-black text-primary tracking-widest uppercase">라이브 게이지</span>
                      </div>
                      <div className="h-56 rounded-[3rem] bg-slate-950 border-8 border-slate-900 flex items-end justify-between p-12 gap-8 relative overflow-hidden shadow-2xl">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/10 blur-[40px] pointer-events-none" />
                        <Bar height={40} opacity={0.3} color="bg-white/10" />
                        <Bar height={70} opacity={0.5} color="bg-white/20" />
                        <Bar height={90} opacity={1} color="bg-primary" active />
                        <Bar height={30} opacity={0.4} color="bg-white/15" />
                        <Bar height={60} opacity={0.7} color="bg-white/25" />
                        <Bar height={80} opacity={0.2} color="bg-white/5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pb-2">
                      <DetailStat icon={<Users size={18} />} label="총 참여자" value="2,480" color="primary" />
                      <DetailStat icon={<Clock size={18} />} label="평균 소요 시간" value="4분 12초" color="amber" />
                      <DetailStat icon={<Target size={18} />} label="완료율" value="78.2%" color="emerald" />
                      <DetailStat icon={<AlertCircle size={18} />} label="이탈률" value="12.4%" color="rose" />
                    </div>

                    <div className="flex gap-4 p-2">
                      <Button variant="outline" className="h-16 flex-1 rounded-[2rem] border-2 border-border font-black tracking-[0.2em] shadow-sm uppercase gap-3">
                        <Share2 size={18} /> Protocol Link
                      </Button>
                      <Button className="h-16 flex-[2] bg-slate-900 border-none text-white rounded-[2rem] font-black tracking-[0.3em] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all uppercase gap-3">
                        Export Data <Download size={20} />
                      </Button>
                    </div>
                  </div>
                </HubSectionCard>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 select-none grayscale bg-slate-50 dark:bg-muted/5 rounded-[4rem] border-4 border-dashed border-border/20">
                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-muted-foreground/20 shadow-inner mb-10 border border-border/10">
                  <PieChart size={48} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase opacity-50">시스템 대기</h3>
                  <p className="text-[11px] font-bold text-muted-foreground/40 max-w-xs mx-auto tracking-[0.4em] uppercase leading-relaxed">
                    Select Identity to Initiate Analytics
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
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
        "w-full group p-6 rounded-3xl border-2 transition-all flex items-center gap-6",
        active
          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
          : "bg-white border-transparent hover:border-primary/20 text-slate-500 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md",
        active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary shadow-inner"
      )}>
        {icon}
      </div>
      <span className="text-[11px] font-black tracking-widest uppercase ">{label}</span>
    </button>
  );
}

function Bar({ height, opacity, active = false, color }: any) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `${height}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn(
          "w-full rounded-t-2xl transition-all shadow-[0_-5px_20px_-5px_rgba(255,255,255,0.1)]",
          color
        )}
        style={{ opacity }}
      />
    </div>
  );
}

function DetailStat({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  const colorMap: any = {
    primary: "text-primary bg-primary/5 border-primary/10",
    amber: "text-amber-500 bg-amber-500/5 border-amber-500/10",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10",
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/10"
  };

  return (
    <div className={cn("p-8 rounded-[2.5rem] border-2 space-y-4 shadow-sm group hover:scale-105 transition-transform", colorMap[color])}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-[9px] font-black tracking-[0.2em] uppercase opacity-40 leading-none">{label}</span>
      </div>
      <p className="text-2xl font-black tracking-tighter text-foreground leading-none tabular-nums">{value}</p>
    </div>
  );
}

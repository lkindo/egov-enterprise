'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
 Layout
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
 status: 'ACTIVE' | 'PENDING' | 'CLOSED';
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
 { id: 1, title: '2024년 상반기 직원 만족도 조사', participants: 450, status: 'ACTIVE', startDate: '2024-03-01', endDate: '2024-03-31' },
 { id: 2, title: '신규 기업 보안 정책 피드백', participants: 120, status: 'ACTIVE', startDate: '2024-03-10', endDate: '2024-03-24' },
 { id: 3, title: '복지 포인트 사용처 선호도 조사', participants: 856, status: 'CLOSED', startDate: '2024-02-15', endDate: '2024-03-01' },
 { id: 4, title: '사내 어학 교육 수요 조사', participants: 32, status: 'PENDING', startDate: '2024-04-01', endDate: '2024-04-15' },
 ];

 const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
 {/* --- Header --- */}
 <div className="flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl rotate-3">
 <ClipboardCheck size={28} className="text-white" />
 </div>
 <div>
 <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
 설문 인텔리전스
 </h2>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 italic">
 통합 피드백 및 분석 허브
 </p>
 </div>
 </div>
 <Button className="h-14 px-8 rounded-2xl bg-primary text-white font-black tracking-tight shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all gap-3">
 <Plus size={20} /> 신규 설문 생성
 </Button>
 </div>

 <div className="grid grid-cols-12 gap-8 px-2">
 
 {/* --- Left Column: Navigation & Stats (25%) --- */}
 <div className="col-span-12 lg:col-span-3 space-y-8">
 <Card className="rounded-[2.5rem] border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-100">
 <CardHeader className="bg-slate-50/50 p-8 border-b">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic">
 설문 탐색기
 </CardTitle>
 </CardHeader>
 <CardContent className="p-4 space-y-2">
 <NavButton icon={<Layout size={20} />} label="전체 " active={activeTab === 'SURVEYS'} onClick={() => setActiveTab('SURVEYS')} />
 <NavButton icon={<BookOpen size={20} />} label="템플릿" active={activeTab === 'TEMPLATES'} onClick={() => setActiveTab('TEMPLATES')} />
 <NavButton icon={<BarChart3 size={20} />} label="고급 통계" active={activeTab === 'STATS'} onClick={() => setActiveTab('STATS')} />
 </CardContent>
 </Card>

 <Card className="rounded-[2.5rem] border-0 bg-slate-900 text-white shadow-2xl p-8 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-10">
 <TrendingUp size={80} />
 </div>
 <div className="relative z-10 space-y-6">
 <div className="space-y-1">
 <p className="text-[10px] font-bold text-white/40 tracking-tight">총 응답자 수</p>
 <h4 className="text-4xl font-black italic tracking-tighter">1,458</h4>
 </div>
 <div className="flex items-center gap-2 text-[10px] font-black text-primary bg-primary/10 w-fit px-3 py-1 rounded-full border border-primary/20">
 <TrendingUp size={12} /> +12.4% 지난달 대비
 </div>
 </div>
 </Card>
 </div>

 {/* --- Center Column: Survey List (40%) --- */}
 <div className="col-span-12 lg:col-span-4 h-full min-h-[700px]">
 <Card className="h-full rounded-[3rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
 <CardHeader className="bg-slate-50/50 border-b p-8 space-y-6">
 <div className="flex items-center justify-between">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic">
 설문 인벤토리
 </CardTitle>
 <span className="bg-primary/10 text-primary text-[8px] font-black px-2 py-0.5 rounded-full border border-primary/20">{surveys.length}</span>
 </div>
 <div className="relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
 <Input 
 className="pl-9 h-11 bg-white border-slate-100 rounded-xl text-sm font-bold"
 placeholder="검색..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 </CardHeader>
 <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
 {surveys.map((survey) => (
 <div 
 key={survey.id}
 onClick={() => setSelectedSurveyId(survey.id)}
 className={cn(
 "group p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
 selectedSurveyId === survey.id 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-600"
 )}
 >
 <div className="space-y-1 max-w-[70%]">
 <div className="flex items-center gap-2 mb-1">
 {survey.status === 'ACTIVE' ? (
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 ) : (
 <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
 )}
 <span className={cn("text-[9px] font-black tracking-tight", selectedSurveyId === survey.id ? "text-primary" : "text-slate-400")}>
 {survey.status}
 </span>
 </div>
 <h4 className={cn("text-sm font-black truncate", selectedSurveyId === survey.id ? "text-white" : "text-slate-900 italic")}>
 {survey.title}
 </h4>
 <p className={cn("text-[8px] font-bold", selectedSurveyId === survey.id ? "text-white/40" : "text-slate-400 tracking-tight")}>
 {survey.startDate} ~ {survey.endDate}
 </p>
 </div>
 <div className="flex flex-col items-end gap-1">
 <span className={cn("text-[10px] font-bold", selectedSurveyId === survey.id ? "text-white" : "text-slate-900")}>
 {survey.participants}
 </span>
 <span className="text-[8px] font-black opacity-40">응답함</span>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 </div>

 {/* --- Right Column: Insights & Details (35%) --- */}
 <div className="col-span-12 lg:col-span-5 h-full min-h-[700px]">
 <AnimatePresence mode="wait">
 {selectedSurveyId ? (
 <motion.div 
 key={selectedSurveyId}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="h-full"
 >
 <Card className="h-full rounded-[3rem] border-0 bg-white shadow-2xl flex flex-col ring-1 ring-slate-100 overflow-hidden">
 <CardHeader className="bg-slate-50/50 p-10 border-b space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-primary">
 <BarChart3 size={18} />
 </div>
 <h3 className="text-[10px] font-black text-slate-400 tracking-tight italic">실시간 분석</h3>
 </div>
 <Button variant="ghost" size="sm" className="h-8 rounded-lg font-black text-[9px] tracking-tight gap-2">
 <Settings size={12} /> 설정
 </Button>
 </div>
 <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-tight">
 {selectedSurvey?.title}
 </h2>
 </CardHeader>
 <CardContent className="flex-1 p-10 space-y-12 overflow-y-auto">
 
 {/* Chart Section */}
 <div className="space-y-6">
 <h4 className="text-[10px] font-black text-slate-400 tracking-tight flex items-center gap-2">
 <Activity size={12} className="text-primary" /> 참여율
 </h4>
 <div className="h-48 rounded-[2rem] bg-slate-50 border-2 border-slate-100 flex items-end justify-between p-8 gap-4 overflow-hidden relative">
 <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_0)] bg-[length:100%_40px] pointer-events-none" />
 <Bar opacity={0.3} height={40} />
 <Bar opacity={0.5} height={70} />
 <Bar opacity={0.8} height={90} active />
 <Bar opacity={0.4} height={30} />
 <Bar opacity={0.6} height={60} />
 </div>
 </div>

 {/* Detail Cards */}
 <div className="grid grid-cols-2 gap-4">
 <DetailStat icon={<Users size={16} />} label="총 " value="2,480" color="primary" />
 <DetailStat icon={<Clock size={16} />} label="평균 소요 시간" value="4m 12s" color="amber" />
 <DetailStat icon={<Target size={16} />} label="완료율" value="78.2%" color="emerald" />
 <DetailStat icon={<Activity size={16} />} label="이탈률" value="12.4%" color="rose" />
 </div>

 <Button className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black tracking-[0.3em] shadow-2xl hover:bg-primary transition-all gap-3">
 데이터 다운로드 <FileText size={18} />
 </Button>
 </CardContent>
 </Card>
 </motion.div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 select-none grayscale bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
 <PieChart size={64} className="mb-8" />
 <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">분석 대상을 선택하세요</h3>
 <p className="text-[10px] font-bold text-slate-400 tracking-[0.5em] mt-2">과거 및 실시간 지표</p>
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
 "w-full group p-5 rounded-3xl border-2 transition-all flex items-center gap-4",
 active 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-500 hover:text-slate-900"
 )}
 >
 <div className={cn(
 "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
 active ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
 )}>
 {icon}
 </div>
 <span className="text-sm font-black tracking-tight italic">{label}</span>
 </button>
 );
}

function Bar({ height, opacity, active = false }: any) {
 return (
 <div className="flex-1 flex flex-col items-center gap-2">
 <motion.div 
 initial={{ height: 0 }}
 animate={{ height: `${height}%` }}
 className={cn(
 "w-full rounded-t-xl transition-all shadow-lg",
 active ? "bg-primary" : "bg-slate-300"
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
 <div className={cn("p-6 rounded-[2rem] border-2 space-y-3", colorMap[color])}>
 <div className="flex items-center gap-2">
 {icon}
 <span className="text-[8px] font-black tracking-tight opacity-60">{label}</span>
 </div>
 <p className="text-xl font-black italic tracking-tighter text-slate-900">{value}</p>
 </div>
 );
}

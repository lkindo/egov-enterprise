import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
 CheckSquare, 
 GitBranch, 
 FileText, 
 Activity, 
 Plus, 
 Search, 
 Zap, 
 ShieldAlert, 
 History, 
 ArrowRight,
 Settings,
 MoreHorizontal,
 Workflow,
 Layers,
 Clock,
 UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type ApprovalTab = 'FORMS' | 'WORKFLOW' | 'MONITOR';

interface ApprovalFormItem {
 id: string | number;
 title: string;
 version: string;
 status: '활성' | '초안' | '사용중단';
 usage: number;
}

export default function WorkflowHubClient({ defaultTab = 'FORMS' }: { defaultTab?: ApprovalTab }) {
 const { toast } = useToast();
 const [activeTab, setActiveTab] = useState<ApprovalTab>(defaultTab);
 const [selectedFormId, setSelectedFormId] = useState<string | number | null>(null);

 // --- Mock Data ---
 const forms: ApprovalFormItem[] = [
 { id: 'F01', title: '일반 지출 결의서', version: 'v2.4', status: '활성', usage: 1240 },
 { id: 'F02', title: '연차/휴가 신청서', version: 'v1.8', status: '활성', usage: 4500 },
 { id: 'F03', title: 'IT 자산 구매 요청', version: 'v3.0', status: '초안', usage: 0 },
 { id: 'F04', title: '프로젝트 법인카드 신청', version: 'v1.1', status: '사용중단', usage: 890 },
 ];

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
  {/* --- Header --- */}
  <div className="flex items-center justify-between px-4">
  <div className="flex items-center gap-4">
  <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl rotate-3">
  <CheckSquare size={28} className="text-white" />
  </div>
  <div>
  <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
  전자결재 워크플로우 허브
  </h2>
  <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 ">
  통합 결재 및 감사 관리 센터
  </p>
  </div>
  </div>
  <Button className="h-14 px-8 rounded-2xl bg-primary text-white font-black tracking-tight shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all gap-3">
  <Zap size={20} /> 워크플로우 배포
  </Button>
  </div>

  <div className="grid grid-cols-12 gap-8 px-2">
  
  {/* --- Left Column: Navigation (20%) --- */}
  <div className="col-span-12 lg:col-span-3 space-y-6">
  <Card className="rounded-[3rem] border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-100">
  <CardHeader className="bg-slate-50/50 p-8 border-b">
  <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.3em] flex items-center gap-2">
  <Workflow size={14} className="text-primary" /> 코어 엔진 모듈 관리 </CardTitle>
  </CardHeader>
  <CardContent className="p-4 space-y-2">
  <NavButton icon={<FileText size={20} />} label="Sanction Forms" active={activeTab === 'FORMS'} onClick={() => setActiveTab('FORMS')} />
  <NavButton icon={<GitBranch size={20} />} label="워크플로우" active={activeTab === 'WORKFLOW'} onClick={() => setActiveTab('WORKFLOW')} />
  <NavButton icon={<Activity size={20} />} label="시스템" active={activeTab === 'MONITOR'} onClick={() => setActiveTab('MONITOR')} />
  </CardContent>
  </Card>

  {/* Engine Status */}
  <Card className="rounded-[3rem] border-0 bg-slate-900 text-white shadow-2xl p-8 relative overflow-hidden">
  <div className="absolute top-0 right-0 p-4 opacity-10">
  <Workflow size={100} />
  </div>
  <div className="relative z-10 space-y-4">
  <div className="flex items-center gap-2 text-[9px] font-black text-emerald-400 tracking-tight animate-pulse">
  <div className="w-2 h-2 rounded-full bg-emerald-400" /> Engine Healthy
  </div>
  <div className="space-y-1">
  <h4 className="text-2xl font-black tracking-tighter ">99.9% Uptime</h4>
  <p className="text-[10px] text-white/40 font-bold tracking-tight leading-relaxed">Cluster: SANCTN-NODE-01</p>
  </div>
  </div>
  </Card>
  </div>

  {/* --- Center Column: Resource List (40%) --- */}
  <div className="col-span-12 lg:col-span-4 h-full min-h-[700px]">
  <Card className="h-full rounded-[3rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
  <CardHeader className="bg-slate-50/50 border-b p-8 space-y-6">
  <div className="flex items-center justify-between">
  <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.3em] ">
  결재 양식 인벤토리
  </CardTitle>
  <Button size="icon" className="w-10 h-10 bg-slate-900 rounded-xl"><Plus size={20} /></Button>
  </div>
  <div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
  <Input className="pl-9 h-11 bg-white border-slate-100 rounded-xl text-sm font-bold" placeholder="검색..." />
  </div>
  </CardHeader>
  <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
  {forms.map((form) => (
  <div 
  key={form.id}
  onClick={() => setSelectedFormId(form.id)}
  className={cn(
  "group p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between",
  selectedFormId === form.id 
  ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
  : "bg-white border-transparent hover:border-slate-50 text-slate-600"
  )}
  >
  <div className="space-y-1 max-w-[70%]">
  <div className="flex items-center gap-2 mb-1">
  <span className={cn(
  "w-1.5 h-1.5 rounded-full",
  form.status === '활성' ? "bg-emerald-400 animate-pulse" : 
  form.status === '초안' ? "bg-amber-400" : "bg-rose-400"
  )} />
  <span className={cn("text-[8px] font-black tracking-tight opacity-40")}>{form.status}</span>
  </div>
  <h4 className={cn("text-sm font-black truncate", selectedFormId === form.id ? "text-white" : "text-slate-900 ")}>
  {form.title}
  </h4>
  <p className={cn("text-[9px] font-bold opacity-40")}>ID: {form.id} ~ {form.version}</p>
  </div>
  <div className="text-right flex flex-col items-end gap-1">
  <span className="text-[10px] font-black opacity-40">사용량</span>
  <span className={cn("text-sm font-black", selectedFormId === form.id ? "text-primary" : "text-slate-900")}>
  {form.usage > 1000 ? (form.usage / 1000).toFixed(1) + 'k' : form.usage}
  </span>
  </div>
  </div>
  ))}
  </CardContent>
  </Card>
  </div>

  {/* --- Right Column: Designer/Preview (40%) --- */}
  <div className="col-span-12 lg:col-span-5 h-full min-h-[700px]">
  <AnimatePresence mode="wait">
  {selectedFormId ? (
  <motion.div 
  key={selectedFormId}
  initial={{ opacity: 0, scale: 0.98 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.98 }}
  className="h-full flex flex-col gap-8"
  >
  <Card className="flex-1 rounded-[3rem] border-0 bg-white shadow-2xl flex flex-col ring-1 ring-slate-100 overflow-hidden relative">
  <CardHeader className="bg-slate-50/50 p-10 border-b flex flex-row items-center justify-between">
  <div className="space-y-1">
  <h3 className="text-[10px] font-black text-slate-400 tracking-[0.3em] flex items-center gap-2 ">
  <Layers size={14} className="text-primary" /> 시각화 로직 설계기
  </h3>
  <h2 className="text-2xl font-black text-slate-900 tracking-tighter ">{forms.find(f => f.id === selectedFormId)?.title}</h2>
  </div>
  <Button variant="ghost" size="icon" className="rounded-xl border border-slate-100"><MoreHorizontal size={20} /></Button>
  </CardHeader>
  
  <CardContent className="flex-1 p-10 relative overflow-hidden bg-slate-50/50 flex items-center justify-center">
  <div className="w-full space-y-6 relative z-10">
  <WorkflowNode type="START" label="기안자" date="문서 제출" />
  <div className="flex justify-center -my-2"><ArrowRight size={24} className="text-slate-200 rotate-90" /></div>
  <WorkflowNode type="APPROVE" label="Dept. 관리자" date="L1 승인" active />
  <div className="flex justify-center -my-2"><ArrowRight size={24} className="text-slate-200 rotate-90" /></div>
  <WorkflowNode type="APPROVE" label="재무 담당자" date="L2 검증" />
  <div className="flex justify-center -my-2"><ArrowRight size={24} className="text-slate-200 rotate-90" /></div>
  <WorkflowNode type="END" label="시스템" date="완료" />
  </div>
  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }} />
  </CardContent>

  <div className="p-10 border-t bg-white flex gap-4">
  <Button variant="outline" className="h-14 flex-1 rounded-2xl font-black tracking-tight text-[10px] border-2 opacity-50">로직 수정</Button>
  <Button className="h-14 flex-[2] bg-slate-900 text-white rounded-2xl font-black tracking-[0.3em] text-[10px] shadow-2xl shadow-slate-900/40">인스턴스 실행</Button>
  </div>
  </Card>
  </motion.div>
  ) : (
  <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 select-none grayscale bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
  <GitBranch size={64} className="mb-8 rotate-45" />
  <h3 className="text-2xl font-black text-slate-900 tracking-tighter ">활성화된 워크플로우 없음</h3>
  <p className="text-[10px] font-bold text-slate-400 tracking-[0.5em] mt-2">로직 확인을 위해 양식을 선택하세요</p>
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
 <span className="text-sm font-black tracking-tight ">{label}</span>
 </button>
 );
}

function WorkflowNode({ type, label, date, active = false }: any) {
 return (
 <div className={cn(
 "p-5 rounded-2xl border-2 flex items-center gap-5 mx-10 transition-all",
 active ? "bg-white border-primary shadow-xl scale-105" : "bg-white border-transparent shadow-sm opacity-60"
 )}>
 <div className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center text-white",
 type === 'START' ? "bg-slate-900" : type === 'END' ? "bg-emerald-500" : "bg-primary"
 )}>
 {type === 'START' ? <UserCheck size={18} /> : type === 'END' ? <ShieldCheck size={18} /> : <Zap size={18} />}
 </div>
 <div className="flex-1">
 <p className="text-[8px] font-black text-slate-400 tracking-tight">{date}</p>
 <h5 className="text-sm font-black tracking-tight text-slate-900">{label}</h5>
 </div>
 {active && <div className="w-2 h-2 rounded-full bg-primary animate-ping" />}
 </div>
 );
}

function ShieldCheck(props: any) {
 return (
 <svg
 {...props}
 xmlns="http://www.w3.org/2000/svg"
 width="24"
 height="24"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
 <path d="m9 12 2 2 4-4" />
 </svg>
 )
}

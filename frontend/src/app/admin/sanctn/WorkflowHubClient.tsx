'use client';

// [데모 스캐폴드] '전자결재 워크플로우 허브'(FORMS/WORKFLOW/MONITOR 탭)는 정적 목업이다(하드코딩 양식/엔진상태, 백엔드 미연동).
// 실제 전자결재 기능은 /approvals·/admin/system/ism(InformalSanction 백엔드)에 별도 구현되어 동작 중.
// 결재양식 CRUD·엔진·배포를 실동작시키려면 대응 백엔드를 신설해 배선할 것.
// (진입점 /admin/sanctn/workflow는 메뉴 SSOT 정합상 /admin/workflow로 리다이렉트됨 — 이 컴포넌트는 /admin/sanctn/forms에서 렌더)
import React, { useState } from 'react';
;
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckSquare,  
 GitBranch,  
 FileText,  
 Activity,  
 Plus,  
 Search,  
 Zap,  
 History,  
 ArrowRight, 
 MoreHorizontal, 
 Workflow, 
 Layers, 
 UserCheck } from 'lucide-react';
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
  <div className="w-14 h-11 bg-surface-inverse rounded-lg flex items-center justify-center shadow-2xl rotate-3">
  <CheckSquare size={28} className="text-surface-inverse-foreground" />
  </div>
  <div>
  <h2 className="text-3xl font-bold text-foreground tracking-tighter leading-none">
  전자결재 워크플로우 허브
  </h2>
  <p className="text-xs font-bold text-muted-foreground tracking-tight mt-2">
  통합 결재 및 감사 관리 센터
  </p>
  </div>
  </div>
  <Button className="h-11 px-8 rounded-lg bg-primary text-white font-bold tracking-tight shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all gap-3">
  <Zap size={20} /> 워크플로우 배포
  </Button>
  </div>

  <div className="grid grid-cols-12 gap-8 px-2">
  
  {/* --- Left Column: Navigation (20%) --- */}
  <div className="col-span-12 lg:col-span-3 space-y-6">
  <Card className="rounded-lg border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-border">
  <CardHeader className="bg-muted/50 p-8 border-b">
  <CardTitle className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-2">
  <Workflow size={14} className="text-primary" /> 코어 엔진 모듈 관리 </CardTitle>
  </CardHeader>
  <CardContent className="p-4 space-y-2">
  <NavButton icon={<FileText size={20} />} label="Sanction Forms" active={activeTab === 'FORMS'} onClick={() => setActiveTab('FORMS')} />
  <NavButton icon={<GitBranch size={20} />} label="워크플로우" active={activeTab === 'WORKFLOW'} onClick={() => setActiveTab('WORKFLOW')} />
  <NavButton icon={<Activity size={20} />} label="시스템" active={activeTab === 'MONITOR'} onClick={() => setActiveTab('MONITOR')} />
  </CardContent>
  </Card>

  {/* Engine Status */}
  <Card className="rounded-lg border-0 bg-surface-inverse text-surface-inverse-foreground shadow-2xl p-8 relative overflow-hidden">
  <div className="absolute top-0 right-0 p-4 opacity-10">
  <Workflow size={100} />
  </div>
  <div className="relative z-10 space-y-4">
  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 tracking-tight animate-pulse">
  <div className="w-2 h-2 rounded-full bg-emerald-400" /> Engine Healthy
  </div>
  <div className="space-y-1">
  <h4 className="text-2xl font-bold tracking-tighter">99.9% Uptime</h4>
  <p className="text-xs text-white/40 font-bold tracking-tight leading-relaxed">Cluster: SANCTN-NODE-01</p>
  </div>
  </div>
  </Card>
  </div>

  {/* --- Content Area (Center + Right) --- */}
  <div className="col-span-12 lg:col-span-9">
    <AnimatePresence mode="wait">
      {activeTab === 'FORMS' && (
        <motion.div 
          key="forms-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="grid grid-cols-1 lg:grid-cols-9 gap-8 h-full"
        >
          {/* Center Column: Resource List */}
          <div className="lg:col-span-4 h-full min-h-[700px]">
            <Card className="h-full rounded-lg border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-border">
              <CardHeader className="bg-muted/50 border-b p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-2">
                      <Layers size={14} className="text-primary" /> 결재 양식 인벤토리
                    </CardTitle>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">Enterprise Resource List</p>
                  </div>
                  <Button size="icon" aria-label="양식 추가" className="w-10 h-10 bg-surface-inverse rounded-lg shadow-lg hover:-translate-y-1 transition-all"><Plus size={20} /></Button>
                </div>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={14} />
                  <Input className="pl-9 h-11 bg-white border-border rounded-lg text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/5 transition-all" placeholder="양식명 또는 ID 검색..." />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {forms.map((form) => (
                  <div 
                    key={form.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedFormId(form.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedFormId(form.id);
                      }
                    }}
                    className={cn(
                      "group p-5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between relative overflow-hidden",
                      selectedFormId === form.id 
                      ? "bg-surface-inverse border-surface-inverse-border text-surface-inverse-foreground shadow-2xl scale-[1.02] z-10"
                      : "bg-white border-border hover:border-border hover:shadow-xl text-muted-foreground"
                    )}
                  >
                    {selectedFormId === form.id && (
                      <motion.div 
                        layoutId="active-glow"
                        className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent pointer-events-none"
                      />
                    )}
                    <div className="space-y-1.5 max-w-[70%] relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter",
                          form.status === '활성' ? "bg-emerald-500/10 text-emerald-500" : 
                          form.status === '초안' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                        )}>
                          {form.status}
                        </div>
                        <span className="text-[10px] font-bold tracking-tight opacity-30 font-mono">{form.version}</span>
                      </div>
                      <h4 className={cn("text-sm font-bold truncate tracking-tight", selectedFormId === form.id ? "text-surface-inverse-foreground" : "text-foreground")}>
                        {form.title}
                      </h4>
                      <p className={cn("text-[10px] font-bold opacity-40 font-mono tracking-tighter uppercase")}>UID: {form.id}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 relative z-10">
                      <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Usage</span>
                      <span className={cn("text-base font-black tracking-tighter tabular-nums", selectedFormId === form.id ? "text-primary" : "text-foreground")}>
                        {form.usage > 1000 ? (form.usage / 1000).toFixed(1) + 'K' : form.usage}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Designer/Preview */}
          <div className="lg:col-span-5 h-full min-h-[700px]">
            {selectedFormId ? (
              <Card className="h-full rounded-lg border-0 bg-white shadow-2xl flex flex-col ring-1 ring-border overflow-hidden relative">
                <CardHeader className="bg-muted/50 p-10 border-b flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-2">
                      <Layers size={14} className="text-primary" /> 시각화 로직 설계기
                    </h3>
                    <h2 className="text-2xl font-bold text-foreground tracking-tighter">{forms.find(f => f.id === selectedFormId)?.title}</h2>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-lg border border-border"><MoreHorizontal size={20} /></Button>
                </CardHeader>
                
                <CardContent className="flex-1 p-10 relative overflow-hidden bg-muted/50 flex items-center justify-center">
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
                  <Button variant="outline" className="h-11 flex-1 rounded-lg font-bold tracking-tight text-xs border-2 opacity-50">로직 수정</Button>
                  <Button className="h-11 flex-[2] bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold tracking-tight text-xs shadow-2xl">인스턴스 실행</Button>
                </div>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 select-none grayscale bg-white rounded-lg border-2 border-dashed border-border">
                <GitBranch size={64} className="mb-8 rotate-45" />
                <h3 className="text-2xl font-bold text-foreground tracking-tighter">활성화된 워크플로우 없음</h3>
                <p className="text-xs font-bold text-muted-foreground tracking-tight mt-2">로직 확인을 위해 양식을 선택하세요</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'WORKFLOW' && (
        <motion.div 
          key="workflow-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="h-full bg-white rounded-lg border-0 shadow-2xl p-10 ring-1 ring-border flex flex-col items-center justify-center text-center space-y-6"
        >
          <div className="w-20 h-11 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
            <GitBranch size={40} />
          </div>
          <h3 className="text-3xl font-bold text-foreground tracking-tighter">워크플로우 배포 관리</h3>
          <p className="text-muted-foreground font-bold max-w-md mx-auto">현재 활성화된 워크플로우 인스턴스를 관리하고 배포 정책을 설정합니다.</p>
          <Button className="h-11 px-10 rounded-lg font-bold tracking-tight shadow-xl shadow-primary/20">새 워크플로우 생성</Button>
        </motion.div>
      )}

      {activeTab === 'MONITOR' && (
        <motion.div 
          key="monitor-tab"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <MonitorCard title="시스템 상태" value="Optimal" icon={<ShieldCheck size={24} className="text-emerald-500" />} status="Healthy" description="All nodes in the cluster are performing within expected latency parameters." />
          <MonitorCard title="엔진 가동률" value="42%" icon={<Zap size={24} className="text-amber-500" />} status="Moderate" description="Current workflow processing load across active worker nodes." />
          <MonitorCard title="동시 세션" value="1,240" icon={<History size={24} className="text-hub-indigo" />} status="Active" description="Real-time concurrent user sessions participating in approval flows." />
        </motion.div>
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
 "w-full group p-5 rounded-lg border-2 transition-all flex items-center gap-4",
 active 
 ? "bg-surface-inverse border-surface-inverse-border text-surface-inverse-foreground shadow-xl"
 : "bg-white border-transparent hover:border-border text-muted-foreground hover:text-foreground"
 )}
 >
 <div className={cn(
 "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
 active ? "bg-white/10 text-surface-inverse-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted"
 )}>
 {icon}
 </div>
 <span className="text-sm font-bold tracking-tight">{label}</span>
 </button>
 );
}

function MonitorCard({ title, value, icon, status, description }: { title: string, value: string, icon: React.ReactNode, status: string, description: string }) {
  return (
    <Card className="rounded-lg border-0 bg-white shadow-xl hover:shadow-2xl transition-all p-8 space-y-6 ring-1 ring-border group">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-all">
          {icon}
        </div>
        <div className={cn(
          "px-3 py-1 rounded-lg text-xs font-bold tracking-tight",
          status === 'Healthy' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
        )}>
          {status}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-muted-foreground tracking-tight">{title}</h4>
        <div className="text-4xl font-bold text-foreground tracking-tighter">{value}</div>
      </div>
      <p className="text-xs font-bold text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}

function WorkflowNode({ type, label, date, active = false }: any) {
 return (
 <div className={cn(
 "p-5 rounded-lg border-2 flex items-center gap-5 mx-10 transition-all",
 active ? "bg-white border-primary shadow-xl scale-105" : "bg-white border-transparent shadow-sm opacity-60"
 )}>
 <div className={cn(
 "w-10 h-10 rounded-lg flex items-center justify-center text-white",
 type === 'START' ? "bg-surface-inverse" : type === 'END' ? "bg-emerald-500" : "bg-primary"
 )}>
 {type === 'START' ? <UserCheck size={18} /> : type === 'END' ? <ShieldCheck size={18} /> : <Zap size={18} />}
 </div>
 <div className="flex-1">
 <p className="text-xs font-bold text-muted-foreground tracking-tight">{date}</p>
 <h5 className="text-sm font-bold tracking-tight text-foreground">{label}</h5>
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

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Zap, 
  ShieldCheck, 
  ArrowLeft, 
  Search, 
  Plus, 
  ChevronRight, 
  Calendar, 
  CreditCard, 
  ShoppingBag, 
  Clock, 
  Send,
  User,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ui/toast';

type DraftStep = 'CATALOG' | 'DETAILS';

interface ApprovalForm {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const FORMS: ApprovalForm[] = [
  { 
    id: 'F01', 
    title: '일반 지출 결의서', 
    category: 'FINANCE', 
    icon: <CreditCard size={24} />, 
    color: 'bg-emerald-500',
    description: '업무 관련 소모품 및 운영비 지출에 대한 사후 결의'
  },
  { 
    id: 'F02', 
    title: '연차/휴가 신청서', 
    category: 'HR', 
    icon: <Calendar size={24} />, 
    color: 'bg-primary',
    description: '연차, 반차, 경조사 등 각종 휴가 신청 및 승인'
  },
  { 
    id: 'F03', 
    title: 'IT 자산 구매 요청', 
    category: 'INFRA', 
    icon: <ShoppingBag size={24} />, 
    color: 'bg-amber-500',
    description: '노트북, 모니터 등 업무용 하드웨어 및 소프트웨어 라이선스 구매'
  },
  { 
    id: 'F04', 
    title: '시간외 근무 신청', 
    category: 'OPERATION', 
    icon: <Clock size={24} />, 
    color: 'bg-indigo-500',
    description: '평일 야간 및 휴일 근무에 대한 사전 승인 요청'
  }
];

export default function ApprovalDraftHubClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<DraftStep>('CATALOG');
  const [selectedForm, setSelectedForm] = useState<ApprovalForm | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const handleSelectForm = (form: ApprovalForm) => {
    setSelectedForm(form);
    setStep('DETAILS');
  };

  const handleSubmit = () => {
    if (!subject || !content) {
      toast('모든 필드를 입력해 주세요.', 'error');
      return;
    }
    toast('결재 상신이 완료되었습니다.', 'success');
    router.push('/approvals');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 animate-in fade-in duration-1000">
      <div className="max-w-[1200px] mx-auto space-y-12">
        
        {/* --- Header --- */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Button 
                variant="ghost" 
                onClick={() => step === 'CATALOG' ? router.back() : setStep('CATALOG')}
                className="w-14 h-11 rounded-lg bg-white shadow-xl hover:bg-slate-50 transition-all border-none"
            >
              <ArrowLeft size={24} className="text-slate-900" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tighter leading-none">
                {step === 'CATALOG' ? 'Draft Center' : 'Document Entry'}
              </h1>
              <p className="text-xs font-bold text-slate-400 tracking-[0.4em] mt-2 uppercase">
                {step === 'CATALOG' ? 'Select Template Node' : `Dispatch: ${selectedForm?.title}`}
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-xl border border-slate-100">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">Encryption Active</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'CATALOG' ? (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {FORMS.map((form) => (
                  <motion.div
                    key={form.id}
                    whileHover={{ y: -5 }}
                    onClick={() => handleSelectForm(form)}
                    className="group cursor-pointer bg-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        {form.icon}
                    </div>
                    
                    <div className="flex items-start gap-6 relative z-10">
                      <div className={cn(
                        "w-16 h-11 rounded-lg flex items-center justify-center text-white shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500 shrink-0",
                        form.color
                      )}>
                        {form.icon}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded uppercase">
                            {form.category}
                          </span>
                          <span className="text-xs font-bold text-slate-300 font-mono">_ #{form.id}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none group-hover:text-primary transition-colors">
                          {form.title}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[280px]">
                          {form.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex items-center justify-end">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="p-12 bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }} />
                <div className="relative z-10 space-y-4">
                  <h4 className="text-xl font-bold text-white tracking-tighter">_ "Precision in every dispatch."</h4>
                  <p className="text-xs text-white/40 font-bold tracking-[0.5em] uppercase">Enterprise Autonomous Governance Core</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* --- Left: Meta Info --- */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="rounded-[2.5rem] border-none bg-white shadow-2xl p-8 space-y-8 overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-6 opacity-[0.02]">
                      <Zap size={100} />
                   </div>
                   
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-14 h-11 rounded-lg flex items-center justify-center text-white shadow-xl", selectedForm?.color)}>
                          {selectedForm?.icon}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 tracking-tight">{selectedForm?.title}</h4>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedForm?.category} MODULE</p>
                        </div>
                      </div>
                      
                      <div className="p-6 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-widest uppercase">
                           <span>Originating Node</span>
                           <span className="text-primary">SECURE</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                              <User size={18} />
                           </div>
                           <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-900 leading-none">Senior Administrator</p>
                              <p className="text-xs font-bold text-slate-400 opacity-60">_ AUTH_TOKEN: XX-9901</p>
                           </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 tracking-[0.3em] uppercase">
                           <Info size={14} className="text-primary" /> Logic Path
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-lg bg-emerald-500" />
                           <span className="text-xs font-bold text-slate-600 tracking-tight">Draft</span>
                           <ChevronRight size={12} className="text-slate-200" />
                           <div className="w-1.5 h-1.5 rounded-lg bg-slate-200" />
                           <span className="text-xs font-bold text-slate-300 tracking-tight opacity-50">L1 Approval</span>
                           <ChevronRight size={12} className="text-slate-200" />
                           <div className="w-1.5 h-1.5 rounded-lg bg-slate-200" />
                           <span className="text-xs font-bold text-slate-300 tracking-tight opacity-50">Commit</span>
                        </div>
                      </div>
                   </div>
                </Card>
                
                <Card className="rounded-[2.5rem] border-none bg-slate-900 text-white shadow-2xl p-10 space-y-4">
                   <h4 className="text-xs font-bold text-primary tracking-[0.4em] uppercase">Audit Protocol</h4>
                   <p className="text-sm font-bold text-white/60 leading-relaxed">
                    "All submissions are subject to real-time integrity checks and permanent ledger logging."
                   </p>
                </Card>
              </div>

              {/* --- Right: Secure Entry --- */}
              <div className="lg:col-span-8">
                <Card className="rounded-[2.5rem] border-none bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col h-full min-h-[600px]">
                  <div className="p-10 lg:p-14 space-y-12 flex-1">
                    <div className="space-y-6">
                       <label className="text-xs font-bold text-slate-400 tracking-[0.5em] uppercase flex items-center gap-3">
                          <Plus size={16} className="text-primary" /> Core Subject Header
                       </label>
                       <Input 
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="상신할 문서의 제목을 입력하십시오..." 
                          className="h-11 text-3xl font-bold tracking-tighter bg-slate-50/50 border-none rounded-lg px-8 focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                       />
                    </div>

                    <div className="space-y-6">
                       <label className="text-xs font-bold text-slate-400 tracking-[0.5em] uppercase flex items-center gap-3">
                          <FileText size={16} className="text-primary" /> Intelligent Payload
                       </label>
                       <textarea 
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="결재 상세 사유 및 전달 사항을 기술하십시오..." 
                          className="w-full min-h-[300px] bg-slate-50/50 border-none rounded-[2rem] p-10 text-lg font-bold leading-relaxed focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-inner resize-none custom-scrollbar"
                       />
                    </div>
                  </div>

                  <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <Button 
                        variant="ghost" 
                        onClick={() => setStep('CATALOG')}
                        className="h-11 px-8 rounded-lg font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest text-xs"
                    >
                      Abort Dispatch
                    </Button>
                    <Button 
                        onClick={handleSubmit}
                        className="h-11 px-10 rounded-lg bg-slate-900 text-white font-bold shadow-2xl hover:bg-primary hover:-translate-y-1 transition-all gap-3 border-none uppercase tracking-widest text-xs"
                    >
                      <Send size={20} /> Commit to Ledger
                    </Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

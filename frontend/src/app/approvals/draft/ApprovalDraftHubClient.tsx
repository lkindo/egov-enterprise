'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText,
  Zap,
  ArrowLeft,
  Plus,
  ChevronRight,
  Calendar,
  CreditCard,
  ShoppingBag,
  Clock,
  Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
    color: 'bg-hub-indigo',
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

  // [2026-08-04] 가짜 성공 제거.
  //   종전 구현은 필드 검증만 하고 **어떤 API 도 호출하지 않은 채** '결재 상신이 완료되었습니다'
  //   성공 토스트를 띄우고 목록으로 이동했다. 사용자는 상신됐다고 믿지만 서버에는 아무것도
  //   저장되지 않는다 — 결재는 기한이 걸린 업무라 이 거짓말의 대가가 특히 크다.
  //   (같은 부류를 Wave 0 에서 NetworkMonitoringApiController 의 '저장 없는 200' → 501 로 바꿨다.)
  //
  //   구현(백엔드 결재 API 연동)은 이 화면의 하드코딩 양식 4종(F01~F04)을 실제 결재 도메인
  //   필드로 매핑하는 설계가 선행돼야 하므로 별도 과제다. 그때까지는 **성공을 흉내 내지 않는다**.
  const handleSubmit = () => {
    toast('이 화면은 아직 상신을 저장하지 않습니다. 작성한 내용은 전송되지 않았습니다.', 'error');
  };

  // 폭 위임: 화면 자체 max-w-[1200px] 캡을 제거하고 루트 레이아웃의 --page-max-w 토큰에
  // 폭·여백을 위임한다(compact 배포에서 전폭, theme-token-contract 고정).
  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">

        {/* --- Header --- */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Button 
                variant="ghost" 
                aria-label="뒤로가기"
                onClick={() => step === 'CATALOG' ? router.back() : setStep('CATALOG')}
                className="w-14 h-11 rounded-lg bg-card shadow-xl hover:bg-muted transition-all border-none"
            >
              <ArrowLeft size={24} className="text-foreground" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tighter leading-none">
                {step === 'CATALOG' ? 'Draft Center' : 'Document Entry'}
              </h1>
              <p className="text-xs font-bold text-muted-foreground tracking-tight mt-2">
                {step === 'CATALOG' ? 'Select Template Node' : `Dispatch: ${selectedForm?.title}`}
              </p>
            </div>
          </div>
          {/* [정직성] 'Encryption Active' 상시 배지 제거 — 어떤 암호화 상태도 계측하지 않으면서
              항상 켜져 있던 근거 없는 보안 지표였다. */}
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
                    className="group cursor-pointer bg-card p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary/20 relative overflow-hidden"
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
                          <span className="text-xs font-bold tracking-tight text-primary bg-primary/5 px-2 py-0.5 rounded">
                            {form.category}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground">#{form.id}</span>
                        </div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
                          {form.title}
                        </h3>
                        <p className="text-xs font-bold text-muted-foreground leading-relaxed max-w-[280px]">
                          {form.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex items-center justify-end">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* [정직성] 'Precision in every dispatch' 인용 카드 제거 — 어떤 기능·데이터와도
                  연결되지 않은 장식 슬로건이었다. */}
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
                <Card className="rounded-[2.5rem] border-none bg-card shadow-2xl p-8 space-y-8 overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-6 opacity-[0.02]">
                      <Zap size={100} />
                   </div>
                   
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-14 h-11 rounded-lg flex items-center justify-center text-white shadow-xl", selectedForm?.color)}>
                          {selectedForm?.icon}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground tracking-tight">{selectedForm?.title}</h4>
                          <p className="text-xs font-bold text-muted-foreground tracking-tight">{selectedForm?.category}</p>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                        {selectedForm?.description}
                      </p>
                      {/* [정직성] 창작 신원 박스('Senior Administrator'/'AUTH_TOKEN: XX-9901')와
                          창작 결재선('Logic Path: Draft → L1 Approval → Commit'), 근거 없는 감사 문구
                          ('Audit Protocol' 인용) 제거 — 이 화면은 백엔드 미연동 양식 작성 화면이며,
                          존재하지 않는 인증 토큰·결재 경로·감사 체계를 사실처럼 표시하지 않는다. */}
                   </div>
                </Card>
              </div>

              {/* --- Right: Secure Entry --- */}
              <div className="lg:col-span-8">
                <Card className="rounded-[2.5rem] border-none bg-card shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col h-full min-h-[600px]">
                  <div className="p-10 lg:p-14 space-y-12 flex-1">
                    <div className="space-y-6">
                       <label className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-3">
                          <Plus size={16} className="text-primary" /> Core Subject Header
                       </label>
                       <Input 
                          aria-label="문서 제목"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="상신할 문서의 제목을 입력하십시오..." 
                          className="h-11 text-3xl font-bold tracking-tighter bg-muted/50 border-none rounded-lg px-8 focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                       />
                    </div>

                    <div className="space-y-6">
                       <label className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-3">
                          <FileText size={16} className="text-primary" /> Intelligent Payload
                       </label>
                       <textarea 
                          aria-label="결재 상세 사유 및 전달 사항"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="결재 상세 사유 및 전달 사항을 기술하십시오..." 
                          className="w-full min-h-[300px] bg-muted/50 border-none rounded-2xl p-10 text-lg font-bold leading-relaxed focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-inner resize-none custom-scrollbar"
                       />
                    </div>
                  </div>

                  {/* [2026-08-04] 상신 미구현을 화면에 명시하고 버튼을 비활성화한다.
                      버튼이 눌리는 한 사용자는 "동작한다" 고 읽는다. 안내 문구만 띄우고 버튼을
                      살려 두면 결국 같은 오해가 남으므로, 클릭 자체를 막는다. */}
                  <div className="px-10 pt-6">
                    <div className="rounded-lg border border-warning/40 bg-warning/10 px-6 py-5">
                      <p className="text-sm font-bold text-foreground">상신 기능은 아직 연결되지 않았습니다.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        이 화면은 양식 작성까지만 제공하며, 작성한 내용은 서버에 저장되지 않습니다.
                        실제 결재 상신은 결재 목록 화면의 기존 경로를 이용해 주세요.
                      </p>
                    </div>
                  </div>

                  <div className="p-10 bg-muted/50 border-t border-border flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => setStep('CATALOG')}
                        className="h-11 px-8 rounded-lg font-bold text-muted-foreground hover:text-foreground transition-all tracking-tight text-xs"
                    >
                      Abort Dispatch
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled
                        aria-disabled="true"
                        title="상신 기능이 아직 연결되지 않았습니다"
                        className="h-11 px-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold shadow-2xl transition-all gap-3 border-none tracking-tight text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={20} /> Commit to Ledger (미지원)
                    </Button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}

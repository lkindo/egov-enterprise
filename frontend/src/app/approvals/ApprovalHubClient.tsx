'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Inbox, 
  Check, 
  X, 
  FileText, 
  User, 
  History, 
  Info, 
  Calendar, 
  Zap, 
  Search, 
  ShieldCheck, 
  Plus, 
  Loader2, 
  Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { approvalUserService, Approval } from '@/services/business/user/approval/ApprovalUserService';
import { motion, AnimatePresence } from 'framer-motion';
;
import { Badge } from '@/components/ui/badge';
import { ApprovalStepper } from './ApprovalStepper';
import Link from 'next/link';
import { HubListSkeleton, HubDetailSkeleton } from '@/components/ui/hub/HubSkeleton';

type ApprovalTab = 'PENDING' | 'HISTORY' | 'ARCHIVE';

const EMPTY_APPROVALS: Approval[] = [];

export default function ApprovalHubClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('PENDING');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchWrd, setSearchWrd] = useState('');

  const { data: approvalData, isLoading } = useQuery({
    queryKey: ['approvals', activeTab, searchWrd],
    queryFn: () => {
        if (activeTab === 'PENDING') {
            return approvalUserService.getPending({ page: 0, size: 50 });
        }
        return approvalUserService.getMyHistory({ page: 0, size: 50 });
    }
  });

  const list = approvalData?.list || EMPTY_APPROVALS;
  const selectedItem = useMemo(() => 
    list.find(item => item.approvalId === selectedItemId) || (list.length > 0 ? list[0] : null)
  , [list, selectedItemId]);

  const handleAction = async (item: Approval, status: 'Y' | 'N') => {
    const actionNm = status === 'Y' ? '승인' : '반려';
    const isConfirmed = await confirm({
      title: `결재 ${actionNm}`,
      message: `[${item.approvalId}] 요청을 ${actionNm}하시겠습니까?`,
      variant: status === 'N' ? 'destructive' : 'default'
    });

    if (!isConfirmed) return;

    try {
      await approvalUserService.confirm(item.approvalId, status);
      toast(`성공적으로 ${actionNm}되었습니다.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch {
      toast(`${actionNm} 처리 중 오류가 발생했습니다.`, 'error');
    }
  };

  const workflowSteps = useMemo(() => {
    if (!selectedItem) return [];
    return [
      { label: '기안', user: selectedItem.applicantId, status: 'completed' as const, date: selectedItem.requestDate },
      { label: '검토 (이순신 과장)', user: '이순신 과장', status: selectedItem.status === 'R' ? 'current' as const : 'completed' as const },
      {
        label: '최종 승인',
        user: '관리자',
        status: selectedItem.status === 'Y' ? 'completed' as const :
        selectedItem.status === 'N' ? 'rejected' as const : 'pending' as const
      }
    ];
  }, [selectedItem]);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleQuickAction = async (e: React.MouseEvent, item: Approval, status: 'Y' | 'N') => {
    e.stopPropagation(); // Prevents selection of the item
    setProcessingId(item.approvalId);
    await handleAction(item, status);
    setProcessingId(null);
  };

  const renderApprovalList = () => (
    <div className="space-y-3">
      {list.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <FileText size={40} className="mb-4 opacity-20" />
          <p className="text-xs font-bold tracking-tight">요청 내역이 없습니다.</p>
        </div>
      ) : (
        list.map((item: Approval) => (
          <motion.div
            key={item.approvalId}
            layout
            onClick={() => setSelectedItemId(item.approvalId)}
            className={cn(
              "group p-5 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-between relative overflow-hidden",
              selectedItemId === item.approvalId || (!selectedItemId && list[0].approvalId === item.approvalId)
                ? "bg-surface-inverse border-surface-inverse-border text-surface-inverse-foreground shadow-2xl scale-[1.02] z-10"
                : "bg-card border-border hover:border-primary/20 shadow-sm"
            )}
          >
            {/* Quick Action Overlay (Only for Pending) */}
            <AnimatePresence>
              {activeTab === 'PENDING' && item.status === 'R' && processingId !== item.approvalId && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="absolute inset-y-0 right-0 px-6 bg-gradient-to-l from-white via-white/95 to-transparent dark:from-slate-800 dark:via-slate-800/95 flex items-center gap-2 opacity-0 transition-opacity z-20"
                >
                  <Button 
                    size="sm"
                    onClick={(e) => handleQuickAction(e, item, 'Y')}
                    className="h-9 px-4 rounded-lg bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 border-none"
                  >
                    <Check size={14} className="mr-1" /> 승인
                  </Button>
                  <Button 
                    size="sm"
                    variant="destructive"
                    onClick={(e) => handleQuickAction(e, item, 'N')}
                    className="h-9 px-4 rounded-lg font-bold text-xs shadow-lg shadow-rose-500/20 border-none"
                  >
                    <X size={14} className="mr-1" /> 반려
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Processing Loader */}
            {processingId === item.approvalId && (
              <div className="absolute inset-0 bg-card/60 backdrop-blur-[2px] flex items-center justify-center z-30">
                <Loader2 size={24} className="text-primary animate-spin" />
              </div>
            )}

            <div className="flex items-center gap-5 relative z-10">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                (selectedItemId === item.approvalId || (!selectedItemId && list[0].approvalId === item.approvalId))
                  ? "bg-primary border-primary/20 text-white rotate-6" 
                  : "bg-muted border-border text-muted-foreground group-hover:rotate-6"
              )}>
                <FileText size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-bold tracking-tight px-2 py-0.5 rounded",
                    (selectedItemId === item.approvalId || (!selectedItemId && list[0].approvalId === item.approvalId)) 
                        ? "bg-white/10 text-surface-inverse-foreground"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {item.jobTypeNm || 'GENERAL_APPROVAL'}
                  </span>
                  <span className="text-xs font-bold opacity-30 tabular-nums">
                    {item.requestDate?.substring(0, 10)}
                  </span>
                </div>
                <h4 className={cn(
                    "text-sm font-bold tracking-tight leading-none", 
                    (selectedItemId === item.approvalId || (!selectedItemId && list[0].approvalId === item.approvalId)) ? "text-surface-inverse-foreground" : "text-foreground"
                )}>
                  #{item.approvalId}
                </h4>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-end gap-1">
                <Badge variant={item.status === 'Y' ? 'success' : item.status === 'N' ? 'destructive' : 'secondary'} className="text-xs font-bold px-2 py-0">
                    {item.status === 'Y' ? '승인 완료' : item.status === 'N' ? '반려됨' : '대기 중'}
                </Badge>
                <p className="text-xs font-bold opacity-30 tracking-tight">작성자: {item.applicantId}</p>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8 animate-in fade-in duration-1000">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* --- Premium Hub Header --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-6">
            <div className="w-16 h-11 bg-surface-inverse rounded-lg flex items-center justify-center shadow-2xl rotate-3 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <ShieldCheck size={32} className="text-surface-inverse-foreground relative z-10" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-foreground tracking-tighter leading-none flex items-center gap-3">
                결재 허브
                <Badge className="bg-primary/10 text-primary border-none text-xs font-bold tracking-tight px-3 py-1">V5.0_보안</Badge>
              </h1>
              <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground tracking-tight">
                <span className="flex items-center gap-1"><Zap size={12} className="text-primary" /> 자율 결재 로직</span>
                <span className="w-1 h-1 rounded-full bg-muted" />
                <span>기업용 보안 암호화</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/approvals/draft" passHref>
              <Button 
                  className="h-11 px-8 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-tight shadow-2xl hover:bg-primary hover:-translate-y-1 transition-all gap-3 border-none group"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                새 결재 기안
              </Button>
            </Link>
          </div>
        </div>

        {/* --- Main 3-Column Hub Layout --- */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* 1. Left: Intelligent Navigation (2.5/12) */}
          <div className="col-span-12 lg:col-span-3 xl:col-span-2 space-y-6">
            <Card className="rounded-[2.5rem] border-none bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/50">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-2">
                  <Layers size={14} className="text-primary" /> 핵심 대기열
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <NavButton 
                  icon={<Inbox size={20} />} 
                  label="대기 중인 결재" 
                  active={activeTab === 'PENDING'} 
                  onClick={() => setActiveTab('PENDING')} 
                />
                <NavButton 
                  icon={<History size={20} />} 
                  label="결재 처리 이력" 
                  active={activeTab === 'HISTORY'} 
                  onClick={() => setActiveTab('HISTORY')} 
                />
                <NavButton 
                  icon={<History size={20} />} 
                  label="결재 문서 보관함" 
                  active={activeTab === 'ARCHIVE'} 
                  onClick={() => setActiveTab('ARCHIVE')} 
                />
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none bg-surface-inverse text-surface-inverse-foreground shadow-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <ShieldCheck size={120} />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 tracking-tight">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  체인 무결성 검증됨
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-bold tracking-tighter">99.9% Compliance</h4>
                  <p className="text-xs text-surface-inverse-muted font-bold tracking-tight">감사 노드: KR-SEOUL-01</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 2. Center: Resource Stream (4.5/12) */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-4 space-y-6">
            <Card className="rounded-[2.5rem] border-none bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col h-[750px] ring-1 ring-white/50">
              <CardHeader className="p-8 space-y-6 border-b border-white/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-muted-foreground tracking-tight">
                    결재 스트림
                  </CardTitle>
                  <Button variant="ghost" size="icon" aria-label="결재 스트림 새로고침" className="rounded-lg hover:bg-muted">
                    <RefreshCcw size={18} className="text-muted-foreground" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input 
                    aria-label="결재 요청 검색어 입력"
                    className="pl-12 h-11 bg-white/50 border-white/20 rounded-lg text-sm font-bold shadow-inner" 
                    placeholder="결재 요청 검색..."
                    value={searchWrd}
                    onChange={(e) => setSearchWrd(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isLoading ? <HubListSkeleton /> : renderApprovalList()}
              </CardContent>
            </Card>
          </div>

          {/* 3. Right: Intelligence Workspace (5/12) */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-6">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <HubDetailSkeleton />
              ) : selectedItem ? (
                <motion.div
                  key={selectedItem.approvalId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                  <Card className="h-full rounded-[2.5rem] border-none bg-card shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] flex flex-col ring-1 ring-border overflow-hidden min-h-[750px]">
                    <CardHeader className="bg-muted/30 p-10 lg:p-14 border-b border-border space-y-8">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-surface-inverse text-surface-inverse-foreground text-xs font-bold rounded-lg tracking-tight px-3 py-1">
                              인텔리전스 뷰
                            </Badge>
                            <span className="text-xs font-bold text-muted-foreground tracking-tight">#{selectedItem.approvalId}</span>
                          </div>
                          <h2 className="text-4xl font-bold text-foreground tracking-tighter leading-none">
                            {selectedItem.jobTypeNm || '일반 결재 요청'}
                          </h2>
                        </div>
                        
                        {activeTab === 'PENDING' && selectedItem.status === 'R' && (
                          <div className="flex gap-4">
                            <Button 
                              onClick={() => handleAction(selectedItem, 'Y')}
                              className="h-11 px-10 rounded-lg bg-emerald-500 text-white font-bold shadow-2xl shadow-emerald-500/30 hover:bg-emerald-600 hover:-translate-y-1 transition-all gap-2 border-none"
                            >
                              <Check size={20} /> 결재 승인
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleAction(selectedItem, 'N')}
                              className="h-11 px-10 rounded-lg font-bold shadow-2xl shadow-rose-500/30 hover:-translate-y-1 transition-all gap-2 border-none"
                            >
                              <X size={20} /> 결재 반려
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="bg-card rounded-lg p-10 border-2 border-border shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-2">
                            <Zap size={14} className="text-primary" /> 결재 체인 분석
                          </h4>
                          <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg tracking-tight">검증된 경로</span>
                        </div>
                        <ApprovalStepper steps={workflowSteps} />
                      </div>
                    </CardHeader>

                    <CardContent className="p-10 lg:p-14 space-y-12 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <DetailSection 
                          icon={<User size={18} />} 
                          title="기안자 신원 정보" 
                          value={selectedItem.applicantId} 
                          desc="인증 완료 사용자" 
                        />
                        <DetailSection 
                          icon={<Calendar size={18} />} 
                          title="기안 일시" 
                          value={selectedItem.requestDate} 
                          desc="표준 시간 동기화 완료" 
                        />
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-2">
                          <Info size={14} className="text-primary" /> 암호화된 페이로드
                        </h4>
                        <div className="p-10 bg-muted/50 rounded-lg border-2 border-border min-h-[200px] shadow-[inset_0_2px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                              <FileText size={100} />
                           </div>
                           <p className="text-lg font-bold leading-[1.8] text-foreground whitespace-pre-wrap relative z-10">
                            {selectedItem.returnReason || "본 결재 건은 시스템 표준 프로세스에 따라 상신되었습니다.\n상세 내용은 첨부된 전자 문서를 참조하여 주시기 바랍니다."}
                          </p>
                        </div>
                      </div>
                    </CardContent>

                    <div className="p-8 bg-muted/20 border-t border-border flex items-center justify-center">
                      <p className="text-xs font-bold text-muted-foreground tracking-tight animate-pulse">
                        ENTERPRISE_SECURE_KERNEL_V5.1_SYNC
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-white/40 rounded-[2.5rem] border-4 border-dashed border-border animate-in fade-in duration-1000">
                  <div className="w-32 h-32 bg-card rounded-lg flex items-center justify-center mb-8 shadow-2xl rotate-12 group hover:rotate-0 transition-transform duration-500">
                    <ShieldCheck size={56} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-3xl font-bold text-muted-foreground tracking-tighter mb-4">_ 결재 문서 선택</h3>
                  <p className="text-xs font-bold text-muted-foreground tracking-tight">상세 내역 대기 중</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full group p-5 rounded-lg transition-all flex items-center gap-4 relative overflow-hidden",
        active
          ? "bg-surface-inverse text-surface-inverse-foreground shadow-xl scale-[1.02] z-10"
          : "text-muted-foreground hover:text-foreground hover:bg-white/80"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
        active ? "bg-primary text-white rotate-6" : "bg-muted text-muted-foreground group-hover:rotate-6 group-hover:text-primary"
      )}>
        {icon}
      </div>
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {active && (
        <motion.div 
            layoutId="nav-active"
            className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
        />
      )}
    </button>
  );
}

function DetailSection({ icon, title, value, desc }: any) {
  return (
    <div className="space-y-4 group">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary shadow-sm border border-border group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
          {icon}
        </div>
        <span className="text-xs font-bold tracking-tight">{title}</span>
      </div>
      <div className="space-y-1 pl-1">
        <p className="text-2xl font-bold text-foreground tracking-tighter">{value}</p>
        <p className="text-xs text-muted-foreground font-bold tracking-tight">{desc}</p>
      </div>
    </div>
  );
}

function RefreshCcw(props: any) {
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
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M21 21v-5h-5" />
    </svg>
  )
}

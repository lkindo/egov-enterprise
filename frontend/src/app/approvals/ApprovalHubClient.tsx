'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Inbox,
  Send,
  Check,
  X,
  FileText,
  User,
  ClipboardCheck,
  History,
  Info,
  Calendar,
  Zap,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Loader2,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { approvalUserService, Approval } from '@/services/business/user/approval/ApprovalUserService';
import { motion, AnimatePresence } from 'framer-motion';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { Badge } from '@/components/ui/badge';
import { ApprovalStepper } from './ApprovalStepper';
import { useRouter } from 'next/navigation';
import { HubListSkeleton, HubDetailSkeleton } from '@/components/ui/hub/HubSkeleton';

type ApprovalTab = 'PENDING' | 'HISTORY' | 'ARCHIVE';

export default function ApprovalHubClient() {
  const router = useRouter();
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

  const list = approvalData?.list || [];
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
    } catch (error) {
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
        <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl">
          <FileText size={40} className="mb-4 opacity-20" />
          <p className="text-[10px] font-black tracking-widest uppercase">No requests found</p>
        </div>
      ) : (
        list.map((item: Approval) => (
          <motion.div
            key={item.approvalId}
            layout
            onClick={() => setSelectedItemId(item.approvalId)}
            className={cn(
              "group p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between relative overflow-hidden",
              selectedItemId === item.approvalId || (!selectedItemId && list[0].approvalId === item.approvalId)
                ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
                : "bg-white border-slate-50 hover:border-primary/20 shadow-sm"
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
                    className="h-9 px-4 rounded-xl bg-emerald-500 text-white font-black text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 border-none"
                  >
                    <Check size={14} className="mr-1" /> APPROVE
                  </Button>
                  <Button 
                    size="sm"
                    variant="destructive"
                    onClick={(e) => handleQuickAction(e, item, 'N')}
                    className="h-9 px-4 rounded-xl font-black text-[10px] shadow-lg shadow-rose-500/20 border-none"
                  >
                    <X size={14} className="mr-1" /> REJECT
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Processing Loader */}
            {processingId === item.approvalId && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-30">
                <Loader2 size={24} className="text-primary animate-spin" />
              </div>
            )}

            <div className="flex items-center gap-5 relative z-10">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                (selectedItemId === item.approvalId || (!selectedItemId && list[0].approvalId === item.approvalId))
                  ? "bg-primary border-primary/20 text-white rotate-6" 
                  : "bg-slate-50 border-slate-100 text-slate-400 group-hover:rotate-6"
              )}>
                <FileText size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded",
                    (selectedItemId === item.approvalId || (!selectedItemId && list[0].approvalId === item.approvalId)) 
                        ? "bg-white/10 text-white" 
                        : "bg-slate-100 text-slate-400"
                  )}>
                    {item.jobTypeNm || 'GENERAL_APPROVAL'}
                  </span>
                  <span className="text-[10px] font-black opacity-30 tabular-nums">
                    {item.requestDate?.substring(0, 10)}
                  </span>
                </div>
                <h4 className={cn(
                    "text-sm font-black tracking-tight leading-none", 
                    (selectedItemId === item.approvalId || (!selectedItemId && list[0].approvalId === item.approvalId)) ? "text-white" : "text-slate-900"
                )}>
                  #{item.approvalId}
                </h4>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-end gap-1">
                <Badge variant={item.status === 'Y' ? 'success' : item.status === 'N' ? 'destructive' : 'secondary'} className="text-[9px] font-black px-2 py-0">
                    {item.status === 'Y' ? 'APPROVED' : item.status === 'N' ? 'REJECTED' : 'PENDING'}
                </Badge>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-tighter">By: {item.applicantId}</p>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 animate-in fade-in duration-1000">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* --- Premium Hub Header --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <ShieldCheck size={32} className="text-white relative z-10" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                Approval Hub
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black tracking-widest px-3 py-1">V5.0_SECURE</Badge>
              </h1>
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">
                <span className="flex items-center gap-1"><Zap size={12} className="text-primary" /> Autonomous Logic</span>
                <span className="w-1 h-1 rounded-full bg-slate-200" />
                <span>Enterprise Grade Cryptography</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
                onClick={() => router.push('/approvals/draft')}
                className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black tracking-tight shadow-2xl hover:bg-primary hover:-translate-y-1 transition-all gap-3 border-none group"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              새 결재 기안
            </Button>
          </div>
        </div>

        {/* --- Main 3-Column Hub Layout --- */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* 1. Left: Intelligent Navigation (2.5/12) */}
          <div className="col-span-12 lg:col-span-3 xl:col-span-2 space-y-6">
            <Card className="rounded-[2.5rem] border-none bg-white/60 backdrop-blur-xl shadow-2xl shadow-slate-200/50 overflow-hidden ring-1 ring-white/50">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase flex items-center gap-2">
                  <Layers size={14} className="text-primary" /> Core Queues
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <NavButton 
                  icon={<Inbox size={20} />} 
                  label="Pending" 
                  active={activeTab === 'PENDING'} 
                  onClick={() => setActiveTab('PENDING')} 
                />
                <NavButton 
                  icon={<History size={20} />} 
                  label="My History" 
                  active={activeTab === 'HISTORY'} 
                  onClick={() => setActiveTab('HISTORY')} 
                />
                <NavButton 
                  icon={<History size={20} />} 
                  label="Archive" 
                  active={activeTab === 'ARCHIVE'} 
                  onClick={() => setActiveTab('ARCHIVE')} 
                />
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none bg-slate-900 text-white shadow-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <ShieldCheck size={120} />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2 text-[9px] font-black text-emerald-400 tracking-widest uppercase">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Chain Integrity Verified
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-black tracking-tighter">99.9% Compliance</h4>
                  <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Audit Node: KR-SEOUL-01</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 2. Center: Resource Stream (4.5/12) */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-4 space-y-6">
            <Card className="rounded-[2.5rem] border-none bg-white/60 backdrop-blur-xl shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col h-[750px] ring-1 ring-white/50">
              <CardHeader className="p-8 space-y-6 border-b border-white/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase">
                    Approval Stream
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                    <RefreshCcw size={18} className="text-slate-400" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <Input 
                    className="pl-12 h-14 bg-white/50 border-white/20 rounded-2xl text-sm font-bold shadow-inner" 
                    placeholder="Search requests..."
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
                  <Card className="h-full rounded-[2.5rem] border-none bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] flex flex-col ring-1 ring-slate-100 overflow-hidden min-h-[750px]">
                    <CardHeader className="bg-slate-50/30 p-10 lg:p-14 border-b border-slate-50 space-y-8">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-slate-900 text-white text-[9px] font-black rounded-lg tracking-[0.2em] px-3 py-1 uppercase">
                              Intelligence View
                            </Badge>
                            <span className="text-xs font-black text-slate-300 font-mono tracking-widest">#{selectedItem.approvalId}</span>
                          </div>
                          <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                            {selectedItem.jobTypeNm || 'General Approval Request'}
                          </h2>
                        </div>
                        
                        {activeTab === 'PENDING' && selectedItem.status === 'R' && (
                          <div className="flex gap-4">
                            <Button 
                              onClick={() => handleAction(selectedItem, 'Y')}
                              className="h-16 px-10 rounded-2xl bg-emerald-500 text-white font-black shadow-2xl shadow-emerald-500/30 hover:bg-emerald-600 hover:-translate-y-1 transition-all gap-2 border-none"
                            >
                              <Check size={20} /> APPROVE
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleAction(selectedItem, 'N')}
                              className="h-16 px-10 rounded-2xl font-black shadow-2xl shadow-rose-500/30 hover:-translate-y-1 transition-all gap-2 border-none"
                            >
                              <X size={20} /> REJECT
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-3xl p-10 border-2 border-slate-50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-[10px] font-black text-slate-400 tracking-[0.3em] flex items-center gap-2 uppercase">
                            <Zap size={14} className="text-primary" /> Approval Chain Analysis
                          </h4>
                          <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Verified Path</span>
                        </div>
                        <ApprovalStepper steps={workflowSteps} />
                      </div>
                    </CardHeader>

                    <CardContent className="p-10 lg:p-14 space-y-12 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <DetailSection 
                          icon={<User size={18} />} 
                          title="Originating Identity" 
                          value={selectedItem.applicantId} 
                          desc="Authenticated User Node" 
                        />
                        <DetailSection 
                          icon={<Calendar size={18} />} 
                          title="Execution Timestamp" 
                          value={selectedItem.requestDate} 
                          desc="Clock Synchronized" 
                        />
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-300 tracking-[0.4em] flex items-center gap-2 uppercase">
                          <Info size={14} className="text-primary" /> Encrypted Payload
                        </h4>
                        <div className="p-10 bg-slate-50/50 rounded-3xl border-2 border-slate-50/50 min-h-[200px] shadow-[inset_0_2px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                              <FileText size={100} />
                           </div>
                           <p className="text-lg font-bold leading-[1.8] text-slate-700 whitespace-pre-wrap relative z-10">
                            {selectedItem.returnReason || "본 결재 건은 시스템 표준 프로세스에 따라 상신되었습니다.\n상세 내용은 첨부된 전자 문서를 참조하여 주시기 바랍니다."}
                          </p>
                        </div>
                      </div>
                    </CardContent>

                    <div className="p-8 bg-slate-50/20 border-t border-slate-50 flex items-center justify-center">
                      <p className="text-[9px] font-black text-slate-200 tracking-[1em] uppercase font-mono animate-pulse">
                        ENTERPRISE_SECURE_KERNEL_V5.1_SYNC
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-white/40 rounded-[2.5rem] border-4 border-dashed border-slate-100 animate-in fade-in duration-1000">
                  <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-slate-200 rotate-12 group hover:rotate-0 transition-transform duration-500">
                    <ShieldCheck size={56} className="text-slate-100 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-300 tracking-tighter uppercase mb-4">_ Select Transaction</h3>
                  <p className="text-[10px] font-black text-slate-200 tracking-[0.5em] uppercase">Awaiting cryptographic selection</p>
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
        "w-full group p-5 rounded-2xl transition-all flex items-center gap-4 relative overflow-hidden",
        active
          ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-[1.02] z-10"
          : "text-slate-500 hover:text-slate-900 hover:bg-white/80"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
        active ? "bg-primary text-white rotate-6" : "bg-slate-50 text-slate-400 group-hover:rotate-6 group-hover:text-primary"
      )}>
        {icon}
      </div>
      <span className="text-sm font-black tracking-tight">{label}</span>
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
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shadow-sm border border-slate-100 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
          {icon}
        </div>
        <span className="text-[10px] font-black tracking-[0.3em] uppercase">{title}</span>
      </div>
      <div className="space-y-1 pl-1">
        <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
        <p className="text-[11px] text-slate-400 font-bold tracking-tight">{desc}</p>
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

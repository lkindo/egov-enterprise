'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  ShieldCheck,
  Plus,
  RefreshCcw,
  Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { approvalUserService, Approval } from '@/services/business/user/approval/ApprovalUserService';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ApprovalStepper } from './ApprovalStepper';
import Link from 'next/link';
import { HubDetailSkeleton } from '@/components/ui/hub/HubSkeleton';

type ApprovalTab = 'PENDING' | 'HISTORY' | 'ARCHIVE';

const EMPTY_APPROVALS: Approval[] = [];

export default function ApprovalHubClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('PENDING');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data: approvalData, isLoading, error: approvalsError, refetch: refetchApprovals } = useQuery({
    queryKey: ['approvals', activeTab],
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

  /**
   * 결재 단계는 서버가 내려준 필드로만 구성한다.
   * 종전에는 존재하지 않는 중간 결재자('이순신 과장')와 '최종 승인' 단계를 화면에서
   * 창작해 실제 결재선이 아닌 흐름을 사실처럼 보여줬다 — 기안(신청자)과 결재(approverId)
   * 두 단계가 이 API 계약이 실제로 보증하는 전부다.
   */
  const workflowSteps = useMemo(() => {
    if (!selectedItem) return [];
    return [
      { label: '기안', user: selectedItem.applicantId, status: 'completed' as const, date: selectedItem.requestDate },
      {
        label: '결재',
        user: selectedItem.approverId || '결재자 미지정',
        status: selectedItem.status === 'Y' ? 'completed' as const :
          selectedItem.status === 'N' ? 'rejected' as const : 'current' as const,
        date: selectedItem.approvalDate
      }
    ];
  }, [selectedItem]);

  /**
   * 결재함 목록 — StandardDataTable + sortKey(현재 페이지 클라이언트 정렬).
   * 문서번호·유형·요청일·상태 전 열이 원시 필드 기준으로 정렬 가능하다.
   */
  const approvalColumns: Column<Approval>[] = useMemo(() => [
    {
      header: '문서번호',
      sortKey: 'approvalId',
      accessor: (item: Approval) => (
        <span className={cn(
          'text-sm font-bold tracking-tight',
          selectedItem?.approvalId === item.approvalId ? 'text-primary' : 'text-foreground'
        )}>
          #{item.approvalId}
        </span>
      )
    },
    {
      header: '유형',
      sortKey: 'jobTypeNm',
      accessor: (item: Approval) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">
          {item.jobTypeNm || '일반 결재'}
        </span>
      )
    },
    {
      header: '요청일',
      sortKey: 'requestDate',
      accessor: (item: Approval) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums">
          {item.requestDate?.substring(0, 10)}
        </span>
      )
    },
    {
      header: '상태',
      sortKey: 'status',
      accessor: (item: Approval) => (
        <Badge variant={item.status === 'Y' ? 'success' : item.status === 'N' ? 'destructive' : 'secondary'} className="text-xs font-bold px-2 py-0">
          {item.status === 'Y' ? '승인 완료' : item.status === 'N' ? '반려됨' : '대기 중'}
        </Badge>
      )
    }
  ], [selectedItem?.approvalId]);

  // 폭 위임: 화면 자체 max-w-[1600px] 캡을 제거하고 루트 레이아웃의 --page-max-w 토큰에
  // 폭·여백을 위임한다(compact 배포에서 전폭 ERP 작업면, theme-token-contract 고정).
  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-1000">

        {/* --- Hub Header --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-6">
            <div className="w-16 h-11 bg-surface-inverse rounded-lg flex items-center justify-center shadow-2xl rotate-3 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <ShieldCheck size={32} className="text-surface-inverse-foreground relative z-10" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-foreground tracking-tighter leading-none">
                결재 허브
              </h1>
              <p className="text-xs font-bold text-muted-foreground tracking-tight">
                대기 결재를 승인·반려하고 처리 이력을 조회합니다
              </p>
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

          {/* 1. Left: Navigation */}
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
          </div>

          {/* 2. Center: 결재함 목록 */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-4 space-y-6">
            <Card className="rounded-[2.5rem] border-none bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/50">
              <CardHeader className="p-8 space-y-6 border-b border-white/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-muted-foreground tracking-tight">
                    결재함 목록
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="결재함 목록 새로고침"
                    className="rounded-lg hover:bg-muted"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['approvals'] })}
                  >
                    <RefreshCcw size={18} className="text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-6">
                <StandardDataTable<Approval>
                  columns={approvalColumns}
                  data={list}
                  loading={isLoading}
                  error={approvalsError as Error | null}
                  onRetry={() => refetchApprovals()}
                  keyField="approvalId"
                  accessibleLabel="결재함 목록"
                  emptyMessage="요청 내역이 없습니다."
                  onRowClick={(item) => setSelectedItemId(item.approvalId)}
                  rowActionLabel={(item) => `${item.approvalId} 결재 상세 보기`}
                  isPremium={false}
                  className="border-none bg-transparent"
                />
              </CardContent>
            </Card>
          </div>

          {/* 3. Right: Detail Workspace */}
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
                              결재 상세
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
                            <Zap size={14} className="text-primary" /> 결재 진행 상태
                          </h4>
                        </div>
                        <ApprovalStepper steps={workflowSteps} />
                      </div>
                    </CardHeader>

                    <CardContent className="p-10 lg:p-14 space-y-12 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <DetailSection
                          icon={<User size={18} />}
                          title="기안자"
                          value={selectedItem.applicantId}
                        />
                        <DetailSection
                          icon={<Calendar size={18} />}
                          title="기안 일시"
                          value={selectedItem.requestDate}
                        />
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-2">
                          <Info size={14} className="text-primary" /> 처리 의견
                        </h4>
                        <div className="p-10 bg-muted/50 rounded-lg border-2 border-border min-h-[200px] shadow-[inset_0_2px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                              <FileText size={100} />
                           </div>
                           {/* 서버가 내려준 의견만 보여준다 — 종전에는 의견이 없으면 '표준 프로세스에 따라
                               상신되었습니다' 라는 창작 본문을 실제 문서 내용처럼 노출했다. */}
                           {selectedItem.returnReason ? (
                             <p className="text-lg font-bold leading-[1.8] text-foreground whitespace-pre-wrap relative z-10">
                               {selectedItem.returnReason}
                             </p>
                           ) : (
                             <p className="text-sm font-bold text-muted-foreground relative z-10">
                               등록된 처리 의견이 없습니다.
                             </p>
                           )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-white/40 rounded-[2.5rem] border-4 border-dashed border-border animate-in fade-in duration-1000">
                  <div className="w-32 h-32 bg-card rounded-lg flex items-center justify-center mb-8 shadow-2xl rotate-12 group hover:rotate-0 transition-transform duration-500">
                    <ShieldCheck size={56} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-3xl font-bold text-muted-foreground tracking-tighter mb-4">결재 문서 선택</h3>
                  <p className="text-xs font-bold text-muted-foreground tracking-tight">상세 내역 대기 중</p>
                </div>
              )}
            </AnimatePresence>
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

function DetailSection({ icon, title, value }: { icon: React.ReactNode; title: string; value: React.ReactNode }) {
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
      </div>
    </div>
  );
}

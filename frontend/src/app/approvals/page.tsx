'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { approvalUserService, Approval } from '@/services/business/user/approval/ApprovalUserService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
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
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApprovalStepper } from './ApprovalStepper';
import { Button } from '@/components/ui/button';

export default function ApprovalInboxPage() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Approval[]>([]);
  const [selectedItem, setSelectedItem] = useState<Approval | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await (tab === 'received'
        ? approvalUserService.getPending({ page: 0, size: 20 })
        : approvalUserService.getMyHistory({ page: 0, size: 20 }));

      const list = result.list || [];
      setData(list);
      if (list.length > 0) {
        setSelectedItem(list[0]);
      } else {
        setSelectedItem(null);
      }
    } catch (error) {
      toast('결재 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      loadData();
    } catch (error) {
      toast(`${actionNm} 처리 중 오류가 발생했습니다.`, 'error');
    }
  };

  const columns = [
    {
      header: '결재 정보',
      accessor: (item: Approval) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0",
            item.status === 'Y' ? "bg-emerald-50 text-emerald-600" :
            item.status === 'N' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
          )}>
            <FileText size={18} />
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="font-black text-sm tracking-tight truncate">{item.approvalId}</span>
            <span className="text-[10px] font-bold text-muted-foreground tracking-tight">
              {item.jobType === '1' ? '주간보고' : item.jobType === '01' ? '연차' : '일반 결재'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: '신청자',
      accessor: (item: Approval) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <User size={12} className="opacity-40" />
          </div>
          <span className="text-sm font-bold">{item.applicantId}</span>
        </div>
      )
    },
    { header: '상태', accessor: (item: Approval) => <StatusBadge status={item.status} /> }
  ];

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

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700 p-8">
      <PageHeader
        title="전자결재 관제 센터"
        breadcrumbs={[{ label: '업무지원' }, { label: '전자결재' }]}
        actions={
          <Button className="rounded-2xl h-14 px-8 font-black shadow-2xl bg-slate-900 border-none text-white hover:bg-primary transition-all gap-2">
            <ClipboardCheck size={20} /> 새 결재 기안
          </Button>
        }
      />

      <div className="flex p-2 bg-slate-100 rounded-[1.8rem] w-fit">
        <TabButton
          active={tab === 'received'}
          onClick={() => setTab('received')}
          icon={<Inbox size={18} />}
          label="받은 결재함"
          count={tab === 'received' ? data.length : undefined}
        />
        <TabButton
          active={tab === 'sent'}
          onClick={() => setTab('sent')}
          icon={<Send size={18} />}
          label="보낸 결재함"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white border-2 border-slate-50 rounded-[3rem] shadow-xl overflow-hidden flex flex-col h-[750px]">
            <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-black text-xl flex items-center gap-3">
                <History size={22} className="text-primary" />
                {tab === 'received' ? '미처리 요청' : '기안 이력'}
              </h3>
              <span className="text-[11px] font-black bg-primary text-white px-3 py-1 rounded-full shadow-lg shadow-primary/20">
                {data.length} 건
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <StandardDataTable
                columns={columns}
                data={data}
                loading={loading}
                onRowClick={setSelectedItem}
                emptyMessage={tab === 'received' ? "대기 중인 결재 요청이 없습니다." : "보낸 결재 이력이 없습니다."}
                className="border-none shadow-none rounded-none"
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-3">
          {selectedItem ? (
            <div className="bg-white border-2 border-slate-50 rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-700 flex flex-col h-full min-h-[750px] ring-1 ring-slate-100">
              <div className="p-12 border-b border-slate-50 bg-slate-50/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-lg tracking-widest uppercase">
                        Detail View
                      </div>
                      <span className="text-xs font-black text-slate-300 font-mono tracking-tighter">#{selectedItem.approvalId}</span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
                      {selectedItem.jobType === '1' ? '주간보고 결재 건' : selectedItem.jobType === '01' ? '연차 휴가 신청 건' : '일반 결재 요청'}
                    </h3>
                  </div>
                  {tab === 'received' && selectedItem.status === 'R' && (
                    <div className="flex gap-4">
                      <Button
                        onClick={() => handleAction(selectedItem, 'Y')}
                        className="h-16 px-10 rounded-[1.5rem] font-black bg-emerald-500 hover:bg-emerald-600 shadow-2xl shadow-emerald-500/20 gap-2 border-none"
                      >
                        <Check size={20} /> 승인 처리
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleAction(selectedItem, 'N')}
                        className="h-16 px-10 rounded-[1.5rem] font-black shadow-2xl shadow-rose-500/20 gap-2 border-none"
                      >
                        <X size={20} /> 반려
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 border-2 border-slate-50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[10px] font-black text-slate-400 tracking-[0.3em] flex items-center gap-2 uppercase">
                      <Zap size={14} className="text-primary" /> Approval Workflow 
                    </h4>
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Real-time Sync</span>
                  </div>
                  <ApprovalStepper steps={workflowSteps} />
                </div>
              </div>

              <div className="p-12 space-y-12 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <DetailSection icon={<User size={18} />} title="기안자 세부 정보" value={selectedItem.applicantId} desc="협업지원팀 / Senior Associate" />
                  <DetailSection icon={<Calendar size={18} />} title="기안 타임스탬프" value={selectedItem.requestDate} desc="기안 유효성 확인 완료" />
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-300 tracking-[0.3em] flex items-center gap-2 uppercase">
                    <Info size={14} className="text-primary" /> Submission Content
                  </h4>
                  <div className="p-10 bg-white rounded-[2.5rem] border-2 border-slate-50 min-h-[250px] shadow-sm">
                    <p className="text-lg font-bold leading-[1.8] text-slate-700 whitespace-pre-wrap">
                      본 결재 건은 시스템 표준 프로세스에 따라 상신되었습니다. <br />
                      상세 내용은 첨부된 부서별 주간 업무 보고서 및 리소스 활용 현황을 참조하여 주시기 바랍니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white border-t border-slate-50 flex items-center justify-center">
                <p className="text-[9px] font-black text-slate-200 tracking-[0.5em] uppercase font-mono">
                  ENTERPRISE_GOV_APPROVAL_AUTHENTIC_V5.0
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-24 bg-slate-50/30 border-4 border-dashed border-slate-100 rounded-[3.5rem] animate-pulse">
              <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl">
                <ClipboardCheck size={48} className="text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-300 tracking-tighter uppercase mb-2">결재 항목을 선택하세요</h3>
              <p className="text-xs font-bold text-slate-200 tracking-[0.2em] uppercase">Select an item to view intelligence analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-10 py-5 text-[11px] font-black rounded-2xl transition-all duration-500 relative uppercase tracking-widest",
        active
          ? "bg-white text-slate-900 shadow-2xl shadow-slate-200 scale-[1.05] z-10"
          : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={cn(
          "ml-2 text-[9px] px-2 py-0.5 rounded-full font-black",
          active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function DetailSection({ icon, title, value, desc }: any) {
  return (
    <div className="space-y-4 group">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[10px] font-black tracking-[0.2em] uppercase">{title}</span>
      </div>
      <div className="space-y-1 pl-1">
        <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-[11px] text-slate-400 font-bold tracking-tight">{desc}</p>
      </div>
    </div>
  );
}

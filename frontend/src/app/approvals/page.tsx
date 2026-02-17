'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { approvalService, Approval } from '@/services/approvalService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { 
  Inbox, 
  Send, 
  Check, 
  X, 
  FileText, 
  Clock, 
  User, 
  ArrowRight,
  ClipboardCheck,
  History,
  Info,
  Calendar
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
      const res = tab === 'received' 
        ? await approvalService.getPending({ page: 0, size: 20 })
        : await approvalService.getMyHistory({ page: 0, size: 20 });
      
      if (res.success) {
        setData(res.data.content || []);
        if (res.data.content?.length > 0) {
          setSelectedItem(res.data.content[0]);
        } else {
          setSelectedItem(null);
        }
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
      await approvalService.confirm(item.approvalId, status);
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
          <div className="flex flex-col overflow-hidden">
            <span className="font-black text-sm tracking-tight truncate">{item.approvalId}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
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
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User size={12} className="opacity-40" />
          </div>
          <span className="text-xs font-bold">{item.applicantId}</span>
        </div>
      )
    },
    { header: '상태', accessor: (item: Approval) => <StatusBadge status={item.status} /> }
  ];

  const workflowSteps = useMemo(() => {
    if (!selectedItem) return [];
    return [
      { label: '기안', user: selectedItem.applicantId, status: 'completed' as const, date: selectedItem.requestDate },
      { label: '검토', user: '이순신 과장', status: selectedItem.status === 'R' ? 'current' : 'completed' as const },
      { 
        label: '최종 승인', 
        user: '관리자', 
        status: selectedItem.status === 'Y' ? 'completed' : 
                selectedItem.status === 'N' ? 'rejected' : 'pending' as const 
      }
    ];
  }, [selectedItem]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <PageHeader 
        title="전자결재 관제 센터" 
        breadcrumbs={[{ label: '업무지원' }, { label: '전자결재' }]}
        actions={
          <Button className="rounded-xl h-11 px-6 font-black shadow-lg shadow-primary/20 gap-2">
            <ClipboardCheck size={18} /> 새 결재 기안
          </Button>
        }
      />

      {/* Modern Tab Bar */}
      <div className="flex p-1.5 bg-muted/30 rounded-[1.5rem] w-fit">
        <TabButton 
          active={tab === 'received'} 
          onClick={() => setTab('received')}
          icon={<Inbox size={18} />}
          label="받은 결재함"
          count={tab === 'received' ? data.length : 3}
        />
        <TabButton 
          active={tab === 'sent'} 
          onClick={() => setTab('sent')}
          icon={<Send size={18} />}
          label="보낸 결재함"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Left: Approval List */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col h-[700px]">
            <div className="px-8 py-6 border-b border-primary/5 flex items-center justify-between bg-muted/5">
              <h3 className="font-black text-lg flex items-center gap-2.5">
                <History size={20} className="text-primary" />
                {tab === 'received' ? '미처리 요청' : '기안 이력'}
              </h3>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
                {data.length} Items
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
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

        {/* Right: Approval Detail & Workflow */}
        <div className="xl:col-span-3">
          {selectedItem ? (
            <div className="bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-500 flex flex-col h-full min-h-[700px]">
              <div className="p-10 border-b border-primary/5 bg-muted/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-primary/20">
                        Detail View
                      </div>
                      <span className="text-sm font-bold text-muted-foreground font-mono">#{selectedItem.approvalId}</span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight">
                      {selectedItem.jobType === '1' ? '2026년 2월 주간보고 결재 건' : '연차 유급 휴가 신청의 건'}
                    </h3>
                  </div>
                  {tab === 'received' && selectedItem.status === 'R' && (
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => handleAction(selectedItem, 'Y')}
                        className="h-14 px-8 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 gap-2"
                      >
                        <Check size={20} /> 승인 처리
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleAction(selectedItem, 'N')}
                        className="h-14 px-8 rounded-2xl font-black shadow-xl shadow-red-500/20 gap-2"
                      >
                        <X size={20} /> 반려
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-background/50 rounded-[2rem] p-8 border-2 border-primary/5 shadow-inner">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                      <Zap size={14} className="text-primary" /> Approval Workflow
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Live Update</span>
                  </div>
                  <ApprovalStepper steps={workflowSteps} />
                </div>
              </div>

              <div className="p-10 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <DetailSection icon={<User size={16} />} title="기안자 정보" value={selectedItem.applicantId} desc="기술지원부 / 대리" />
                  <DetailSection icon={<Calendar size={16} />} title="기안 일시" value={selectedItem.requestDate} desc="최종 수정: 2026-02-17 10:00" />
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                    <Info size={14} className="text-primary" /> 상세 상신 내용
                  </h4>
                  <div className="p-8 bg-muted/20 rounded-[2rem] border-2 border-primary/5 min-h-[200px]">
                    <p className="text-base font-medium leading-relaxed text-foreground/80">
                      본 결재 건은 시스템 현대화 프로젝트의 주간 보고 내용이며, 주요 인프라 교체 및 UI 표준화 작업에 대한 승인을 요청드립니다. <br /><br />
                      세부 내용은 첨부된 '2026_Weekly_Report_Feb.pdf' 파일을 참조하시기 바랍니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-muted/5 border-t border-primary/5 flex items-center justify-center">
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.3em]">
                  Electronic Approval Certification System v5.0
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-card/30 border-2 border-dashed border-primary/10 rounded-[2.5rem]">
              <div className="w-24 h-24 bg-muted rounded-[2.5rem] flex items-center justify-center mb-6">
                <ClipboardCheck size={48} className="text-muted-foreground/20" />
              </div>
              <h3 className="text-xl font-black text-muted-foreground/60">결재 항목을 선택해주세요</h3>
              <p className="text-sm text-muted-foreground/40 mt-2 max-w-xs">좌측 목록에서 상세 내용을 확인하고 싶은 결재 건을 선택하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-8 py-3.5 text-sm font-black rounded-2xl transition-all duration-300 relative",
        active 
          ? "bg-background text-primary shadow-xl shadow-primary/10 scale-105 z-10" 
          : "text-muted-foreground hover:bg-background/50"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={cn(
          "ml-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold",
          active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function DetailSection({ icon, title, value, desc }: any) {
  return (
    <div className="space-y-3 group">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-primary/60 group-hover:text-primary transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <div className="space-y-1 pl-9">
        <p className="text-lg font-black text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{desc}</p>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { approvalService, Approval } from '@/services/approvalService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Inbox, Send, Check, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApprovalInboxPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Approval[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = tab === 'received' 
        ? await approvalService.getPending({ page: 0, size: 20 })
        : await approvalService.getMyHistory({ page: 0, size: 20 });
      
      if (res.success) {
        setData(res.data.content);
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
    { header: 'ID', accessor: 'approvalId', className: 'w-24' },
    { 
      header: '유형', 
      accessor: (item: Approval) => (
        <span className="px-2 py-1 bg-muted rounded text-[10px] font-black uppercase">
          {item.jobType === '1' ? '주간보고' : item.jobType === '01' ? '연차' : '일반'}
        </span>
      )
    },
    { header: '신청자', accessor: 'applicantId' },
    { header: '신청일', accessor: 'requestDate' },
    { header: '상태', accessor: (item: Approval) => <StatusBadge status={item.status} /> },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Approval) => (
        tab === 'received' && item.status === 'R' ? (
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => handleAction(item, 'Y')}
              className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-md transition-all"
            >
              <Check size={16} />
            </button>
            <button 
              onClick={() => handleAction(item, 'N')}
              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-all"
            >
              <X size={16} />
            </button>
          </div>
        ) : null
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="전자결재 센터" 
        breadcrumbs={[{ label: '업무지원' }, { label: '전자결재' }]}
      />

      {/* Tabs */}
      <div className="flex border-b">
        <TabButton 
          active={tab === 'received'} 
          onClick={() => setTab('received')}
          icon={<Inbox size={18} />}
          label="받은 결재함"
        />
        <TabButton 
          active={tab === 'sent'} 
          onClick={() => setTab('sent')}
          icon={<Send size={18} />}
          label="보낸 결재함"
        />
      </div>

      <StandardDataTable 
        columns={columns} 
        data={data} 
        loading={loading}
        emptyMessage={tab === 'received' ? "대기 중인 결재 요청이 없습니다." : "보낸 결재 이력이 없습니다."}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all",
        active ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

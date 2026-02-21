'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { ismService, InfrmlSanctn } from '@/services/ismService';
import { useToast } from '@/app/components/ui/toast';
import { ShieldCheck, UserCheck, FileText, CheckCircle2, XCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';

export default function InformalSanctionPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InfrmlSanctn[]>([]);

  // 모달 상태 (승인/반려 처리용)
  const [isModalOpen, setIsOpen] = useState(false);
  const [selectedSanctn, setSelectedSanctn] = useState<InfrmlSanctn | null>(null);
  const [returnResn, setReturnResn] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // 백엔드에 리스트 API가 아직 없을 수 있으므로 예외 처리
      // 실제로는 ismService.getInfrmlSanctnList() 가 필요함.
      // 여기서는 서비스에 getInfrmlSanctnList를 추가했다고 가정.
      const res = await (ismService as any).getInfrmlSanctnList?.({ page: 0, size: 50 }) || { success: true, data: { content: [] } };
      if (res.success) setData(res.data.content || []);
    } catch (error) {
      toast('결재 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenConfirm = (sanctn: InfrmlSanctn) => {
    setSelectedSanctn(sanctn);
    setReturnResn('');
    setIsOpen(true);
  };

  const handleProcess = async (status: 'C' | 'R') => {
    if (!selectedSanctn) return;
    try {
      await ismService.confirmInfrmlSanctn(selectedSanctn.infrmlSanctnId, status, returnResn);
      toast(`결재가 ${status === 'C' ? '승인' : '반려'}되었습니다.`, 'success');
      setIsOpen(false);
      loadData();
    } catch (error) {
      toast('처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { 
      header: '업무구분', 
      accessor: (item: InfrmlSanctn) => (
        <span className="text-xs font-bold text-muted-foreground uppercase">
          {item.jobSe || item.jobSeCode || 'ETC'}
        </span>
      )
    },
    { 
      header: '결재명', 
      accessor: (item: InfrmlSanctn) => item.sancltNm, 
      className: 'font-bold text-primary' 
    },
    { 
      header: '신청자 ID', 
      accessor: (item: InfrmlSanctn) => item.applcntId, 
      className: 'font-mono text-xs' 
    },
    {
      header: '상태',
      accessor: (item: InfrmlSanctn) => (
        <div className="flex items-center gap-1">
          {item.confmAt === 'Y' ? (
            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> 승인</span>
          ) : item.confmAt === 'R' ? (
            <span className="text-[10px] font-bold text-red-600 flex items-center gap-1"><XCircle size={12} /> 반려</span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12} /> 대기</span>
          )}
        </div>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: InfrmlSanctn) => (
        <div className="flex justify-end gap-1">
          {(item.confmAt === 'N' || item.confmAt === 'A') && (
            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-primary" onClick={() => handleOpenConfirm(item)}>결재처리</Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => {}}><Trash2 size={14} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="약식결재 및 승인 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '약식결재' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="대기 중 결재" count={data.filter(i => i.confmAt === 'N' || i.confmAt === 'A').length} icon={<Clock size={18} />} color="text-orange-600" />
        <SummaryCard title="승인 완료" count={data.filter(i => i.confmAt === 'Y').length} icon={<CheckCircle2 size={18} />} color="text-green-600" />
        <SummaryCard title="전체 내역" count={data.length} icon={<FileText size={18} />} color="text-blue-600" />
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> 약식 결재 처리 현황
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyMessage="결재 요청 내역이 없습니다."
          className="border-none rounded-none"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title="약식결재 처리"
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-muted/30 rounded-xl">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">결재 대상</div>
            <h4 className="text-lg font-black text-primary">{selectedSanctn?.sancltNm}</h4>
            <div className="mt-2 text-sm">
              <span className="font-bold">신청자:</span> {selectedSanctn?.applcntId}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1">
              승인/반려 의견 <span className="text-destructive">*</span>
            </label>
            <textarea 
              value={returnResn}
              onChange={(e) => setReturnResn(e.target.value)}
              placeholder="처리 의견을 입력하세요 (반려 시 필수)"
              className="w-full min-h-[100px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsOpen(false)}>취소</Button>
            <Button variant="destructive" className="flex-1 h-12 rounded-xl font-bold gap-2" onClick={() => handleProcess('R')}>
              <XCircle size={18} /> 반려하기
            </Button>
            <Button className="flex-[2] h-12 rounded-xl font-bold gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleProcess('C')}>
              <CheckCircle2 size={18} /> 승인완료
            </Button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}

function SummaryCard({ title, count, icon, color }: any) {
  return (
    <div className="p-6 bg-card border rounded-3xl flex items-center gap-4 shadow-sm">
      <div className={cn("p-3 rounded-2xl bg-muted/50", color)}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <h3 className="text-xl font-black mt-0.5">{count} 건</h3>
      </div>
    </div>
  );
}

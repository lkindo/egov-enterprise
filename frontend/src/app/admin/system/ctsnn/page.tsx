'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { ctsnnService, CtsnnManage } from '@/services/ctsnnService';
import { useToast } from '@/app/components/ui/toast';
import { Heart, Gift, User, Calendar, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { CtsnnForm } from '@/components/admin/system/CtsnnForm';

export default function CtsnnPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CtsnnManage[]>([]);
  const [searchParams, setSearchParams] = useState({ usid: '' });

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedCtsnn, setSelectedCtsnn] = useState<CtsnnManage | undefined>(undefined);

  const loadData = useCallback(async (params = searchParams) => {
    try {
      setLoading(true);
      const res = await ctsnnService.getCtsnnList({ ...params, page: 0, size: 50 });
      if (res.success) {
        setData(res.data.content || []);
      }
    } catch (error) {
      toast('경조사 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedCtsnn(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CtsnnManage) => {
    setMode('edit');
    setSelectedCtsnn(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: Partial<CtsnnManage>) => {
    try {
      if (mode === 'create') {
        await ctsnnService.createCtsnn(formData);
        toast('경조사 신청이 완료되었습니다.', 'success');
      } else {
        await ctsnnService.updateCtsnn(selectedCtsnn!.ctsnnId, formData);
        toast('정보가 수정되었습니다.', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await ctsnnService.deleteCtsnn(id);
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await ctsnnService.approveCtsnn(id);
      toast('승인되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('승인 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { 
      header: '유형', 
      accessor: (item: CtsnnManage) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black uppercase",
          item.ctsnnCode === '1' ? "bg-pink-100 text-pink-700" :
          item.ctsnnCode === '2' ? "bg-slate-100 text-slate-700" :
          "bg-blue-100 text-blue-700"
        )}>
          {item.ctsnnCode === '1' ? '결혼' : item.ctsnnCode === '2' ? '부고' : '기타'}
        </span>
      )
    },
    { header: '경조사명', accessor: 'ctsnnNm', className: 'font-bold text-primary' },
    { header: '대상자(관계)', accessor: (item: CtsnnManage) => `${item.trgetNm} (관계코드:${item.relate})`, className: 'text-xs' },
    { header: '발생일자', accessor: 'occrrncDe', className: 'font-mono text-xs' },
    { header: '신청자 ID', accessor: 'usid', className: 'text-xs text-muted-foreground' },
    { 
      header: '승인상태', 
      accessor: (item: CtsnnManage) => (
        <div className="flex items-center gap-1">
          {item.confmAt === 'Y' ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
              <CheckCircle2 size={12} /> 승인완료
            </span>
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground">대기중</span>
          )}
        </div>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: CtsnnManage) => (
        <div className="flex justify-end gap-1">
          {item.confmAt === 'N' && (
            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-primary" onClick={() => handleApprove(item.ctsnnId)}>승인</Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(item)}><Edit size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(item.ctsnnId)}><Trash2 size={14} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="임직원 경조사 관리"
        breadcrumbs={[{ label: '시스템관리' }, { label: '경조사관리' }]}
        actions={
          <Button onClick={handleOpenCreate} className="rounded-full gap-2">
            <Plus size={16} /> 신규 경조사 등록
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="이번 달 경조사" count={data.length} icon={<Heart size={18} />} color="text-pink-600" />
        <SummaryCard title="승인 대기" count={data.filter(i => i.confmAt === 'N').length} icon={<Calendar size={18} />} color="text-orange-600" />
        <SummaryCard title="전체 내역" count={data.length} icon={<Gift size={18} />} color="text-blue-600" />
      </div>

      <StandardSearchFilter 
        fields={[
          { name: 'usid', label: '사용자 ID', type: 'text', placeholder: '직원 ID 입력...' }
        ]}
        onSearch={(v: any) => {
          setSearchParams(v);
          loadData(v);
        }}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Heart size={14} /> 경조사 신청 및 처리 현황
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyMessage="등록된 경조사 내역이 없습니다."
          className="border-none rounded-none"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? '신규 경조사 등록' : '경조사 정보 수정'}
        maxWidth="lg"
      >
        <CtsnnForm 
          initialData={selectedCtsnn} 
          onSubmit={handleSubmit} 
          onCancel={() => setIsModalOpen(false)} 
        />
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

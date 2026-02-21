'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { rewardService, Reward } from '@/services/rewardService';
import { useToast } from '@/app/components/ui/toast';
import { Trophy, Gift, User, Calendar, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { RewardForm } from '@/components/admin/system/RewardForm';

export default function RewardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Reward[]>([]);
  const [searchParams, setSearchParams] = useState({ usid: '' });

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedReward, setSelectedReward] = useState<Reward | undefined>(undefined);

  const loadData = useCallback(async (params = searchParams) => {
    try {
      setLoading(true);
      const res = await rewardService.getRewards({ ...params, page: 0, size: 50 });
      if (res.success) {
        setData(res.data.content || []);
      }
    } catch (error) {
      toast('포상 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedReward(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Reward) => {
    setMode('edit');
    setSelectedReward(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: Partial<Reward>) => {
    try {
      if (mode === 'create') {
        await rewardService.createReward(formData);
        toast('신규 포상이 등록되었습니다.', 'success');
      } else {
        await rewardService.updateReward(selectedReward!.rwdId, formData);
        toast('포상 정보가 수정되었습니다.', 'success');
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
      await rewardService.deleteReward(id);
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { 
      header: '종류', 
      accessor: (item: Reward) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black uppercase",
          item.rwdKnd === '1' ? "bg-orange-100 text-orange-700" :
          item.rwdKnd === '2' ? "bg-blue-100 text-blue-700" :
          "bg-green-100 text-green-700"
        )}>
          {item.rwdKnd === '1' ? '표창' : item.rwdKnd === '2' ? '포상금' : '휴가'}
        </span>
      )
    },
    { 
      header: '포상명', 
      accessor: (item: Reward) => item.rwdNm, 
      className: 'font-bold text-primary' 
    },
    { 
      header: '대상자 ID', 
      accessor: (item: Reward) => item.usid, 
      className: 'font-mono text-xs' 
    },
    { 
      header: '포상일자', 
      accessor: (item: Reward) => item.rwdDe, 
      className: 'text-xs text-muted-foreground' 
    },
    { 
      header: '상태', 
      accessor: (item: Reward) => (
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
      accessor: (item: Reward) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(item)}><Edit size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(item.rwdId)}><Trash2 size={14} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="임직원 포상 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '포상관리' }]}
        action={
          <Button onClick={handleOpenCreate} className="rounded-full gap-2">
            <Plus size={16} /> 신규 포상 등록
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="올해의 포상" count={data.length} icon={<Trophy size={18} />} color="text-orange-600" />
        <SummaryCard title="승인 대기" count={data.filter(i => i.confmAt === 'N').length} icon={<Calendar size={18} />} color="text-slate-600" />
        <SummaryCard title="최근 포상" count={data.slice(0, 5).length} icon={<Gift size={18} />} color="text-blue-600" />
      </div>

      <StandardSearchFilter 
        fields={[
          { name: 'usid', label: '대상자 ID', type: 'text', placeholder: '직원 ID 입력...' }
        ]}
        onSearch={(v: any) => {
          setSearchParams(v);
          loadData(v);
        }}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Trophy size={14} /> 포상 수여 내역
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyMessage="등록된 포상 내역이 없습니다."
          className="border-none rounded-none"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? '신규 포상 등록' : '포상 정보 수정'}
        maxWidth="lg"
      >
        <RewardForm 
          initialData={selectedReward} 
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

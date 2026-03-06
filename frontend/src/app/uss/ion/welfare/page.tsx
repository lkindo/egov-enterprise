'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { welfareService, WelfareReward, Ctsnn } from '@/services/user/WelfareService';
import { useToast } from '@/app/components/ui/toast';
import { Trophy, Heart, Gift, Users, Search, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WelfarePage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'reward' | 'ctsnn'>('reward');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = tab === 'reward'
        ? await welfareService.getRewards({ page: 0, size: 20 })
        : await welfareService.getCtsnns({ page: 0, size: 20 });

      setData(result.content || []);
    } catch (error) {
      toast('데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rewardColumns = [
    {
      header: '포상명',
      accessor: (item: WelfareReward) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Trophy size={16} /></div>
          <span className="font-bold text-foreground">{item.rwardNm}</span>
        </div>
      )
    },
    {
      header: '대상자',
      accessor: (item: WelfareReward) => item.userNm
    },
    {
      header: '포상종류',
      accessor: (item: WelfareReward) => item.rwardKnd,
      className: 'text-xs text-muted-foreground'
    },
    {
      header: '포상일',
      accessor: (item: WelfareReward) => item.rwardDe,
      className: 'text-xs font-medium'
    }
  ];

  const ctsnnColumns = [
    {
      header: '경조사명',
      accessor: (item: Ctsnn) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Heart size={16} /></div>
          <span className="font-bold text-foreground">{item.ctsnnNm}</span>
        </div>
      )
    },
    {
      header: '신청자',
      accessor: (item: Ctsnn) => item.userNm
    },
    {
      header: '대상자',
      accessor: (item: Ctsnn) => item.trgetNm,
      className: 'text-xs text-muted-foreground'
    },
    {
      header: '일시',
      accessor: (item: Ctsnn) => item.ctsnnDe,
      className: 'text-xs font-medium'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="임직원 포상 및 경조사 현황"
        breadcrumbs={[{ label: '부가서비스' }, { label: '복지현황' }]}
      />

      {/* Tabs */}
      <div className="flex bg-card border rounded-2xl p-1.5 w-fit shadow-sm">
        <TabButton active={tab === 'reward'} onClick={() => setTab('reward')} icon={<Trophy size={18} />} label="포상 내역" />
        <TabButton active={tab === 'ctsnn'} onClick={() => setTab('ctsnn')} icon={<Heart size={18} />} label="경조사 현황" />
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable
          columns={tab === 'reward' ? (rewardColumns as any) : (ctsnnColumns as any)}
          data={data}
          loading={loading}
          emptyMessage="등록된 내역이 없습니다."
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-black transition-all",
        active ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

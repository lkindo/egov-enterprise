'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { communityService, Community } from '@/services/communityService';
import { useToast } from '@/app/components/ui/toast';
import { Users, Plus, ShieldCheck, Trash2, Globe, Lock } from 'lucide-react';
import { StatusBadge } from '@/app/components/ui/status-badge';

export default function CommunityAdminPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await communityService.getCommunities({ page: 0, size: 20 }) as any;
        setData(res?.data?.content || res?.content || []);
      } catch (error) {
        toast('동호회 목록을 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const columns: { header: string; accessor: keyof Community | ((item: Community) => React.ReactNode); className?: string }[] = [
    { 
      header: '구분', 
      accessor: (item: Community) => (
        item.useAt === 'Y' ? <Globe size={16} className="text-green-500" /> : <Lock size={16} className="text-muted-foreground" />
      ),
      className: 'w-12'
    },
    { 
      header: '동호회명', 
      accessor: (item) => item.cmmntyNm, 
      className: 'font-black text-primary' 
    },
    { 
      header: '설명', 
      accessor: (item) => item.cmmntyIntrcn, 
      className: 'text-sm text-muted-foreground line-clamp-1' 
    },
    { 
      header: '관리자', 
      accessor: (item) => item.frstRegisterId, 
      className: 'text-xs' 
    },
    { 
      header: '개설일', 
      accessor: (item) => item.createdDate, 
      className: 'text-xs text-muted-foreground' 
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: () => (
        <button className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-all"><Trash2 size={16} /></button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="사내 동호회 및 커뮤니티 관리" 
        breadcrumbs={[{ label: '협업지원' }, { label: '동호회관리' }]}
        actions={
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
            <Plus size={18} /> 동호회 개설
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-card border rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">활성 동호회</p>
          <h4 className="text-2xl font-black">{data.filter(c => c.useAt === 'Y').length} 개</h4>
        </div>
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyMessage="개설된 동호회가 없습니다."
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}

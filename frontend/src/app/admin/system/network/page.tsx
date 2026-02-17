'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { networkService, Network } from '@/services/networkService';
import { useToast } from '@/app/components/ui/toast';
import { Network as NetworkIcon, Globe, Shield, Activity, Plus, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { NetworkForm } from '@/components/admin/system/NetworkForm';

export default function NetworkPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [searchParams, setSearchParams] = useState({ manageIem: '', userNm: '' });

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedNetwork, setSelectedNetwork] = useState<Network | undefined>(undefined);

  const loadNetworks = useCallback(async (params = searchParams) => {
    try {
      setLoading(true);
      const res = await networkService.getNetworks({ ...params, page: 0, size: 50 });
      if (res.success) {
        setNetworks(res.data.content || []);
      }
    } catch (error) {
      toast('네트워크 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, searchParams]);

  useEffect(() => {
    loadNetworks();
  }, [loadNetworks]);

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedNetwork(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (network: Network) => {
    setMode('edit');
    setSelectedNetwork(network);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Partial<Network>) => {
    try {
      if (mode === 'create') {
        await networkService.createNetwork(data as Omit<Network, 'ntwrkId'>);
        toast('신규 네트워크가 등록되었습니다.', 'success');
      } else {
        await networkService.updateNetwork(selectedNetwork!.ntwrkId, data);
        toast('네트워크 정보가 수정되었습니다.', 'success');
      }
      setIsModalOpen(false);
      loadNetworks();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await networkService.deleteNetwork(id);
      if (res.success) {
        toast('네트워크 정보가 삭제되었습니다.', 'success');
        loadNetworks();
      }
    } catch (error) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { header: '관리항목', accessor: 'manageIem', className: 'font-bold' },
    { header: 'IP 주소', accessor: 'ntwrkIp', className: 'font-mono text-primary' },
    { header: '서브넷', accessor: 'subnet', className: 'font-mono text-xs' },
    { header: '게이트웨이', accessor: 'gtwy', className: 'font-mono text-xs' },
    { header: '관리자', accessor: 'userNm' },
    { 
      header: '상태', 
      accessor: (item: Network) => (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-black",
          item.useAt === 'Y' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
        )}>
          {item.useAt === 'Y' ? '사용중' : '중지'}
        </span>
      )
    },
    {
      header: '작업',
      className: 'text-right',
      accessor: (item: Network) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(item)}><Edit size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(item.ntwrkId)}><Trash2 size={14} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="네트워크 인프라 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '네트워크관리' }]}
        action={
          <Button className="rounded-full gap-2" onClick={handleOpenCreate}>
            <Plus size={16} /> 신규 네트워크 등록
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard title="활성 네트워크" count={networks.filter(n => n.useAt === 'Y').length} icon={<Activity size={18} />} color="text-green-600" />
        <StatusCard title="IP 대역" count={networks.length} icon={<Globe size={18} />} color="text-blue-600" />
        <StatusCard title="보안 구역" count={new Set(networks.map(n => n.manageIem)).size} icon={<Shield size={18} />} color="text-purple-600" />
        <StatusCard title="전체 자산" count={networks.length} icon={<NetworkIcon size={18} />} color="text-slate-600" />
      </div>

      <StandardSearchFilter 
        fields={[
          { name: 'manageIem', label: '관리항목', type: 'text', placeholder: '항목명...' },
          { name: 'userNm', label: '관리자명', type: 'text', placeholder: '이름...' }
        ]}
        onSearch={(v: any) => {
          setSearchParams(v);
          loadNetworks(v);
        }}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable 
          columns={columns} 
          data={networks} 
          loading={loading}
          emptyMessage="등록된 네트워크 정보가 없습니다."
          className="border-none rounded-none"
        />
      </div>

      {/* 네트워크 등록/수정 모달 */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? '신규 네트워크 등록' : '네트워크 정보 수정'}
        maxWidth="lg"
      >
        <NetworkForm 
          initialData={selectedNetwork} 
          onSubmit={handleSubmit} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </StandardModal>
    </div>
  );
}

function StatusCard({ title, count, icon, color }: any) {
  return (
    <div className="p-5 bg-card border rounded-3xl flex items-center gap-4 shadow-sm">
      <div className={cn("p-3 rounded-2xl bg-muted/50", color)}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <h3 className="text-xl font-black mt-0.5">{count}</h3>
      </div>
    </div>
  );
}

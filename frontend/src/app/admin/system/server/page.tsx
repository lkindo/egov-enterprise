'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { serverService, ServerInfo } from '@/services/serverService';
import { useToast } from '@/app/components/ui/toast';
import { Server, Monitor, Database, Globe, Cpu, Plus, Trash2, Edit, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { ServerForm } from '@/components/admin/system/ServerForm';

export default function ServerAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [serverNm, setServerNm] = useState('');

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedServer, setSelectedServer] = useState<ServerInfo | undefined>(undefined);

  const loadServers = useCallback(async (name = serverNm) => {
    try {
      setLoading(true);
      const res = await serverService.getServers({ serverNm: name, page: 0, size: 50 });
      if (res.success) {
        setServers(res.data.content || []);
      }
    } catch (error) {
      toast('서버 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, serverNm]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedServer(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (server: ServerInfo) => {
    setMode('edit');
    setSelectedServer(server);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Partial<ServerInfo>) => {
    try {
      if (mode === 'create') {
        await serverService.createServer(data as Omit<ServerInfo, 'serverId'>);
        toast('신규 서버가 등록되었습니다.', 'success');
      } else {
        await serverService.updateServer(selectedServer!.serverId, data);
        toast('서버 정보가 수정되었습니다.', 'success');
      }
      setIsModalOpen(false);
      loadServers();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await serverService.deleteServer(id);
      if (res.success) {
        toast('서버 정보가 삭제되었습니다.', 'success');
        loadServers();
      }
    } catch (error) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { 
      header: '서버 유형', 
      accessor: (item: ServerInfo) => (
        <div className="flex items-center gap-2">
          {item.serverKnd === '1' ? <Cpu size={16} className="text-orange-500" /> :
           item.serverKnd === '2' ? <Database size={16} className="text-blue-500" /> :
           <Globe size={16} className="text-green-500" />}
          <span className="text-xs font-bold text-muted-foreground uppercase">
            {item.serverKnd === '1' ? 'WAS' : item.serverKnd === '2' ? 'DB' : 'WEB'}
          </span>
        </div>
      ),
      className: 'w-28'
    },
    { 
      header: '서버명', 
      accessor: (item: ServerInfo) => item.serverNm, 
      className: 'font-black' 
    },
    { 
      header: '등록일', 
      accessor: (item: ServerInfo) => item.regstYmd, 
      className: 'text-xs text-muted-foreground' 
    },
    { 
      header: '상태', 
      accessor: () => (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-700">ONLINE</span>
        </div>
      )
    },
    {
      header: '작업',
      className: 'text-right',
      accessor: (item: ServerInfo) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(item)}><Edit size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(item.serverId)}><Trash2 size={14} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="전사 인프라 관리"
        breadcrumbs={[{ label: '시스템관리' }, { label: '서버정보' }]}
        actions={
          <Button className="rounded-full gap-2" onClick={handleOpenCreate}>
            <Plus size={16} /> 신규 서버 등록
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ServerSummaryCard title="총 자산" count={servers.length} icon={<Server size={18} />} color="bg-slate-900" />
        <ServerSummaryCard title="WAS" count={servers.filter(s => s.serverKnd === '1').length} icon={<Cpu size={18} />} color="bg-orange-600" />
        <ServerSummaryCard title="DATABASE" count={servers.filter(s => s.serverKnd === '2').length} icon={<Database size={18} />} color="bg-blue-600" />
        <ServerSummaryCard title="WEB SERVER" count={servers.filter(s => s.serverKnd === '3').length} icon={<Globe size={18} />} color="bg-green-600" />
      </div>

      <StandardSearchFilter 
        fields={[
          { name: 'serverNm', label: '서버명', type: 'text', placeholder: '서버 이름을 입력하세요...' }
        ]}
        onSearch={(v: any) => {
          setServerNm(v.serverNm);
          loadServers(v.serverNm);
        }}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Monitor size={14} /> 시스템 서버 자산 현황
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={servers} 
          loading={loading}
          emptyMessage="등록된 서버 정보가 없습니다."
          className="border-none rounded-none"
        />
      </div>

      {/* 서버 등록/수정 모달 */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? '신규 서버 등록' : '서버 정보 수정'}
        maxWidth="md"
      >
        <ServerForm 
          initialData={selectedServer} 
          onSubmit={handleSubmit} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </StandardModal>
    </div>
  );
}

function ServerSummaryCard({ title, count, icon, color }: any) {
  return (
    <div className="p-5 bg-card border rounded-3xl flex items-center gap-4 shadow-sm hover:border-primary transition-colors">
      <div className={cn("p-3 rounded-2xl text-white", color)}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{title}</p>
        <h3 className="text-xl font-black mt-0.5">{count}</h3>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { myPageAdminService } from '@/services/foundation/workspace/MyPageAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Settings,  LayoutGrid,  Layers,  Zap,  Activity,  RefreshCcw,  Search,  MoreVertical } from 'lucide-react';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MyPageManagement() {
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const data = await myPageAdminService.getContents({ all: true });
        setContents(data || []);
      } catch (error) {
        toast('콘텐츠 정보를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const toggleStatus = async (item: any) => {
    const newStatus = item.cntntsUseYn === 'Y' ? 'N' : 'Y';
    try {
      await myPageAdminService.updateContent(item.cntntsId, { ...item, cntntsUseYn: newStatus });
      setContents(contents.map(c => c.cntntsId === item.cntntsId ? { ...c, cntntsUseYn: newStatus } : c));
      toast(`${item.cntntsNm} 상태가 변경되었습니다.`, 'success');
    } catch (error) {
      toast('상태 변경 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns: Column<any>[] = [
    {
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-slate-400">{(index! + 1).toString().padStart(2, '0')}</span>,
      className: 'w-20 text-center'
    },
    {
      header: '콘텐츠 명칭',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">{item.cntntsNm}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">ID: {item.cntntsId}</span>
        </div>
      )
    },
    {
      header: '연동 URL',
      accessor: (item) => <span className="text-xs font-bold text-slate-500 font-mono tracking-tighter truncate max-w-xs block">{item.cntcUrl}</span>
    },
    {
      header: '상태',
      accessor: (item) => (
        <button 
          onClick={(e) => { e.stopPropagation(); toggleStatus(item); }}
          className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${item.cntntsUseYn === 'Y'
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-slate-100 text-slate-400 border border-slate-200'
          }`}
        >
          {item.cntntsUseYn === 'Y' ? '활성' : '중단'}
        </button>
      ),
      className: 'w-32 text-center'
    },
    {
      header: '관리',
      accessor: () => (
        <div className="flex justify-end pr-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-slate-100">
            <MoreVertical size={16} className="text-slate-400" />
          </Button>
        </div>
      ),
      className: 'w-20 text-right'
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="마이페이지 환경 설정"
        breadcrumbs={[{ label: '워크스페이스' }, { label: '설정' }]}
      />

      <HubHeader 
        title="Workspace" 
        highlight="Customizer" 
        subtitle="사용자 개인별 대시보드 콘텐츠 및 레이아웃 위젯을 관리합니다." 
        icon={LayoutGrid} 
        actions={
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.reload()} className="h-11 w-14 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm">
              <RefreshCcw size={20} />
            </Button>
            <Button className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
               콘텐츠 동기화
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 콘텐츠" value={contents.length} icon={Layers} color="primary" />
        <HubMetricCard title="활성 위젯" value={contents.filter(c => c.cntntsUseYn === 'Y').length} icon={Zap} color="emerald" status="정상" />
        <HubMetricCard title="사용량" value="HIGH" icon={Activity} color="indigo" />
        <HubMetricCard title="보안 상태" value="SAFE" icon={RefreshCcw} color="amber" />
      </HubMetricGrid>

      <HubSectionCard 
        title="마이페이지 콘텐츠 매트릭스" 
        description="시스템에서 가용한 모든 마이페이지 구성 요소 및 위젯 명세입니다." 
        icon={Settings}
        className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
            <div className="relative group max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
              <Input 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-11 bg-slate-50/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
                placeholder="콘텐츠 명칭으로 검색.." 
              />
            </div>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={contents.filter(c => c.cntntsNm.includes(searchKeyword))}
              loading={loading}
              emptyMessage="등록된 콘텐츠가 없습니다."
              isPremium={true}
              className="border-none bg-transparent shadow-none"
            />
          </div>
        </div>
      </HubSectionCard>
    </div>
  );
}

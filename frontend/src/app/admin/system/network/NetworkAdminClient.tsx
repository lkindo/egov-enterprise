'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { Network as NetworkType } from '@/services/admin/system/NetworkAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { saveNetworkAction, deleteNetworkAction } from '@/app/actions/networkActions';
import {
  Network as NetworkIcon,
  Globe,
  Shield,
  Activity,
  Plus,
  Trash2,
  Edit,
  RefreshCcw,
  Wifi,
  Cpu,
  Server,
  Terminal,
  ArrowUpRight,
  User,
  Search,
  Zap,
  Globe2,
  Lock,
  Database,
  SearchCode,
  CheckCircle2,
  ChevronRight,
  Settings,
  Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/app/components/ui/standard-form';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function NetworkAdminClient({ initialNetworks }: { initialNetworks: NetworkType[] }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({ manageIem: '', userNm: '' });

  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NetworkType | null>(null);

  const handleRefresh = () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsOpen(true);
  };

  const handleEdit = (item: NetworkType) => {
    setEditingItem(item);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: '인프라 노드 삭제 확인',
      message: '해당 네트워크 인프라 자산을 시스템에서 영구적으로 삭제하시겠습니까? 연결된 서비스에 영향이 있을 수 있습니다.',
      variant: 'destructive',
      confirmText: '데이터 삭제 완료'
    });
    if (isConfirmed) {
      const res = await deleteNetworkAction(id);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await saveNetworkAction(null, formData);
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const filteredData = initialNetworks.filter(item =>
    item.manageIem.toLowerCase().includes(searchParams.manageIem.toLowerCase()) &&
    item.userNm.toLowerCase().includes(searchParams.userNm.toLowerCase())
  );

  const columns: Column<NetworkType>[] = [
    {
      header: '인프라 클러스터 명칭',
      accessor: (item: NetworkType) => (
        <div className="flex items-center gap-5 py-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <Server size={22} />
          </div>
          <div>
            <span className="font-black tracking-tighter text-foreground block text-md uppercase leading-none">{item.manageIem}</span>
            <span className="text-[9px] font-black text-muted-foreground tracking-[0.4em] mt-2 uppercase opacity-40 italic">NODE_ID: {item.ntwrkId}</span>
          </div>
        </div>
      )
    },
    {
      header: '가상 주소 및 세그먼트',
      accessor: (item: NetworkType) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Globe2 size={12} className="text-primary opacity-40" />
            <span className="text-[13px] font-black font-mono text-primary tabular-nums tracking-tighter">{item.ntwrkIp}</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md w-fit">
            <span className="text-[9px] font-black font-mono text-slate-400 tracking-tighter lowercase">mask: {item.subnet}</span>
          </div>
        </div>
      ),
      className: 'w-56'
    },
    {
      header: '게이트웨이 로직',
      accessor: (item: NetworkType) => (
        <div className="flex items-center gap-3 font-mono text-xs font-black text-muted-foreground/60 tracking-tighter italic">
            <NetworkIcon size={14} className="opacity-30" />
            {item.gtwy}
        </div>
      ),
      className: 'w-48'
    },
    {
      header: '노드 컨트롤러',
      accessor: (item: NetworkType) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-primary/5 group-hover:text-primary transition-colors">
            <User size={16} />
          </div>
          <span className="text-sm font-black text-foreground tracking-tight">{item.userNm}</span>
        </div>
      ),
      className: 'w-48'
    },
    {
      header: '활성 상태',
      accessor: (item: NetworkType) => (
        <HubStatusBadge status={item.useAt === 'Y' ? 'ACTIVE' : 'INACTIVE'} />
      ),
      className: 'w-32'
    },
    {
      header: 'MANAGEMENT',
      className: 'text-right w-32',
      accessor: (item: NetworkType) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-100 transition-all font-black" onClick={() => handleEdit(item)}>
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all" onClick={() => handleDelete(item.ntwrkId)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="인프라스트럭처 자산 거버넌스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '네트워크 관리' }]}
      />

      <HubHeader 
        title="네트워크" 
        highlight="인텔리전스" 
        subtitle="전사 인프라 노드 토폴로지 관리 및 가상 IP 클러스터의 논리적 세그먼트 제어" 
        icon={NetworkIcon} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
                variant="ghost"
                onClick={handleRefresh}
                className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95"
            >
                <RefreshCcw size={22} className={cn("group-hover:rotate-180 transition-transform duration-700", loading && "animate-spin")} />
            </Button>
            <Button
              onClick={handleCreate}
              size="lg"
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
            >
              <Plus size={20} /> 신규 인프라 노드 등록
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="ACTIVE_SLOTS" value={initialNetworks.filter(n => n.useAt === 'Y').length} icon={Activity} color="emerald" />
        <HubMetricCard title="IP_CLUSTERS" value={initialNetworks.length} icon={Globe} color="primary" />
        <HubMetricCard title="SECURITY_ZONES" value={new Set(initialNetworks.map(n => n.manageIem)).size} icon={Shield} color="indigo" />
        <HubMetricCard title="REALTIME_NODES" value={initialNetworks.length} icon={Zap} color="amber" status="ONLINE" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Search Panel */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <div className="rounded-[3.5rem] p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
                <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                    <Terminal size={240} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-12">
                    <div className="space-y-3">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                            <Cpu size={32} className="text-primary" />
                        </div>
                        <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase">Infrastructure<br />Core Intelligence</h4>
                    </div>
                    
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 tracking-[0.4em] px-2 uppercase">Core_Search_Proxy</label>
                            <div className="relative group/search">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-primary transition-colors" size={20} />
                                <input
                                    value={searchParams.manageIem}
                                    onChange={(e) => setSearchParams({ ...searchParams, manageIem: e.target.value })}
                                    className="w-full h-16 pl-16 pr-8 bg-white/5 border-2 border-white/5 rounded-2xl focus:border-primary/50 focus:bg-white/10 transition-all text-xs font-black tracking-widest text-white outline-none placeholder:text-white/10 uppercase"
                                    placeholder="인프라 클러스터 식별자"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 tracking-[0.4em] px-2 uppercase">Operator_Probe</label>
                            <div className="relative group/user">
                                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/user:text-primary transition-colors" size={20} />
                                <input
                                    value={searchParams.userNm}
                                    onChange={(e) => setSearchParams({ ...searchParams, userNm: e.target.value })}
                                    className="w-full h-16 pl-16 pr-8 bg-white/5 border-2 border-white/5 rounded-2xl focus:border-primary/50 focus:bg-white/10 transition-all text-xs font-black tracking-widest text-white outline-none placeholder:text-white/10 uppercase"
                                    placeholder="운영 컨트롤러 성명"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic uppercase opacity-60">
                            * 모든 인커밍 패킷은 암호화된 터널링을 통해 처리되며 실시간 보안 감사가 수행됩니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Data Stream Inventory */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
            <HubSectionCard title="인프라스트럭처 스트림 인벤토리" description="시스템 네트워크 토폴로지 내에 구성된 모든 논리적 연결 노드의 실시간 상태 명세입니다." icon={SearchCode}>
                <div className="overflow-hidden">
                    <StandardDataTable
                        columns={columns}
                        data={filteredData}
                        loading={loading}
                        emptyMessage="조회된 네트워크 인프라 자산이 존재하지 않습니다."
                        className="border-none bg-transparent"
                    />
                </div>
            </HubSectionCard>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={editingItem ? '인프라 노드 아키텍처 수정' : '신규 네트워크 슬롯 프로비저닝'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <button type="button" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black text-[10px] tracking-widest uppercase border-2 text-muted-foreground hover:bg-slate-50 transition-all">CANCEL</button>
            <button 
                form="network-form"
                type="submit" 
                className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-primary/30 tracking-widest text-[10px] flex items-center justify-center gap-3 hover:-translate-y-2 hover:bg-primary transition-all uppercase group"
            >
              <Zap size={18} className="group-hover:animate-pulse" /> {editingItem ? 'PATCH_SPECIFICATION' : 'ESTABLISH_CONNECTION'}
            </button>
          </div>
        }
      >
        <form id="network-form" onSubmit={handleSubmit} className="space-y-10 pt-4">
          <input type="hidden" name="ntwrkId" defaultValue={editingItem?.ntwrkId} />

          <div className="space-y-8">
            <FormField label="인프라 클러스터 식별 명칭" required description="시스템 내에서 해당 노드를 식별하기 위한 유니크 라벨">
              <div className="relative group/name">
                  <Server size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/name:opacity-100 transition-opacity" />
                  <Input 
                    name="manageIem" 
                    defaultValue={editingItem?.manageIem} 
                    className="h-16 pl-16 rounded-2xl border-2 text-md font-black tracking-tight shadow-inner" 
                    required 
                    placeholder="예: CORE_BACKBONE_CLUSTER" 
                  />
              </div>
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 shadow-inner">
                <FormField label="Virtual IPv4 (EndPoint)" required>
                    <div className="relative group/ip">
                        <Globe2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/ip:opacity-100 transition-opacity" />
                        <Input 
                            name="ntwrkIp" 
                            defaultValue={editingItem?.ntwrkIp} 
                            className="h-14 pl-12 rounded-xl border-2 text-sm font-mono font-black tracking-tighter shadow-sm" 
                            required 
                            placeholder="0.0.0.0" 
                        />
                    </div>
                </FormField>
                <FormField label="Gateway Logic Address" required>
                    <div className="relative group/gtwy">
                        <Wifi size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/gtwy:opacity-100 transition-opacity" />
                        <Input 
                            name="gtwy" 
                            defaultValue={editingItem?.gtwy} 
                            className="h-14 pl-12 rounded-xl border-2 text-sm font-mono font-black tracking-tighter shadow-sm" 
                            required 
                            placeholder="0.0.0.0" 
                        />
                    </div>
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField label="Subnet Mask" required>
                    <Input name="subnet" defaultValue={editingItem?.subnet} className="h-14 rounded-xl border-2 text-[11px] font-mono font-black shadow-sm" required placeholder="255.255.255.0" />
                </FormField>
                <FormField label="Domain Server" required>
                    <Input name="domnServer" defaultValue={editingItem?.domnServer} className="h-14 rounded-xl border-2 text-[11px] font-black shadow-sm" required placeholder="DNS_IP" />
                </FormField>
                <FormField label="Primary Controller" required>
                    <Input name="userNm" defaultValue={editingItem?.userNm} className="h-14 rounded-xl border-2 text-[11px] font-black shadow-sm" required placeholder="담당 운영자" />
                </FormField>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
                <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.3em] px-2 uppercase mb-4">Node Activation Protocol</p>
                <div className="flex gap-6">
                    <label className="flex-1 cursor-pointer group">
                        <input type="radio" name="useAt" value="Y" defaultChecked={editingItem?.useAt !== 'N'} className="hidden peer" />
                        <div className="h-20 rounded-[1.5rem] border-2 border-slate-100 flex items-center justify-center gap-4 peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all shadow-sm hover:shadow-lg peer-checked:shadow-xl peer-checked:shadow-slate-900/20">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
                            <span className="text-[11px] font-black tracking-widest uppercase">LIVE_INFRA_ESTABLISH</span>
                        </div>
                    </label>
                    <label className="flex-1 cursor-pointer group">
                        <input type="radio" name="useAt" value="N" defaultChecked={editingItem?.useAt === 'N'} className="hidden peer" />
                        <div className="h-20 rounded-[1.5rem] border-2 border-slate-100 flex items-center justify-center gap-4 peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all shadow-sm hover:shadow-lg peer-checked:shadow-xl">
                            <div className="w-3 h-3 rounded-full bg-slate-300" />
                            <span className="text-[11px] font-black tracking-widest uppercase">DEACTIVATE_BYPASS</span>
                        </div>
                    </label>
                </div>
            </div>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PageResponse } from '@/types/foundation/system';
import { deptAdminService, DeptDto } from '@/services/foundation/user/DeptAdminService';
import {
  Plus,
  RefreshCcw,
  Building2,
  Trash2,
  Network,
  Zap,
  LayoutGrid,
  SearchCode,
  ShieldCheck,
  Settings,
  Pencil,
  MapPin,
  Database,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { FormField } from '@/app/components/ui/standard-form';
import { toast } from 'sonner';

export default function DeptAdminClient({
  initialDepts
}: {
  initialDepts: PageResponse<DeptDto>
}) {
  const [loading, setLoading] = useState(false);
  const [depts, setDepts] = useState(initialDepts.list || []);
  const [totalCount, setTotalCount] = useState(initialDepts.total || 0);
  const [searchKeyword, setSearchKeyword] = useState('');

  const [isFormOpen, setIsAddOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DeptDto | null>(null);
  const [form, setForm] = useState<DeptDto>({
    orgnztNm: '',
    orgnztDc: ''
  });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await deptAdminService.getDeptList({ keyword: searchKeyword });
      setDepts(res.list);
      setTotalCount(res.total);
    } catch {
      toast.error('조직 체계 데이터를 로드하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedDept(null);
    setForm({ orgnztNm: '', orgnztDc: '' });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (dept: DeptDto) => {
    setSelectedDept(dept);
    setForm({ orgnztNm: dept.orgnztNm, orgnztDc: dept.orgnztDc });
    setIsAddOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.orgnztNm) {
      toast.error('부서 명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      if (selectedDept?.orgnztId) {
        await deptAdminService.updateDept(selectedDept.orgnztId, form);
        toast.success('부서 정보를 성공적으로 수정하였습니다.');
      } else {
        await deptAdminService.createDept(form);
        toast.success('신규 조직 노드가 성공적으로 배포되었습니다.');
      }
      setIsAddOpen(false);
      handleRefresh();
    } catch {
      toast.error('데이터 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deptId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      await deptAdminService.deleteDept(deptId);
      toast.success('조직 노드가 영구적으로 삭제되었습니다.');
      handleRefresh();
    } catch {
      toast.error('삭제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<DeptDto>[] = [
    {
      header: '조직 아이덴티티',
      accessor: (item: DeptDto) => (
        <div className="flex flex-col gap-1 py-4">
          <span className="font-black font-mono text-muted-foreground/40 text-[9px] tracking-[0.4em] uppercase italic leading-none mb-1">NODE_UID: {item.orgnztId}</span>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              <Building2 size={20} className="text-primary" />
            </div>
            <span className="font-black tracking-tighter text-foreground text-md uppercase leading-none">{item.orgnztNm}</span>
          </div>
        </div>
      ),
      className: 'w-72'
    },
    {
      header: '아키텍처 명세 (Metadata)',
      accessor: (item: DeptDto) => (
        <div className="max-w-[400px]">
          <span className="text-xs font-bold text-muted-foreground/60 leading-relaxed block italic py-2">
            {item.orgnztDc || '상세 명세가 정의되지 않은 조직 노드입니다.'}
          </span>
        </div>
      )
    },
    {
      header: '가용 상태',
      accessor: (item: DeptDto) => <HubStatusBadge status="활성" />,
      className: 'w-32 text-center'
    },
    {
      header: 'MANAGEMENT',
      className: 'text-right w-40',
      accessor: (item: DeptDto) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-200 transition-all font-black shadow-sm group">
            <Settings size={16} className="group-hover:rotate-45 transition-transform" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => item.orgnztId && handleDelete(item.orgnztId)} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all shadow-sm">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="조직 체계 매트릭스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '사용자관리' }, { label: '부서관리' }]}
      />

      <HubHeader
        title="Organization"
        highlight="Topology"
        subtitle="전사 비즈니스 조직 체계 및 계층형 부재 구조의 실시간 관리 시스템"
        icon={Network}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              variant="ghost"
              onClick={handleRefresh}
              className="h-14 w-14 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95"
            >
              <RefreshCcw size={22} className={cn("group-hover:rotate-180 transition-transform duration-700", loading && "animate-spin")} />
            </Button>
            <Button
              onClick={handleOpenAdd}
              size="lg"
              className="h-14 px-10 rounded-xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
            >
              <Plus size={20} /> 신규 조직 노드 구성
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="STRUCTURAL_ENTITIES" value={totalCount} icon={Building2} color="primary" />
        <HubMetricCard title="ACTIVE_RESOURCES" value={depts.length} icon={ShieldCheck} color="emerald" status="ONLINE" />
        <HubMetricCard title="IDENTITY_POOL" value={totalCount * 12} icon={LayoutGrid} color="indigo" />
        <HubMetricCard title="SYSTEM_INTEGRITY" value="100%" icon={Zap} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Statistics & Search Panel */}
        <div className="col-span-12 lg:col-span-4 h-full text-left">
          <div className="rounded-xl p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
            <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
              <Database size={240} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-12">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                  <Building2 size={32} className="text-primary" />
                </div>
                <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase text-left">조직 체계<br />인프라</h4>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 tracking-[0.4em] px-2 uppercase font-mono text-left block">Filter_Topology_Probe</label>
                  <div className="relative group/search text-left">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-primary transition-colors" size={20} />
                    <input
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      value={searchKeyword}
                      className="w-full h-16 pl-16 pr-8 bg-white/5 border-2 border-white/5 rounded-xl focus:border-primary/50 focus:bg-white/10 transition-all text-xs font-black tracking-widest text-white outline-none placeholder:text-white/10 uppercase"
                      placeholder="조직 또는 부서 식별값"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic uppercase opacity-60 max-w-[200px] text-left">
                  * 프로비저닝된 모든 조직 자산은 실시간 가용성 매트릭스에 동기화됩니다.
                </p>
                <Button
                  onClick={handleRefresh}
                  className="h-12 px-8 rounded-xl bg-white text-slate-900 border-none font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary hover:text-white transition-all hover:-translate-y-1"
                >
                  SEARCH
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Structural Assets Stream */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <HubSectionCard
            title="조직 자산 디렉토리 인벤토리"
            description="시스템 토폴로지 내에 구성된 전사 비즈니스 조직 단위의 실시간 상태 명세입니다."
            icon={SearchCode}
          >
            <div className="overflow-hidden">
              <StandardDataTable
                columns={columns}
                data={depts}
                loading={loading}
                emptyMessage="식별된 부서 정보가 존재하지 않습니다."
                className="border-none bg-transparent"
              />
            </div>
          </HubSectionCard>
        </div>
      </div>

      <StandardModal
        isOpen={isFormOpen}
        onClose={() => setIsAddOpen(false)}
        title={selectedDept ? '조직 노드 명세 수정' : '신규 부서 자산 프로비저닝'}
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 h-14 rounded-xl font-black text-[10px] tracking-widest border-2">취소</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-[2] h-14 rounded-xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary transition-all hover:-translate-y-2 group">
              <Zap size={18} className="group-hover:animate-pulse" /> {selectedDept ? '조직 수정' : '부서 배포'}
            </Button>
          </div>
        }
      >
        <div className="space-y-10 pt-4 text-left">
          <FormField label="조직 및 부서 명칭" required description="시스템 전반에 노출될 조직의 공식 명칭">
            <div className="relative group/name">
              <Building2 size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/name:opacity-100 transition-opacity" />
              <Input
                placeholder="조직 아이덴티티 입력"
                value={form.orgnztNm}
                onChange={(e) => setForm(prev => ({ ...prev, orgnztNm: e.target.value }))}
                className="h-16 pl-16 rounded-xl border-2 text-md font-black tracking-tight shadow-inner"
              />
            </div>
          </FormField>

          <FormField label="조직 아키텍처 명세" description="해당 조직의 주요 역할 및 메타데이터 정의">
            <div className="relative group/dc">
              <Pencil size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
              <Textarea
                placeholder="조직 상세 명세 입력"
                value={form.orgnztDc}
                onChange={(e) => setForm(prev => ({ ...prev, orgnztDc: e.target.value }))}
                className="min-h-[160px] pl-16 p-6 rounded-xl border-2 bg-slate-50/50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none shadow-inner"
              />
            </div>
          </FormField>

          <div className="p-8 rounded-xl bg-indigo-50/30 border-2 border-indigo-100/50 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shadow-sm">
              <MapPin className="text-indigo-500" size={18} />
            </div>
            <div className="space-y-1">
              <h6 className="text-[10px] font-black text-indigo-900 tracking-widest uppercase text-left">Structural_Integrity_Check</h6>
              <p className="text-[10px] font-bold text-indigo-700/60 leading-relaxed italic uppercase text-left">신규 조직 노드 생성 시 계층 구조 자동 검증 프로토콜을 수행합니다</p>
            </div>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}

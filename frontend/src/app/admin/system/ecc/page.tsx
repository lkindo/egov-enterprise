'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { eventCmpgnService, EventCmpgn } from '@/services/eventCmpgnService';
import { useToast } from '@/app/components/ui/toast';
import { Megaphone, Calendar, Users, Star, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { EventCmpgnForm } from '@/components/admin/system/EventCmpgnForm';

export default function EventCmpgnPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EventCmpgn[]>([]);
  const [searchParams, setSearchParams] = useState({ eventCn: '' });

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<EventCmpgn | undefined>(undefined);

  const loadData = useCallback(async (params = searchParams) => {
    try {
      setLoading(true);
      const res = await eventCmpgnService.getEventCmpgnList({ ...params, page: 0, size: 50 });
      if (res.success) {
        setData(res.data.content || []);
      }
    } catch (error) {
      toast('행사/캠페인 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedEvent(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: EventCmpgn) => {
    setMode('edit');
    setSelectedEvent(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: Partial<EventCmpgn>) => {
    try {
      if (mode === 'create') {
        await eventCmpgnService.createEventCmpgn(formData);
        toast('신규 행사/캠페인이 등록되었습니다.', 'success');
      } else {
        await eventCmpgnService.updateEventCmpgn(selectedEvent!.eventId, formData);
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
      await eventCmpgnService.deleteEventCmpgn(id);
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { 
      header: '구분', 
      accessor: (item: EventCmpgn) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black uppercase",
          item.eventTyCode === '1' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
        )}>
          {item.eventTyCode === '1' ? '행사' : '캠페인'}
        </span>
      )
    },
    { 
      header: '명칭', 
      accessor: (item: EventCmpgn) => item.eventNm, 
      className: 'font-bold text-primary' 
    },
    { 
      header: '행사 기간', 
      accessor: (item: EventCmpgn) => (
        <div className="flex flex-col text-[10px] text-muted-foreground">
          <span>{item.eventBeginDe} ~</span>
          <span>{item.eventEndDe}</span>
        </div>
      )
    },
    { 
      header: '접수 기간', 
      accessor: (item: EventCmpgn) => (
        <div className="flex flex-col text-[10px] text-muted-foreground italic">
          <span>{item.receptBeginDe} ~</span>
          <span>{item.receptEndDe}</span>
        </div>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: EventCmpgn) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(item)}><Edit size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(item.eventId)}><Trash2 size={14} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="사내 행사 및 캠페인 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '행사캠페인' }]}
        action={
          <Button onClick={handleOpenCreate} className="rounded-full gap-2">
            <Plus size={16} /> 신규 등록
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard title="진행 중 행사" count={data.filter(i => i.eventTyCode === '1').length} icon={<Star size={18} />} color="text-purple-600" />
        <StatusCard title="진행 중 캠페인" count={data.filter(i => i.eventTyCode === '2').length} icon={<Megaphone size={18} />} color="text-blue-600" />
        <StatusCard title="접수 중" count={data.length} icon={<Clock size={18} />} color="text-green-600" />
        <StatusCard title="전체 등록" count={data.length} icon={<Users size={18} />} color="text-slate-600" />
      </div>

      <StandardSearchFilter 
        fields={[
          { name: 'eventCn', label: '상세 내용 검색', type: 'text', placeholder: '키워드 입력...' }
        ]}
        onSearch={(v: any) => {
          setSearchParams(v);
          loadData(v);
        }}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> 행사 및 캠페인 일정 현황
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyMessage="등록된 행사 또는 캠페인이 없습니다."
          className="border-none rounded-none"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? '신규 행사/캠페인 등록' : '정보 수정'}
        maxWidth="lg"
      >
        <EventCmpgnForm 
          initialData={selectedEvent} 
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
        <h3 className="text-xl font-black mt-0.5">{count} 건</h3>
      </div>
    </div>
  );
}

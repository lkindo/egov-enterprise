'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSummaryCard } from '@/app/components/ui/standard-summary-card';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { troubleService, Trouble } from '@/services/troubleService';
import { useToast } from '@/app/components/ui/toast';
import { AlertCircle, CheckCircle2, Clock, Plus, Filter, Search, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function TroublePage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Trouble[]>([]);

  // 모달 상태
  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<Trouble>>({
    troblNm: '',
    troblKnd: '1',
    processSttus: 'R',
    troblDc: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await troubleService.getTroubles({ page: 0, size: 50 });
      if (res.success) setData(res.data.content || []);
    } catch (error) {
      toast('장애 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setMode('create');
    setFormData({ troblNm: '', troblKnd: '1', processSttus: 'R', troblDc: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (trouble: Trouble) => {
    setMode('edit');
    setFormData(trouble);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'create') {
        await troubleService.createTrouble(formData);
      } else {
        await troubleService.updateTrouble(formData.troblId!, formData);
      }
      toast(`장애 티켓이 ${mode === 'create' ? '접수' : '수정'}되었습니다.`, 'success');
      setIsOpen(false);
      loadData();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await troubleService.deleteTrouble(id);
      if (res.success) {
        toast('장애 티켓이 삭제되었습니다.', 'success');
        loadData();
      }
    } catch (error) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { 
      header: 'ID', 
      accessor: (item: Trouble) => item.troblId, 
      className: 'w-24 text-muted-foreground font-mono text-[10px]' 
    },
    {
      header: '장애명',
      accessor: (item: Trouble) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground text-sm">{item.troblNm}</span>
          <span className="text-[10px] text-muted-foreground uppercase">
            {item.troblKnd === '1' ? 'SERVER' : item.troblKnd === '2' ? 'DB' : 'NW'}
          </span>
        </div>
      )
    },
    { 
      header: '발생일시', 
      accessor: (item: Trouble) => item.troblOccrrncTime, 
      className: 'text-[11px] font-mono' 
    },
    {
      header: '상태',
      accessor: (item: Trouble) => (
        <StatusBadge status={item.processSttus === 'C' ? 'Y' : item.processSttus === 'P' ? 'R' : 'N'} />
      )
    },
    { 
      header: '요청자', 
      accessor: (item: Trouble) => item.troblRqesterNm, 
      className: 'text-xs' 
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Trouble) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(item)}><Edit size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(item.troblId)}><Trash2 size={14} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="시스템 장애 및 티켓 관리"
        breadcrumbs={[{ label: '시스템관리' }, { label: '장애관리' }]}
        actions={
          <Button onClick={handleOpenCreate} className="rounded-full gap-2 bg-red-600 hover:bg-red-700">
            <Plus size={16} /> 장애 접수
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StandardSummaryCard title="미처리 장애" value={data.filter(t => t.processSttus === 'R').length} unit="건" icon={<AlertCircle size={20} />} variant="red" isAlert />
        <StandardSummaryCard title="진행 중" value={data.filter(t => t.processSttus === 'P').length} unit="건" icon={<Clock size={20} />} variant="orange" />
        <StandardSummaryCard title="조치 완료" value={data.filter(t => t.processSttus === 'C').length} unit="건" icon={<CheckCircle2 size={20} />} variant="green" />
        <StandardSummaryCard title="전체 티켓" value={data.length} unit="건" icon={<Filter size={20} />} variant="blue" />
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={14} /> 장애 처리 티켓 현황
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyMessage="접수된 장애 티켓이 없습니다."
          className="border-none rounded-none"
        />
      </div>

      <StandardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsOpen(false)} 
        title={mode === 'create' ? '신규 장애 티켓 접수' : '장애 처리 정보 수정'}
      >
        <StandardForm onSubmit={handleSave}>
          <FormField label="장애 명칭" required>
            <input 
              type="text" 
              value={formData.troblNm}
              onChange={(e) => setFormData({...formData, troblNm: e.target.value})}
              placeholder="예: API 서버 응답 지연"
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="장애 유형" required>
              <select 
                value={formData.troblKnd}
                onChange={(e) => setFormData({...formData, troblKnd: e.target.value})}
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="1">서버 장애</option>
                <option value="2">데이터베이스 장애</option>
                <option value="3">네트워크 장애</option>
                <option value="4">보안 이슈</option>
              </select>
            </FormField>
            <FormField label="처리 상태" required>
              <select 
                value={formData.processSttus}
                onChange={(e) => setFormData({...formData, processSttus: e.target.value})}
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="R">접수</option>
                <option value="P">처리중</option>
                <option value="C">완료</option>
              </select>
            </FormField>
          </div>
          <FormField label="장애 내용 및 원인">
            <textarea 
              value={formData.troblDc || ''}
              onChange={(e) => setFormData({...formData, troblDc: e.target.value})}
              placeholder="상세 내용을 입력하세요."
              className="w-full min-h-[120px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
            <Button type="submit" className="bg-primary text-white font-bold px-8">저장하기</Button>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}

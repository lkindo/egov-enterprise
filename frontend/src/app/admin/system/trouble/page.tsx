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
    troblKind: '1',
    troblDe: format(new Date(), 'yyyy-MM-dd'),
    troblProcessSttus: '1',
    troblCn: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await troubleService.getTroubles({ page: 0, size: 20 });
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
    setFormData({ troblNm: '', troblKind: '1', troblDe: format(new Date(), 'yyyy-MM-dd'), troblProcessSttus: '1', troblCn: '' });
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
      await troubleService.reportTrouble(formData);
      toast(`장애 티켓이 ${mode === 'create' ? '접수' : '수정'}되었습니다.`, 'success');
      setIsOpen(false);
      loadData();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { header: 'ID', accessor: 'troblId', className: 'w-24 text-muted-foreground font-mono' },
    { 
      header: '장애명', 
      accessor: (item: Trouble) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{item.troblNm}</span>
          <span className="text-[10px] text-muted-foreground uppercase">{item.troblKind === '1' ? 'SERVER' : 'DATABASE'}</span>
        </div>
      )
    },
    { header: '발생일', accessor: 'troblDe', className: 'text-xs' },
    { 
      header: '처리상태', 
      accessor: (item: Trouble) => (
        <StatusBadge status={item.troblProcessSttus === '3' ? 'Y' : item.troblProcessSttus === '2' ? 'R' : 'N'} />
      )
    },
    { header: '요청자', accessor: 'troblRqesterId', className: 'text-xs' },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Trouble) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => handleOpenEdit(item)} className="p-1 hover:bg-accent rounded text-primary"><Edit size={14} /></button>
          <button onClick={() => toast('삭제되었습니다(Mock)', 'info')} className="p-1 hover:bg-destructive/10 rounded text-destructive"><Trash2 size={14} /></button>
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
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-md hover:bg-red-700 transition-all"
          >
            <Plus size={18} /> 장애 접수
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StandardSummaryCard title="미처리 장애" value={data.filter(t => t.troblProcessSttus !== '3').length} unit="건" icon={<AlertCircle size={20} />} variant="red" isAlert />
        <StandardSummaryCard title="진행 중" value={data.filter(t => t.troblProcessSttus === '2').length} unit="건" icon={<Clock size={20} />} variant="orange" />
        <StandardSummaryCard title="오늘 완료" value={data.filter(t => t.troblProcessSttus === '3').length} unit="건" icon={<CheckCircle2 size={20} />} variant="green" />
        <StandardSummaryCard title="평균 대응" value="1.2" unit="h" icon={<Filter size={20} />} variant="blue" />
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={14} /> 장애 티켓 목록
          </h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input type="text" placeholder="티켓 검색..." className="pl-9 pr-4 py-1.5 bg-background border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          className="border-none rounded-none"
        />
      </div>

      {/* 장애 접수/수정 모달 */}
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
                value={formData.troblKind}
                onChange={(e) => setFormData({...formData, troblKind: e.target.value})}
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
                value={formData.troblProcessSttus}
                onChange={(e) => setFormData({...formData, troblProcessSttus: e.target.value})}
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="1">접수</option>
                <option value="2">처리중</option>
                <option value="3">완료</option>
              </select>
            </FormField>
          </div>
          <FormField label="장애 내용 및 원인">
            <textarea 
              value={formData.troblCn || ''}
              onChange={(e) => setFormData({...formData, troblCn: e.target.value})}
              placeholder="상세 내용을 입력하세요."
              className="w-full min-h-[120px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-lg font-bold">취소</button>
            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">저장하기</button>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}

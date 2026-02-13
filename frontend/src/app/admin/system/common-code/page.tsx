'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { codeService, CommonCodeDetail } from '@/services/codeService';
import { useToast } from '@/app/components/ui/toast';
import { Layers, ChevronRight, Save, Plus, Tag, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { useConfirm } from '@/app/components/ui/confirm-modal';

export default function CommonCodePage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [details, setDetails] = useState<CommonCodeDetail[]>([]);

  // 모달 상태
  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<CommonCodeDetail>>({
    codeId: '',
    code: '',
    codeNm: '',
    codeDc: '',
    useAt: 'Y'
  });

  const loadGroups = useCallback(async () => {
    try {
      const res = await codeService.getGroups();
      if (res.success) setGroups(res.data || []);
    } catch (error) {
      toast('코드 그룹을 불러오지 못했습니다.', 'error');
    }
  }, [toast]);

  const loadDetails = useCallback(async (codeId: string) => {
    try {
      setLoading(true);
      const res = await codeService.getDetails({ codeId });
      if (res.success) setDetails(res.data || []);
    } catch (error) {
      toast('상세 코드를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (selectedGroup) loadDetails(selectedGroup);
  }, [selectedGroup, loadDetails]);

  const handleOpenCreate = () => {
    if (!selectedGroup) return;
    setMode('create');
    setFormData({ codeId: selectedGroup, code: '', codeNm: '', codeDc: '', useAt: 'Y' });
    setIsOpen(true);
  };

  const handleOpenEdit = (detail: CommonCodeDetail) => {
    setMode('edit');
    setFormData(detail);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await codeService.saveDetail(formData);
      toast(`상세 코드가 ${mode === 'create' ? '등록' : '수정'}되었습니다.`, 'success');
      setIsOpen(false);
      if (selectedGroup) loadDetails(selectedGroup);
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (code: string) => {
    if (!selectedGroup) return;
    const isConfirmed = await confirm({
      title: '상세 코드 삭제',
      message: `[${code}] 코드를 삭제하시겠습니까?`,
      variant: 'destructive'
    });

    if (isConfirmed) {
      try {
        await codeService.deleteDetail(selectedGroup, code);
        toast('삭제되었습니다.', 'success');
        loadDetails(selectedGroup);
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const columns = [
    { header: '코드', accessor: 'code', className: 'w-24 font-mono font-bold' },
    { header: '코드 명칭', accessor: 'codeNm', className: 'font-black text-primary' },
    { header: '설명', accessor: 'codeDc', className: 'text-xs text-muted-foreground' },
    { 
      header: '사용여부', 
      accessor: (item: any) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black",
          item.useAt === 'Y' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {item.useAt === 'Y' ? '사용중' : '중단'}
        </span>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: CommonCodeDetail) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => handleOpenEdit(item)} className="p-1 hover:bg-accent rounded text-primary"><Edit size={14} /></button>
          <button onClick={() => handleDelete(item.code)} className="p-1 hover:bg-destructive/10 rounded text-destructive"><Trash2 size={14} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="공통 코드 및 상세 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Code Groups */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">코드 그룹 (Master)</h3>
            <button className="text-primary hover:bg-primary/10 p-1 rounded"><Plus size={16} /></button>
          </div>
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <button
                key={g.codeId}
                onClick={() => setSelectedGroup(g.codeId)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border text-left transition-all",
                  selectedGroup === g.codeId 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                    : "bg-card hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Layers size={18} />
                  <span className="text-sm font-bold">{g.codeIdNm}</span>
                </div>
                <ChevronRight size={14} className={selectedGroup === g.codeId ? "opacity-100" : "opacity-30"} />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Code Details */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedGroup ? (
            <div className="h-full min-h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
              <Tag size={48} className="mb-4 opacity-10" />
              <p className="font-bold">관리할 코드 그룹을 선택해 주세요.</p>
              <p className="text-xs mt-1">좌측 리스트에서 그룹을 선택하면 상세 코드를 관리할 수 있습니다.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-black text-foreground flex items-center gap-2">
                  <Tag size={18} className="text-primary" />
                  {groups.find(g => g.codeId === selectedGroup)?.codeIdNm} 상세 코드
                </h3>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold hover:bg-accent transition-all">
                    순서 변경
                  </button>
                  <button 
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
                  >
                    <Plus size={14} /> 코드 추가
                  </button>
                </div>
              </div>
              <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
                <StandardDataTable 
                  columns={columns} 
                  data={details} 
                  loading={loading}
                  emptyMessage="등록된 상세 코드가 없습니다."
                  className="border-none rounded-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 상세 코드 등록/수정 모달 */}
      <StandardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsOpen(false)} 
        title={mode === 'create' ? '신규 상세 코드 등록' : '상세 코드 정보 수정'}
      >
        <StandardForm onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="코드" required>
              <input 
                type="text" 
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                disabled={mode === 'edit'}
                placeholder="01"
                className="w-full h-10 px-3 rounded-md border bg-background disabled:bg-muted/30 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <FormField label="코드 명칭" required>
              <input 
                type="text" 
                value={formData.codeNm}
                onChange={(e) => setFormData({...formData, codeNm: e.target.value})}
                placeholder="정상"
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
          </div>
          <FormField label="사용 여부" required>
            <select 
              value={formData.useAt}
              onChange={(e) => setFormData({...formData, useAt: e.target.value as 'Y' | 'N'})}
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="Y">사용</option>
              <option value="N">미사용</option>
            </select>
          </FormField>
          <FormField label="설명">
            <textarea 
              value={formData.codeDc || ''}
              onChange={(e) => setFormData({...formData, codeDc: e.target.value})}
              className="w-full min-h-[80px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
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

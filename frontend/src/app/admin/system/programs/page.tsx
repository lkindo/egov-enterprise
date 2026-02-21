'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { programService } from '@/services/programService';
import { Program } from '@/types/program';
import { useToast } from '@/app/components/ui/toast';
import { Plus, Settings, Code, Globe, Trash2, Edit } from 'lucide-react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { useConfirm } from '@/app/components/ui/confirm-modal';

export default function ProgramAdminPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [total, setTotal] = useState(0);

  // 모달 상태
  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Program>({
    progrmFileNm: '',
    progrmStrePath: '',
    progrmNm: '',
    url: '',
    progrmDc: ''
  });

  const loadPrograms = useCallback(async (searchWrd?: string) => {
    try {
      setLoading(true);
      const res = await programService.getPrograms({ page: 0, size: 20, searchWrd });
      if (res.success) {
        setPrograms(res.data.content || []);
        setTotal(res.data.totalElements);
      }
    } catch (error) {
      toast('프로그램 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const handleOpenCreate = () => {
    setMode('create');
    setFormData({ progrmFileNm: '', progrmStrePath: '', progrmNm: '', url: '', progrmDc: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (program: Program) => {
    setMode('edit');
    setFormData(program);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'create') {
        await programService.createProgram(formData);
        toast('프로그램이 등록되었습니다.', 'success');
      } else {
        await programService.updateProgram(formData.progrmFileNm, formData);
        toast('프로그램 정보가 수정되었습니다.', 'success');
      }
      setIsOpen(false);
      loadPrograms();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (name: string) => {
    const isConfirmed = await confirm({
      title: '프로그램 삭제',
      message: `[${name}] 프로그램을 삭제하시겠습니까? 관련 메뉴 연동이 해제될 수 있습니다.`,
      variant: 'destructive'
    });

    if (isConfirmed) {
      try {
        await programService.deleteProgram(name);
        toast('성공적으로 삭제되었습니다.', 'success');
        loadPrograms();
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const columns = [
    {
      header: '파일명',
      accessor: (item: Program) => item.progrmFileNm,
      className: 'font-mono font-bold text-primary'
    },
    { 
      header: '프로그램명', 
      accessor: (item: Program) => item.progrmNm, 
      className: 'font-bold' 
    },
    {
      header: 'URL 경로',
      accessor: (item: Program) => (
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          {item.url}
        </span>
      )
    },
    { 
      header: '저장경로', 
      accessor: (item: Program) => item.progrmStrePath, 
      className: 'text-xs italic text-muted-foreground' 
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Program) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 hover:bg-accent rounded-md text-primary transition-all"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => handleDelete(item.progrmFileNm)}
            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="시스템 프로그램 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '프로그램관리' }]}
        actions={
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} /> 새 프로그램 등록
          </button>
        }
      />

      <StandardSearchFilter 
        fields={[
          { name: 'searchWrd', label: '프로그램명/파일명 검색', type: 'text', placeholder: '검색어 입력...' }
        ]}
        onSearch={(v) => loadPrograms(v.searchWrd)}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable 
          columns={columns} 
          data={programs} 
          loading={loading}
          emptyMessage="등록된 프로그램이 없습니다."
          className="border-none rounded-none"
        />
      </div>
      
      <div className="flex justify-center pt-4">
        <p className="text-sm text-muted-foreground font-medium">
          총 <span className="text-foreground font-bold">{total}</span> 개의 프로그램이 정의되어 있습니다.
        </p>
      </div>

      {/* 등록/수정 모달 */}
      <StandardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsOpen(false)} 
        title={mode === 'create' ? '신규 프로그램 등록' : '프로그램 정보 수정'}
      >
        <StandardForm onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="파일명 (Unique)" required>
              <input 
                type="text" 
                value={formData.progrmFileNm}
                onChange={(e) => setFormData({...formData, progrmFileNm: e.target.value})}
                disabled={mode === 'edit'}
                placeholder="EgovLoginUsr"
                className="w-full h-10 px-3 rounded-md border bg-background disabled:bg-muted/30 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <FormField label="프로그램 한글명" required>
              <input 
                type="text" 
                value={formData.progrmNm}
                onChange={(e) => setFormData({...formData, progrmNm: e.target.value})}
                placeholder="로그인 화면"
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
          </div>
          <FormField label="URL 경로" required>
            <input 
              type="text" 
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              placeholder="/uat/uia/egovLoginUsr.do"
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="저장 경로">
            <input 
              type="text" 
              value={formData.progrmStrePath}
              onChange={(e) => setFormData({...formData, progrmStrePath: e.target.value})}
              placeholder="/uat/uia/"
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="상세 설명">
            <textarea 
              value={formData.progrmDc}
              onChange={(e) => setFormData({...formData, progrmDc: e.target.value})}
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

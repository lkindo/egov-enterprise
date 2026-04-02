'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { manualAdminService, ManualDto } from '@/services/foundation/user/ManualAdminService';
import { PageResponse } from '@/types/foundation/system';
import {
  BookOpen,
  Plus,
  Search,
  RefreshCcw,
  FileText,
  CheckCircle2,
  Trash2,
  Edit2,
  ExternalLink,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function ManualAdminClient({ 
  initialManuals 
}: { 
  initialManuals: PageResponse<ManualDto> 
}) {
  const [loading, setLoading] = useState(false);
  const [manuals, setManuals] = useState(initialManuals.list || []);
  const [totalCount, setTotalCount] = useState(initialManuals.total || 0);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const [isFormOpen, setIsAddOpen] = useState(false);
  const [selectedManual, setSelectedManual] = useState<ManualDto | null>(null);
  const [form, setForm] = useState<ManualDto>({
    onlineMnlNm: '',
    onlineMnlDc: '',
    onlineMnlCours: ''
  });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await manualAdminService.getManualList({ keyword: searchKeyword });
      setManuals(res.list);
      setTotalCount(res.total);
    } catch (error) {
      toast.error('매뉴얼 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedManual(null);
    setForm({ onlineMnlNm: '', onlineMnlDc: '', onlineMnlCours: '' });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (manual: ManualDto) => {
    setSelectedManual(manual);
    setForm({ 
      onlineMnlNm: manual.onlineMnlNm, 
      onlineMnlDc: manual.onlineMnlDc, 
      onlineMnlCours: manual.onlineMnlCours 
    });
    setIsAddOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.onlineMnlNm || !form.onlineMnlCours) {
      toast.error('매뉴얼 명과 경로를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      if (selectedManual?.onlineMnlId) {
        await manualAdminService.updateManual(selectedManual.onlineMnlId, form);
        toast.success('매뉴얼 정보를 수정했습니다.');
      } else {
        await manualAdminService.createManual(form);
        toast.success('새 매뉴얼을 등록했습니다.');
      }
      setIsAddOpen(false);
      handleRefresh();
    } catch (error) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mnlId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    setLoading(true);
    try {
      await manualAdminService.deleteManual(mnlId);
      toast.success('매뉴얼을 삭제했습니다.');
      handleRefresh();
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: '매뉴얼 정보',
      accessor: (item: ManualDto) => (
        <div className="flex items-center gap-3 py-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <BookOpen size={18} />
          </div>
          <div className="text-left">
            <span className="font-black tracking-tighter text-slate-900 block">{item.onlineMnlNm}</span>
            <span className="text-[9px] font-bold text-slate-400 tracking-tight">{item.onlineMnlId}</span>
          </div>
        </div>
      )
    },
    {
      header: '소스 경로',
      accessor: (item: ManualDto) => (
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] text-left">
          <Code size={12} />
          {item.onlineMnlCours}
        </div>
      )
    },
    {
      header: '설명',
      accessor: (item: ManualDto) => (
        <span className="text-[11px] font-bold text-slate-500 max-w-[200px] truncate block text-left">
          {item.onlineMnlDc || '설명이 없습니다.'}
        </span>
      )
    },
    {
      header: '액션',
      className: 'text-right',
      accessor: (item: ManualDto) => (
        <div className="flex items-center justify-end gap-2 pr-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleOpenEdit(item)}
            className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Edit2 size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => item.onlineMnlId && handleDelete(item.onlineMnlId)}
            className="h-10 w-10 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="온라인 가이드 아키텍처"
        breadcrumbs={[{ label: '부가서비스' }, { label: '온라인 매뉴얼' }]}
        actions={
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="h-14 w-14 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95 px-4"
            >
              <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            </Button>
            <Button
              onClick={handleOpenAdd}
              className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3"
            >
              <Plus size={18} /> 새 매뉴얼 등록
            </Button>
          </div>
        }
      />

      <div className="responsive-card p-6 md:p-12 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group rounded-[3rem] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen size={24} />
            </div>
            <div className="text-left">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter text-left">지식 자산</h3>
              <p className="text-[9px] font-black text-slate-400 tracking-[0.3em] uppercase text-left">온라인 매뉴얼 관리</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group/search flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 opacity-40 group-focus-within/search:opacity-100 transition-opacity" size={18} />
              <Input
                placeholder="매뉴얼 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRefresh()}
                className="h-14 pl-12 pr-6 w-full md:w-[300px] rounded-2xl border-2 border-slate-100 font-black text-[10px] tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-white"
              />
            </div>
            <Button
              onClick={handleRefresh}
              className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-tight shadow-xl hover:bg-primary transition-all active:scale-95"
            >
              검색
            </Button>
          </div>
        </div>

        <div className="px-2 overflow-x-auto relative z-10">
          <StandardDataTable
            columns={columns}
            data={manuals}
            loading={loading}
            emptyMessage="등록된 매뉴얼 정보가 없습니다."
            className="border-none bg-slate-50/50 rounded-[3rem] p-8"
          />
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] p-10 border-none shadow-2xl bg-white outline-none">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 mx-auto">
              {selectedManual ? <Edit2 size={28} /> : <Plus size={28} />}
            </div>
            <div className="text-center space-y-2">
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter text-center uppercase">
                {selectedManual ? '가이드 수정' : '가이드 등록'}
              </DialogTitle>
              <DialogDescription className="text-center font-bold text-slate-400 text-xs tracking-widest uppercase">
                사용자 교육을 위한 지식 자산을 {selectedManual ? '수정' : '정의'}합니다
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="space-y-8 py-8 text-left">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2">매뉴얼 명칭</label>
              <Input
                placeholder="매뉴얼 명을 입력하세요..."
                value={form.onlineMnlNm}
                onChange={(e) => setForm(prev => ({ ...prev, onlineMnlNm: e.target.value }))}
                className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 text-lg font-black focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2">리소스 경로</label>
              <Input
                placeholder="/src/docs/manuals/..."
                value={form.onlineMnlCours}
                onChange={(e) => setForm(prev => ({ ...prev, onlineMnlCours: e.target.value }))}
                className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 font-mono text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2">상세 설명</label>
              <Textarea
                placeholder="매뉴얼 설명을 입력하세요..."
                value={form.onlineMnlDc}
                onChange={(e) => setForm(prev => ({ ...prev, onlineMnlDc: e.target.value }))}
                className="min-h-[120px] p-8 rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="h-16 px-10 rounded-2xl border-2 border-slate-100 font-black text-[11px] tracking-[0.2em] uppercase hover:bg-slate-50 transition-all flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="h-16 bg-slate-900 border-none text-white rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 flex-[1.5]"
            >
              {loading ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {selectedManual ? '수정 완료' : '등록 완료'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

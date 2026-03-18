'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { deptAdminService, DeptDto } from '@/services/admin/user/DeptAdminService';
import {
  Users,
  Plus,
  Search,
  RefreshCcw,
  Building2,
  CheckCircle2,
  Trash2,
  Edit2,
  Network
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

export default function DeptAdminClient({ 
    initialDepts 
}: { 
    initialDepts: any 
}) {
  const [loading, setLoading] = useState(false);
  const [depts, setDepts] = useState(initialDepts.list || []);
  const [totalCount, setTotalCount] = useState(initialDepts.pagination.totalItems || 0);
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
      setTotalCount(res.pagination.totalItems);
    } catch (error) {
      toast.error('부서 목록을 불러오지 못했습니다.');
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
        toast.success('부서 정보를 수정했습니다.');
      } else {
        await deptAdminService.createDept(form);
        toast.success('새 부서를 등록했습니다.');
      }
      setIsAddOpen(false);
      handleRefresh();
    } catch (error) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deptId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    setLoading(true);
    try {
      await deptAdminService.deleteDept(deptId);
      toast.success('부서를 삭제했습니다.');
      handleRefresh();
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: '부서 ID',
      accessor: (item: DeptDto) => (
        <span className="font-mono font-black text-slate-400 italic text-[10px] tracking-widest">{item.orgnztId}</span>
      )
    },
    {
      header: '부서 명',
      accessor: (item: DeptDto) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <Building2 size={18} />
          </div>
          <span className="font-black italic uppercase tracking-tighter text-slate-900">{item.orgnztNm}</span>
        </div>
      )
    },
    {
      header: '설명',
      accessor: (item: DeptDto) => (
        <span className="text-sm font-medium text-slate-500 italic max-w-[300px] truncate block">
          {item.orgnztDc || 'No description provided.'}
        </span>
      )
    },
    {
      header: '액션',
      accessor: (item: DeptDto) => (
        <div className="flex items-center gap-2">
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
            onClick={() => item.orgnztId && handleDelete(item.orgnztId)}
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
        title="조직 체계 매트릭스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '부서관리' }]}
        actions={
          <div className="flex items-center gap-4">
            <Button
                onClick={handleRefresh}
                variant="outline"
                className="h-14 w-14 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95"
            >
                <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            </Button>
            <Button
                onClick={handleOpenAdd}
                className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 italic"
            >
                <Plus size={18} />
                New Node
            </Button>
          </div>
        }
      />

      {/* Luxury Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-10 rounded-[3rem] bg-white border-2 border-slate-100 shadow-xl shadow-slate-900/5 group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-transform">
                <Network size={24} />
            </div>
            <h4 className="text-4xl font-black tracking-tighter italic tabular-nums text-slate-900">{totalCount.toLocaleString()}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
                <span className="w-4 h-0.5 bg-slate-200" />
                Structural Entities
            </p>
            <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
                <Building2 size={200} />
            </div>
        </div>

        <div className="p-10 rounded-[3rem] bg-primary/5 border-2 border-primary/10 shadow-xl shadow-primary/5 group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-transform">
                <CheckCircle2 size={24} />
            </div>
            <h4 className="text-4xl font-black tracking-tighter italic tabular-nums text-primary">Synchronized</h4>
            <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
                <span className="w-4 h-0.5 bg-primary/20" />
                Data Integrity Status
            </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="responsive-card p-6 md:p-12 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 size={24} />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Structural Assets</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Managed Department Data</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="FILTER DEPARTMENTS..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="h-14 pl-12 pr-6 w-full md:w-[300px] rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest focus:ring-4 focus:ring-primary/10 transition-all bg-white"
                    />
                </div>
                <Button
                    onClick={handleRefresh}
                    className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-primary transition-all active:scale-95 italic"
                >
                    Search
                </Button>
            </div>
        </div>

        <div className="px-2 overflow-x-auto relative z-10">
            <StandardDataTable
                columns={columns}
                data={depts}
                loading={loading}
                emptyMessage="등록된 부서 정보가 없습니다."
                className="border-none bg-slate-50/50 rounded-[3rem] p-8"
            />
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] p-10 border-none shadow-2xl bg-white">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
              {selectedDept ? <Edit2 size={28} /> : <Plus size={28} />}
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic text-center">
                {selectedDept ? 'Modify Node' : 'New Node'}
            </DialogTitle>
            <DialogDescription className="text-center font-bold text-slate-400 text-sm">
                조직 체계의 구조적 정보를 {selectedDept ? '수정' : '정의'}합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8 py-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2">Department Designation</label>
              <Input
                placeholder="DEPARTMENT NAME..."
                value={form.orgnztNm}
                onChange={(e) => setForm(prev => ({ ...prev, orgnztNm: e.target.value }))}
                className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 text-lg font-black italic focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2">Description Payload</label>
              <Textarea
                placeholder="DEPARTMENT DESCRIPTION..."
                value={form.orgnztDc}
                onChange={(e) => setForm(prev => ({ ...prev, orgnztDc: e.target.value }))}
                className="min-h-[120px] p-8 rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 text-sm font-bold italic outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="h-16 px-10 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest italic hover:bg-slate-50 transition-all"
            >
                Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="h-16 px-14 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 italic flex-1"
            >
              {loading ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Authorize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

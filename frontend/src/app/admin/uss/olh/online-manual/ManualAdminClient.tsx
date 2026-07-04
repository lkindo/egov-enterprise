'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/components/composite/standard-data-table';
import { manualAdminService, ManualDto } from '@/services/foundation/user/ManualAdminService';
import { PageResponse } from '@/types/foundation/system';
import { BookOpen, 
  Plus, 
  Search, 
  RefreshCcw, 
  FileText, 
  Trash2, 
  Edit2, 
  ExternalLink } from 'lucide-react';
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
import { manualSchema } from '@/lib/validation/schemas';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
;
import { motion } from 'framer-motion';

export default function ManualAdminClient({ 
  initialManuals 
}: { 
  initialManuals: PageResponse<ManualDto> 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [manuals, setManuals] = useState(initialManuals.list || []);
  const [totalCount, setTotalCount] = useState(initialManuals.total || 0);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  
  const form = useAppForm(manualSchema, {
    defaultValues: {
      onlnMnlId: '',
      onlnMnlNm: '',
      onlnMnlExpln: '',
      onlnMnlDfn: '',
      onlnMnlSeCd: 'GNR'
    }
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
    setMode('create');
    form.reset({ onlnMnlId: '', onlnMnlNm: '', onlnMnlExpln: '', onlnMnlDfn: '', onlnMnlSeCd: 'GNR' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (manual: ManualDto) => {
    setMode('edit');
    form.reset({ 
      onlnMnlId: manual.onlnMnlId || '',
      onlnMnlNm: manual.onlnMnlNm || '', 
      onlnMnlExpln: manual.onlnMnlExpln || '', 
      onlnMnlDfn: manual.onlnMnlDfn || '',
      onlnMnlSeCd: manual.onlnMnlSeCd || 'GNR'
    });
    setIsFormOpen(true);
  };

  const onFormSubmit = async (data: z.infer<typeof manualSchema>) => {
    setLoading(true);
    try {
      if (mode === 'create') {
        await manualAdminService.createManual(data as any);
        toast.success('새 매뉴얼을 등록했습니다.');
      } else {
        await manualAdminService.updateManual(data.onlnMnlId!, data as any);
        toast.success('매뉴얼 정보를 수정했습니다.');
      }
      setIsFormOpen(false);
      handleRefresh();
      router.refresh();
    } catch (error) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        await manualAdminService.deleteManual(id);
        toast.success('매뉴얼을 삭제했습니다.');
        handleRefresh();
      } catch (error) {
        toast.error('삭제에 실패했습니다.');
      }
    }
  };

  const columns = [
    {
      header: '매뉴얼 명칭',
      accessor: (item: ManualDto) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner">
            <FileText size={18} />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-foreground tracking-tighter">
              {item.onlnMnlNm}
            </span>
            <span className="text-xs font-bold text-muted-foreground mt-1 tracking-widest uppercase opacity-40">
              ID: {item.onlnMnlId}
            </span>
          </div>
        </div>
      )
    },
    {
      header: '설명',
      accessor: (item: ManualDto) => (
        <div className="max-w-[300px] truncate font-medium text-muted-foreground text-left">
          {item.onlnMnlExpln || '-'}
        </div>
      )
    },
    {
      header: '경로',
      accessor: (item: ManualDto) => (
        <div className="flex items-center gap-2 font-mono text-xs text-primary/70 bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 w-fit">
          <ExternalLink size={12} />
          {item.onlnMnlDfn}
        </div>
      )
    },
    {
      header: '작업',
      accessor: (item: ManualDto) => (
        <div className="flex items-center gap-2 justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleOpenEdit(item)}
            className="h-10 w-10 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Edit2 size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => item.onlnMnlId && handleDelete(item.onlnMnlId)}
            className="h-10 w-10 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24"
    >
      <PageHeader
        title="온라인 가이드 아키텍처"
        breadcrumbs={[{ label: '부가서비스' }, { label: '온라인 매뉴얼' }]}
        actions={
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="h-11 w-14 rounded-lg border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95 px-4"
            >
              <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            </Button>
            <Button
              onClick={handleOpenAdd}
              className="h-11 px-8 bg-slate-900 text-white rounded-lg font-bold text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3"
            >
              <Plus size={18} /> 새 매뉴얼 등록
            </Button>
          </div>
        }
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="responsive-card p-6 md:p-12 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group rounded-lg shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg">
              <BookOpen size={24} />
            </div>
            <div className="text-left">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter text-left">지식 자산</h3>
              <p className="text-xs font-bold text-slate-400 tracking-[0.3em] uppercase text-left">온라인 매뉴얼 관리</p>
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
                className="h-11 pl-12 pr-6 w-full md:w-[300px] rounded-lg border-2 border-slate-100 font-bold text-xs tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-white"
              />
            </div>
            <Button
              onClick={handleRefresh}
              className="h-11 px-8 bg-slate-900 text-white rounded-lg font-bold text-xs tracking-tight shadow-xl hover:bg-primary transition-all active:scale-95"
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
            className="border-none bg-slate-50/50 rounded-lg p-8"
          />
        </div>
      </motion.div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-lg overflow-hidden p-0 bg-white">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)}>
              <DialogHeader className="p-8 pb-0 space-y-4">
                <div className="w-16 h-11 bg-primary text-white rounded-lg flex items-center justify-center shadow-2xl shadow-primary/30 mx-auto">
                  {mode === 'edit' ? <Edit2 size={28} /> : <Plus size={28} />}
                </div>
                <div className="text-center space-y-2">
                  <DialogTitle className="text-3xl font-bold text-slate-900 tracking-tighter text-center uppercase">
                    {mode === 'edit' ? '가이드 수정' : '가이드 등록'}
                  </DialogTitle>
                  <DialogDescription className="text-center font-bold text-slate-400 text-xs tracking-widest uppercase">
                    사용자 교육을 위한 지식 자산을 {mode === 'edit' ? '수정' : '정의'}합니다
                  </DialogDescription>
                </div>
              </DialogHeader>
              
              <div className="p-8 space-y-8 text-left">
                <FormField
                  control={form.control}
                  name="onlnMnlNm"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase ml-2">매뉴얼 명칭</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="매뉴얼 명을 입력하세요..."
                          className="h-11 px-8 rounded-lg border-2 border-slate-100 bg-slate-50/50 text-lg font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                        />
                      </FormControl>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="onlnMnlDfn"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase ml-2">리소스 경로</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="/src/docs/manuals/..."
                          className="h-11 px-8 rounded-lg border-2 border-slate-100 bg-slate-50/50 font-mono text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                        />
                      </FormControl>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="onlnMnlExpln"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase ml-2">상세 설명</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="매뉴얼 설명을 입력하세요..."
                          className="min-h-[120px] p-8 rounded-lg border-2 border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
                        />
                      </FormControl>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="p-8 pt-0 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="h-11 px-10 rounded-lg border-2 border-slate-100 font-bold text-xs tracking-[0.2em] uppercase hover:bg-slate-50 transition-all flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 px-16 bg-slate-900 border-none text-white rounded-lg font-bold text-xs tracking-[0.3em] uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex-1"
                >
                  {loading ? '처리 중...' : mode === 'edit' ? '수정 완료' : '등록 완료'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

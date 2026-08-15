'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { manualAdminService, ManualDto } from '@/services/foundation/user/ManualAdminService';
import { PageResponse } from '@/types/modernization';
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
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
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
import { motion } from 'framer-motion';

const PAGE_SIZE = 10;

export default function ManualAdminClient({
  initialManuals
}: {
  /** 서버 프리페치 결과. 실패 시 null 이며, 그때는 클라이언트 쿼리가 실패를 그대로 노출한다. */
  initialManuals: PageResponse<ManualDto> | null
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSaving, setIsSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  /** 타이핑마다 서버를 때리지 않도록 300ms 디바운스(감사 P1-8). */
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);

  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  /** 페이지는 URL 에 반영한다 — 새로고침·공유·뒤로가기 복원(감사 P1-7). 검색어는 넣지 않는다. */
  const goToPage = useCallback((next: number) => {
    setPage(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-manuals', debouncedKeyword, page],
    // 서버는 Spring Pageable(0-base)을 읽는다.
    queryFn: () => manualAdminService.getManualList({
      keyword: debouncedKeyword || undefined,
      page: page - 1,
      size: PAGE_SIZE,
    }),
    initialData: (page === 1 && !debouncedKeyword) ? (initialManuals ?? undefined) : undefined,
  });

  const manuals = data?.list ?? [];

  const form = useAppForm<typeof manualSchema>(manualSchema, {
    defaultValues: {
      onlnMnlSn: undefined,
      onlnMnlNm: '',
      onlnMnlExpln: '',
      onlnMnlDfn: '',
      onlnMnlSeCd: 'GNR'
    }
  });

  const handleOpenAdd = () => {
    setMode('create');
    form.reset({ onlnMnlSn: undefined, onlnMnlNm: '', onlnMnlExpln: '', onlnMnlDfn: '', onlnMnlSeCd: 'GNR' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (manual: ManualDto) => {
    setMode('edit');
    form.reset({
      onlnMnlSn: manual.onlnMnlSn,
      onlnMnlNm: manual.onlnMnlNm || '',
      onlnMnlExpln: manual.onlnMnlExpln || '',
      onlnMnlDfn: manual.onlnMnlDfn || '',
      onlnMnlSeCd: manual.onlnMnlSeCd || 'GNR'
    });
    setIsFormOpen(true);
  };

  const onFormSubmit = async (values: z.infer<typeof manualSchema>) => {
    setIsSaving(true);
    // 스키마는 설명·경로를 optional 로 두지만 ManualDto 계약은 필수다 —
    // 캐스팅으로 덮지 않고 빈 문자열로 정규화해 실제 계약을 맞춘다.
    const payload: ManualDto = {
      onlnMnlNm: values.onlnMnlNm,
      onlnMnlSeCd: values.onlnMnlSeCd,
      onlnMnlDfn: values.onlnMnlDfn ?? '',
      onlnMnlExpln: values.onlnMnlExpln ?? '',
    };
    try {
      if (mode === 'create') {
        await manualAdminService.createManual(payload);
        toast('새 매뉴얼을 등록했습니다.', 'success');
      } else {
        await manualAdminService.updateManual(values.onlnMnlSn!, { ...payload, onlnMnlSn: values.onlnMnlSn });
        toast('매뉴얼 정보를 수정했습니다.', 'success');
      }
      setIsFormOpen(false);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : '저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (manual: ManualDto) => {
    if (!manual.onlnMnlSn) return;
    // native confirm 은 대상이 무엇인지 알려주지 않는다 → useConfirm + 대상명 노출(감사 P1-9).
    const ok = await confirm({
      title: '매뉴얼 삭제',
      message: `'${manual.onlnMnlNm}' 매뉴얼을 삭제합니다. 되돌릴 수 없습니다. 계속하시겠습니까?`,
      variant: 'destructive',
      confirmText: '삭제',
    });
    if (!ok) return;

    try {
      await manualAdminService.deleteManual(manual.onlnMnlSn);
      toast(`'${manual.onlnMnlNm}' 매뉴얼을 삭제했습니다.`, 'success');
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : '삭제에 실패했습니다.', 'error');
    }
  };

  const columns: Column<ManualDto>[] = [
    {
      header: '매뉴얼 명칭',
      accessor: (item: ManualDto) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner">
            <FileText size={18} aria-hidden="true" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-foreground tracking-tighter">
              {item.onlnMnlNm}
            </span>
            <span className="text-xs font-bold text-muted-foreground mt-1 tracking-widest opacity-40">
              SN: {item.onlnMnlSn}
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
          <ExternalLink size={12} aria-hidden="true" />
          {item.onlnMnlDfn || '-'}
        </div>
      )
    },
    {
      header: '관리',
      accessor: (item: ManualDto) => (
        <div className="flex items-center gap-2 justify-end">
          {/* 아이콘 전용 버튼은 스크린리더에서 전부 '버튼'으로 읽혀 오조작을 부른다 → 대상명 포함 접근명(감사 P1-10). */}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${item.onlnMnlNm} 수정`}
            onClick={() => handleOpenEdit(item)}
            className="h-10 w-10 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Edit2 size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${item.onlnMnlNm} 삭제`}
            onClick={() => handleDelete(item)}
            className="h-10 w-10 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 transition-all"
          >
            <Trash2 size={16} aria-hidden="true" />
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
      // 루트 admin 레이아웃이 이미 좌우 여백을 준다 — 화면별 px 를 겹쳐 넣지 않는다(감사 P2).
      className="max-w-6xl mx-auto space-y-12 pb-24"
    >
      <PageHeader
        title="온라인 매뉴얼 관리"
        breadcrumbs={[{ label: '부가서비스' }, { label: '온라인 매뉴얼' }]}
        actions={
          <div className="flex items-center gap-4">
            <Button
              onClick={() => refetch()}
              variant="outline"
              aria-label="매뉴얼 목록 새로고침"
              className="h-11 w-14 rounded-lg border-2 border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95 px-4"
            >
              <RefreshCcw size={18} className={cn(isFetching && "animate-spin")} aria-hidden="true" />
            </Button>
            <Button
              onClick={handleOpenAdd}
              className="h-11 px-8 bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3"
            >
              <Plus size={18} aria-hidden="true" /> 새 매뉴얼 등록
            </Button>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="responsive-card p-6 md:p-12 border-2 border-border bg-card/50 backdrop-blur-xl relative overflow-hidden group rounded-lg shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-surface-inverse text-surface-inverse-foreground rounded-lg flex items-center justify-center shadow-lg">
              <BookOpen size={24} aria-hidden="true" />
            </div>
            <div className="text-left">
              <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tighter text-left">지식 자산</h3>
              <p className="text-xs font-bold text-muted-foreground tracking-[0.3em] text-left">온라인 매뉴얼 관리</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group/search flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40 group-focus-within/search:opacity-100 transition-opacity" size={18} aria-hidden="true" />
              <Input
                placeholder="매뉴얼 검색..."
                aria-label="매뉴얼 검색"
                value={searchKeyword}
                // 검색 시 1페이지로 되돌린다 — 3페이지에서 검색하면 빈 화면이 되던 결함(감사 P1-8).
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  if (page !== 1) goToPage(1);
                }}
                className="h-11 pl-12 pr-6 w-full md:w-[300px] rounded-lg border-2 border-border font-bold text-xs tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-card"
              />
            </div>
          </div>
        </div>

        <div className="px-2 overflow-x-auto relative z-10">
          <StandardDataTable<ManualDto>
            columns={columns}
            data={manuals}
            loading={isLoading}
            error={isError ? (error as Error) : null}
            onRetry={() => refetch()}
            keyField="onlnMnlSn"
            emptyMessage={debouncedKeyword ? `'${debouncedKeyword}' 에 해당하는 매뉴얼이 없습니다.` : '등록된 매뉴얼이 없습니다.'}
            className="border-none bg-muted/50 rounded-lg p-8"
            pagination={{
              currentPage: page,
              totalPages: data?.totalPage || 1,
              totalCount: data?.total,
              pageSize: PAGE_SIZE,
              onPageChange: goToPage,
            }}
          />
        </div>
      </motion.div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-lg overflow-hidden p-0 bg-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)}>
              <DialogHeader className="p-8 pb-0 space-y-4">
                <div className="w-16 h-11 bg-primary text-white rounded-lg flex items-center justify-center shadow-2xl shadow-primary/30 mx-auto">
                  {mode === 'edit' ? <Edit2 size={28} aria-hidden="true" /> : <Plus size={28} aria-hidden="true" />}
                </div>
                <div className="text-center space-y-2">
                  <DialogTitle className="text-3xl font-bold text-foreground tracking-tighter text-center">
                    {mode === 'edit' ? '매뉴얼 수정' : '매뉴얼 등록'}
                  </DialogTitle>
                  <DialogDescription className="text-center font-bold text-muted-foreground text-xs tracking-widest">
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
                      <FormLabel className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-2">매뉴얼 명칭</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="매뉴얼 명을 입력하세요..."
                          className="h-11 px-8 rounded-lg border-2 border-border bg-muted/50 text-lg font-bold focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
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
                      <FormLabel className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-2">리소스 경로</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="/src/docs/manuals/..."
                          className="h-11 px-8 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
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
                      <FormLabel className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-2">상세 설명</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="매뉴얼 설명을 입력하세요..."
                          className="min-h-[120px] p-8 rounded-lg border-2 border-border bg-muted/50 text-sm font-bold outline-none focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
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
                  className="h-11 px-10 rounded-lg border-2 border-border font-bold text-xs tracking-[0.2em] hover:bg-muted transition-all flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 px-16 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-[0.3em] shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex-1"
                >
                  {isSaving ? '처리 중...' : mode === 'edit' ? '수정 완료' : '등록 완료'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

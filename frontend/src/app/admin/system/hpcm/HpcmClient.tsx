'use client';

import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { hpcmAdminService, Hpcm } from '@/services/foundation/system/HpcmAdminService';
import { Plus, BookOpen, ShieldCheck, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormErrorSummary,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

import { HpcmDtoSchema } from '@/types/generated-zod';

/** 물리 컬럼 상한(tb_hlp_info.hlp_expln varchar(4000), V2_19). 생성 계약의 65535 가 아니다. */
const HLP_EXPLN_MAX = 4000;

export const hpcmSchema = HpcmDtoSchema.extend({
  hlpSeCd: HpcmDtoSchema.shape.hlpSeCd
    .trim()
    .min(1, '분류 구분을 입력해 주세요.')
    .max(3, '분류 구분은 최대 3자까지 입력할 수 있습니다.'),
  hlpDfn: HpcmDtoSchema.shape.hlpDfn
    .trim()
    .min(1, '도움말 명칭을 입력해 주세요.')
    .max(1000, '도움말 명칭은 최대 1,000자까지 입력할 수 있습니다.'),
  /*
    ⚠ 생성 계약은 65,535 자를 허용하지만 **물리 컬럼은 varchar(4000)** 이다
    (V2_19 가 text→varchar(4000) 로 좁혔고, Hpcm 엔티티도 length=4000 이다).
    즉 4,001~65,535 자는 화면 검증과 서버 DTO 검증(@Size(max=65535))을 모두 통과한 뒤
    **DB 에서 죽는다** — 사용자는 일반 오류만 보고 쓴 글을 잃는다.

    이 화면이 그 값을 만들지 못하게 물리 한계로 조인다. 근본 수정은 HpcmDto 의
    @Size 를 4000 으로 낮추는 것인데, 그러면 api-docs.json 재생성(서버 기동 필요)과
    codegen 이 같은 변경에 딸려 오므로 별건으로 분리했다.
  */
  hlpExpln: HpcmDtoSchema.shape.hlpExpln
    .trim()
    .min(1, '도움말 상세 설명을 입력해 주세요.')
    .max(HLP_EXPLN_MAX, `도움말 상세 설명은 최대 ${HLP_EXPLN_MAX.toLocaleString()}자까지 입력할 수 있습니다.`),
});

const HPCM_FORM_LABELS = {
  hlpSeCd: '분류 구분',
  hlpDfn: '도움말 명칭',
  hlpExpln: '도움말 상세 설명',
};

type HpcmFormValues = z.infer<typeof hpcmSchema>;

const DEFAULT_PAGE_SIZE = 10;

/**
 * 목록 정렬 키.
 *
 * 서버의 `findByHlpDfnContaining(keyword, pageable)` 은 파생 질의라 **Sort 를 주지 않으면 순서가
 * 정해지지 않는다** — 그 상태로 페이징을 붙이면 2페이지에서 1페이지 행이 되풀이되거나 빠질 수
 * 있다. 페이저를 다는 것과 정렬을 고정하는 것은 같은 변경이어야 한다.
 *
 * `hlpSn` 은 IDENTITY PK 라 유일하고 단조 증가하므로, 내림차순이 곧 최신순이면서 동률이 없다.
 * (`crtDt` 는 동률 가능성이 남는다.) 서버 기본값(`@PageableDefault`)을 바꾸면 api-docs 의 sort
 * default 까지 바뀌어 재생성·codegen 이 딸려 오는데, 이 엔드포인트의 소비자는 이 화면뿐이라
 * 화면이 명시해 보내는 쪽을 택했다.
 */
const LIST_SORT = 'hlpSn,DESC';

export default function HpcmClient({
  initialData,
  fetchError = null,
}: {
  initialData: { list: Hpcm[]; total?: number; totalPage?: number };
  /** 서버 컴포넌트의 첫 조회가 실패한 사유(성공 시 null). 빈 목록 위장을 막는다. */
  fetchError?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingSn, setEditingSn] = useState<number | null>(null);
  const [savePending, setSavePending] = useState(false);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const [deletingSn, setDeletingSn] = useState<number | null>(null);

  const [keyword, setKeyword] = useState('');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });

  /** 페이지는 URL 에 반영한다 — 새로고침·뒤로가기로 보던 페이지가 복원된다. */
  const goToPage = useCallback((next: number) => {
    setPage(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-hpcm', keyword, page, pageSize],
    // 서버는 Spring Pageable(0-base)을 읽는다.
    queryFn: () => hpcmAdminService.getHpcmList({
      keyword: keyword || undefined,
      page: page - 1,
      size: pageSize,
      sort: LIST_SORT,
    }),
    // 첫 페이지·무검색일 때만 서버 렌더 결과를 재사용한다. 조회가 실패했으면 재사용하지
    // 않는다 — 실패를 빈 목록으로 굳히면 화면이 '없음'이라고 거짓말한다.
    //
    // totalPage 를 빠뜨리면 안 된다 — 없으면 아래 페이저가 `|| 1` 로 떨어져 42건이 있어도
    // "1페이지" 로 보이고, 2페이지로 가는 길이 서버 렌더 직후에만 사라진다.
    initialData: (page === 1 && !keyword && !fetchError)
      ? ({
          list: initialData.list,
          total: initialData.total ?? initialData.list.length,
          totalPage: initialData.totalPage
            ?? Math.max(1, Math.ceil((initialData.total ?? initialData.list.length) / pageSize)),
        } as never)
      : undefined,
  });

  const hpcmList = data?.list ?? [];
  const listError = fetchError ? new Error(fetchError) : (isError ? (error as Error) : null);
  const isWritePending = savePending || deletingSn !== null;

  const form = useAppForm(hpcmSchema, {
    defaultValues: {
      hlpSeCd: '',
      hlpDfn: '',
      hlpExpln: '',
    }
  });

  const openCreate = () => {
    if (isWritePending) return;
    setMode('create');
    setEditingSn(null);
    form.reset({ hlpSeCd: '', hlpDfn: '', hlpExpln: '' });
    setIsModalOpen(true);
  };

  const openEdit = (item: Hpcm) => {
    if (isWritePending || item.hlpSn === undefined) return;
    setMode('edit');
    setEditingSn(item.hlpSn);
    form.reset({
      hlpSeCd: item.hlpSeCd ?? '',
      hlpDfn: item.hlpDfn ?? '',
      hlpExpln: item.hlpExpln ?? '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: HpcmFormValues) => {
    if (savingRef.current || deletingRef.current) return;
    savingRef.current = true;
    setSavePending(true);
    try {
      if (mode === 'edit' && editingSn !== null) {
        await hpcmAdminService.updateHpcm(editingSn, { ...values, hlpSn: editingSn });
        toast('도움말 콘텐츠를 수정했습니다.', 'success');
      } else {
        await hpcmAdminService.createHpcm(values);
        toast('도움말 콘텐츠가 등록되었습니다.', 'success');
      }
      setIsModalOpen(false);
      form.reset();
      await refetch();
    } catch (error: unknown) {
      if (!form.applyServerErrors(error)) {
        toast(
          mode === 'edit'
            ? '도움말 수정 중 오류가 발생했습니다. 입력값은 유지됩니다.'
            : '도움말 등록 중 오류가 발생했습니다. 입력값은 유지됩니다.',
          'error',
        );
      }
    } finally {
      savingRef.current = false;
      setSavePending(false);
    }
  };

  const handleDelete = async (item: Hpcm) => {
    if (item.hlpSn === undefined || savingRef.current || deletingRef.current) return;
    deletingRef.current = true;
    setDeletingSn(item.hlpSn);
    try {
      // 무엇을 지우는지 이름으로 밝힌다 — 되돌릴 수 없는 동작이다.
      const ok = await confirm({
        title: '도움말 삭제',
        message: `'${item.hlpDfn}' 도움말을 삭제합니다. 되돌릴 수 없습니다. 계속하시겠습니까?`,
        variant: 'destructive',
        confirmText: '삭제',
      });
      if (!ok) return;

      await hpcmAdminService.deleteHpcm(item.hlpSn);
      toast(`'${item.hlpDfn}' 도움말을 삭제했습니다.`, 'success');
      await refetch();
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : '도움말을 삭제하지 못했습니다.', 'error');
    } finally {
      deletingRef.current = false;
      setDeletingSn(null);
    }
  };

  const closeModal = () => {
    if (!savingRef.current) setIsModalOpen(false);
  };

  const columns: Column<Hpcm>[] = [
    {
      header: '콘텐츠 명세',
      accessor: (item) => (
        <div className="flex items-center gap-5 py-4">
          <div className="w-12 h-12 rounded-lg bg-surface-inverse flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
            <BookOpen size={18} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1 text-left">
            <span className="px-3 py-1 bg-muted text-foreground rounded-lg text-xs font-bold tracking-tight border border-border w-fit">
              {item.hlpSeCd || 'SYSTEM'}
            </span>
            <span className="font-bold tracking-tighter text-foreground text-md uppercase leading-tight mt-1">{item.hlpDfn}</span>
          </div>
        </div>
      )
    },
    {
      header: 'ID / 레퍼런스',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.3em] font-mono ">
          SN: {item.hlpSn}
        </span>
      ),
      className: 'w-48'
    },
    {
      header: '요약 설명',
      accessor: (item) => (
        <p className="text-sm text-muted-foreground font-medium line-clamp-1 max-w-md">
          {/* 이제 이 값은 화면에서 고칠 수 있다 — '아카이브' 같은 다른 도메인 어휘를 쓰지 않는다. */}
          {item.hlpExpln || '설명 없음'}
        </p>
      )
    },
    {
      header: '관리',
      className: 'text-right w-40',
      accessor: (item) => (
        <div className="flex items-center gap-2 justify-end">
          {/* 아이콘 전용 버튼은 스크린리더에서 전부 '버튼'으로 읽힌다 → 대상명을 접근명에 넣는다. */}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${item.hlpDfn} 수정`}
            disabled={isWritePending}
            onClick={() => openEdit(item)}
            className="h-10 w-10 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Edit2 size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${item.hlpDfn} ${deletingSn === item.hlpSn ? '삭제 중…' : '삭제'}`}
            aria-busy={deletingSn === item.hlpSn || undefined}
            disabled={isWritePending}
            onClick={() => { void handleDelete(item); }}
            className="h-10 w-10 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
          >
            {deletingSn === item.hlpSn
              ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              : <Trash2 size={16} aria-hidden="true" />}
          </Button>
        </div>
      )
    }
  ];

  return (
    <WorkListPage
      title="도움말 콘텐츠 관리(HPCM)"
      description="시스템 가이드와 도움말 콘텐츠를 등록·관리합니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: 'HPCM' }]}
      filterStateKey="system-hpcm"
      // 종전에는 현재 페이지의 행 수(항상 10)를 총건수로 내놨다. 서버가 주는 전체 건수를 쓴다.
      totalCount={listError ? undefined : data?.total}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            aria-label="도움말 목록 새로고침"
            onClick={() => { void refetch(); }}
            className="gap-2"
          >
            <Loader2 size={16} className={isFetching ? 'animate-spin' : undefined} aria-hidden="true" />
            새로고침
          </Button>
          <Button size="sm" disabled={isWritePending} onClick={openCreate} className="gap-2">
            <Plus size={16} aria-hidden="true" /> 콘텐츠 등록
          </Button>
        </>
      }
      filter={
        // 서버는 hlpDfn(도움말 명칭)만 검색한다 — 라벨이 그 범위를 그대로 말한다(카탈로그 G15).
        <KeywordFilter
          label="도움말 명칭"
          placeholder="도움말 명칭으로 검색"
          value={keyword}
          onSearch={(next) => { setKeyword(next); goToPage(1); }}
          onReset={() => { setKeyword(''); goToPage(1); }}
        />
      }
    >
      <StandardDataTable<Hpcm>
        accessibleLabel="도움말 콘텐츠 목록"
        columns={columns}
        data={hpcmList}
        loading={isLoading}
        error={listError}
        onRetry={() => { void refetch(); }}
        keyField="hlpSn"
        emptyMessage={emptyResultMessage(keyword, '등록된 도움말 콘텐츠가 없습니다.')}
        pagination={{
          currentPage: page,
          totalPages: data?.totalPage || 1,
          pageSize,
          onPageSizeChange: (size) => { setPageSize(size); goToPage(1); },
          onPageChange: goToPage,
        }}
      />

      <StandardModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={mode === 'edit' ? '도움말 콘텐츠 수정' : '도움말 콘텐츠 등록'}
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" type="button" disabled={savePending} onClick={closeModal} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2">취소</Button>
            <Button
              type="submit"
              form="hpcm-create-form"
              disabled={savePending}
              aria-busy={savePending || undefined}
              className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
            >
              <ShieldCheck size={18} strokeWidth={3} aria-hidden="true" className="text-primary group-hover:rotate-12 transition-transform" />
              {savePending
                ? (mode === 'edit' ? '수정 중…' : '등록 중…')
                : (mode === 'edit' ? '수정 저장' : '최종 등록')}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form id="hpcm-create-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4 text-left" noValidate>
            <FormErrorSummary labels={HPCM_FORM_LABELS} onNavigate={form.focusError} />
            <ShadcnFormField
              control={form.control}
              name="hlpSeCd"
              required
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-bold text-foreground">분류 구분</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={3} placeholder="예: BBS" />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-destructive" />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="hlpDfn"
              required
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-bold text-foreground">도움말 명칭</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={1000} placeholder="도움말 명칭" />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-destructive" />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="hlpExpln"
              required
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-bold text-foreground">도움말 상세 설명</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      maxLength={4000}
                      placeholder="도움말 상세 설명"
                      className="w-full min-h-[160px] rounded-lg border border-border bg-muted/40 p-4 outline-none focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all resize-y"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-destructive" />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </StandardModal>
    </WorkListPage>
  );
}

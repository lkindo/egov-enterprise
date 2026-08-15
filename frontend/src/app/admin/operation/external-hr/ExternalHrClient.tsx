'use client';
import React, { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { operationAdminService, type ExternalHr } from '@/services/foundation/operation/OperationAdminService';
import type { PageResponse } from '@/types/foundation/system';
import { useToast } from '@/app/components/ui/toast';
import { Plus, Search, Users, ShieldCheck, RefreshCcw, Layers } from 'lucide-react';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import dynamic from 'next/dynamic';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), {
  ssr: false,
  // 모달은 열릴 때만 마운트되므로 레이아웃 점유가 없다. 로딩 placeholder 를 두지 않는다.
  loading: () => null,
});

import { ExternalHrDtoSchema } from '@/types/generated-zod';

const externalHrSchema = ExternalHrDtoSchema.extend({
  evntSn: z.number().int().positive('행사 일련번호를 입력하세요.'),
  otsdHrId: z.string().min(1, '외부인사 ID를 입력하세요.').max(20),
  otsdHrNm: z.string().min(1),
  ogdpInstNm: z.string().min(1),
  areaNo: z.string().min(1).max(4),
  mdTelno: z.string().min(1).max(4),
  endTelno: z.string().min(1).max(4),
  emlAddr: z.string().email(),
  brdtYmd: z.string().length(8, '생년월일 8자리를 입력하세요(예: 19900101).'),
});

type ExternalHrFormValues = z.infer<typeof externalHrSchema>;

const PAGE_SIZE = 10;

export default function ExternalHrClient({ initialPage }: { initialPage: PageResponse<ExternalHr> | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 페이지 번호는 URL 파생값이다(공유·새로고침·뒤로가기 복원).
  // 검색어는 개인정보 노출 우려로 URL 에 싣지 않는다(감사 D-13).
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = useCallback((next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const form = useAppForm(externalHrSchema, {
    defaultValues: {
      evntSn: 0,
      otsdHrId: '',
      otsdHrNm: '',
      ogdpInstNm: '',
      areaNo: '',
      mdTelno: '',
      endTelno: '',
      emlAddr: '',
      brdtYmd: '',
    }
  });

  /**
   * 목록 조회. 서버 응답은 PageResponse(list/total/page/size/totalPage) 이며,
   * Spring Data Pageable 은 0-based 이므로 page(1-based) - 1 을 전송한다.
   * 조회 실패는 삼키지 않고 StandardDataTable 의 error/onRetry 로 화면에 드러낸다.
   */
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-external-hr', searchKeyword, page],
    queryFn: () => operationAdminService.getExternalHrList({
      name: searchKeyword,
      page: page - 1,
      size: PAGE_SIZE,
    }),
    // SSR 프리페치 결과는 검색어 없는 1페이지에 한해서만 초기값으로 쓴다.
    // 서버 프리페치가 실패했으면 initialPage 가 null 이므로 클라이언트가 다시 조회하고 실패를 노출한다.
    initialData: (!searchKeyword && page === 1 && initialPage) ? initialPage : undefined,
  });

  const rows: ExternalHr[] = data?.list ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPage ?? Math.ceil(totalItems / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 3페이지에서 검색해 빈 화면이 되는 것을 막는다.
    if (page !== 1) setPage(1);
    setSearchKeyword(searchTerm.trim());
  };

  const onRegisterSubmit = async (values: ExternalHrFormValues) => {
    try {
      setRegisterLoading(true);
      const submitData: Partial<ExternalHr> = {
        ...values,
        gndrCd: 'M',
        crTypeCd: 'STANDARD',
      };
      await operationAdminService.createExternalHr(submitData);
      toast('성공적으로 등록되었습니다.', 'success');
      setIsModalOpen(false);
      form.reset();
      // 최신 등록건은 crtDt DESC 정렬로 1페이지 선두에 노출된다
      if (page !== 1) setPage(1);
      queryClient.invalidateQueries({ queryKey: ['admin-external-hr'] });
    } catch {
      toast('등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  // 컬럼 접근자는 백엔드 ExternalHrDto 필드명(SSOT)만 사용한다.
  const columns: Column<ExternalHr>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {(index !== undefined ? index + 1 + (page - 1) * PAGE_SIZE : 0).toString().padStart(2, '0')}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '성명',
      accessor: (item) => (
        <span className="font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
          {item.otsdHrNm || '미지정'}
        </span>
      )
    },
    {
      header: '소속기관',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">
          {item.ogdpInstNm || '미지정'}
        </span>
      )
    },
    {
      header: '연락처',
      accessor: (item) => {
        const { areaNo, mdTelno, endTelno } = item;
        return (
          <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">
            {areaNo && mdTelno && endTelno ? `${areaNo}-${mdTelno}-${endTelno}` : '미등록'}
          </span>
        );
      },
      className: 'w-40'
    },
    {
      header: '이메일',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">
          {item.emlAddr || '-'}
        </span>
      )
    },
    {
      header: '생년월일',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-widest">
          {item.brdtYmd || '-'}
        </span>
      ),
      className: 'w-32 text-right pr-8'
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="외부 인사 인벤토리"
        breadcrumbs={[{ label: '운영지원' }, { label: '행사관리' }, { label: '외부인사정보' }]}
      />

      <HubHeader
        title="외부 인사"
        highlight="Personnel"
        subtitle="조직과 협력하는 외부 전문가 및 인사 정보를 통합 관리합니다."
        icon={Users}
        actions={
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => refetch()}
              aria-label="외부 인사 목록 새로고침"
              className="h-11 w-14 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm"
            >
              <RefreshCcw size={20} aria-hidden="true" />
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl"
            >
              <Plus size={20} aria-hidden="true" /> 인사 등록
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 인사" value={totalItems} icon={Layers} color="primary" />
        <HubMetricCard title="이메일 보유 (현재 페이지)" value={rows.filter(i => !!i.emlAddr).length} icon={Users} color="amber" />
      </HubMetricGrid>

      <HubSectionCard
        title="인사 정보 매트릭스"
        description="협력 관계에 있는 외부 인사들의 핵심 메타데이터 스트림입니다."
        icon={Users}
        className="bg-card/60 backdrop-blur-md border border-border/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
            <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} aria-hidden="true" />
              <Input
                placeholder="인사 성명으로 검색..."
                aria-label="인사 성명으로 검색"
                className="h-11 pl-16 rounded-xl border-none bg-muted/50 text-sm font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-xl hover:bg-primary transition-all">검색</Button>
            </form>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={rows}
              loading={isLoading}
              error={isError ? (error as Error) : null}
              onRetry={() => refetch()}
              emptyMessage="등록된 외부인사 정보가 없습니다."
              keyField="otsdHrId"
              isPremium={true}
              className="border-none bg-transparent shadow-none"
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                totalCount: totalItems,
                pageSize: PAGE_SIZE,
                onPageChange: setPage
              }}
            />
          </div>
        </div>
      </HubSectionCard>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="외부 인사 정보 등록"
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2">취소</Button>
            <Button
              onClick={form.handleSubmit(onRegisterSubmit)}
              disabled={registerLoading}
              className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
            >
              <ShieldCheck size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" aria-hidden="true" /> 최종 등록
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form className="space-y-6 pt-4 text-left">
            <ShadcnFormField
              control={form.control}
              name="evntSn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">행사 일련번호</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={field.value || ''}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      placeholder="1"
                      className="h-11 rounded-lg bg-muted border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="otsdHrId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">외부인사 ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={20}
                      placeholder="HR-2026-001"
                      className="h-11 rounded-lg bg-muted border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="otsdHrNm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">성명</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="홍길동" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="ogdpInstNm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">소속기관</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="한국인재개발원" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <ShadcnFormField
                control={form.control}
                name="areaNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">지역번호</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="02" className="h-11 rounded-lg bg-muted border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ShadcnFormField
                control={form.control}
                name="mdTelno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">국번</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1234" className="h-11 rounded-lg bg-muted border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ShadcnFormField
                control={form.control}
                name="endTelno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">종번</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="5678" className="h-11 rounded-lg bg-muted border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <ShadcnFormField
              control={form.control}
              name="emlAddr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">이메일</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="example@domain.com" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="brdtYmd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">생년월일 (8자리)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="19900101" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </StandardModal>
    </div>
  );
}

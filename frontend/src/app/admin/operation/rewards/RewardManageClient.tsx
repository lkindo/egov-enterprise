'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCcw, ShieldCheck } from 'lucide-react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { operationAdminService, type Reward } from '@/services/foundation/operation/OperationAdminService';
import type { PageResponse } from '@/types/foundation/system';
import { useToast } from '@/app/components/ui/toast';
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

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

import { RewardManageDtoSchema } from '@/types/generated-zod';

const rewardSchema = RewardManageDtoSchema.extend({
  rwardNm: z.string().min(1),
  rwardwnrId: z.string().min(1),
  rwardCode: z.string().min(1),
  rwardDe: z.string().length(8, '포상일자 8자리를 입력하세요(예: 20260515).'),
  pblenCn: z.string().min(1),
});

type RewardFormValues = z.infer<typeof rewardSchema>;

export default function RewardManageClient({ initialPage }: { initialPage: PageResponse<Reward> }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [size, setSize] = useState(initialPage?.size || 10);

  const form = useAppForm(rewardSchema, {
    defaultValues: {
      rwardNm: '',
      rwardwnrId: '',
      rwardCode: '',
      rwardDe: '',
      pblenCn: '',
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rewards', searchKeyword, page, size],
    // 서버 계약: name(포상명 부분일치) + Spring Data Pageable(page 는 0-based)
    queryFn: () => operationAdminService.getRewardList({
      name: searchKeyword,
      page: page - 1,
      size
    }),
    // SSR 프리페치 결과는 검색어 없는 1페이지에 한해서만 초기값으로 사용한다
    initialData: (!searchKeyword && page === 1) ? initialPage : undefined,
  });

  const rewards = data?.list || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPage ?? Math.ceil(totalItems / size);

  const onRegisterSubmit = async (values: RewardFormValues) => {
    try {
      setRegisterLoading(true);
      const submitData = {
        ...values,
        confmAt: 'N',
        sanctnerId: 'SYSTEM',
        frstRgtrId: 'SYSTEM',
        lastMdfrId: 'SYSTEM',
      };
      await operationAdminService.createReward(submitData as any);
      toast('포상 기록이 성공적으로 등록되었습니다.', 'success');
      setIsModalOpen(false);
      form.reset();
      // 최신 등록건은 crtDt DESC 정렬로 1페이지 선두에 노출된다
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
    } catch {
      toast('포상 기록 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  // 컬럼 접근자는 백엔드 RewardManageDto 필드명(SSOT)만 사용한다.
  const columns: Column<Reward>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {index !== undefined ? (index + 1 + (page - 1) * size).toString().padStart(2, '0') : '-'}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '포상 명칭',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {item.rwardNm}
          </span>
          <div className="flex items-center gap-2 opacity-60">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.rwardCode}</span>
          </div>
        </div>
      )
    },
    {
      header: '수상자 ID',
      accessor: 'rwardwnrId',
      className: 'w-32 font-mono text-xs font-bold text-muted-foreground tracking-tighter'
    },
    {
      header: '포상일자',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">
          {item.rwardDe}
        </span>
      ),
      className: 'w-32'
    },
    {
      header: '승인상태',
      accessor: (item) => (
        <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${item.confmAt === 'Y'
          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
          : 'bg-muted text-muted-foreground border border-border'
        }`}>
          {item.confmAt === 'Y' ? '동기화승인' : '대기중'}
        </div>
      ),
      className: 'w-36 text-center'
    },
    {
      header: '승인일시',
      accessor: 'sanctnDt',
      className: 'w-48 text-muted-foreground text-[10px] tabular-nums font-bold pr-8 text-right'
    }
  ];

  return (
    <WorkListPage
      title="상훈 및 포상 관리 체계"
      description="조직 내 성과 및 공헌에 대한 포상 기록을 조회·등록합니다."
      breadcrumbItems={[{ label: '운영지원' }, { label: '상훈관리' }, { label: '포상관리' }]}
      filterStateKey="operation-rewards"
      totalCount={totalItems}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            aria-label="포상 목록 새로고침"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-rewards'] })}
            className="gap-2"
          >
            <RefreshCcw size={16} aria-hidden="true" />
            새로고침
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={16} aria-hidden="true" /> 포상 기록 등록
          </Button>
        </>
      }
      filter={
        <KeywordFilter
          label="포상 명칭 · 대상자"
          placeholder="포상 명칭 또는 대상자로 검색"
          value={searchKeyword}
          onSearch={(keyword) => { setPage(1); setSearchKeyword(keyword); }}
        />
      }
    >
      <StandardDataTable
        accessibleLabel="포상 기록 목록"
        columns={columns}
        data={rewards}
        loading={isLoading}
        emptyMessage={emptyResultMessage(searchKeyword, '등록된 포상 기록이 없습니다.')}
        pagination={{
          currentPage: page,
          totalPages: totalPages,
          onPageChange: (p) => setPage(p),
          // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
          pageSize: size,
          onPageSizeChange: (next) => { setSize(next); setPage(1); },
          pageSizeOptions: [10, 20, 50],
        }}
      />

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="포상 기록 등록"
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2">취소</Button>
            <Button 
              onClick={form.handleSubmit(onRegisterSubmit)}
              disabled={registerLoading}
              className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
            >
              <ShieldCheck size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> 최종 등록
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form className="space-y-6 pt-4 text-left">
            <ShadcnFormField
              control={form.control}
              name="rwardNm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">포상 명칭</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="모범 사원상" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="rwardwnrId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">수상자 ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="USR_000000000001" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="rwardCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">포상 코드</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="R01" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="rwardDe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">포상 일자 (8자리)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="20260606" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="pblenCn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">공적 내용</FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      placeholder="사내 인프라 아키텍처 개선 및 현대화 프로젝트 공헌" 
                      className="w-full min-h-[120px] p-3 rounded-lg border bg-muted border-border focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </StandardModal>
    </WorkListPage>
  );
}

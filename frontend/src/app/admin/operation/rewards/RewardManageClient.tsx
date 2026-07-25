'use client';

import React, { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Trophy, Search, Plus, Clock, Layers, RefreshCcw, ShieldCheck, Zap, Activity, Filter } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const size = initialPage?.size || 10;

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
        rwardId: `RW_${Date.now()}`,
        confmAt: 'N',
        sanctnerId: 'SYSTEM',
        informlSanctnId: `ISM_${Date.now()}`,
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
    } catch (error) {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchKeyword(searchTerm.trim());
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="상훈 및 포상 관리 체계"
        breadcrumbs={[{ label: '운영지원' }, { label: '상훈관리' }, { label: '포상관리' }]}
      />

      <HubHeader
        title="Reward &"
        highlight="Honor"
        subtitle="조직 내 우수한 성과 및 공헌에 대한 포상 기록을 관리합니다."
        icon={Trophy}
        actions={
          <div className="flex gap-4">
            <Button
              variant="outline"
              aria-label="포상 목록 새로고침"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-rewards'] })}
              className="h-11 w-14 rounded-xl bg-white border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm active:scale-95"
            >
              <RefreshCcw size={20} />
            </Button>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl"
            >
              <Plus size={20} /> 포상 기록 등록
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="포상 현황" value={totalItems} icon={Layers} color="amber" />
        <HubMetricCard title="동기화상태" value="확인됨" icon={Zap} color="emerald" status="동기화됨" />
        <HubMetricCard title="활성 레코드" value={rewards.length} icon={Activity} color="primary" />
        <HubMetricCard title="감시 프로브" value="안전함" icon={Filter} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
        title="포상 아카이브 매트릭스"
        description="전사적으로 관리되는 상훈 및 포상 데이터 유닛의 실시간 스트림입니다."
        icon={Trophy}
        className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
            <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} />
              <Input
                placeholder="포상 명칭 또는 대상자 식별자로 분석..."
                className="h-11 pl-16 rounded-xl border-none bg-muted/50 text-sm font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">ANALYZE</Button>
            </form>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={rewards}
              loading={isLoading}
              emptyMessage="식별된 포상 내역 레코드가 존재하지 않습니다."
              className="border-none bg-transparent shadow-none"
              isPremium={true}
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                onPageChange: (p) => setPage(p)
              }}
            />
          </div>
        </div>
      </HubSectionCard>

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
                      className="w-full min-h-[120px] p-3 rounded-lg border bg-muted border-border focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed resize-none"
                    />
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

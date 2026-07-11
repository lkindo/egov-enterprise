'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  RefreshCcw, 
  Plus, 
  LayoutGrid, 
  ShieldCheck, 
  Calendar,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  MessageSquare,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { communityService } from '@/services/business/community/communityService';
import { CommunityVO } from '@/types/business/community';
import Link from 'next/link';
import { useToast } from '@/app/components/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function CommunityHubClient({ 
  initialData 
}: { 
  initialData: any 
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['communities', searchKeyword, page],
    queryFn: () => communityService.getCommunityList({ page, searchKeyword }),
    initialData: (page === 1 && !searchKeyword) ? initialData : undefined
  });

  const communities = useMemo(() => {
    return (data?.list || []) as CommunityVO[];
  }, [data]);

  const columns: Column<CommunityVO>[] = [
    {
      header: '커뮤니티',
      accessor: (item) => (
        <div className="flex items-center gap-6 py-2">
          <div className="w-14 h-11 rounded-[var(--radius-hub-item)] bg-slate-900 flex items-center justify-center text-primary font-bold text-xs shadow-lg group-hover:rotate-6 transition-transform">
            CM
          </div>
          <div className="space-y-1">
            <h4 className="text-md font-bold tracking-tighter leading-none text-foreground group-hover:text-primary transition-colors">
              {item.cmntyNm}
            </h4>
            <p className="text-xs font-bold tracking-tight opacity-40">
              ID_{item.cmntyId?.substring(0, 8)}
            </p>
          </div>
        </div>
      )
    },
    {
      header: '소개',
      accessor: (item) => (
        <p className="text-sm text-muted-foreground font-bold line-clamp-1 max-w-md">
          "{item.cmntyIntroCn || '등록된 소개 정보가 없습니다.'}"
        </p>
      )
    },
    {
      header: '관리자',
      accessor: (item) => (
        <div className="inline-flex items-center gap-3 px-5 py-2 bg-muted border border-border rounded-[var(--radius-hub-item)] text-muted-foreground font-bold text-xs tracking-tight">
          <ShieldCheck size={14} className="text-primary" /> {item.frstRegisterNm}
        </div>
      )
    },
    {
      header: '개설일',
      accessor: (item) => (
        <div className="flex items-center gap-3 text-muted-foreground/40 font-bold text-xs tracking-tight">
          <Calendar size={14} /> {item.crtDt?.substring(0, 10)}
        </div>
      )
    },
    {
      header: '이동',
      accessor: (item) => (
        <Link href={`/cop/cmy/selectCommunityDetail/${item.cmntyId}`}>
          <Button size="sm" className="h-10 w-10 rounded-[var(--radius-hub-item)] bg-muted border border-border/60 text-foreground hover:bg-slate-900 hover:text-white transition-all group">
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      )
    }
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-[var(--gap-hub-section)] pb-24 animate-in fade-in duration-1000">
        <PageHeader
          title="커뮤니티 익스피리언스"
          breadcrumbs={[{ label: '협업 서비스' }, { label: '커뮤니티 공간' }]}
        />

        <HubHeader
          title="커뮤니티"
          highlight="공간"
          subtitle="전사 소모임 및 지식 공유 커뮤니티 통합 아카이브"
          icon={Globe}
          actions={
            <div className="flex gap-4 p-2 items-center">
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="lg" className="h-11 w-14 rounded-[var(--radius-hub-item)] bg-white border-2 border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95">
                    <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[var(--radius-hub-item)] px-4 py-2 text-xs font-bold tracking-tight">
                  AI 추천 커뮤니티 탐색
                </TooltipContent>
              </Tooltip>

              <Button 
                size="lg" 
                className="h-11 px-10 rounded-[var(--radius-hub-item)] bg-slate-900 border-none text-white font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
              >
                <Plus size={20} />
                커뮤니티 개설 신청
                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-12 gap-[var(--gap-hub-section)]">
          {/* Left Metrics / Filters */}
          <div className="col-span-12 lg:col-span-3 space-y-8">
            <div className="hub-glass-premium rounded-[var(--radius-hub-section)] p-8 space-y-8 border-2 border-border/50 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                <MessageSquare size={120} className="text-primary" />
              </div>
              <div className="relative z-10 space-y-2">
                <span className="text-xs font-bold text-primary tracking-tight">통계 분석 매트릭스</span>
                <h4 className="text-3xl font-bold tracking-tighter text-foreground">커뮤니케이션<br />활동성</h4>
              </div>
              <div className="space-y-6 relative z-10">
                <MetricItem label="활성 커뮤니티" value={data?.total || 0} />
                <MetricItem label="일일 상호작용" value="1.2k+" />
                <MetricItem label="지식 자산 건수" value="4.8k+" />
              </div>
            </div>

            <div className="rounded-[var(--radius-hub-widget)] bg-white border-2 border-border shadow-xl p-4 flex flex-col gap-4">
               <NavButton icon={<LayoutGrid size={22} />} label="전체 목록" active={true} onClick={() => {}} />
               <NavButton icon={<Users size={22} />} label="내 가입 커뮤니티" active={false} onClick={() => {}} />
               <NavButton icon={<ShieldCheck size={22} />} label="관리 중인 공간" active={false} onClick={() => {}} />
            </div>
          </div>

          {/* Main List Area */}
          <div className="col-span-12 lg:col-span-9">
            <HubSectionCard
              title="등록 공간 스트림"
              description="활성화된 커뮤니티 객체들의 실시간 데이터 매트릭스입니다"
              icon={Users}
            >
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2 pt-2 border-b border-border pb-8">
                  <div className="relative w-full sm:w-96 group/search">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                    <Input
                      className="pl-16 h-11 bg-muted/50 border-none rounded-[var(--radius-hub-item)] text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
                      placeholder="커뮤니티 검색..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['communities'] })}
                        className="h-12 rounded-[var(--radius-hub-item)] px-6 text-xs font-bold tracking-tight gap-3 hover:bg-slate-900 hover:text-white bg-muted border border-border transition-all group shadow-sm"
                      >
                        <RefreshCcw size={16} className={cn("text-primary group-hover:text-white transition-colors", isLoading ? "animate-spin" : "group-hover:rotate-180")} /> 
                        동기화
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-slate-900 text-white border-none rounded-[var(--radius-hub-item)] px-4 py-2 text-xs font-bold tracking-tight">
                      실시간 데이터 동기화
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={page + searchKeyword}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5 }}
                    >
                      <StandardDataTable<CommunityVO>
                        columns={columns}
                        data={communities}
                        loading={isLoading}
                        error={error as Error | null}
                        onRetry={() => refetch()}
                        keyField="cmntyId"
                        emptyMessage="검색된 커뮤니티 공간이 존재하지 않습니다."
                        isPremium={true}
                        className="border-none shadow-none bg-transparent"
                        pagination={{
                          currentPage: page,
                          totalPages: data?.totalPage || 1,
                          onPageChange: (p) => setPage(p)
                        }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </HubSectionCard>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function MetricItem({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-muted-foreground tracking-tight">_ {label}</span>
      <span className="text-xl font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full group p-6 rounded-[var(--radius-hub-item)] border-2 transition-all flex items-center gap-5 relative overflow-hidden",
        active
          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
          : "bg-transparent border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-[var(--radius-hub-item)] flex items-center justify-center transition-all shadow-lg relative z-10",
        active ? "bg-white/10 text-white" : "bg-white text-slate-300 group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        {icon}
      </div>
      <span className="text-xs font-bold tracking-tight text-left">_ {label}</span>
      {active && (
        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/20 rounded-lg blur-2xl opacity-50 -mr-12 -mt-12 pointer-events-none" />
      )}
    </button>
  );
}

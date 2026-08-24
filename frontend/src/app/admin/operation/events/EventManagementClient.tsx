'use client';

import React, { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2, Zap } from 'lucide-react';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { eventService, EventInfo } from '@/services/foundation/operation/eventService';
import { Button } from '@/components/ui/button';

/**
 * `<input type="date">` 는 `2026-05-01`(10자)을 준다. 그러나 evnt_bgng_ymd/evnt_end_ymd 는
 * length=8 YYYYMMDD 컬럼이고 DTO 도 @Size(max = 8) 이라, 종전에는 등록 요청이 **항상 400
 * (C001 "size must be between 0 and 8")** 으로 실패했다 = 행사 등록 기능이 동작한 적이 없다.
 * 저장소의 기존 관례(ScheduleCreateForm·ReportCreateForm·ScheduleDeptClient)와 동일하게
 * 경계에서 하이픈을 제거한다.
 */
const inputToYmd = (value?: string) => (value ?? '').replace(/-/g, '');

/** 반대 방향 — 저장된 YYYYMMDD 를 사람이 읽는 형태로. 등록이 가능해지면서 실제로 노출된다. */
const ymdToDisplay = (value?: string) => {
  const ymd = inputToYmd(value);
  return ymd.length === 8 ? `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}` : (value ?? '-');
};
import { Input } from '@/components/ui/input';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function EventManagementClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
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

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchWrd, setSearchWrd] = useState('');
  // 타이핑 한 글자마다 서버 요청이 나가지 않도록 디바운스 값만 queryKey 에 넣는다.
  const debouncedSearchWrd = useDebouncedValue(searchWrd, 300);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<EventInfo>>({
    evntNm: '',
    evntCn: '',
    evntBgngYmd: '',
    evntEndYmd: '',
    evntUseCnt: 0
  });

  // --- Data Fetching ---
  const { data: eventsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['events-list', debouncedSearchWrd, page, pageSize],
    queryFn: () => eventService.getEvents({ searchWrd: debouncedSearchWrd, page: page - 1, size: pageSize }),
  });

  const displayItems: EventInfo[] = eventsData?.list ?? [];
  const totalItems = eventsData?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: (data: Partial<EventInfo>) => eventService.createEvent(data),
    onSuccess: () => {
      toast('행사가 성공적으로 생성되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['events-list'] });
      setIsCreateModalOpen(false);
      setForm({
        evntNm: '',
        evntCn: '',
        evntBgngYmd: '',
        evntEndYmd: '',
        evntUseCnt: 0
      });
    },
    onError: () => {
      toast('행사 생성에 실패했습니다.', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (evntSn: number) => eventService.deleteEvent(evntSn),
    onSuccess: () => {
      toast('행사가 성공적으로 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['events-list'] });
    },
    onError: () => {
      toast('행사 삭제에 실패했습니다.', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bgngYmd = inputToYmd(form.evntBgngYmd);
    const endYmd = inputToYmd(form.evntEndYmd);
    const bizYr = bgngYmd ? bgngYmd.substring(0, 4) : new Date().getFullYear().toString();
    createMutation.mutate({ ...form, evntBgngYmd: bgngYmd, evntEndYmd: endYmd, bizYr });
  };

  const handleSearchChange = (value: string) => {
    setSearchWrd(value);
    // 3페이지에서 검색해 빈 화면이 되는 것을 막는다.
    if (page !== 1) setPage(1);
  };

  const handleDelete = async (event: EventInfo) => {
    const ok = await confirm({
      title: '행사 삭제',
      message: `'${event.evntNm}' 행사를 삭제합니다. 삭제된 행사는 복구할 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(event.evntSn);
  };

  // --- DataTable Configuration ---
  const eventColumns: Column<EventInfo>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {index !== undefined ? (index + 1 + (page - 1) * pageSize).toString().padStart(2, '0') : '-'}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '행사 명칭',
      accessor: (event) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {event.evntNm}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            {ymdToDisplay(event.evntBgngYmd)} ~ {ymdToDisplay(event.evntEndYmd)}
          </span>
        </div>
      )
    },
    {
      header: '참여 정원',
      accessor: (event) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground tabular-nums">{event.evntUseCnt}</span>
          <span className="text-[10px] font-bold text-muted-foreground tracking-tighter">명</span>
        </div>
      ),
      className: 'w-32'
    },
    {
      header: '관리',
      className: 'text-right w-24',
      accessor: (event) => (
        <div className="flex items-center justify-end pr-4">
          <Button
            variant="ghost"
            size="icon"
            data-testid="delete-event-btn"
            aria-label={`${event.evntNm} 삭제`}
            onClick={() => handleDelete(event)}
            className="w-10 h-10 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <WorkListPage
      title="행사 운영 센터"
      description="사내 행사 및 캠페인을 조회·등록합니다."
      breadcrumbItems={[{ label: '운영지원' }, { label: '행사관리' }]}
      filterStateKey="operation-events"
      // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
      totalCount={isError ? undefined : totalItems}
      actions={
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus size={16} aria-hidden="true" /> 행사 등록
        </Button>
      }
      filter={
        <div className="min-w-60 max-w-xl space-y-1">
          <label htmlFor="event-search" className="text-[length:var(--font-size-body)] font-medium">
            행사 명칭
          </label>
          <Input
            id="event-search"
            value={searchWrd}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="행사 검색"
            placeholder="행사 검색"
          />
        </div>
      }
    >
      <StandardDataTable
        accessibleLabel="행사 목록"
        columns={eventColumns}
        data={displayItems}
        loading={isLoading}
        error={isError ? (error as Error) : null}
        onRetry={() => refetch()}
        emptyMessage={emptyResultMessage(debouncedSearchWrd, '등록된 행사가 없습니다.')}
        keyField="evntSn"
        pagination={{
          currentPage: page,
          totalPages: totalPages,
          // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
          pageSize,
          onPageChange: (p) => setPage(p),
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
      />

      {/* Creation Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl bg-card rounded-lg border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-surface-inverse p-8 text-surface-inverse-foreground">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tighter">신규 행사 등록</DialogTitle>
              <DialogDescription className="text-white/40 text-xs font-bold tracking-[0.2em]">행사 기본 정보를 입력하십시오.</DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="evntNm" className="text-xs font-bold text-muted-foreground tracking-widest">행사 명칭</Label>
                <Input
                  id="evntNm"
                  value={form.evntNm}
                  onChange={(e) => setForm({ ...form, evntNm: e.target.value })}
                  placeholder="행사 명칭을 입력하십시오"
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                  maxLength={200}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="evntCn" className="text-xs font-bold text-muted-foreground tracking-widest">상세 내용</Label>
                <Input
                  id="evntCn"
                  value={form.evntCn}
                  onChange={(e) => setForm({ ...form, evntCn: e.target.value })}
                  placeholder="상세 내용을 입력하십시오"
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                  maxLength={4000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evntBgngYmd" className="text-xs font-bold text-muted-foreground tracking-widest">행사 시작일</Label>
                <Input
                  id="evntBgngYmd"
                  type="date"
                  value={form.evntBgngYmd}
                  onChange={(e) => setForm({ ...form, evntBgngYmd: e.target.value })}
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evntEndYmd" className="text-xs font-bold text-muted-foreground tracking-widest">행사 종료일</Label>
                <Input
                  id="evntEndYmd"
                  type="date"
                  value={form.evntEndYmd}
                  onChange={(e) => setForm({ ...form, evntEndYmd: e.target.value })}
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="evntUseCnt" className="text-xs font-bold text-muted-foreground tracking-widest">참여 정원 (명)</Label>
                <Input
                  id="evntUseCnt"
                  type="number"
                  value={form.evntUseCnt}
                  onChange={(e) => setForm({ ...form, evntUseCnt: parseInt(e.target.value) || 0 })}
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                  min={0}
                />
              </div>
            </div>
            <DialogFooter className="pt-8 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="h-11 px-8 font-bold text-xs tracking-widest">취소</Button>
              <Button type="submit" disabled={createMutation.isPending} className="h-11 px-10 bg-primary text-white rounded-lg font-bold text-xs tracking-widest shadow-xl shadow-primary/20 gap-3">
                {createMutation.isPending ? '등록 중...' : <><Zap size={16} aria-hidden="true" /> 행사 등록</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </WorkListPage>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCcw, Calendar, ChevronRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { communityService } from '@/services/business/community/communityService';
import { CommunityVO } from '@/types/business/community';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function CommunityHubClient({ 
  initialData 
}: { 
  initialData: any 
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  // 'managed' = 내가 개설한(= 목록의 '관리자' 열) 커뮤니티. 서버에 소유자 필터 파라미터가 없어
  // 현재 조회된 페이지 안에서만 추리는 클라이언트 필터다.
  const [filter, setFilter] = useState<'all' | 'managed'>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['communities', searchKeyword, page],
    // StandardDataTable 의 currentPage 는 1-based 이다. 공통 ApiService 의 `page`는
    // 0-based 입력으로 간주해 +1 하므로, 여기서는 백엔드 계약인 pageIndex 를 명시한다.
    queryFn: () => communityService.getCommunityList({ pageIndex: page, searchKeyword }),
    initialData: (page === 1 && !searchKeyword) ? initialData : undefined
  });

  // 옵셔널 체이닝 결과를 memo 밖에서 스칼라로 고정한다. memo 안에서 user?.id 와 user.id 를
  // 섞어 읽으면 컴파일러가 의존성을 확정하지 못해 메모 보존에 실패한다
  // (react-hooks/preserve-manual-memoization → 컴포넌트 전체 최적화 스킵).
  const currentUserId = user?.id;

  const communities = useMemo(() => {
    const list = (data?.list || []) as CommunityVO[];
    // frstRgtrId 는 JPA 감사(LoginUserAuditorAware)가 심는 로그인 ID 이고, useAuth().user.id 는
    // /auth/me 가 내려주는 로그인 ID 라 동일 축이다.
    if (filter === 'managed') {
      return currentUserId ? list.filter((item) => item.frstRgtrId === currentUserId) : [];
    }
    return list;
  }, [data, filter, currentUserId]);

  const columns: Column<CommunityVO>[] = [
    {
      header: '커뮤니티',
      accessor: (item) => (
        <div className="flex items-center gap-6 py-2">
          <div className="w-14 h-11 rounded-[var(--radius-hub-item)] bg-surface-inverse flex items-center justify-center text-primary font-bold text-xs shadow-lg group-hover:rotate-6 transition-transform">
            CM
          </div>
          <div className="space-y-1">
            <h4 className="text-md font-bold tracking-tighter leading-none text-foreground group-hover:text-primary transition-colors">
              {item.cmntyNm}
            </h4>
            <p className="text-xs font-bold tracking-tight opacity-40">
              SN_{item.cmntySn}
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
        <Link href={`/cop/cmy/selectCommunityDetail/${item.cmntySn}`}>
          <Button size="sm" aria-label={`${item.cmntyNm || '커뮤니티'} 상세 보기`} className="h-10 w-10 rounded-[var(--radius-hub-item)] bg-muted border border-border/60 text-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all group">
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      )
    }
  ];

  return (
    /*
      [정직성] 종전 좌측 지표 카드의 '일일 상호작용 1.2k+'·'지식 자산 건수 4.8k+' 는 계측 원천이
      없는 고정 문구였고(ADR-0003 위장 금지), 'AI 추천 커뮤니티 탐색'·'커뮤니티 개설 신청' 은
      onClick 이 없는 死버튼이었다(카탈로그 G10). 근거 없는 값과 죽은 컨트롤을 제거한다.
    */
    <WorkListPage
      title="커뮤니티 목록"
      description="전사 소모임과 지식 공유 커뮤니티를 조회합니다."
      breadcrumbItems={[{ label: '협업 서비스' }, { label: '커뮤니티 공간' }]}
      filterStateKey="cop-community-list"
      totalCount={error ? undefined : data?.total}
      actions={
        <Button
          variant="outline"
          size="sm"
          aria-label="커뮤니티 목록 새로고침"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['communities'] })}
          className="gap-2"
        >
          <RefreshCcw size={16} className={cn(isLoading && "animate-spin")} aria-hidden="true" />
          새로고침
        </Button>
      }
      filter={
        <div className="space-y-[var(--form-gap)]">
          <div className="min-w-60 max-w-xl space-y-1">
            <label htmlFor="community-search" className="text-[length:var(--font-size-body)] font-medium">
              커뮤니티명
            </label>
            <Input
              id="community-search"
              placeholder="커뮤니티 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <div role="group" aria-label="조회 범위" className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              전체 목록
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === 'managed' ? 'default' : 'outline'}
              aria-pressed={filter === 'managed'}
              onClick={() => setFilter('managed')}
              title="내가 개설한 커뮤니티만 현재 페이지에서 추립니다"
            >
              관리 중인 공간
            </Button>
            {/* 가입 여부는 tb_cmnty_user_map 에만 있고 목록 응답(CommunityDto)에 없다.
                가짜로 동작시키지 않고 사유를 밝혀 비활성화한다. */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled
              title="가입 여부를 내려주는 API가 아직 없어 사용할 수 없습니다"
            >
              내 가입 커뮤니티
            </Button>
          </div>
        </div>
      }
    >
      <StandardDataTable<CommunityVO>
        accessibleLabel="커뮤니티 목록"
        columns={columns}
        data={communities}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        keyField="cmntySn"
        emptyMessage={filter === 'managed'
          ? "이 페이지에는 내가 개설한 커뮤니티가 없습니다."
          : emptyResultMessage(searchKeyword, '등록된 커뮤니티가 없습니다.')}
        pagination={{
          currentPage: page,
          totalPages: data?.totalPage || 1,
          onPageChange: (p) => setPage(p)
        }}
      />
    </WorkListPage>
  );
}

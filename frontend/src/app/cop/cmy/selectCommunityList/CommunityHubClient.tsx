'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCcw, Calendar, ChevronRight } from 'lucide-react';
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
  /** 페이지당 건수(A1 필수). URL 에는 싣지 않는다. */
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  // 'managed' = 내가 개설한(= 목록의 '관리자' 열) 커뮤니티. 서버에 소유자 필터 파라미터가 없어
  // 현재 조회된 페이지 안에서만 추리는 클라이언트 필터다.
  const [filter, setFilter] = useState<'all' | 'managed'>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['communities', searchKeyword, page, pageSize],
    /*
     * [2026-08-25 실측 수정] 종전에는 `pageIndex`·`searchKeyword` 를 보냈는데
     * CommunityApiController 는 **Spring `Pageable`(page 0-based / size)** 과
     * `searchCnd`·`searchWrd` 를 읽는다. ApiService 의 매핑도 `page → pageIndex` 한 방향뿐이라
     * 두 값 모두 서버에 닿지 않았다 — 페이지를 넘겨도 같은 목록이 오고, 검색어는 무시됐다.
     * 서버가 이름 검색을 `searchCnd === '0'` 분기로만 지원하므로 그 값을 함께 보낸다.
     */
    queryFn: () => communityService.getCommunityList({
      page: page - 1,
      size: pageSize,
      searchCnd: '0',
      searchWrd: searchKeyword,
    }),
    initialData: (page === 1 && !searchKeyword && pageSize === 10) ? initialData : undefined
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
    /*
      [2026-08-29] '관리자' 열을 걷는다.
      읽던 `frstRegisterNm` 은 서버가 **어떤 경로에서도 채우지 않는다** — CommunityDto.from()
      은 frstRgtrId 만 매핑한다. 그래서 방패 아이콘만 있는 빈 배지가 모든 행에 떴고, 관리자
      이름이 있어야 할 자리처럼 보였다.
      같은 필드를 읽던 커뮤니티 상세는 이미 걷었는데(웨이브 A) 계약이 상세 화면만 검사해
      이 목록이 남아 있었다 — 계약을 같은 DTO 를 읽는 화면 전체로 넓힌다.
      개설자 식별자(frstRgtrId)는 esntlId 원문이라 사람에게 보여 줄 값이 아니다. 이름을
      보여 주려면 서버가 사용자 join 으로 내려주는 것이 선행이다.
    */
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
          pageSize,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          onPageChange: (p) => setPage(p)
        }}
      />
    </WorkListPage>
  );
}

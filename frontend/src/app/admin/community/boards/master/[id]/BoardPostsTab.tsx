'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { toDisplayYmd } from '@/lib/format-date';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import type { BoardPost } from '@/types/business/board';

/**
 * 게시판 운영 화면의 게시물 탭(ADR-0040 §5.4). A2 에서는 목록(제목·작성자·작성일·게시 기간)만 보인다 — 게시 상태·조회 조건·
 * 빠른 편집·일괄 처리는 B1, 상단 고정은 B2 가 더한다(구현 전에는 그 열·조건·단추를 보이지 않는다).
 *
 * 조회 대행 권한(BOARD_READ_ALL)이 있을 때만 이 탭이 보인다. 그 권한이면 서버가 사용 안 함 게시판의 목록도 연다(결정 1).
 * 쪽은 1 기반 page·size(ADR-0036)이고 URL 밖 상태다(결정 2 — 운영 화면의 URL 키는 탭뿐이다).
 */
export function BoardPostsTab({ bbsId, boardName }: { bbsId: string; boardName: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const posts = useQuery({
    queryKey: ['board-operations', 'posts', bbsId, page, size],
    queryFn: () => boardUserService.getPosts(bbsId, { page, size }),
  });
  const rows = posts.data?.list ?? [];
  const total = posts.data?.total ?? rows.length;
  const totalPages = posts.data?.totalPage ?? Math.max(1, Math.ceil(total / size));

  const columns: Column<BoardPost>[] = [
    {
      header: '제목',
      accessor: (post) => (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-left">
          <span className="truncate font-medium text-foreground">{post.pstTtl}</span>
          {post.scrtYn === 'Y' && <Badge variant="outline" className="text-xs">비밀글</Badge>}
        </div>
      ),
    },
    { header: '작성자', accessor: (post) => post.userNm ?? '—' },
    { header: '작성일', accessor: (post) => (post.crtDt ? post.crtDt.substring(0, 10) : '—'), className: 'tabular-nums' },
    {
      header: '게시 기간',
      accessor: (post) => (post.pstBgngYmd || post.pstEndYmd
        ? `${toDisplayYmd(post.pstBgngYmd, '시작일 없음')} ~ ${toDisplayYmd(post.pstEndYmd, '종료일 없음')}`
        : '기간 없음'),
      className: 'tabular-nums',
    },
  ];

  return (
    <WorkListPage
      title="게시물"
      headingLevel={2}
      showBreadcrumb={false}
      description="이 게시판의 글입니다. 본문·첨부 수정은 글 상세의 작성 화면에서 합니다."
      totalCount={posts.isError ? undefined : total}
    >
      <StandardDataTable<BoardPost>
        columns={columns}
        data={rows}
        loading={posts.isLoading}
        error={posts.isError ? posts.error : null}
        onRetry={() => posts.refetch()}
        keyField="pstSn"
        onRowClick={(post) => router.push(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${post.pstSn}`)}
        rowActionLabel={(post) => `${post.pstTtl} 글 상세 열기`}
        pagination={{
          currentPage: page,
          totalPages,
          onPageChange: setPage,
          pageSize: size,
          onPageSizeChange: (next) => { setSize(next); setPage(1); },
          pageSizeOptions: [20, 50, 100],
        }}
        accessibleLabel={`${boardName} 게시물 목록`}
        emptyMessage="이 게시판에 글이 없습니다."
      />
    </WorkListPage>
  );
}

'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { BoardPost } from '@/types/business/board';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { Plus, Eye } from 'lucide-react';

const DEFAULT_BBS_ID = 'BBSMSTR_AAAAAAAAAAAA'; // 공지사항 기본값

function CommunityDetailContent() {
    const router = useRouter();

    const { values, setSearchValues } = useSearchState({
        bbsId: DEFAULT_BBS_ID,
        searchWrd: '',
        searchCnd: '0',
        page: '0'
    });

    // 감사 P1-1: 과거 useEffect + try/catch 라 조회 실패 시 toast 만 뜨고 목록은 빈 배열로 남아
    // "게시글이 존재하지 않습니다"(= 데이터 0건)로 위장됐다. useQuery 로 옮겨 isError/error/refetch 를
    // StandardDataTable 의 error/onRetry 로 그대로 전달한다.
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['communityPosts', values.bbsId, values.searchWrd, values.searchCnd, values.page],
        queryFn: () => boardUserService.getPosts(values.bbsId, {
            page: Number(values.page) || 0,
            size: 10,
            searchWrd: values.searchWrd,
            searchCnd: values.searchCnd
        })
    });

    const posts: BoardPost[] = data?.list || [];
    const total = data?.total || 0;

    const columns = [
        {
            // 감사 死코드: 과거 `(item as any).noticeYn` 분기는 BoardDto(generated-api.d.ts)에 없는 필드를
            // 캐스팅으로 읽어 항상 false 였다(공지 표시가 한 번도 렌더되지 않음). 계약에 있는 값만 표시한다.
            header: '번호',
            accessor: (item: BoardPost) => item.pstSn,
            className: 'w-20'
        },
        {
            header: '제목',
            accessor: (item: BoardPost) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground hover:text-primary transition-colors">{item.pstTtl}</span>
                    {item.pstCn ? <span className="text-xs text-muted-foreground line-clamp-1">{item.pstCn.substring(0, 50)}</span> : null}
                </div>
            ),
            className: 'min-w-[300px]'
        },
        {
            header: '작성자',
            accessor: (item: BoardPost) => item.userNm
        },
        {
            header: '날짜',
            accessor: (item: BoardPost) => item.crtDt?.substring(0, 10) || '-'
        },
        {
            header: '조회',
            accessor: (item: BoardPost) => (
                <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye size={14} />
                    {item.inqCnt}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="커뮤니티 상세 및 게시글"
                breadcrumbs={[{ label: '커뮤니티 관리', href: '/admin/community' }, { label: '커뮤니티 상세' }]}
                actions={
                    <button
                        onClick={() => router.push('/admin/community/boards/write')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus size={18} /> 새 글 쓰기
                    </button>
                }
            />

            <StandardSearchFilter
                fields={[
                    {
                        name: 'bbsId',
                        label: '게시판 선택',
                        type: 'select',
                        options: [
                            { label: '공지사항', value: 'BBSMSTR_AAAAAAAAAAAA' },
                            { label: '자유게시판', value: 'BBSMSTR_BBBBBBBBBBBB' },
                            { label: '업무게시판', value: 'BBSMSTR_CCCCCCCCCCCC' }
                        ]
                    },
                    { name: 'searchWrd', label: '검색어', type: 'text', placeholder: '제목, 내용 입력...' },
                    {
                        name: 'searchCnd',
                        label: '검색 조건',
                        type: 'select',
                        options: [
                            { label: '제목', value: '0' },
                            { label: '내용', value: '1' },
                            { label: '작성자', value: '2' }
                        ]
                    }
                ]}
                onSearch={(v) => setSearchValues({ ...v, page: '0' })}
            />

            <StandardDataTable
                columns={columns}
                data={posts}
                loading={isLoading}
                error={isError ? error : null}
                onRetry={() => void refetch()}
                onRowClick={(item) => router.push(`/admin/community/boards/detail?bbsId=${item.bbsId}&pstSn=${item.pstSn}`)}
                rowActionLabel={(item) => `${item.pstTtl || `${item.pstSn}번`} 게시글 열기`}
                emptyMessage="게시글이 존재하지 않습니다."
            />

            {/* 감사 P1-5: 조회가 실패한 상태에서 "총 0 개"라고 단정하지 않도록 성공 시에만 건수를 표기한다. */}
            {!isError && (
                <div className="flex justify-center pt-4">
                    <p className="text-sm text-muted-foreground font-medium">
                        총 <span className="text-foreground font-bold">{total.toLocaleString()}</span> 개의 게시글이 있습니다.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function CommunityDetailClient() {
    return (
        <Suspense fallback={
            <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-0 py-8 animate-pulse">
                <h1 className="sr-only">커뮤니티 상세를 불러오는 중</h1>
                {/* PageHeader 1:1 스켈레톤 */}
                <div className="flex justify-between items-center pb-6 border-b border-border">
                    <div className="space-y-2 w-1/3">
                        <div className="h-8 bg-muted rounded-lg w-3/4" />
                        <div className="h-4 bg-muted/80 rounded-lg w-1/2" />
                    </div>
                    <div className="h-10 bg-muted rounded-lg w-28" />
                </div>
                {/* StandardSearchFilter 1:1 스켈레톤 */}
                <div className="h-16 bg-muted/80 rounded-xl border border-border" />
                {/* StandardDataTable 1:1 스켈레톤 */}
                <div className="space-y-3">
                    <div className="h-12 bg-muted/80 rounded-lg" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 bg-muted/50 rounded-lg border border-border" />
                    ))}
                </div>
            </div>
        }>
            <CommunityDetailContent />
        </Suspense>
    );
}

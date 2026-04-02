
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { BoardPost } from '@/types/business/board';
import { useToast } from '@/app/components/ui/toast';
import { useSearchState } from '@/lib/hooks/use-search-state';
import { Plus, Eye, Megaphone, Loader2 } from 'lucide-react';

const DEFAULT_BBS_ID = 'BBSMSTR_AAAAAAAAAAAA'; // 공지사항 湲곕낯媛
function CommunityDetailContent() {
    const router = useRouter();
    const params = useParams();
    const communityId = params.id as string;
    const { toast } = useToast();

    const { values, setSearchValues } = useSearchState({
        bbsId: DEFAULT_BBS_ID,
        searchWrd: '',
        searchCnd: '0',
        page: '0'
    });

<<<<<<< HEAD
 useEffect(() => {
 async function loadPosts() {
 try {
 setLoading(true);
 // ㅼ젣濡쒕뒗 communityId님?곕Ⅸ bbsId瑜조회?댁빞 님?섎룄 ?덉쑝님 
 // 湲곗〈 濡쒖쭅님?꾨님붾맂 경로濡님댁떇합니다
 const res = await boardUserService.getPosts(values.bbsId, {
 page: parseInt(values.page),
 size: 10,
 searchWrd: values.searchWrd,
 searchCnd: values.searchCnd
 });
 setData(res.list || []);
 setTotal(res.total || 0);
 } catch {
 toast('紐⑸줉님遺덈윭ㅻ뒗 以님ㅻ쪟媛 諛쒖깮있습니다.', 'error');
 } finally {
 setLoading(false);
 }
 }
 loadPosts();
 }, [values, toast, communityId]);
=======
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<BoardPost[]>([]);
    const [total, setTotal] = useState(0);
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f

    useEffect(() => {
        async function loadPosts() {
            try {
                setLoading(true);
                // ㅼ젣濡쒕뒗 communityId님?곕Ⅸ bbsId瑜조회?댁빞 님?섎룄 ?덉쑝님 
                // 湲곗〈 濡쒖쭅님?꾨님붾맂 경로濡님댁떇합니다
                const res = await boardUserService.getPosts(values.bbsId, {
                    page: parseInt(values.page),
                    size: 10,
                    searchWrd: values.searchWrd,
                    searchCnd: values.searchCnd
                });
                setData(res.list || []);
                setTotal(res.total || 0);
            } catch {
                toast('紐⑸줉님遺덈윭ㅻ뒗 以님ㅻ쪟媛 諛쒖깮있습니다.', 'error');
            } finally {
                setLoading(false);
            }
        }
        loadPosts();
    }, [values, toast, communityId]);

    const columns = [
        {
            header: '번호',
            accessor: (item: BoardPost) => (
                item.noticeAt === 'Y' ?
                    <span className="flex items-center gap-1.5 text-blue-600 font-bold"><Megaphone size={14} /> 공지</span> :
                    item.nttId
            ),
            className: 'w-20'
        },
        {
            header: '제목',
            accessor: (item: BoardPost) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground hover:text-primary transition-colors">{item.nttSj}</span>
                    {item.nttCn ? <span className="text-[11px] text-muted-foreground line-clamp-1">{item.nttCn.substring(0, 50)}</span> : null}
                </div>
            ),
            className: 'min-w-[300px]'
        },
        { header: '작성자'?듬챸' },
        { header: '?좎쭨', accessor: (item: BoardPost) => item.createdDate.substring(0, 10) },
        {
            header: '조회',
            accessor: (item: BoardPost) => (
                <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye size={14} />
                    {item.inqireCo}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="而ㅻ님덊떚 상세 및 寃뚯떆님
                breadcrumbs={[{ label: '?묒뾽吏님, href: '/admin/community' }, { label: '而ㅻ님덊떚 상세' }]}
                actions={
                    <button
                        onClick={() => router.push('/admin/community/boards/write')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus size={18} /> 님湲 ?곌린
                    </button>
                }
            />

            <StandardSearchFilter
                fields={[
                    {
                        name: '게시판 선택',
                        label: '寃뚯떆님?좏깮',
                        type: 'select',
                        options: [
                            { label: '공지사항', value: 'BBSMSTR_AAAAAAAAAAAA' },
                            { label: '자유게시판'BBSMSTR_BBBBBBBBBBBB' },
                            { label: '업무게시판'BBSMSTR_CCCCCCCCCCCC' }
                        ]
                    },
                    { name: 'searchWrd', label: '검색어', type: 'text', placeholder: '제목, 내용 입력...' },
                    {
                        name: '검색 조건',
                        label: '寃님議곌굔',
                        type: 'select',
                        options: [
                            { label: '제목', value: '0' },
                            { label: '내용', value: '1' },
                            { label: '작성자'2' }
                        ]
                    }
                ]}
                onSearch={(v) => setSearchValues({ ...v, page: '0' })}
            />

            <StandardDataTable
                columns={columns}
                data={data}
                loading={loading}
                onRowClick={(item) => router.push(`/admin/community/boards/${item.nttId}?bbsId=${item.bbsId}`)}
                emptyMessage="게시글이 존재하지 않습니다."
            />

            <div className="flex justify-center pt-4">
                <p className="text-sm text-muted-foreground font-medium">
                    珥<span className="text-foreground font-bold">{total}</span> 媛쒖쓽 게시글이있습니다.
                </p>
            </div>
        </div>
    );
}

export default function CommunityDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">而ㅻ님덊떚 ?뺣낫瑜遺덈윭ㅺ퀬 있습니다...</p>
            </div>
        }>
            <CommunityDetailContent />
        </Suspense>
    );
}

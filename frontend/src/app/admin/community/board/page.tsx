'use client';

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

const DEFAULT_BBS_ID = 'BBSMSTR_AAAAAAAAAAAA'; // 怨듭??ы빆 湲곕낯媛?
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

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<BoardPost[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        async function loadPosts() {
            try {
                setLoading(true);
                // ?ㅼ쭏?곸쑝濡쒕뒗 communityId???곕Ⅸ bbsId瑜?議고쉶?댁빞 ???섎룄 ?덉쑝??
                // 湲곗〈 濡쒖쭅??紐낆떆??寃쎈줈瑜??곕쫭?덈떎.
                const res = await boardUserService.getPosts(values.bbsId, {
                    page: parseInt(values.page),
                    size: 10,
                    searchWrd: values.searchWrd,
                    searchCnd: values.searchCnd
                });
                setData(res.list || []);
                setTotal(res.total || 0);
            } catch {
                toast('紐⑸줉??遺덈윭?ㅻ뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
            } finally {
                setLoading(false);
            }
        }
        loadPosts();
    }, [values, toast, communityId, values.bbsId, values.page, values.searchWrd, values.searchCnd]);

    const columns = [
        {
            header: '踰덊샇',
            accessor: (item: BoardPost) => (
                item.noticeAt === 'Y' ?
                    <span className="flex items-center gap-1.5 text-blue-600 font-bold"><Megaphone size={14} /> 怨듭?</span> :
                    item.nttId
            ),
            className: 'w-20'
        },
        {
            header: '?쒕ぉ',
            accessor: (item: BoardPost) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground hover:text-primary transition-colors">{item.nttSj}</span>
                    {item.nttCn ? <span className="text-[11px] text-muted-foreground line-clamp-1">{item.nttCn.substring(0, 50)}</span> : null}
                </div>
            ),
            className: 'min-w-[300px]'
        },
        { header: '?묒꽦??, accessor: (item: BoardPost) => item.ntcrNm || '?듬챸' },
        { header: '?좎쭨', accessor: (item: BoardPost) => item.createdDate?.substring(0, 10) || '-' },
        {
            header: '議고쉶',
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
                title="而ㅻ??덊떚 ?곸꽭 諛?寃뚯떆湲"
                breadcrumbs={[{ label: '而ㅻ??덊떚 愿由?, href: '/admin/community' }, { label: '而ㅻ??덊떚 ?곸꽭' }]}
                actions={
                    <button
                        onClick={() => router.push('/admin/community/boards/write')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-[0.1rem] font-bold shadow-md hover:shadow-lg transition"
                    >
                        <Plus size={18} /> ??湲 ?곌린
                    </button>
                }
            />

            <StandardSearchFilter
                fields={[
                    {
                        name: 'bbsId',
                        label: '寃뚯떆???좏깮',
                        type: 'select',
                        options: [
                            { label: '怨듭??ы빆', value: 'BBSMSTR_AAAAAAAAAAAA' },
                            { label: '?먯쑀寃뚯떆??, value: 'BBSMSTR_BBBBBBBBBBBB' },
                            { label: '?낅Т寃뚯떆??, value: 'BBSMSTR_CCCCCCCCCCCC' }
                        ]
                    },
                    { name: 'searchWrd', label: '寃?됱뼱', type: 'text', placeholder: '?쒕ぉ, ?댁슜 ?낅젰...' },
                    {
                        name: 'searchCnd',
                        label: '寃??議곌굔',
                        type: 'select',
                        options: [
                            { label: '?쒕ぉ', value: '0' },
                            { label: '?댁슜', value: '1' },
                            { label: '?묒꽦??, value: '2' }
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
                emptyMessage="寃뚯떆湲??議댁옱?섏? ?딆뒿?덈떎."
            />

            <div className="flex justify-center pt-4">
                <p className="text-sm text-muted-foreground font-medium">
                    珥?<span className="text-foreground font-bold">{total}</span> 媛쒖쓽 寃뚯떆湲???덉뒿?덈떎.
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
                <p className="text-muted-foreground font-medium animate-pulse">而ㅻ??덊떚 ?뺣낫瑜?遺덈윭?ㅺ퀬 ?덉뒿?덈떎...</p>
            </div>
        }>
            <CommunityDetailContent />
        </Suspense>
    );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/api/client';
import type { components } from '@/types/generated-api';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Plus, Trash2, ExternalLink, FileText, RefreshCcw } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';

/** 스크랩 계약의 SSOT 는 생성 타입이다(로컬 인터페이스 재선언 금지). */
type Scrap = components['schemas']['ScrapDto'];
type ScrapPage = components['schemas']['PageResponseScrapDto'];

const PAGE_UNIT = 10;

const ScrapListClient = () => {
    const { toast } = useToast();
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const [pageNo, setPageNo] = React.useState(1);

    // 백엔드(ScrapApiController)는 pageIndex(1-base)/pageUnit 파라미터를 직접 읽는다.
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['scraps', pageNo],
        queryFn: () => axios.get<ScrapPage>('/scraps', { params: { pageIndex: pageNo, pageUnit: PAGE_UNIT } }),
    });

    const list: Scrap[] = data?.list ?? [];
    const totalCount = data?.total ?? 0;
    const totalPages = data?.totalPage ?? 0;

    const deleteMutation = useMutation({
        mutationFn: (scrapId: string) => axios.delete<void>(`/scraps/${scrapId}`),
        onSuccess: () => {
            toast('스크랩이 삭제되었습니다.', 'success');
            queryClient.invalidateQueries({ queryKey: ['scraps'] });
        },
        onError: () => toast('삭제에 실패했습니다.', 'error'),
    });

    /** [P1-9] native confirm → useConfirm. 본문에 대상 스크랩명을 노출한다. */
    const handleDelete = async (item: Scrap) => {
        if (!item.scrapId) return;
        const ok = await confirm({
            title: '스크랩 삭제',
            message: `'${item.scrapNm ?? '제목 없음'}' 스크랩을 삭제합니다. 삭제한 항목은 복구할 수 없습니다.`,
            confirmText: '삭제',
            variant: 'destructive',
        });
        if (ok) deleteMutation.mutate(item.scrapId);
    };

    const columns: Column<Scrap>[] = [
        {
            header: '번호',
            accessor: (_, index) => (
                <span className="font-mono text-xs font-bold text-muted-foreground">
                    {totalCount - ((pageNo - 1) * PAGE_UNIT) - (index ?? 0)}
                </span>
            ),
            className: 'w-20 text-center'
        },
        {
            header: '스크랩명',
            accessor: (item) => (
                <Link
                    href={`/admin/collaboration/scraps/selectScrapDetail/${item.scrapId}`}
                    className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                    <FileText className="w-4 h-4 opacity-40" /> {item.scrapNm}
                </Link>
            ),
            className: 'w-[250px]'
        },
        {
            header: 'URL / 설명',
            accessor: (item) => (
                <div className="flex flex-col gap-1 py-1">
                    {/* [보안] javascript: 등 위험 스킴 차단 — http/https 가 아니면 링크로 만들지 않는다. */}
                    <a
                        href={/^https?:\/\//i.test(item.scrapUrl || '') ? item.scrapUrl : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-hub-blue hover:underline flex items-center gap-1.5 font-medium group/link"
                    >
                        {(item.scrapUrl?.length ?? 0) > 70 ? `${item.scrapUrl?.substring(0, 70)}...` : item.scrapUrl}
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                    <span className="text-sm text-muted-foreground font-medium truncate max-w-[500px]">{item.scrapExpln || '설명 없음'}</span>
                </div>
            )
        },
        {
            header: '등록일',
            accessor: (item) => (
                <span className="text-sm text-muted-foreground font-medium tabular-nums">{item.crtDt?.substring(0, 10)}</span>
            ),
            className: 'w-[120px] text-center'
        },
        {
            header: '관리',
            accessor: (item) => (
                <div className="flex items-center justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${item.scrapNm ?? '스크랩'} 삭제`}
                        onClick={() => { void handleDelete(item); }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive-emphasis hover:bg-destructive/10 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
            className: 'w-[100px] text-center'
        }
    ];

    return (
        <div className="flex flex-col gap-6">
            <DynamicBreadcrumb />

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-6 bg-gradient-to-r from-muted/50 to-transparent border-b px-10 pt-10">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Bookmark className="w-6 h-6 text-primary" /> 스크랩 목록
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">나중에 다시 볼 중요한 페이지와 정보를 관리하세요.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            aria-label="스크랩 목록 새로고침"
                            onClick={() => { void refetch(); }}
                            className="gap-2 font-bold"
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                        <Link href="/admin/collaboration/scraps/insertScrap">
                            <Button size="sm" className="gap-2 shadow-sm font-bold">
                                <Plus className="w-4 h-4" /> 신규 등록
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="p-10 pt-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="bg-muted px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border">
                            전체 <span className="text-primary font-bold">{isError ? '-' : totalCount}</span>건의 스크랩
                        </div>
                    </div>

                    <StandardDataTable<Scrap>
                        columns={columns}
                        data={list}
                        keyField="scrapId"
                        loading={isLoading}
                        error={isError ? (error as Error) : null}
                        onRetry={() => { void refetch(); }}
                        emptyMessage="저장된 스크랩이 없습니다. 유익한 정보를 저장해보세요."
                        pagination={{
                            currentPage: pageNo,
                            totalPages,
                            onPageChange: setPageNo,
                            totalCount,
                            pageSize: PAGE_UNIT,
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default ScrapListClient;

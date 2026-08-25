'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/api/client';
import type { components } from '@/types/generated-api';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ExternalLink, RefreshCcw } from "lucide-react";
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';

/** 스크랩 계약의 SSOT 는 생성 타입이다(로컬 인터페이스 재선언 금지). */
type Scrap = components['schemas']['ScrapDto'];
type ScrapPage = components['schemas']['PageResponseScrapDto'];

const DEFAULT_PAGE_UNIT = 10;

/**
 * A1(조회형 목록) archetype 이행 — docs/02-architecture/work-screen-grammar-catalog.md §5 A1.
 *
 * 종전에는 Card + 그라데이션 헤더 + 장식 카운트 칩이 표를 감싸고, 총 건수가 상단 칩과 표 하단
 * 요약에 두 번 나왔다. 셸로 옮기면서 장식을 걷어내고 총 건수 출처를 툴바 한 곳으로 모았으며,
 * A1 필수인 열 정렬과 페이지당 건수 선택을 채웠다.
 */
const ScrapListClient = () => {
    const { toast } = useToast();
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const [pageNo, setPageNo] = React.useState(1);
    const [pageUnit, setPageUnit] = React.useState(DEFAULT_PAGE_UNIT);

    // 백엔드(ScrapApiController)는 pageIndex(1-base)/pageUnit 파라미터를 직접 읽는다.
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['scraps', pageNo, pageUnit],
        queryFn: () => axios.get<ScrapPage>('/scraps', { params: { pageIndex: pageNo, pageUnit } }),
    });

    const list: Scrap[] = data?.list ?? [];
    const totalCount = data?.total ?? 0;
    const totalPages = data?.totalPage ?? 0;

    const deleteMutation = useMutation({
        mutationFn: (scrapSn: number) => axios.delete<void>(`/scraps/${scrapSn}`),
        onSuccess: () => {
            toast('스크랩이 삭제되었습니다.', 'success');
            queryClient.invalidateQueries({ queryKey: ['scraps'] });
        },
        onError: () => toast('삭제에 실패했습니다.', 'error'),
    });

    /** [P1-9] native confirm → useConfirm. 본문에 대상 스크랩명을 노출한다. */
    const handleDelete = async (item: Scrap) => {
        if (!item.scrapSn) return;
        const ok = await confirm({
            title: '스크랩 삭제',
            message: `'${item.scrapNm ?? '제목 없음'}' 스크랩을 삭제합니다. 삭제한 항목은 복구할 수 없습니다.`,
            confirmText: '삭제',
            variant: 'destructive',
        });
        if (ok) deleteMutation.mutate(item.scrapSn);
    };

    const columns: Column<Scrap>[] = [
        {
            header: '번호',
            accessor: (_, index) => (
                <span className="font-mono text-xs font-bold text-muted-foreground">
                    {totalCount - ((pageNo - 1) * pageUnit) - (index ?? 0)}
                </span>
            ),
            className: 'w-20 text-center'
        },
        {
            // G4 — 행을 식별하고 상세로 들어가는 진입점은 이 열이다.
            header: '스크랩명',
            accessor: (item) => (
                <Link
                    href={`/admin/collaboration/scraps/selectScrapDetail/${item.scrapSn}`}
                    className="font-bold text-foreground hover:text-primary transition-colors"
                >
                    {item.scrapNm}
                </Link>
            ),
            sortKey: 'scrapNm',
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
            sortKey: 'crtDt',
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
        <WorkListPage
            title="스크랩 목록"
            description="나중에 다시 볼 중요한 페이지와 정보를 관리합니다."
            // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다 — 숫자를 찍으면 빈 결과와 구분되지 않는다.
            totalCount={isError ? undefined : totalCount}
            actions={
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label="스크랩 목록 새로고침"
                        onClick={() => { void refetch(); }}
                        className="gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" aria-hidden="true" />
                        새로고침
                    </Button>
                    {/* 링크 안 버튼 중첩(상호작용 2중)을 피한다 — 이동은 link 역할이 옳다. */}
                    <Button asChild size="sm" className="gap-2">
                        <Link href="/admin/collaboration/scraps/insertScrap">
                            <Plus className="w-4 h-4" aria-hidden="true" /> 신규 등록
                        </Link>
                    </Button>
                </>
            }
        >
            <StandardDataTable<Scrap>
                accessibleLabel="스크랩 목록"
                columns={columns}
                data={list}
                keyField="scrapSn"
                loading={isLoading}
                error={isError ? (error as Error) : null}
                onRetry={() => { void refetch(); }}
                emptyMessage="저장된 스크랩이 없습니다. 유익한 정보를 저장해보세요."
                pagination={{
                    currentPage: pageNo,
                    totalPages,
                    onPageChange: setPageNo,
                    // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
                    pageSize: pageUnit,
                    onPageSizeChange: (size) => {
                        setPageUnit(size);
                        setPageNo(1);
                    },
                }}
            />
        </WorkListPage>
    );
};

export default ScrapListClient;

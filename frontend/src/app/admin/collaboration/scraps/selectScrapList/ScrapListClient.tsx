'use client';

import React from 'react';
import Link from 'next/link';
import { ScrapFormDialog, type ScrapFormValues } from '../ScrapFormDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Scrap } from '@/services/business/user/ScrapService';
import { scrapMutationOptions, scrapQueryOptions } from '@/queries/scrap-query-options';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ExternalLink, RefreshCcw } from "lucide-react";
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';

const DEFAULT_PAGE_UNIT = 10;

/**
 * 스크랩 URL을 분석하여 안전한 링크 정보를 생성한다.
 * - 내부 eGov 레거시 경로(/cop/bbs/selectArticleDetail.do?bbsId=...&nttId=...)는 표준 Next.js 경로로 변환
 * - 내부 상대경로(/...)는 Next.js <Link>로 연결하여 SPA 이동
 * - 외부 http/https 경로는 <a> 새 창 열기
 * - javascript: 등 위험 스킴은 null 반환(텍스트만 표시)
 */
export function parseScrapUrl(url: string | undefined): { isInternal: boolean; resolvedHref: string } | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed || /[\r\n\t]/.test(trimmed)) return null;

    // 내부 상대 경로 (/...) — 프로토콜 상대 경로(//, /\) 및 오픈 리다이렉트 차단
    //
    // ⚠ 레거시 변환은 **내부 경로에만** 적용한다. 스킴 검증보다 먼저 bbsId/nttId 를 찾으면
    //   `https://example.com/x?bbsId=A&nttId=1` 같은 외부 주소가 호스트를 잃고 내부 게시글
    //   경로로 바뀌어, 목록에 보이는 글자와 실제 이동 목적지가 달라진다.
    if (trimmed.startsWith('/') && !/^\/[\\/]/.test(trimmed)) {
        // eGov 레거시 게시판 경로(/cop/bbs/selectArticleDetail.do?bbsId=...&nttId=...) → 표준 경로
        const bbsMatch = trimmed.match(/[?&]bbsId=([^&#\s]+)/i)?.[1];
        const nttMatch = trimmed.match(/[?&](?:pstSn|nttId)=([^&#\s]+)/i)?.[1];
        if (bbsMatch && nttMatch) {
            return {
                isInternal: true,
                resolvedHref: `/admin/community/boards/detail?bbsId=${encodeURIComponent(bbsMatch)}&pstSn=${encodeURIComponent(nttMatch)}`,
            };
        }
        return {
            isInternal: true,
            resolvedHref: trimmed,
        };
    }

    // 외부 절대 URL (http / https 만 허용, new URL 로 스킴 엄격 검증)
    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return {
                    isInternal: false,
                    resolvedHref: parsed.href,
                };
            }
        } catch {
            return null;
        }
    }

    return null;
}

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
    const deletePendingRef = React.useRef(false);
    /*
      [2026-09-12 §A3-1] 등록·수정을 전용 페이지에서 목록 위 모달로 옮겼다. 목록의 page·pageSize 는
      useState 이고 URL 에 실리지 않아, 라우트를 떠나면 조회 맥락이 전손됐다.
    */
    const [formMode, setFormMode] = React.useState<'create' | 'edit' | null>(null);
    const [editTarget, setEditTarget] = React.useState<{ scrapSn: number; values: ScrapFormValues } | null>(null);
    const [deletingScrapSn, setDeletingScrapSn] = React.useState<number | null>(null);

    // 백엔드(ScrapApiController)는 pageIndex(1-base)/pageUnit 파라미터를 직접 읽는다.
    const { data, isLoading, isError, error, refetch } = useQuery(
        scrapQueryOptions.list({ pageIndex: pageNo, pageUnit }),
    );

    const list: Scrap[] = data?.list ?? [];
    const totalCount = data?.total ?? 0;
    const totalPages = data?.totalPage ?? 0;

    const deleteMutation = useMutation({
        ...scrapMutationOptions.remove(queryClient),
        onSuccess: () => {
            toast('스크랩이 삭제되었습니다.', 'success');
        },
        onError: (error: Error) => {
            toast(error instanceof Error && error.message ? error.message : '삭제에 실패했습니다.', 'error');
        },
    });

    /** [P1-9] native confirm → useConfirm. 본문에 대상 스크랩명을 노출한다. */
    const handleDelete = async (item: Scrap) => {
        if (!item.scrapSn || deletePendingRef.current) return;
        deletePendingRef.current = true;
        setDeletingScrapSn(item.scrapSn);
        try {
            const ok = await confirm({
                title: '스크랩 삭제',
                message: `'${item.scrapNm ?? '제목 없음'}' 스크랩을 삭제합니다. 삭제한 항목은 복구할 수 없습니다.`,
                confirmText: '삭제',
                variant: 'destructive',
            });
            if (!ok) return;
            try {
                await deleteMutation.mutateAsync(item.scrapSn);
            } catch {
                // mutation onError가 사용자 안내를 소유한다. 목록과 선택 상태는 그대로 둔다.
            }
        } finally {
            deletePendingRef.current = false;
            setDeletingScrapSn(null);
        }
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
            /*
              G4 — 행을 식별하고 편집으로 들어가는 진입점은 이 열이다.
              [2026-09-12 §A3-1] 종전 목적지 `selectScrapDetail/[id]` 는 이름과 달리 **열람 표면이 0** 인
              수정 전용 페이지였다(제목·입력 3개·삭제·저장뿐). 그래서 상세 라우트가 아니라 수정 모달을 연다.
            */
            header: '스크랩명',
            accessor: (item) => (
                <button
                    type="button"
                    onClick={() => {
                        setEditTarget({
                            scrapSn: item.scrapSn as number,
                            values: {
                                scrapNm: item.scrapNm ?? '',
                                scrapUrl: item.scrapUrl ?? '',
                                scrapExpln: item.scrapExpln ?? '',
                            },
                        });
                        setFormMode('edit');
                    }}
                    className="font-bold text-foreground hover:text-primary transition-colors text-left"
                >
                    {item.scrapNm}
                </button>
            ),
            sortKey: 'scrapNm',
            className: 'w-[250px]'
        },
        {
            header: 'URL / 설명',
            accessor: (item) => {
                const parsed = parseScrapUrl(item.scrapUrl);
                const displayUrl = (item.scrapUrl?.length ?? 0) > 70
                    ? `${item.scrapUrl?.substring(0, 70)}...`
                    : item.scrapUrl;

                return (
                    <div className="flex flex-col gap-1 py-1">
                        {parsed ? (
                            parsed.isInternal ? (
                                <Link
                                    href={parsed.resolvedHref}
                                    className="text-sm text-hub-blue hover:underline flex items-center gap-1.5 font-medium group/link"
                                >
                                    {displayUrl}
                                </Link>
                            ) : (
                                <a
                                    href={parsed.resolvedHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-hub-blue hover:underline flex items-center gap-1.5 font-medium group/link"
                                >
                                    {displayUrl}
                                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                </a>
                            )
                        ) : (
                            <span className="text-sm text-muted-foreground font-medium">
                                {item.scrapUrl || 'URL 없음'}
                            </span>
                        )}
                        <span className="text-sm text-muted-foreground font-medium truncate max-w-[500px]">
                            {item.scrapExpln || '설명 없음'}
                        </span>
                    </div>
                );
            }
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
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${item.scrapNm ?? '스크랩'} 수정`}
                        disabled={deletingScrapSn !== null}
                        onClick={() => {
                            setEditTarget({
                                scrapSn: item.scrapSn as number,
                                values: {
                                    scrapNm: item.scrapNm ?? '',
                                    scrapUrl: item.scrapUrl ?? '',
                                    scrapExpln: item.scrapExpln ?? '',
                                },
                            });
                            setFormMode('edit');
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${item.scrapNm ?? '스크랩'} ${deletingScrapSn === item.scrapSn ? '삭제 중' : '삭제'}`}
                        aria-busy={deletingScrapSn === item.scrapSn || undefined}
                        disabled={deletingScrapSn !== null}
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
                    {/* [2026-09-12 §A3-1] 페이지 이동이 아니라 모달이므로 button 역할이 옳다. */}
                    <Button size="sm" className="gap-2" onClick={() => { setEditTarget(null); setFormMode('create'); }}>
                        <Plus className="w-4 h-4" aria-hidden="true" /> 신규 등록
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
            {formMode ? (
                <ScrapFormDialog
                    isOpen
                    mode={formMode}
                    scrapSn={editTarget?.scrapSn}
                    initialValues={editTarget?.values}
                    onClose={() => { setFormMode(null); setEditTarget(null); }}
                    // 저장 후 목록만 다시 읽는다 — 현재 페이지가 보존되는 것이 이 이행의 실질이다.
                    onSaved={() => { void refetch(); }}
                />
            ) : null}
        </WorkListPage>
    );
};

export default ScrapListClient;

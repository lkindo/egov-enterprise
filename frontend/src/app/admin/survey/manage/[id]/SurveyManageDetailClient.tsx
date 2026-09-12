'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { parseStorageYmd, toDisplayYmd } from "@/lib/format-date";
import { AlertTriangle, ArrowLeft, Pencil, RefreshCcw, Trash2 } from "lucide-react";
import { pollUserService } from '@/services/business/user/poll/PollUserService';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { SurveyFormDialog } from '../SurveyFormDialog';

const POLL_KIND_LABEL: Record<string, string> = {
    '001': '일반 설문',
    '002': '투표',
};

/**
 * 설문(여론조사) 상세 — **열람** 화면.
 *
 * [2026-09-12 §A3-1] 종전 이 라우트는 이름과 달리 열람과 입력을 겸했다(입력 5개·474줄).
 * 업무 화면 문법 §A3-1 은 한 라우트가 둘을 겸하면 **열람을 라우트에 남기고 입력 컨트롤만
 * 모달로 올린다**고 정한다. 이 라우트를 없애지 않는 이유는 항목별 득표라는 진짜 열람 표면이
 * 있기 때문이다 — 목록에도 다른 어느 화면에도 그 수치는 없다.
 *
 * ⚠ 수정은 `SurveyFormDialog` 가 소유하며 **열릴 때만 마운트한다**. 모달의 폼 상태는 props 를
 *   초기값으로 한 번만 읽으므로(useState-from-props), 상시 마운트해 두고 isOpen 만 토글하면
 *   먼저 연 대상의 값이 나중 대상 위에 저장되는 사고가 난다.
 *
 * [고친 것 · 2026-08-28] 종전에는 URL 의 `[id]` 를 한 번도 읽지 않고 빈 폼을 띄운 뒤
 * `createPoll()` 을 호출해, 목록에서 행을 눌러 저장하면 같은 설문이 하나 더 생겼다.
 */
export default function SurveyManageDetailClient() {
    const router = useRouter();
    const routeParams = useParams();
    const queryClient = useQueryClient();
    const { success, error: toastError } = useToast();
    // 파괴적 액션은 native confirm 대신 useConfirm — 본문에 대상 설문명과 결과 소실을 노출한다.
    const confirm = useConfirm();

    const rawId = routeParams?.id;
    const pollSnParam = Array.isArray(rawId) ? rawId[0] : (rawId ?? '');
    const pollSn = Number(pollSnParam);
    const hasValidPollSn = Number.isSafeInteger(pollSn) && pollSn > 0;

    const {
        data: poll,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['poll-detail', pollSn],
        queryFn: () => pollUserService.getPollDetail(pollSn),
        enabled: hasValidPollSn,
    });

    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const deletingRef = useRef(false);
    /*
     * 삭제 실패 사유를 화면에도 남긴다. 토스트는 사라지므로 "왜 안 지워졌는지"를 사용자가
     * 놓치기 쉽고, 파괴적 액션일수록 그 사유가 화면에 머물러야 한다.
     */
    const [deleteError, setDeleteError] = useState<string | null>(null);

    /**
     * 설문 삭제.
     *
     * ⚠ 되돌릴 수 없다 — deletePoll 은 FK(NO ACTION) 때문에 tb_onln_poll_rslt 를 먼저 지운다.
     *   즉 **투표 결과가 함께 사라진다.** 확인 문구에 그 사실을 그대로 적는다.
     *   진행을 멈추기만 하려면 수정 모달의 '폐기' 로 충분하고 그쪽은 되돌릴 수 있다.
     */
    const handleDelete = async () => {
        if (deletingRef.current || isEditing) return;

        const ok = await confirm({
            title: '설문 삭제',
            message: `'${poll?.pollNm ?? pollSn}' 설문을 삭제하시겠습니까? 이미 모인 투표 결과도 함께 삭제되며 되돌릴 수 없습니다. 진행을 멈추기만 하려면 '수정'에서 '폐기'를 사용하세요.`,
            confirmText: '삭제',
            variant: 'destructive',
        });
        if (!ok) return;

        deletingRef.current = true;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await pollUserService.deletePoll(pollSn);
            success('설문을 삭제했습니다.');
            await queryClient.invalidateQueries({ queryKey: ['admin-polls'] });
            router.push('/admin/survey/manage');
        } catch (e) {
            const message = e instanceof Error ? e.message : '설문 삭제에 실패했습니다.';
            setDeleteError(message);
            toastError(message);
        } finally {
            deletingRef.current = false;
            setIsDeleting(false);
        }
    };

    /*
      저장 뒤에는 목록과 이 상세를 **둘 다** 다시 읽는다. 전역 staleTime 이 60초라 상세 키를
      비우지 않으면 방금 고친 값 대신 예전 값이 최대 1분 동안 그대로 보이고, 화면은 그 사실을
      말하지 않는다(오류가 아니므로 아무 신호도 없다).
    */
    const handleSaved = async () => {
        setIsEditing(false);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-polls'] }),
            queryClient.invalidateQueries({ queryKey: ['poll-detail', pollSn] }),
        ]);
    };

    const periodText = poll
        ? `${toDisplayYmd(poll.pollBgngYmd) || '—'} ~ ${toDisplayYmd(poll.pollEndYmd) || '—'}`
        : '—';

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="rounded-lg font-bold gap-2">
                    <ArrowLeft className="w-4 h-4" /> 뒤로가기
                </Button>
            </div>

            <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-lg bg-card ring-1 ring-border">
                <CardHeader className="bg-surface-inverse pb-12 pt-12 px-10 text-surface-inverse-foreground relative overflow-hidden">
                    <div className="relative z-10 space-y-2">
                        <h1 className="text-3xl font-bold tracking-tighter">설문 상세</h1>
                        <p className="font-medium opacity-70">기본 정보와 응답 선택지별 득표를 확인합니다. 수정은 이 화면의 &lsquo;수정&rsquo;에서 합니다.</p>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                    {/* 조회 실패를 빈 화면으로 위장하지 않는다(P1-1). */}
                    {isError ? (
                        <div role="alert" className="flex flex-col items-center gap-6 py-16 text-center">
                            <AlertTriangle className="w-10 h-10 text-destructive-emphasis" />
                            <div className="space-y-2">
                                <p className="text-lg font-bold text-foreground">설문 정보를 불러오지 못했습니다.</p>
                                <p className="text-sm text-muted-foreground">잠시 후 다시 시도하거나 목록으로 돌아가 주세요.</p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => void refetch()} className="rounded-lg font-bold gap-2">
                                    <RefreshCcw className="w-4 h-4" /> 다시 시도
                                </Button>
                                <Button variant="ghost" onClick={() => router.push('/admin/survey/manage')} className="rounded-lg font-bold">
                                    목록으로
                                </Button>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="space-y-10">
                            <Skeleton className="h-11 w-full rounded-lg" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Skeleton className="h-11 w-full rounded-lg" />
                                <Skeleton className="h-11 w-full rounded-lg" />
                            </div>
                            <Skeleton className="h-11 w-full rounded-lg" />
                        </div>
                    ) : (
                        <>
                            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="space-y-1 sm:col-span-2">
                                    <dt className="text-sm font-bold text-muted-foreground">설문명</dt>
                                    <dd className="text-base font-bold text-foreground">{poll?.pollNm || '—'}</dd>
                                </div>
                                <div className="space-y-1">
                                    <dt className="text-sm font-bold text-muted-foreground">기간</dt>
                                    <dd className="tabular-nums text-foreground">{periodText}</dd>
                                </div>
                                <div className="space-y-1">
                                    <dt className="text-sm font-bold text-muted-foreground">설문 유형</dt>
                                    {/* 목록에 없는 레거시 코드(POLL01 등)는 지어내지 않고 코드 그대로 보여 준다. */}
                                    <dd className="text-foreground">
                                        {POLL_KIND_LABEL[poll?.pollKndCd ?? ''] ?? (poll?.pollKndCd || '—')}
                                    </dd>
                                </div>
                                <div className="space-y-1">
                                    <dt className="text-sm font-bold text-muted-foreground">진행 상태</dt>
                                    <dd className="text-foreground">{poll?.pollDsuseYn === 'Y' ? '폐기(투표 중지)' : '진행 중'}</dd>
                                </div>
                            </dl>

                            {/*
                              [2026-08-28] 응답 선택지 노출.
                              서버는 상세 응답에 pollArticles 를 담아 보내는데 프런트 타입에 선언이 없어
                              화면이 존재를 몰랐다 — 관리자는 자기가 만든 설문의 선택지를 어디에서도 볼 수
                              없었다. 등록 화면이 4개를 고정하므로 실제로 무엇이 저장됐는지는 더욱 중요하다.

                              여기서 고칠 수는 없다: updatePoll 은 항목을 clear-and-recreate 하는데
                              tb_onln_poll_rslt.poll_artcl_sn → tb_onln_poll_artcl 외래키가 NO ACTION 이라
                              (V2_67) 투표가 한 건이라도 있으면 저장이 실패한다. 항목 단건 수정
                              (OnlinePollService.updatePollItem)은 구현돼 있으나 어느 컨트롤러도 노출하지
                              않는다. 그래서 편집 컨트롤을 두지 않고, 못 고친다는 사실을 그대로 적는다.
                            */}
                            <div className="space-y-3">
                                <h2 className="text-sm font-bold text-muted-foreground ml-1">응답 선택지</h2>
                                {(poll?.pollArticles?.length ?? 0) === 0 ? (
                                    <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                                        등록된 선택지가 없습니다.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-border rounded-lg border border-border">
                                        {poll?.pollArticles?.map((article) => (
                                            <li
                                                key={article.pollArtclSn ?? article.pollArtclNm}
                                                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                                            >
                                                <span className="font-medium text-foreground">{article.pollArtclNm}</span>
                                                {/*
                                                  ⚠ 서버는 득표를 숨길 때 null 을 보낸다(OnlinePollService#maskVoteCounts).
                                                  종전에는 `?? 0` 으로 0표라고 적었는데, 그것은 "아무도 고르지 않았다"는
                                                  **사실 주장**이라 화면이 거짓말을 하게 된다. 숨겨진 것은 숨겨졌다고 말한다.
                                                */}
                                                <span className="tabular-nums text-xs text-muted-foreground">
                                                    {article.pollIemCo == null ? '집계 비공개' : `${article.pollIemCo}표`}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p className="px-1 text-xs text-muted-foreground">
                                    선택지는 설문을 만들 때 정해지며 이 화면에서는 바꿀 수 없습니다.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-6 sm:flex-row">
                                {/* [2026-09-12 §A3-1] 페이지 이동이 아니라 모달이므로 button 역할이 옳다. */}
                                <Button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    disabled={isDeleting}
                                    data-testid="poll-edit-button"
                                    className="h-11 flex-1 rounded-lg font-bold gap-3"
                                >
                                    <Pencil className="w-5 h-5" aria-hidden="true" /> 수정
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { void handleDelete(); }}
                                    disabled={isDeleting || isEditing}
                                    aria-busy={isDeleting || undefined}
                                    className="h-11 rounded-lg border-2 border-destructive/30 font-bold text-destructive-emphasis hover:bg-destructive hover:text-destructive-foreground sm:w-48"
                                >
                                    <Trash2 className="w-5 h-5" aria-hidden="true" /> {isDeleting ? '삭제 중…' : '설문 삭제'}
                                </Button>
                            </div>

                            {deleteError ? (
                                <p role="alert" className="text-sm font-medium text-destructive-emphasis">
                                    {deleteError}
                                </p>
                            ) : null}
                        </>
                    )}
                </CardContent>
            </Card>

            {isEditing && poll ? (
                <SurveyFormDialog
                    isOpen
                    mode="edit"
                    pollSn={pollSn}
                    initialValues={{
                        pollNm: poll.pollNm ?? '',
                        pollKndCd: poll.pollKndCd ?? '001',
                        pollDsuseYn: poll.pollDsuseYn ?? 'N',
                        // 저장 포맷이 손상된 값('2026-05-' 등)이면 null 이 되어 '미선택'으로 뜬다.
                        // 임의 보정하지 않는다 — 사용자가 다시 고르지 않으면 저장이 막힌다.
                        beginDate: parseStorageYmd(poll.pollBgngYmd) ?? undefined,
                        endDate: parseStorageYmd(poll.pollEndYmd) ?? undefined,
                    }}
                    onClose={() => setIsEditing(false)}
                    onSaved={() => { void handleSaved(); }}
                />
            ) : null}
        </div>
    );
}

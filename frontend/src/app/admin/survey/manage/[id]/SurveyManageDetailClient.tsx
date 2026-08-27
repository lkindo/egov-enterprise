'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { parseStorageYmd, toDisplayYmd, toStorageYmd } from "@/lib/format-date";
import { AlertTriangle, CalendarIcon, ArrowLeft, RefreshCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { pollUserService } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO } from '@/types/business/poll';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { pollFormSchema } from '../poll-form-validation';

const pollValidationLabels = {
    pollNm: '설문명',
    pollBgngYmd: '시작일',
    pollEndYmd: '종료일',
    pollKndCd: '설문 유형',
    pollDsuseYn: '사용 여부',
};

/**
 * 설문 상세(수정) 화면.
 *
 * [고친 것] 종전 이 화면은 URL 의 `[id]` 를 **한 번도 읽지 않고** 빈 폼을 띄운 뒤
 * `createPoll()` 을 호출했다. 즉 목록에서 설문 행을 클릭해 '저장'하면 같은 설문이
 * 하나 더 생기는 중복 생성 경로였다(감사 §2 '상세=빈 등록폼(중복 생성)').
 * 이제 상세를 조회해 폼을 채우고 `updatePoll()` 로 저장한다.
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

    const [formData, setFormData] = useState<OnlinePollManageVO>({
        pollNm: '',
        pollBgngYmd: '',
        pollEndYmd: '',
        pollKndCd: '001',
        pollDsuseYn: 'N',
    });
    const [beginDate, setBeginDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [isSaving, setIsSaving] = useState(false);
    const savingRef = useRef(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const deletingRef = useRef(false);
    /*
     * 삭제 실패 사유를 화면에도 남긴다. 토스트는 사라지므로 "왜 안 지워졌는지"를 사용자가
     * 놓치기 쉽고, 파괴적 액션일수록 그 사유가 화면에 머물러야 한다.
     */
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const validation = useManualFormValidation(pollFormSchema, { labels: pollValidationLabels });

    // 조회 성공 시 폼을 서버 값으로 초기화한다.
    // 저장 포맷('yyyyMMdd')은 손상 값('2026-05-' 등)이면 parseStorageYmd 가 null 을 돌려주므로
    // 날짜 입력이 '미선택'이 되고, 사용자가 다시 고르지 않으면 저장이 막힌다(임의 보정 금지).
    useEffect(() => {
        if (!poll) return;
        setFormData({
            pollSn: poll.pollSn,
            pollNm: poll.pollNm ?? '',
            pollBgngYmd: poll.pollBgngYmd ?? '',
            pollEndYmd: poll.pollEndYmd ?? '',
            pollKndCd: poll.pollKndCd ?? '001',
            pollDsuseYn: poll.pollDsuseYn ?? 'N',
        });
        setBeginDate(parseStorageYmd(poll.pollBgngYmd) ?? undefined);
        setEndDate(parseStorageYmd(poll.pollEndYmd) ?? undefined);
    }, [poll]);

    const handleSave = async () => {
        if (savingRef.current) return;
        if (!hasValidPollSn) {
            toastError('설문 일련번호를 확인할 수 없습니다.');
            return;
        }
        const validated = validation.validate({
            ...formData,
            pollBgngYmd: beginDate ? toStorageYmd(beginDate) : '',
            pollEndYmd: endDate ? toStorageYmd(endDate) : '',
        });
        if (!validated) return;

        savingRef.current = true;
        setIsSaving(true);
        try {
            // 저장 포맷 'yyyyMMdd' 8자 (varchar(8) / @Size(max = 8)) — 10자 전송은 400.
            await pollUserService.updatePoll({
                ...formData,
                ...validated,
                pollSn,
            });
            success('설문 정보를 저장했습니다.');
            // 무인자 invalidateQueries 는 메뉴·알림까지 전역 재요청시킨다 — 키를 한정한다(P2).
            await queryClient.invalidateQueries({ queryKey: ['admin-polls'] });
            await queryClient.invalidateQueries({ queryKey: ['poll-detail', pollSn] });
            router.push('/admin/survey/manage');
        } catch (e) {
            const fieldErrors = extractFieldErrors(e);
            if (fieldErrors) validation.setFormErrors(fieldErrors);
            else toastError(e instanceof Error ? e.message : '설문 저장에 실패했습니다.');
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    };

    /**
     * 설문 삭제.
     *
     * [2026-08-28] 삭제 경로는 위아래로 다 열려 있었는데(DELETE /api/v1/polls/{pollSn} →
     * OnlinePollService.deletePoll → pollUserService.deletePoll) **UI 소비자가 0건**이었다.
     * 그래서 잘못 만든 설문을 지울 방법이 제품에 없었다.
     *
     * ⚠ 되돌릴 수 없다 — deletePoll 은 FK(NO ACTION) 때문에 tb_onln_poll_rslt 를 먼저 지운다.
     *   즉 **투표 결과가 함께 사라진다.** 확인 문구에 그 사실을 그대로 적는다.
     *   진행 중인 설문을 멈추기만 하려면 아래 '폐기' 로 충분하고 그쪽은 되돌릴 수 있다.
     */
    const handleDelete = async () => {
        if (deletingRef.current || savingRef.current) return;

        const ok = await confirm({
            title: '설문 삭제',
            message: `'${poll?.pollNm ?? pollSn}' 설문을 삭제하시겠습니까? 이미 모인 투표 결과도 함께 삭제되며 되돌릴 수 없습니다. 진행을 멈추기만 하려면 '폐기'를 사용하세요.`,
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

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="rounded-lg font-bold gap-2">
                    <ArrowLeft className="w-4 h-4" /> 뒤로가기
                </Button>
            </div>

            <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-lg bg-card ring-1 ring-border">
                <CardHeader className="bg-surface-inverse pb-12 pt-12 px-10 text-surface-inverse-foreground relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                        <Sparkles size={120} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 w-fit rounded-lg border border-white/10 mb-4">
                            <Save className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold tracking-widest">설문 편집</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tighter">설문 상세 관리</h1>
                        <p className="font-medium opacity-70">설문의 기본 정보와 일정을 수정합니다.</p>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                    {/* 조회 실패를 빈 폼으로 위장하지 않는다(P1-1) — 빈 폼은 '새 설문'처럼 보여 중복 생성으로 이어진다. */}
                    {isError ? (
                        <div role="alert" className="flex flex-col items-center gap-6 py-16 text-center">
                            <AlertTriangle className="w-10 h-10 text-rose-500" />
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
                            <FormErrorSummary
                                errors={validation.errors}
                                labels={pollValidationLabels}
                                onNavigate={(name) => { validation.focusError(name); }}
                            />
                            <div className="space-y-3">
                                <Label htmlFor="pollNm" className="text-sm font-bold text-muted-foreground ml-1">설문명 (필수)</Label>
                                <Input
                                    id="pollNm"
                                    {...validation.fieldProps('pollNm')}
                                    value={formData.pollNm}
                                    onChange={(e) => {
                                        validation.clearError('pollNm');
                                        setFormData(prev => ({ ...prev, pollNm: e.target.value }));
                                    }}
                                    required
                                    maxLength={100}
                                    placeholder="설문 주제를 입력하세요"
                                    className="h-11 rounded-lg border-2 bg-muted/50 focus:bg-card transition-all font-bold px-6"
                                />
                                {validation.errors.pollNm ? (
                                    <p {...validation.messageProps('pollNm')} className="text-sm text-destructive-emphasis" />
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label htmlFor="poll-begin-date" className="text-sm font-bold text-muted-foreground ml-1">시작일 (필수)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="poll-begin-date"
                                                {...validation.fieldProps('pollBgngYmd')}
                                                aria-required="true"
                                                variant="outline"
                                                className={cn(
                                                    "h-11 w-full justify-start text-left font-bold rounded-lg border-2 bg-muted/50 px-6",
                                                    !beginDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-3 h-5 w-5 opacity-40" />
                                                {beginDate ? toDisplayYmd(toStorageYmd(beginDate)) : <span>날짜 선택</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 rounded-lg border-none shadow-2xl overflow-hidden">
                                            <Calendar
                                                mode="single"
                                                selected={beginDate}
                                                onSelect={(date) => {
                                                    validation.clearError('pollBgngYmd');
                                                    setBeginDate(date);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {validation.errors.pollBgngYmd ? (
                                        <p {...validation.messageProps('pollBgngYmd')} className="text-sm text-destructive-emphasis" />
                                    ) : null}
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="poll-end-date" className="text-sm font-bold text-muted-foreground ml-1">종료일 (필수)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="poll-end-date"
                                                {...validation.fieldProps('pollEndYmd')}
                                                aria-required="true"
                                                variant="outline"
                                                className={cn(
                                                    "h-11 w-full justify-start text-left font-bold rounded-lg border-2 bg-muted/50 px-6",
                                                    !endDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-3 h-5 w-5 opacity-40" />
                                                {endDate ? toDisplayYmd(toStorageYmd(endDate)) : <span>날짜 선택</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 rounded-lg border-none shadow-2xl overflow-hidden">
                                            <Calendar
                                                mode="single"
                                                selected={endDate}
                                                onSelect={(date) => {
                                                    validation.clearError('pollEndYmd');
                                                    setEndDate(date);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {validation.errors.pollEndYmd ? (
                                        <p {...validation.messageProps('pollEndYmd')} className="text-sm text-destructive-emphasis" />
                                    ) : null}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="poll-knd-cd" className="text-sm font-bold text-muted-foreground ml-1">설문 유형</Label>
                                {/* 목록에 없는 코드값(레거시 'POLL01' 등)이 실려 와도 formData 에 그대로 보존돼 저장 시 유실되지 않는다. */}
                                <Select
                                    value={formData.pollKndCd}
                                    onValueChange={(value) => {
                                        validation.clearError('pollKndCd');
                                        setFormData(prev => ({ ...prev, pollKndCd: value }));
                                    }}
                                >
                                    <SelectTrigger
                                        id="poll-knd-cd"
                                        {...validation.fieldProps('pollKndCd')}
                                        aria-required="true"
                                        className="h-11 rounded-lg border-2 bg-muted/50 font-bold px-6"
                                    >
                                        <SelectValue placeholder="유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border-none shadow-2xl">
                                        <SelectItem value="001" className="font-bold py-3 text-foreground">일반 설문</SelectItem>
                                        <SelectItem value="002" className="font-bold py-3 text-foreground">투표</SelectItem>
                                    </SelectContent>
                                </Select>
                                {validation.errors.pollKndCd ? (
                                    <p {...validation.messageProps('pollKndCd')} className="text-sm text-destructive-emphasis" />
                                ) : null}
                            </div>

                            {/*
                              [2026-08-28] 응답 선택지 노출.
                              서버는 상세 응답에 pollArticles 를 담아 보내는데 프런트 타입에 선언이 없어
                              화면이 존재를 몰랐다 — 관리자는 자기가 만든 설문의 선택지를 어디에서도 볼 수
                              없었다. 등록 화면이 4개를 소스에 고정하므로 실제로 무엇이 저장됐는지는 더욱
                              중요하다.

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
                                                <span className="tabular-nums text-xs text-muted-foreground">
                                                    {article.pollIemCo ?? 0}표
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p className="px-1 text-xs text-muted-foreground">
                                    선택지는 설문을 만들 때 정해지며 이 화면에서는 바꿀 수 없습니다.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="poll-dsuse-yn" className="text-sm font-bold text-muted-foreground ml-1">진행 상태</Label>
                                {/*
                                  [2026-08-28] 폐기 컨트롤 신설. pollDsuseYn 은 폼 state 에만 있고 입력이 없어
                                  **항상 'N'(사용)으로 굳어 있었다** — 진행 중인 설문을 멈출 방법이 없었다.
                                  서버는 이 값을 실제로 집행한다: OnlinePollService.vote 가 'Y' 면
                                  '종료되었거나 폐기된 설문입니다.' 로 투표를 거부한다.
                                  삭제와 달리 되돌릴 수 있고 이미 모인 결과도 보존된다.
                                */}
                                <Select
                                    value={formData.pollDsuseYn}
                                    onValueChange={(value) => {
                                        validation.clearError('pollDsuseYn');
                                        setFormData(prev => ({ ...prev, pollDsuseYn: value }));
                                    }}
                                >
                                    <SelectTrigger
                                        id="poll-dsuse-yn"
                                        {...validation.fieldProps('pollDsuseYn')}
                                        aria-required="true"
                                        className="h-11 rounded-lg border-2 bg-muted/50 font-bold px-6"
                                    >
                                        <SelectValue placeholder="상태 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border-none shadow-2xl">
                                        <SelectItem value="N" className="font-bold py-3 text-foreground">진행 중</SelectItem>
                                        <SelectItem value="Y" className="font-bold py-3 text-foreground">폐기(투표 중지)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="px-1 text-xs text-muted-foreground">
                                    폐기하면 새 투표를 받지 않습니다. 이미 모인 결과는 그대로 남고 언제든 되돌릴 수 있습니다.
                                </p>
                                {validation.errors.pollDsuseYn ? (
                                    <p {...validation.messageProps('pollDsuseYn')} className="text-sm text-destructive-emphasis" />
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-3 pt-6 sm:flex-row">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving || isDeleting}
                                    aria-busy={isSaving || undefined}
                                    className="h-11 flex-1 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-lg tracking-widest shadow-2xl hover:bg-primary transition-all active:scale-95 gap-3"
                                >
                                    <Save className="w-5 h-5" aria-hidden="true" /> {isSaving ? '저장 중…' : '설정 저장'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { void handleDelete(); }}
                                    disabled={isSaving || isDeleting}
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
        </div>
    );
}

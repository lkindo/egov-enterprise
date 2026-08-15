'use client';

import { useEffect, useState } from 'react';
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
import { AlertTriangle, CalendarIcon, ArrowLeft, RefreshCcw, Save, Sparkles } from "lucide-react";
import { pollUserService } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO } from '@/types/business/poll';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/app/components/ui/toast';

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
        if (!hasValidPollSn) {
            toastError('설문 일련번호를 확인할 수 없습니다.');
            return;
        }
        if (!formData.pollNm || !beginDate || !endDate) {
            toastError('필수 항목을 입력해주세요.');
            return;
        }
        if (beginDate > endDate) {
            toastError('설문 시작일은 종료일보다 빨라야 합니다.');
            return;
        }

        setIsSaving(true);
        try {
            // 저장 포맷 'yyyyMMdd' 8자 (varchar(8) / @Size(max = 8)) — 10자 전송은 400.
            await pollUserService.updatePoll({
                ...formData,
                pollSn,
                pollBgngYmd: toStorageYmd(beginDate),
                pollEndYmd: toStorageYmd(endDate),
            });
            success('설문 정보를 저장했습니다.');
            // 무인자 invalidateQueries 는 메뉴·알림까지 전역 재요청시킨다 — 키를 한정한다(P2).
            await queryClient.invalidateQueries({ queryKey: ['admin-polls'] });
            await queryClient.invalidateQueries({ queryKey: ['poll-detail', pollSn] });
            router.push('/admin/survey/manage');
        } catch (e) {
            toastError(e instanceof Error ? e.message : '설문 저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
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
                        <CardTitle className="text-3xl font-bold tracking-tighter">설문 상세 관리</CardTitle>
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
                            <div className="space-y-3">
                                <Label htmlFor="pollNm" className="text-sm font-bold text-muted-foreground ml-1">설문명 (필수)</Label>
                                <Input
                                    id="pollNm"
                                    value={formData.pollNm}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pollNm: e.target.value }))}
                                    placeholder="설문 주제를 입력하세요"
                                    className="h-11 rounded-lg border-2 bg-muted/50 focus:bg-card transition-all font-bold px-6"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label htmlFor="poll-begin-date" className="text-sm font-bold text-muted-foreground ml-1">시작일</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="poll-begin-date"
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
                                                onSelect={setBeginDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="poll-end-date" className="text-sm font-bold text-muted-foreground ml-1">종료일</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="poll-end-date"
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
                                                onSelect={setEndDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="poll-knd-cd" className="text-sm font-bold text-muted-foreground ml-1">설문 유형</Label>
                                {/* 목록에 없는 코드값(레거시 'POLL01' 등)이 실려 와도 formData 에 그대로 보존돼 저장 시 유실되지 않는다. */}
                                <Select
                                    value={formData.pollKndCd}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, pollKndCd: value }))}
                                >
                                    <SelectTrigger id="poll-knd-cd" className="h-11 rounded-lg border-2 bg-muted/50 font-bold px-6">
                                        <SelectValue placeholder="유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border-none shadow-2xl">
                                        <SelectItem value="001" className="font-bold py-3 text-foreground">일반 설문</SelectItem>
                                        <SelectItem value="002" className="font-bold py-3 text-foreground">투표</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex pt-6">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full h-11 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-lg tracking-widest shadow-2xl hover:bg-primary transition-all active:scale-95 gap-3"
                                >
                                    <Save className="w-5 h-5" /> {isSaving ? '저장 중…' : '설정 저장'}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

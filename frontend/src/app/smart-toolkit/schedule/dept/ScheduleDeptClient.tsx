'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
;
;
;
import { format } from "date-fns";
import { Loader2, Pencil,  Trash2,  Plus } from "lucide-react";
import { getDeptScheduleList, createDeptSchedule, updateDeptSchedule, deleteDeptSchedule } from '@/services/business/schedule/deptScheduleService';
import { DeptSchedule, ScheduleSearchParams } from '@/types/business/schedule';
import { toast } from 'sonner';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { deptScheduleFormSchema } from './schedule-form-validation';

const SCHEDULE_FORM_LABELS = {
    schdlNm: '일정명',
    schdlCn: '내용',
    schdlBgngYmd: '시작일',
    schdlEndYmd: '종료일',
    schdlPlcNm: '장소',
};

/**
 * 일정 날짜 컬럼(schdl_bgng_ymd / schdl_end_ymd)은 varchar(8) 'yyyyMMdd' 다.
 * DTO 도 @Size(max = 8) 이라 시각(HH:mm)을 붙여 보내면 컨트롤러 @Valid 에서 400 이 난다.
 * 스키마에 시각 정보 자체가 없으므로 일정은 일(day) 단위다.
 */
const YMD = 'yyyyMMdd';
/** 저장 포맷 'yyyyMMdd' → <input type="date"> 가 요구하는 'yyyy-MM-dd' */
const ymdToInput = (ymd?: string) =>
    ymd && ymd.length >= 8 ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : '';
/** <input type="date"> 의 'yyyy-MM-dd' → 저장 포맷 'yyyyMMdd' */
const inputToYmd = (value: string) => value.replace(/-/g, '');
/** 목록 표시용 'yyyyMMdd' → 'yyyy.MM.dd' (원문 그대로 두면 '20260719' 로 보인다) */
const formatYmd = (ymd?: string) =>
    ymd && ymd.length >= 8 ? `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}` : '-';

/** 조회 실패 사유를 Error 로 정규화한다(목록 영역에 그대로 노출하기 위함). */
const toError = (value: unknown): Error => {
    if (value instanceof Error) return value;
    if (typeof value === 'string' && value) return new Error(value);
    return new Error('부서 일정 목록을 불러오지 못했습니다.');
};

export default function ScheduleDeptClient() {
    const [schedules, setSchedules] = useState<DeptSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    // 조회 실패를 "등록된 일정 없음"으로 위장하지 않기 위해 실패 사유를 목록 영역에 그대로 노출한다.
    const [fetchError, setFetchError] = useState<Error | null>(null);
    // 서버는 pageIndex/pageUnit 을 받는다. 종전의 pageNo 는 ApiService 매핑 대상이 아니라
    // 그대로 전달돼 서버에서 무시됐고, 그래서 '조회' 버튼이 사실상 무동작이었다.
    const [params, setParams] = useState<ScheduleSearchParams>({
        pageIndex: 1,
        schdlNm: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const savingRef = useRef(false);
    const [deletingScheduleSn, setDeletingScheduleSn] = useState<number | null>(null);
    const deletePendingRef = useRef(false);
    const confirm = useConfirm();
    const [editingSchedule, setEditingSchedule] = useState<DeptSchedule | null>(null);
    const [formData, setFormData] = useState<Partial<DeptSchedule>>({
        schdlNm: '',
        schdlCn: '',
        schdlBgngYmd: format(new Date(), YMD),
        schdlEndYmd: format(new Date(), YMD),
        schdlPlcNm: '',
        schdlImprtCd: 'A', // A: 전체, B: 부서, C: 개인
        // [필수] 이 화면은 '부서 일정'이고 GET /schedules/dept 는 schdlSeCd='1' 로 필터한다.
        //   종전에는 이 값을 보내지 않아 null 로 저장됐고, 등록에 성공해도 목록에 영영 나타나지 않았다.
        schdlSeCd: '1',
    });
    const validation = useManualFormValidation(deptScheduleFormSchema, {
        labels: SCHEDULE_FORM_LABELS,
    });

    const fetchList = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const response = await getDeptScheduleList(params);
            setSchedules(response?.list ?? []);
        } catch (err) {
            // 실패를 빈 목록으로 삼키면 화면이 "일정 0건"으로 거짓말한다 — 사유와 재시도 수단을 노출한다.
            setFetchError(toError(err));
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        if (savingRef.current || deletePendingRef.current) return;
        setEditingSchedule(null);
        setFormData({
            schdlNm: '',
            schdlCn: '',
            schdlBgngYmd: format(new Date(), YMD),
            schdlEndYmd: format(new Date(), YMD),
            schdlPlcNm: '',
            schdlImprtCd: 'A',
            schdlSeCd: '1', // 부서 일정 — GET /schedules/dept 의 필터 조건
        });
        validation.setFormErrors({}, false);
        setIsDialogOpen(true);
    };

    const handleEdit = (schedule: DeptSchedule) => {
        if (savingRef.current || deletePendingRef.current) return;
        setEditingSchedule(schedule);
        setFormData(schedule);
        validation.setFormErrors({}, false);
        setIsDialogOpen(true);
    };

    const handleDelete = async (schdlSn: number) => {
        if (deletePendingRef.current || savingRef.current) return;
        deletePendingRef.current = true;
        setDeletingScheduleSn(schdlSn);
        try {
            // [2026-09-06 DEC-OPS-038] 네이티브 confirm → useConfirm 모달.
            const ok = await confirm({
                title: '일정 삭제',
                message: '이 일정을 삭제하시겠습니까? 삭제한 일정은 복구할 수 없습니다.',
                confirmText: '삭제',
                variant: 'destructive',
            });
            if (!ok) return;
            await deleteDeptSchedule(schdlSn);
            await fetchList();
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally {
            deletePendingRef.current = false;
            setDeletingScheduleSn(null);
        }
    };

    const handleSubmit = async () => {
        if (savingRef.current || deletePendingRef.current) return;
        const validated = validation.validate({
            ...formData,
            schdlSeCd: formData.schdlSeCd ?? '1',
            schdlNm: formData.schdlNm ?? '',
            schdlCn: formData.schdlCn ?? '',
            schdlBgngYmd: formData.schdlBgngYmd ?? '',
            schdlEndYmd: formData.schdlEndYmd ?? '',
            schdlPlcNm: formData.schdlPlcNm ?? '',
        });
        if (!validated) return;

        savingRef.current = true;
        setIsSaving(true);
        try {
            if (editingSchedule && editingSchedule.schdlSn) {
                await updateDeptSchedule(editingSchedule.schdlSn, validated);
            } else {
                await createDeptSchedule(validated);
            }
            setIsDialogOpen(false);
            validation.setFormErrors({}, false);
            fetchList();
        } catch (error) {
            const fieldErrors = extractFieldErrors(error);
            if (fieldErrors) validation.setFormErrors(fieldErrors);
            else toast.error('저장 중 오류가 발생했습니다.');
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    };

    const handleDialogOpenChange = (nextOpen: boolean) => {
        if (savingRef.current || deletePendingRef.current) return;
        setIsDialogOpen(nextOpen);
        if (!nextOpen) validation.setFormErrors({}, false);
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">부서 일정 관리</h1>
                <Button
                    onClick={handleCreate}
                    disabled={isSaving || deletingScheduleSn !== null}
                    className="rounded-lg shadow-lg font-bold"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    일정 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-muted p-4 rounded-lg border border-border">
                <Input
                    placeholder="일정명으로 검색하세요"
                    className="max-w-sm rounded-lg"
                    value={params.schdlNm}
                    onChange={(e) => setParams(prev => ({ ...prev, schdlNm: e.target.value }))}
                />
                <Button onClick={handleSearch} className="rounded-lg px-8 font-bold">조회</Button>
            </div>

            <div className="rounded-lg border-2 border-border overflow-hidden shadow-sm bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[80px] text-center font-bold">번호</TableHead>
                            <TableHead className="font-bold">일정명</TableHead>
                            <TableHead className="font-bold">일시</TableHead>
                            <TableHead className="font-bold">장소</TableHead>
                            <TableHead className="w-[120px] text-center font-bold">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <span className="sr-only">부서 일정을 불러오는 중</span>
                                    <div aria-hidden="true" className="animate-pulse space-y-3 py-4">
                                        <div className="h-4 bg-muted rounded mx-8" />
                                        <div className="h-4 bg-muted rounded mx-8" />
                                        <div className="h-4 bg-muted rounded mx-8" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : fetchError ? (
                            // 조회 실패는 "0건"과 다른 상태다 — 사유를 밝히고 재시도 수단을 준다.
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <div role="alert" className="space-y-3">
                                        <p className="font-bold text-destructive-emphasis">부서 일정 목록을 불러오지 못했습니다.</p>
                                        <p className="text-sm text-muted-foreground">{fetchError.message}</p>
                                        <Button variant="outline" onClick={fetchList} className="rounded-lg font-bold">
                                            다시 시도
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : schedules.length === 0 ? (
                                // <tbody> 직속 자식은 <tr> 이어야 한다. TableRow 없이 TableCell 을 두면
                                // 브라우저가 DOM 을 교정하면서 SSR 결과와 어긋나 hydration 오류가 난다.
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-bold tracking-tight opacity-40">
                                        등록된 부서 일정이 존재하지 않습니다.
                                    </TableCell>
                                </TableRow>
                        ) : (
                            schedules.map((schedule, index) => {
                                const isDeleting = deletingScheduleSn === schedule.schdlSn;
                                return (
                                <TableRow key={schedule.schdlSn} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="text-center font-mono text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-bold text-foreground">{schedule.schdlNm}</TableCell>
                                    <TableCell className="text-sm font-medium">
                                        {formatYmd(schedule.schdlBgngYmd)} ~ {formatYmd(schedule.schdlEndYmd)}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground font-medium">{schedule.schdlPlcNm}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(schedule)}
                                                disabled={isSaving || deletingScheduleSn !== null}
                                                aria-label={`${schedule.schdlNm || '일정'} 수정`}
                                                className="rounded-lg hover:bg-primary/10"
                                            >
                                                <Pencil className="h-4 w-4 text-primary" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => { void handleDelete(schedule.schdlSn!); }}
                                                disabled={isSaving || deletingScheduleSn !== null}
                                                aria-busy={isDeleting || undefined}
                                                aria-label={isDeleting ? `${schedule.schdlNm || '일정'} 삭제 중` : `${schedule.schdlNm || '일정'} 삭제`}
                                                className="rounded-lg hover:bg-destructive/10"
                                            >
                                                {isDeleting
                                                    ? <Loader2 className="h-4 w-4 animate-spin text-destructive-emphasis" aria-hidden="true" />
                                                    : <Trash2 className="h-4 w-4 text-destructive-emphasis" aria-hidden="true" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="max-w-md rounded-lg border-none shadow-2xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight">{editingSchedule ? '일정 수정' : '일정 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <FormErrorSummary
                            errors={validation.errors}
                            labels={SCHEDULE_FORM_LABELS}
                            onNavigate={validation.focusError}
                        />
                        <div className="space-y-2">
                            <Label htmlFor="schdlNm" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                일정명 <span aria-hidden="true" className="text-destructive-emphasis">*</span><span className="sr-only">(필수)</span>
                            </Label>
                            <Input
                                id="schdlNm"
                                maxLength={100}
                                aria-required="true"
                                {...validation.fieldProps('schdlNm')}
                                className="rounded-lg h-12"
                                value={formData.schdlNm ?? ''}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, schdlNm: e.target.value }));
                                    validation.clearError('schdlNm');
                                }}
                            />
                            {validation.errors.schdlNm ? <p {...validation.messageProps('schdlNm')} className="text-sm text-destructive-emphasis" /> : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schdlCn" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">내용</Label>
                            <Textarea
                                id="schdlCn"
                                maxLength={4000}
                                {...validation.fieldProps('schdlCn')}
                                className="rounded-lg min-h-[100px]"
                                value={formData.schdlCn ?? ''}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, schdlCn: e.target.value }));
                                    validation.clearError('schdlCn');
                                }}
                            />
                            {validation.errors.schdlCn ? <p {...validation.messageProps('schdlCn')} className="text-sm text-destructive-emphasis" /> : null}
                        </div>
                        {/* 날짜 입력. 저장은 'yyyyMMdd'(varchar 8) 이고 input[type=date] 는 'yyyy-MM-dd' 를
                            요구하므로 경계에서 변환한다. 종전에는 입력란 자체가 없어 항상 '오늘' 로만 등록됐다. */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="schdlBgngYmd" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    시작일 <span aria-hidden="true" className="text-destructive-emphasis">*</span><span className="sr-only">(필수)</span>
                                </Label>
                                <Input
                                    id="schdlBgngYmd"
                                    type="date"
                                    aria-required="true"
                                    {...validation.fieldProps('schdlBgngYmd')}
                                    className="rounded-lg h-12"
                                    value={ymdToInput(formData.schdlBgngYmd)}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, schdlBgngYmd: inputToYmd(e.target.value) }));
                                        validation.clearError('schdlBgngYmd');
                                    }}
                                />
                                {validation.errors.schdlBgngYmd ? <p {...validation.messageProps('schdlBgngYmd')} className="text-sm text-destructive-emphasis" /> : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="schdlEndYmd" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    종료일 <span aria-hidden="true" className="text-destructive-emphasis">*</span><span className="sr-only">(필수)</span>
                                </Label>
                                <Input
                                    id="schdlEndYmd"
                                    type="date"
                                    aria-required="true"
                                    {...validation.fieldProps('schdlEndYmd')}
                                    className="rounded-lg h-12"
                                    value={ymdToInput(formData.schdlEndYmd)}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, schdlEndYmd: inputToYmd(e.target.value) }));
                                        validation.clearError('schdlEndYmd');
                                    }}
                                />
                                {validation.errors.schdlEndYmd ? <p {...validation.messageProps('schdlEndYmd')} className="text-sm text-destructive-emphasis" /> : null}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schdlPlcNm" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">장소</Label>
                            <Input
                                id="schdlPlcNm"
                                maxLength={100}
                                {...validation.fieldProps('schdlPlcNm')}
                                className="rounded-lg h-12"
                                value={formData.schdlPlcNm || ''}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, schdlPlcNm: e.target.value }));
                                    validation.clearError('schdlPlcNm');
                                }}
                            />
                            {validation.errors.schdlPlcNm ? <p {...validation.messageProps('schdlPlcNm')} className="text-sm text-destructive-emphasis" /> : null}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" disabled={isSaving || deletingScheduleSn !== null} onClick={() => handleDialogOpenChange(false)} className="rounded-lg px-10 h-12 font-bold shadow-sm">취소</Button>
                        <Button disabled={isSaving || deletingScheduleSn !== null} aria-busy={isSaving || undefined} onClick={handleSubmit} className="rounded-lg px-10 h-12 font-bold shadow-lg shadow-primary/20">
                            {isSaving ? '저장 중…' : '저장'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

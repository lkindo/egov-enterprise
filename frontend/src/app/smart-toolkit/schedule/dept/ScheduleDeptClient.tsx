'use client';

import { useState, useCallback, useEffect } from 'react';

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
import { Pencil,  Trash2,  Plus } from "lucide-react";
import { getDeptScheduleList, createDeptSchedule, updateDeptSchedule, deleteDeptSchedule } from '@/services/business/schedule/deptScheduleService';
import { DeptSchedule, ScheduleSearchParams } from '@/types/business/schedule';
import { toast } from 'sonner';

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

export default function ScheduleDeptClient() {
    const [schedules, setSchedules] = useState<DeptSchedule[]>([]);
    const [params, setParams] = useState<ScheduleSearchParams>({
        pageNo: 1,
        schdlNm: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
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

    const fetchList = useCallback(async () => {
        try {
            const response = await getDeptScheduleList(params);
            if (response && response.list) {
                setSchedules(response.list);
            } else {
                setSchedules([]);
            }
        } catch (error) {
            console.error('Failed to fetch schedules', error);
            setSchedules([]);
        }
    }, [params]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageNo: 1 }));
    };

    const handleCreate = () => {
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
        setIsDialogOpen(true);
    };

    const handleEdit = (schedule: DeptSchedule) => {
        setEditingSchedule(schedule);
        setFormData(schedule);
        setIsDialogOpen(true);
    };

    const handleDelete = async (schdlId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteDeptSchedule(schdlId);
            fetchList();
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingSchedule && editingSchedule.schdlId) {
                await updateDeptSchedule(editingSchedule.schdlId, formData as DeptSchedule);
            } else {
                await createDeptSchedule(formData as DeptSchedule);
            }
            setIsDialogOpen(false);
            fetchList();
        } catch {
            toast.error('저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">부서 일정 관리</h2>
                <Button onClick={handleCreate} className="rounded-lg shadow-lg font-bold">
                    <Plus className="mr-2 h-4 w-4" />
                    일정 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-muted p-4 rounded-lg border border-border">
                <Input
                    placeholder="일정명 또는 내용으로 검색하세요"
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
                        {schedules.length === 0 ? (
                                // <tbody> 직속 자식은 <tr> 이어야 한다. TableRow 없이 TableCell 을 두면
                                // 브라우저가 DOM 을 교정하면서 SSR 결과와 어긋나 hydration 오류가 난다.
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-bold tracking-tight opacity-40">
                                        등록된 부서 일정이 존재하지 않습니다.
                                    </TableCell>
                                </TableRow>
                        ) : (
                            schedules.map((schedule, index) => (
                                <TableRow key={schedule.schdlId} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="text-center font-mono text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-bold text-foreground">{schedule.schdlNm}</TableCell>
                                    <TableCell className="text-sm font-medium">
                                        {formatYmd(schedule.schdlBgngYmd)} ~ {formatYmd(schedule.schdlEndYmd)}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground font-medium">{schedule.schdlPlcNm}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)} className="rounded-lg hover:bg-primary/10">
                                                <Pencil className="h-4 w-4 text-primary" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.schdlId!)} className="rounded-lg hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md rounded-lg border-none shadow-2xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight">{editingSchedule ? '일정 수정' : '일정 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="schdlNm" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">일정명</Label>
                            <Input
                                id="schdlNm"
                                className="rounded-lg h-12"
                                value={formData.schdlNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, schdlNm: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schdlCn" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">내용</Label>
                            <Textarea
                                id="schdlCn"
                                className="rounded-lg min-h-[100px]"
                                value={formData.schdlCn}
                                onChange={(e) => setFormData(prev => ({ ...prev, schdlCn: e.target.value }))}
                            />
                        </div>
                        {/* 날짜 입력. 저장은 'yyyyMMdd'(varchar 8) 이고 input[type=date] 는 'yyyy-MM-dd' 를
                            요구하므로 경계에서 변환한다. 종전에는 입력란 자체가 없어 항상 '오늘' 로만 등록됐다. */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="schdlBgngYmd" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">시작일</Label>
                                <Input
                                    id="schdlBgngYmd"
                                    type="date"
                                    className="rounded-lg h-12"
                                    value={ymdToInput(formData.schdlBgngYmd)}
                                    onChange={(e) => setFormData(prev => ({ ...prev, schdlBgngYmd: inputToYmd(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="schdlEndYmd" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">종료일</Label>
                                <Input
                                    id="schdlEndYmd"
                                    type="date"
                                    className="rounded-lg h-12"
                                    value={ymdToInput(formData.schdlEndYmd)}
                                    onChange={(e) => setFormData(prev => ({ ...prev, schdlEndYmd: inputToYmd(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schdlPlcNm" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">장소</Label>
                            <Input
                                id="schdlPlcNm"
                                className="rounded-lg h-12"
                                value={formData.schdlPlcNm || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, schdlPlcNm: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg px-10 h-12 font-bold shadow-sm">취소</Button>
                        <Button onClick={handleSubmit} className="rounded-lg px-10 h-12 font-bold shadow-lg shadow-primary/20">저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

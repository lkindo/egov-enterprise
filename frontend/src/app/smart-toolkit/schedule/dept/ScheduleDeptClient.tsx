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
        schdlBgngYmd: format(new Date(), 'yyyy-MM-dd HH:mm'),
        schdlEndYmd: format(new Date(), 'yyyy-MM-dd HH:mm'),
        schdlPlcNm: '',
        schdlImprtCd: 'A', // A: 전체, B: 부서, C: 개인
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
            schdlBgngYmd: format(new Date(), 'yyyy-MM-dd HH:mm'),
            schdlEndYmd: format(new Date(), 'yyyy-MM-dd HH:mm'),
            schdlPlcNm: '',
            schdlImprtCd: 'A',
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
            alert('삭제 중 오류가 발생했습니다.');
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
            alert('저장 중 오류가 발생했습니다.');
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

            <div className="rounded-lg border-2 border-slate-50 overflow-hidden shadow-sm bg-white">
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
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-bold tracking-tight opacity-40">
                                    등록된 부서 일정이 존재하지 않습니다.
                                </TableCell>
                        ) : (
                            schedules.map((schedule, index) => (
                                <TableRow key={schedule.schdlId} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="text-center font-mono text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-bold text-foreground">{schedule.schdlNm}</TableCell>
                                    <TableCell className="text-sm font-medium">
                                        {schedule.schdlBgngYmd} ~ {schedule.schdlEndYmd}
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

'use client';

import { useState, useCallback, useEffect } from 'react';

export const dynamic = 'force-dynamic';

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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Pencil, Trash2, Plus } from "lucide-react";
import { getDeptScheduleList, createDeptSchedule, updateDeptSchedule, deleteDeptSchedule } from '@/services/schedule/deptScheduleService';
import { DeptSchedule, ScheduleSearchParams } from '@/types/schedule';

export default function DeptSchedulePage() {
    const [schedules, setSchedules] = useState<DeptSchedule[]>([]);
    const [params, setParams] = useState<ScheduleSearchParams>({
        pageIndex: 1,
        schdulNm: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<DeptSchedule | null>(null);
    const [formData, setFormData] = useState<Partial<DeptSchedule>>({
        schdulNm: '',
        schdulCn: '',
        schdulBgnde: '',
        schdulEndde: '',
        schdulPlace: '',
        schdulIpcrCode: 'A', // A: 전체, B: 부서, C: 개인
    });

    const fetchList = useCallback(async () => {
        try {
            const response = await getDeptScheduleList(params);
            if (response && response.resultList) {
                setSchedules(response.resultList);
            } else {
                setSchedules([]);
            }
        } catch (error) {
            console.error(error);
            setSchedules([]);
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
        setEditingSchedule(null);
        setFormData({
            schdulNm: '',
            schdulCn: '',
            schdulBgnde: format(new Date(), 'yyyy-MM-dd HH:mm'),
            schdulEndde: format(new Date(), 'yyyy-MM-dd HH:mm'),
            schdulPlace: '',
            schdulIpcrCode: 'A',
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (schedule: DeptSchedule) => {
        setEditingSchedule(schedule);
        setFormData(schedule);
        setIsDialogOpen(true);
    };

    const handleDelete = async (schdulId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteDeptSchedule(schdulId);
            fetchList();
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingSchedule) {
                await updateDeptSchedule(formData as DeptSchedule);
            } else {
                await createDeptSchedule(formData as DeptSchedule);
            }
            setIsDialogOpen(false);
            fetchList();
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">부서 일정 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    일정 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="일정명 또는 내용으로 검색"
                    className="max-w-sm"
                    value={params.schdulNm}
                    onChange={(e) => setParams(prev => ({ ...prev, schdulNm: e.target.value }))}
                />
                <Button onClick={handleSearch}>조회</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">순번</TableHead>
                            <TableHead>일정명</TableHead>
                            <TableHead>일시</TableHead>
                            <TableHead>장소</TableHead>
                            <TableHead>담당자</TableHead>
                            <TableHead className="w-[120px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {schedules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            schedules.map((schedule, index) => (
                                <TableRow key={schedule.schdulId}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{schedule.schdulNm}</TableCell>
                                    <TableCell>
                                        {schedule.schdulBgnde} ~ {schedule.schdulEndde}
                                    </TableCell>
                                    <TableCell>{schedule.schdulPlace}</TableCell>
                                    <TableCell>{schedule.schdulChargerId}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.schdulId!)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingSchedule ? '일정 수정' : '일정 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="schdulNm">일정명</Label>
                            <Input
                                id="schdulNm"
                                value={formData.schdulNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, schdulNm: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schdulCn">내용</Label>
                            <Textarea
                                id="schdulCn"
                                value={formData.schdulCn}
                                onChange={(e) => setFormData(prev => ({ ...prev, schdulCn: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schdulPlace">장소</Label>
                            <Input
                                id="schdulPlace"
                                value={formData.schdulPlace || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, schdulPlace: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                        <Button onClick={handleSubmit}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

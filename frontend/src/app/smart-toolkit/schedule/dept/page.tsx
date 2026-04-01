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
import { getDeptScheduleList, createDeptSchedule, updateDeptSchedule, deleteDeptSchedule } from '@/services/business/schedule/deptScheduleService';
import { DeptSchedule, ScheduleSearchParams } from '@/types/business/schedule';

export default function DeptSchedulePage() {
 const [schedules, setSchedules] = useState<DeptSchedule[]>([]);
 const [params, setParams] = useState<ScheduleSearchParams>({
 page踰덊샇: 1,
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
 schdulIpcrCode: 'A', // A: ?꾩껜, B: 遺님 C: 媛쒖씤
 });

 const fetchList = useCallback(async () => {
 try {
 const response = await getDeptScheduleList(params);
 if (response && response.resultList) {
 setSchedules(response.resultList);
 } else {
 setSchedules([]);
 }
 } catch {
 console.error(error);
 setSchedules([]);
 }
 }, [params]);

 useEffect(() => {
 fetchList();
 }, [fetchList]);

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 setParams(prev => ({ ...prev, page踰덊샇: 1 }));
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
 if (!confirm('?뺣쭚 님젣?섏떆寃좎뒿?덇퉴?')) return;
 try {
 await deleteDeptSchedule(schdulId);
 fetchList();
 } catch {
 alert('님젣 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
 }
 };

 const handleSubmit = async () => {
 try {
 if (editingSchedule && editingSchedule.schdulId) {
 await updateDeptSchedule(editingSchedule.schdulId, formData as DeptSchedule);
 } else {
 await createDeptSchedule(formData as DeptSchedule);
 }
 setIsDialogOpen(false);
 fetchList();
 } catch {
 alert('?님以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold tracking-tight">遺?쒖씪님愿由?/h2>
 <Button onClick={handleCreate}>
 <Plus className="mr-2 h-4 w-4" />
 ?쇱젙 등록
 </Button>
 </div>

 <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
 <Input
 placeholder="?쇱젙紐님먮뒗 ?댁슜?쇰줈 寃님
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
 <TableHead className="w-[80px]">?쒕쾲</TableHead>
 <TableHead>?쇱젙紐?/TableHead>
 <TableHead>?쇱떆</TableHead>
 <TableHead>?μ냼</TableHead>
 <TableHead>?대떦님/TableHead>
 <TableHead className="w-[120px]">愿由?/TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {schedules.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="h-24 text-center">
 ?곗씠?곌? ?놁뒿?덈떎.
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
 <DialogTitle>{editingSchedule ? '?쇱젙 ?섏젙' : '?쇱젙 등록'}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label htmlFor="schdulNm">?쇱젙紐?/Label>
 <Input
 id="schdulNm"
 value={formData.schdulNm}
 onChange={(e) => setFormData(prev => ({ ...prev, schdulNm: e.target.value }))}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="schdulCn">?댁슜</Label>
 <Textarea
 id="schdulCn"
 value={formData.schdulCn}
 onChange={(e) => setFormData(prev => ({ ...prev, schdulCn: e.target.value }))}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="schdulPlace">?μ냼</Label>
 <Input
 id="schdulPlace"
 value={formData.schdulPlace || ''}
 onChange={(e) => setFormData(prev => ({ ...prev, schdulPlace: e.target.value }))}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsDialogOpen(false)}>痍⑥냼</Button>
 <Button onClick={handleSubmit}>?님/Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}


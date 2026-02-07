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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, FileText, CheckCircle } from "lucide-react";
import { getReportList, createReport, updateReport, deleteReport, confirmReport } from '@/services/schedule/reportService';
import { WikMnthngReprt, ReportSearchParams } from '@/types/schedule';
import { format } from "date-fns";

export default function WeeklyReportPage() {
    const [reports, setReports] = useState<WikMnthngReprt[]>([]);
    const [params, setParams] = useState<ReportSearchParams>({
        pageIndex: 1,
        searchCondition: '0',
        searchKeyword: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<WikMnthngReprt | null>(null);
    const [formData, setFormData] = useState<WikMnthngReprt>({
        reprtSe: 'W', // Weekly default
        reprtBgnDe: format(new Date(), 'yyyy-MM-dd'),
        reprtEndDe: format(new Date(), 'yyyy-MM-dd'),
        wikWorkCn: '',
        nextWikWorkCn: '',
        partclrMatter: '',
    });

    const fetchList = useCallback(async () => {
        try {
            const response = await getReportList(params);
            if (response && response.resultList) {
                setReports(response.resultList);
            } else {
                setReports([]);
            }
        } catch (error) {
            console.error(error);
            setReports([]);
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
        setEditingReport(null);
        setFormData({
            reprtSe: 'W',
            reprtBgnDe: format(new Date(), 'yyyy-MM-dd'),
            reprtEndDe: format(new Date(), 'yyyy-MM-dd'),
            wikWorkCn: '',
            nextWikWorkCn: '',
            partclrMatter: '',
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (report: WikMnthngReprt) => {
        setEditingReport(report);
        setFormData(report);
        setIsDialogOpen(true);
    };

    const handleDelete = async (reprtId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteReport(reprtId);
            fetchList();
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleConfirm = async (reprtId: string) => {
        if (!confirm('승인하시겠습니까?')) return;
        try {
            await confirmReport(reprtId);
            fetchList();
        } catch (error) {
            alert('승인 중 오류가 발생했습니다.');
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingReport) {
                await updateReport(formData);
            } else {
                await createReport(formData);
            }
            setIsDialogOpen(false);
            fetchList();
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    const getStatusBadge = (status?: string) => {
        return status === 'C'
            ? <Badge variant="secondary">승인완료</Badge>
            : <Badge variant="outline">승인대기</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">주간/월간 보고 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    보고 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="보고 내용으로 검색"
                    className="max-w-sm"
                    value={params.searchKeyword}
                    onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button onClick={handleSearch}>조회</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">순번</TableHead>
                            <TableHead>보고기간</TableHead>
                            <TableHead>구분</TableHead>
                            <TableHead>작성자</TableHead>
                            <TableHead>승인상태</TableHead>
                            <TableHead className="w-[140px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            reports.map((report, index) => (
                                <TableRow key={report.reprtId}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        {report.reprtBgnDe} ~ {report.reprtEndDe}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {report.reprtSe === 'W' ? '주간' : '월간'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{report.reporterNm}</TableCell>
                                    <TableCell>{getStatusBadge(report.confirmAt)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(report)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {report.confirmAt !== 'C' && (
                                                <Button variant="ghost" size="icon" onClick={() => handleConfirm(report.reprtId!)}>
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(report.reprtId!)}>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingReport ? '보고 수정' : '보고 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reprtSe">보고 구분</Label>
                            <Select
                                value={formData.reprtSe}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, reprtSe: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="보고 구분을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="W">주간보고</SelectItem>
                                    <SelectItem value="M">월간보고</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="reprtBgnDe">시작일</Label>
                                <Input
                                    id="reprtBgnDe"
                                    type="date"
                                    value={formData.reprtBgnDe}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reprtBgnDe: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reprtEndDe">종료일</Label>
                                <Input
                                    id="reprtEndDe"
                                    type="date"
                                    value={formData.reprtEndDe}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reprtEndDe: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wikWorkCn">금주 업무 내용</Label>
                            <Textarea
                                id="wikWorkCn"
                                value={formData.wikWorkCn}
                                onChange={(e) => setFormData(prev => ({ ...prev, wikWorkCn: e.target.value }))}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nextWikWorkCn">차주 업무 계획</Label>
                            <Textarea
                                id="nextWikWorkCn"
                                value={formData.nextWikWorkCn}
                                onChange={(e) => setFormData(prev => ({ ...prev, nextWikWorkCn: e.target.value }))}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="partclrMatter">특이사항</Label>
                            <Textarea
                                id="partclrMatter"
                                value={formData.partclrMatter}
                                onChange={(e) => setFormData(prev => ({ ...prev, partclrMatter: e.target.value }))}
                                rows={2}
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

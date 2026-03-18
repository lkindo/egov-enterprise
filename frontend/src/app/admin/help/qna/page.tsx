'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Eye, MessageSquare, Trash2, Loader2, Search } from "lucide-react";
import { cnsltAdminService } from '@/services/admin/system/CnsltAdminService';
import { CnsltVO, CnsltSearchParams } from '@/types/consult';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";
import { Badge } from "@/components/ui/badge";

export default function ConsultManagePage() {
    const queryClient = useQueryClient();
    const [params, setParams] = useState<CnsltSearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewMode, setIsViewMode] = useState(true);
    const [selectedCnslt, setSelectedCnslt] = useState<CnsltVO | null>(null);
    const [answerCn, setAnswerCn] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['admin-consults', params],
        queryFn: () => cnsltAdminService.getConsultationList(params),
    });

    const consults: CnsltVO[] = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const answerMutation = useMutation({
        mutationFn: ({ id, answer }: { id: string, answer: string }) => cnsltAdminService.answerConsultation(id, { managtCn: answer }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-consults'] });
            setIsDialogOpen(false);
            setAnswerCn('');
        },
        onError: () => alert('답변 저장 중 오류가 발생했습니다.')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => cnsltAdminService.deleteConsultation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-consults'] });
        },
        onError: () => alert('삭제 중 오류가 발생했습니다.')
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleView = (cnslt: CnsltVO) => {
        setSelectedCnslt(cnslt);
        setAnswerCn(cnslt.managtCn || '');
        setIsViewMode(true);
        setIsDialogOpen(true);
    };

    const handleAnswerMode = (cnslt: CnsltVO) => {
        setSelectedCnslt(cnslt);
        setAnswerCn(cnslt.managtCn || '');
        setIsViewMode(false);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        deleteMutation.mutate(id);
    };

    const handleAnswerSubmit = () => {
        if (!selectedCnslt?.cnsltId || !answerCn.trim()) return;
        answerMutation.mutate({ id: selectedCnslt.cnsltId, answer: answerCn });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">상단 관리 (Q&A)</h2>
            </div>

            <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="제목으로 검색"
                        className="pl-9"
                        value={params.searchKeyword || ''}
                        onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                    />
                </div>
                <Button type="submit">조회</Button>
            </form>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">순번</TableHead>
                            <TableHead>제목</TableHead>
                            <TableHead className="w-[120px]">작성자</TableHead>
                            <TableHead className="w-[120px]">상태</TableHead>
                            <TableHead className="w-[150px]">등록일</TableHead>
                            <TableHead className="w-[150px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton columnCount={6} rowCount={10} />
                        ) : consults.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            consults.map((item, index) => (
                                <TableRow key={item.cnsltId}>
                                    <TableCell>{index + 1 + ((params.pageIndex || 1) - 1) * 10}</TableCell>
                                    <TableCell className="font-medium">{item.cnsltSj}</TableCell>
                                    <TableCell>{item.wrterNm}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.qnaProcessSttusCode === '2' ? "default" : "secondary"}>
                                            {item.qnaProcessSttusCode === '2' ? '답변완료' : '접수'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{item.createdDate?.slice(0, 10)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleView(item)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleAnswerMode(item)}>
                                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => handleDelete(item.cnsltId!)}>
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

            {pagination && (
                <PagePagination
                    pagination={pagination}
                    onPageChange={(page) => setParams(prev => ({ ...prev, pageIndex: page }))}
                />
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {isViewMode ? '상담 상세조회' : '상담 답변등록'}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCnslt && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">작성자</Label>
                                    <p className="font-medium">{selectedCnslt.wrterNm}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">공개여부</Label>
                                    <p className="font-medium">{selectedCnslt.othbcAt === 'Y' ? '공개' : '비공개'}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-muted-foreground">상담 제목</Label>
                                <p className="font-medium text-lg">{selectedCnslt.cnsltSj}</p>
                            </div>
                            <div className="space-y-1 border-t pt-2">
                                <Label className="text-muted-foreground">상담 내용</Label>
                                <div className="min-h-[100px] bg-slate-50 p-3 rounded-md whitespace-pre-wrap">
                                    {selectedCnslt.cnsltCn}
                                </div>
                            </div>
                            <div className="space-y-2 border-t pt-4">
                                <Label htmlFor="managtCn" className="text-blue-600 font-semibold flex items-center gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    전문가 답변
                                </Label>
                                {isViewMode ? (
                                    <div className="min-h-[100px] bg-blue-50/50 border border-blue-100 p-3 rounded-md whitespace-pre-wrap">
                                        {selectedCnslt.managtCn || '아직 등록된 답변이 없습니다.'}
                                    </div>
                                ) : (
                                    <Textarea
                                        id="managtCn"
                                        placeholder="답변 내용을 입력하세요"
                                        value={answerCn}
                                        onChange={(e) => setAnswerCn(e.target.value)}
                                        rows={6}
                                        className="focus-visible:ring-blue-500"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>닫기</Button>
                        {!isViewMode && (
                            <Button onClick={handleAnswerSubmit} disabled={answerMutation.isPending}>
                                {answerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                답변 완료
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

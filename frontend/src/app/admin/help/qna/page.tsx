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
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Eye, MessageSquare, Loader2 } from "lucide-react";
import { getQnaList, createQna, updateQna, deleteQna, updateQnaAnswer } from '@/services/help/onlineHelpService';
import { QnaVO, OnlineHelpSearchParams } from '@/types/onlineHelp';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";

export default function QnaManagePage() {
    const queryClient = useQueryClient();
    const [params, setParams] = useState<OnlineHelpSearchParams>({
        pageIndex: 1,
        searchCondition: '0',
        searchKeyword: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAnswerMode, setIsAnswerMode] = useState(false);
    const [editingQna, setEditingQna] = useState<QnaVO | null>(null);
    const [formData, setFormData] = useState<QnaVO>({
        qestnSj: '',
        qestnCn: '',
        answerCn: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-qnas', params],
        queryFn: () => getQnaList(params),
    });

    const qnas: QnaVO[] = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const createMutation = useMutation({
        mutationFn: createQna,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-qnas'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('저장 중 오류가 발생했습니다.')
    });

    const updateMutation = useMutation({
        mutationFn: updateQna,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-qnas'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('저장 중 오류가 발생했습니다.')
    });

    const answerMutation = useMutation({
        mutationFn: updateQnaAnswer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-qnas'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('답변 저장 중 오류가 발생했습니다.')
    });

    const deleteMutation = useMutation({
        mutationFn: deleteQna,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-qnas'] });
        },
        onError: () => alert('삭제 중 오류가 발생했습니다.')
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setEditingQna(null);
        setIsAnswerMode(false);
        setFormData({ qestnSj: '', qestnCn: '', answerCn: '' });
        setIsDialogOpen(true);
    };

    const handleView = (qna: QnaVO) => {
        setEditingQna(qna);
        setFormData(qna);
        setIsAnswerMode(false);
        setIsDialogOpen(true);
    };

    const handleAnswer = (qna: QnaVO) => {
        setEditingQna(qna);
        setFormData(qna);
        setIsAnswerMode(true);
        setIsDialogOpen(true);
    };

    const handleDelete = async (qaId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        deleteMutation.mutate(qaId);
    };

    const handleSubmit = async () => {
        if (isAnswerMode && editingQna) {
            answerMutation.mutate(formData);
        } else if (editingQna) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'Y': return <Badge variant="secondary">답변완료</Badge>;
            case 'N':
            default: return <Badge variant="outline">답변대기</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Q&A 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    질문 등록
                </Button>
            </div>

            <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="제목 또는 내용으로 검색"
                    className="max-w-sm"
                    value={params.searchKeyword || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button type="submit">조회</Button>
            </form>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">순번</TableHead>
                            <TableHead>제목</TableHead>
                            <TableHead className="w-[100px]">작성자</TableHead>
                            <TableHead className="w-[100px]">조회수</TableHead>
                            <TableHead className="w-[100px]">상태</TableHead>
                            <TableHead className="w-[120px]">등록일</TableHead>
                            <TableHead className="w-[140px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton columnCount={7} rowCount={10} />
                        ) : qnas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            qnas.map((qna, index) => (
                                <TableRow key={qna.qaId}>
                                    <TableCell>{index + 1 + ((params.pageIndex || 1) - 1) * 10}</TableCell>
                                    <TableCell className="font-medium">{qna.qestnSj}</TableCell>
                                    <TableCell>{qna.wrterNm || qna.frstRegisterNm}</TableCell>
                                    <TableCell>{qna.inqireCo || 0}</TableCell>
                                    <TableCell>{getStatusBadge(qna.answerSttusCode)}</TableCell>
                                    <TableCell>{qna.frstRegistPnttm?.slice(0, 10)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleView(qna)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleAnswer(qna)}>
                                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => handleDelete(qna.qaId!)}>
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
                            {isAnswerMode ? 'Q&A 답변' : (editingQna ? 'Q&A 상세' : 'Q&A 등록')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="qestnSj">질문 제목</Label>
                            <Input
                                id="qestnSj"
                                value={formData.qestnSj}
                                onChange={(e) => setFormData(prev => ({ ...prev, qestnSj: e.target.value }))}
                                disabled={!!editingQna}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="qestnCn">질문 내용</Label>
                            <Textarea
                                id="qestnCn"
                                value={formData.qestnCn}
                                onChange={(e) => setFormData(prev => ({ ...prev, qestnCn: e.target.value }))}
                                disabled={!!editingQna}
                                rows={4}
                            />
                        </div>
                        {(isAnswerMode || editingQna) && (
                            <div className="space-y-2">
                                <Label htmlFor="answerCn">답변 내용</Label>
                                <Textarea
                                    id="answerCn"
                                    value={formData.answerCn || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, answerCn: e.target.value }))}
                                    disabled={!isAnswerMode}
                                    rows={4}
                                    placeholder={isAnswerMode ? "답변을 입력하세요" : ""}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        {editingQna && !isAnswerMode ? (
                            <Button onClick={() => setIsDialogOpen(false)}>닫기</Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending || answerMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending || answerMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isAnswerMode ? '답변 등록' : '저장'}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
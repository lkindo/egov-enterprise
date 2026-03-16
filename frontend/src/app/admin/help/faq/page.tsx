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
import { Pencil, Trash2, Plus, Eye, Loader2 } from "lucide-react";
import { getFaqList, createFaq, updateFaq, deleteFaq } from '@/services/help/onlineHelpService';
import { FaqVO, OnlineHelpSearchParams } from '@/types/onlineHelp';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";

export default function FaqManagePage() {
    const queryClient = useQueryClient();
    const [params, setParams] = useState<OnlineHelpSearchParams>({
        pageIndex: 1,
        searchCondition: '0',
        searchKeyword: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FaqVO | null>(null);
    const [formData, setFormData] = useState<FaqVO>({
        qestnSj: '',
        qestnCn: '',
        answerCn: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-faqs', params],
        queryFn: () => getFaqList(params),
    });

    const faqs: FaqVO[] = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const createMutation = useMutation({
        mutationFn: createFaq,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('저장 중 오류가 발생했습니다.')
    });

    const updateMutation = useMutation({
        mutationFn: updateFaq,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
            setIsDialogOpen(false);
        },
        onError: () => alert('저장 중 오류가 발생했습니다.')
    });

    const deleteMutation = useMutation({
        mutationFn: deleteFaq,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
        },
        onError: () => alert('삭제 중 오류가 발생했습니다.')
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setEditingFaq(null);
        setIsViewMode(false);
        setFormData({ qestnSj: '', qestnCn: '', answerCn: '' });
        setIsDialogOpen(true);
    };

    const handleView = (faq: FaqVO) => {
        setEditingFaq(faq);
        setFormData(faq);
        setIsViewMode(true);
        setIsDialogOpen(true);
    };

    const handleEdit = (faq: FaqVO) => {
        setEditingFaq(faq);
        setFormData(faq);
        setIsViewMode(false);
        setIsDialogOpen(true);
    };

    const handleDelete = async (faqId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        deleteMutation.mutate(faqId);
    };

    const handleSubmit = async () => {
        if (editingFaq) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">FAQ 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    FAQ 등록
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
                            <TableHead className="w-[100px]">조회수</TableHead>
                            <TableHead className="w-[120px]">등록자</TableHead>
                            <TableHead className="w-[120px]">등록일</TableHead>
                            <TableHead className="w-[140px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton columnCount={6} rowCount={10} />
                        ) : faqs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            faqs.map((faq, index) => (
                                <TableRow key={faq.faqId}>
                                    <TableCell>{index + 1 + ((params.pageIndex || 1) - 1) * 10}</TableCell>
                                    <TableCell className="font-medium">{faq.qestnSj}</TableCell>
                                    <TableCell>{faq.inqireCo || 0}</TableCell>
                                    <TableCell>{faq.frstRegisterNm}</TableCell>
                                    <TableCell>{faq.frstRegistPnttm?.slice(0, 10)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleView(faq)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(faq)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => handleDelete(faq.faqId!)}>
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
                            {isViewMode ? 'FAQ 상세' : (editingFaq ? 'FAQ 수정' : 'FAQ 등록')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="qestnSj">질문 제목</Label>
                            <Input
                                id="qestnSj"
                                value={formData.qestnSj}
                                onChange={(e) => setFormData(prev => ({ ...prev, qestnSj: e.target.value }))}
                                disabled={isViewMode}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="qestnCn">질문 내용</Label>
                            <Textarea
                                id="qestnCn"
                                value={formData.qestnCn}
                                onChange={(e) => setFormData(prev => ({ ...prev, qestnCn: e.target.value }))}
                                disabled={isViewMode}
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="answerCn">답변 내용</Label>
                            <Textarea
                                id="answerCn"
                                value={formData.answerCn}
                                onChange={(e) => setFormData(prev => ({ ...prev, answerCn: e.target.value }))}
                                disabled={isViewMode}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        {isViewMode ? (
                            <Button onClick={() => setIsDialogOpen(false)}>닫기</Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    저장
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

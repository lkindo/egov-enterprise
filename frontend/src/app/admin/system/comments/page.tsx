'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";
import commentService from '@/services/comment/commentService';
import { CommentVO } from '@/types/comment';
import { Trash2, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function CommentListContent() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();

    const page = Number(searchParams.get('page')) || 1;
    const searchKeyword = searchParams.get('search') || '';

    const [keywordInput, setKeywordInput] = useState(searchKeyword);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-comments', page, searchKeyword],
        queryFn: () => commentService.getAdminCommentList({
            pageIndex: page,
            searchKeyword: searchKeyword
        }),
    });

    const commentList = data?.list || [];
    const pagination = data?.paginationInfo;

    const handleSearch = () => {
        router.push(`/admin/system/comments?page=1&search=${keywordInput}`);
    };

    const deleteMutation = useMutation({
        mutationFn: commentService.deleteAdminComment,
        onSuccess: () => {
            alert('댓글이 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
        },
        onError: () => alert('댓글 삭제에 실패했습니다.')
    });

    const handleDelete = async (commentNo: number) => {
        if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;
        deleteMutation.mutate(commentNo);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">전체 댓글 관리</h2>
            </div>

            <div className="flex items-center space-x-2">
                <Input
                    placeholder="댓글 내용 검색"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    className="max-w-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>검색</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">No</TableHead>
                            <TableHead className="w-[120px]">작성자</TableHead>
                            <TableHead>내용</TableHead>
                            <TableHead className="w-[100px]">BBS ID</TableHead>
                            <TableHead className="w-[180px]">등록일</TableHead>
                            <TableHead className="w-[100px] text-center">상태</TableHead>
                            <TableHead className="w-[80px] text-center">작업</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton columnCount={7} rowCount={10} />
                        ) : commentList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    등록된 댓글이 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            commentList.map((comment) => (
                                <TableRow key={comment.id}>
                                    <TableCell>{comment.id}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{comment.wrterNm}</span>
                                            <span className="text-xs text-muted-foreground">{comment.wrterId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md truncate">
                                        <div className="flex items-start">
                                            <MessageSquare className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                                            <span>{comment.commentCn}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{comment.bbsId}</Badge>
                                    </TableCell>
                                    <TableCell>{comment.frstRegisterPnttm?.slice(0, 16) || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        {comment.useAt === 'Y' ? (
                                            <Badge className="bg-green-100 text-green-800">정상</Badge>
                                        ) : (
                                            <Badge variant="destructive">삭제됨</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            <Button variant="destructive" size="icon" disabled={comment.useAt === 'N' || deleteMutation.isPending} onClick={() => handleDelete(comment.id)}>
                                                <Trash2 className="h-4 w-4" />
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
                    onPageChange={(page) => router.push(`/admin/system/comments?page=${page}&search=${searchKeyword}`)}
                />
            )}
        </div>
    );
}

export default function GlobalCommentPage() {
    return (
        <Suspense fallback={<div>Loading comments...</div>}>
            <CommentListContent />
        </Suspense>
    );
}

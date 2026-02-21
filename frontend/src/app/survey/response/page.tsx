'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQustnrRespondInfoList, deleteQustnrRespondInfo } from '@/lib/api/survey';
import { useState } from 'react';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Search,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Eye,
    Trash2,
    BarChart3
} from 'lucide-react';

export default function SurveyResponseListPage() {
    const [pageIndex, setPageIndex] = useState(1);
    const [searchKeyword, setSearchKeyword] = useState('');
    const queryClient = useQueryClient();

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: ['survey-responses', pageIndex, searchKeyword],
        queryFn: () => getQustnrRespondInfoList({ pageIndex, pageSize: 10, respondNm: searchKeyword }),
        retry: false,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteQustnrRespondInfo(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['survey-responses'] });
            alert('삭제되었습니다.');
        },
        onError: (err) => {
            alert(`삭제 실패: ${err instanceof Error ? err.message : '일 수 없는 오류'}`);
        }
    });

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchKeyword(e.target.value);
        setPageIndex(1);
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`${name}님의 응답을 삭제하시겠습니까?`)) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-6xl space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">설문조사 응답 관리</h1>
                    <p className="text-muted-foreground mt-1">
                        시스템에 등록된 설문조사 응답 현황을 확인하고 관리합니다.
                    </p>
                </div>
                <div className="flex space-x-2">
                    <Link href="/survey/stats">
                        <Button variant="outline" size="sm">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            통계 보기
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RotateCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium">응답 목록</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="응답자 이름 검색..."
                                value={searchKeyword}
                                onChange={handleSearch}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <CardDescription>
                        총 {data?.paginationInfo?.totalRecordCount || 0}건의 응답이 조회되었습니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[150px] font-semibold">응답자</TableHead>
                                    <TableHead className="font-semibold">응답 내용</TableHead>
                                    <TableHead className="w-[180px] font-semibold">등록 일시</TableHead>
                                    <TableHead className="w-[120px] font-semibold text-center">관리</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <p className="text-muted-foreground">데이터를 불러오는 중입니다...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center text-destructive">
                                            연결 오류: {error instanceof Error ? error.message : '데이터를 가져올 수 없습니다.'}
                                        </TableCell>
                                    </TableRow>
                                ) : data?.resultList?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                                            검색 결과가 없습니다.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.resultList?.map((item) => (
                                        <TableRow key={item.qestnrQesitmId} className="transition-colors hover:bg-muted/30">
                                            <TableCell className="font-medium">{item.respondNm}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                <span className="line-clamp-1">{item.respondAnswerCn}</span>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {item.frstRegisterPnttm}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-center space-x-1">
                                                    <Link href={`/survey/response/${item.qestnrQesitmId}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(item.qestnrQesitmId, item.respondNm)}
                                                    >
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

                    {/* Pagination */}
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            전체 {data?.paginationInfo?.totalPageCount || 1}페이지 중 {pageIndex}페이지
                        </p>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pageIndex === 1 || isFetching}
                                onClick={() => setPageIndex(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> 이전
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pageIndex >= (data?.paginationInfo?.totalPageCount || 1) || isFetching}
                                onClick={() => setPageIndex(p => p + 1)}
                            >
                                다음 <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

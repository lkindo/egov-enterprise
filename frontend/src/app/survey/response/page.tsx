'use client';

import { QustnrRespondInfo } from '@/types/business/survey';
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
 const [page踰덊샇, setPage踰덊샇] = useState(1);
 const [searchKeyword, setSearchKeyword] = useState('');
 const queryClient = useQueryClient();

 const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
 queryKey: ['survey-responses', page踰덊샇, searchKeyword],
 queryFn: () => getQustnrRespondInfoList({ page: page踰덊샇, size: 10, keyword: searchKeyword }),
 retry: false,
 }) as any;

 const deleteMutation = useMutation({
 mutationFn: (id: string) => deleteQustnrRespondInfo(id),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['survey-responses'] });
 alert('님젣?섏뿀?듬땲님');
 },
 onError: (err) => {
 alert(`님젣 ?ㅽ뙣: ${err instanceof Error ? err.message : '님님?녿뒗 ?ㅻ쪟'}`);
 }
 });

 const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
 setSearchKeyword(e.target.value);
 setPage踰덊샇(1);
 };

 const handleDelete = (id: string, name: string) => {
 if (confirm(`${name}?섏쓽 ?묐떟님님젣?섏떆寃좎뒿?덇퉴?`)) {
 deleteMutation.mutate(id);
 }
 };

 return (
 <div className="container mx-auto py-8 max-w-6xl space-y-6">
 <div className="flex justify-between items-end">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">설문조사 ?묐떟 愿由?/h1>
 <p className="text-muted-foreground mt-1">
 ?쒖뒪?쒖뿉 등록님설문조사 ?묐떟 현황님?뺤씤?섍퀬 愿由ы빀?덈떎.
 </p>
 </div>
 <div className="flex space-x-2">
 <Link href="/survey/stats">
 <Button variant="outline" size="sm">
 <BarChart3 className="mr-2 h-4 w-4" />
 통계 蹂닿린
 </Button>
 </Link>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => refetch()}
 disabled={isFetching}
 >
 <RotateCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
 ?덈줈怨좎묠
 </Button>
 </div>
 </div>

 <Card className="shadow-sm">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-lg font-medium">?묐떟 紐⑸줉</CardTitle>
 <div className="relative w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 type="search"
 placeholder="?묐떟님?대쫫 寃님.."
 value={searchKeyword}
 onChange={handleSearch}
 className="pl-9"
 />
 </div>
 </div>
 <CardDescription>
 珥?{data?.totalElements || 0}嫄댁쓽 ?묐떟님조회?섏뿀?듬땲님
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="rounded-md border bg-card overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/50">
 <TableHead className="w-[150px] font-semibold">?묐떟님/TableHead>
 <TableHead className="font-semibold">?묐떟 ?댁슜</TableHead>
 <TableHead className="w-[180px] font-semibold">등록 ?쇱떆</TableHead>
 <TableHead className="w-[120px] font-semibold text-center">愿由?/TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={4} className="h-48 text-center">
 <div className="flex flex-col items-center justify-center space-y-2">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-muted-foreground">?곗씠?곕? 遺덈윭?ㅻ뒗 以묒엯?덈떎...</p>
 </div>
 </TableCell>
 </TableRow>
 ) : isError ? (
 <TableRow>
 <TableCell colSpan={4} className="h-48 text-center text-destructive">
 ?곌껐 ?ㅻ쪟: {error instanceof Error ? error.message : '?곗씠?곕? 媛?몄삱 님?놁뒿?덈떎.'}
 </TableCell>
 </TableRow>
 ) : data?.content?.length === 0 ? (
 <TableRow>
 <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
 寃님寃곌낵媛 ?놁뒿?덈떎.
 </TableCell>
 </TableRow>
 ) : (
 data?.content?.map((item: any) => (
 <TableRow key={item.qestnrQesitmId} className="transition-colors hover:bg-muted/30">
 <TableCell className="font-medium">{item.respondNm}</TableCell>
 <TableCell className="text-muted-foreground">
 <span className="line-clamp-1">{item.respondAnswerCn}</span>
 </TableCell>
 <TableCell className="text-sm font-mono text-muted-foreground">
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
 현재 {page踰덊샇}?섏씠吏
 </p>
 <div className="flex items-center space-x-2">
 <Button
 variant="outline"
 size="sm"
 disabled={page踰덊샇 === 1 || isFetching}
 onClick={() => setPage踰덊샇(p => Math.max(1, p - 1))}
 >
 <ChevronLeft className="h-4 w-4 mr-1" /> ?댁쟾
 </Button>
 <Button
 variant="outline"
 size="sm"
 disabled={data?.content?.length < 10 || isFetching}
 onClick={() => setPage踰덊샇(p => p + 1)}
 >
 ?ㅼ쓬 <ChevronRight className="h-4 w-4 ml-1" />
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}


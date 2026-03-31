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
 const [pageë²ˆí˜¸, setPageë²ˆí˜¸] = useState(1);
 const [searchKeyword, setSearchKeyword] = useState('');
 const queryClient = useQueryClient();

 const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
 queryKey: ['survey-responses', pageë²ˆí˜¸, searchKeyword],
 queryFn: () => getQustnrRespondInfoList({ page: pageë²ˆí˜¸, size: 10, keyword: searchKeyword }),
 retry: false,
 }) as any;

 const deleteMutation = useMutation({
 mutationFn: (id: string) => deleteQustnrRespondInfo(id),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['survey-responses'] });
 alert('?? œ?˜ì—ˆ?µë‹ˆ??');
 },
 onError: (err) => {
 alert(`?? œ ?¤íŒ¨: ${err instanceof Error ? err.message : '?????†ëŠ” ?¤ë¥˜'}`);
 }
 });

 const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
 setSearchKeyword(e.target.value);
 setPageë²ˆí˜¸(1);
 };

 const handleDelete = (id: string, name: string) => {
 if (confirm(`${name}?˜ì˜ ?‘ë‹µ???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?`)) {
 deleteMutation.mutate(id);
 }
 };

 return (
 <div className="container mx-auto py-8 max-w-6xl space-y-6">
 <div className="flex justify-between items-end">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">?¤ë¬¸ì¡°ì‚¬ ?‘ë‹µ ê´€ë¦?/h1>
 <p className="text-muted-foreground mt-1">
 ?œìŠ¤?œì— ?±ë¡???¤ë¬¸ì¡°ì‚¬ ?‘ë‹µ ?„í™©???•ì¸?˜ê³  ê´€ë¦¬í•©?ˆë‹¤.
 </p>
 </div>
 <div className="flex space-x-2">
 <Link href="/survey/stats">
 <Button variant="outline" size="sm">
 <BarChart3 className="mr-2 h-4 w-4" />
 ?µê³„ ë³´ê¸°
 </Button>
 </Link>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => refetch()}
 disabled={isFetching}
 >
 <RotateCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
 ?ˆë¡œê³ ì¹¨
 </Button>
 </div>
 </div>

 <Card className="shadow-sm">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-lg font-medium">?‘ë‹µ ëª©ë¡</CardTitle>
 <div className="relative w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 type="search"
 placeholder="?‘ë‹µ???´ë¦„ ê²€??.."
 value={searchKeyword}
 onChange={handleSearch}
 className="pl-9"
 />
 </div>
 </div>
 <CardDescription>
 ì´?{data?.totalElements || 0}ê±´ì˜ ?‘ë‹µ??ì¡°íšŒ?˜ì—ˆ?µë‹ˆ??
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="rounded-md border bg-card overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/50">
 <TableHead className="w-[150px] font-semibold">?‘ë‹µ??/TableHead>
 <TableHead className="font-semibold">?‘ë‹µ ?´ìš©</TableHead>
 <TableHead className="w-[180px] font-semibold">?±ë¡ ?¼ì‹œ</TableHead>
 <TableHead className="w-[120px] font-semibold text-center">ê´€ë¦?/TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={4} className="h-48 text-center">
 <div className="flex flex-col items-center justify-center space-y-2">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-muted-foreground">?°ì´?°ë? ë¶ˆëŸ¬?¤ëŠ” ì¤‘ì…?ˆë‹¤...</p>
 </div>
 </TableCell>
 </TableRow>
 ) : isError ? (
 <TableRow>
 <TableCell colSpan={4} className="h-48 text-center text-destructive">
 ?°ê²° ?¤ë¥˜: {error instanceof Error ? error.message : '?°ì´?°ë? ê°€?¸ì˜¬ ???†ìŠµ?ˆë‹¤.'}
 </TableCell>
 </TableRow>
 ) : data?.content?.length === 0 ? (
 <TableRow>
 <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
 ê²€??ê²°ê³¼ê°€ ?†ìŠµ?ˆë‹¤.
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
 ?„ì¬ {pageë²ˆí˜¸}?˜ì´ì§€
 </p>
 <div className="flex items-center space-x-2">
 <Button
 variant="outline"
 size="sm"
 disabled={pageë²ˆí˜¸ === 1 || isFetching}
 onClick={() => setPageë²ˆí˜¸(p => Math.max(1, p - 1))}
 >
 <ChevronLeft className="h-4 w-4 mr-1" /> ?´ì „
 </Button>
 <Button
 variant="outline"
 size="sm"
 disabled={data?.content?.length < 10 || isFetching}
 onClick={() => setPageë²ˆí˜¸(p => p + 1)}
 >
 ?¤ìŒ <ChevronRight className="h-4 w-4 ml-1" />
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}

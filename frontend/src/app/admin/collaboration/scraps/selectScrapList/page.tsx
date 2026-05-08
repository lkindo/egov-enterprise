'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from '@/lib/api/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, Plus, Trash2, Home, ChevronRight, ExternalLink, FileText } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

interface Scrap {
    scrapId: string;
    scrapNm: string;
    scrapUrl: string;
    scrapDc: string;
    frstRegisterPnttm: string;
}

const ScrapListPage = () => {
    const [list, setList] = useState<Scrap[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [pageNo, setPageNo] = useState(1);
    const [loading, setLoading] = useState(false);

    const fetchList = async () => {
        setLoading(true);
        try {
            const params = { pageIndex: pageNo, pageUnit: 10 };
            const response = (await axios.get('/scraps', { params })) as any;
            setList(response.list || []);
            setTotalCount(response.total || 0);
            setTotalPages(response.totalPage || 0);
        } catch (error) {
            console.error('Failed to fetch scraps', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [pageNo]);

    const handleDelete = async (id: string) => {
        if (!confirm('??†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) return;
        try {
            await axios.delete(`/scraps/${id}`);
            fetchList();
        } catch (error) {
            alert('??†ú???§Ìå®?àÏäµ?àÎã§.');
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <DynamicBreadcrumb />

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-6 bg-gradient-to-r from-muted/50 to-transparent border-b px-10 pt-10">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Bookmark className="w-6 h-6 text-primary" /> ?§ÌÅ¨??Î™©Î°ù
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">?òÏ§ë???§Ïãú Î≥?Ï§ëÏöî???òÏù¥ÏßÄ?Ä ?ïÎ≥¥Î•?Í¥ÄÎ¶¨Ìïò?∏Ïöî.</p>
                    </div>
                    <Link href="/admin/collaboration/scraps/insertScrap">
                        <Button size="sm" className="gap-2 shadow-sm font-bold">
                            <Plus className="w-4 h-4" /> ?†Í∑ú ?±Î°ù
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="p-10 pt-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="bg-muted px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border">
                            ?ÑÏ≤¥ <span className="text-primary font-bold">{totalCount}</span>Í±¥Ïùò ?§ÌÅ¨??                        </div>
                    </div>

                    <div className="rounded-lg border shadow-sm overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[80px] text-center font-bold">Î≤àÌò∏</TableHead>
                                    <TableHead className="w-[250px] font-bold">?§ÌÅ¨?©Î™Ö</TableHead>
                                    <TableHead className="font-bold">URL / ?§Î™Ö</TableHead>
                                    <TableHead className="w-[120px] text-center font-bold">?±Î°ù??/TableHead>
                                    <TableHead className="w-[100px] text-center font-bold">Í¥ÄÎ¶?/TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">
                                            ?Ä?•Îêú ?§ÌÅ¨?©Ïù¥ ?ÜÏäµ?àÎã§. ?†Ïùµ???ïÎ≥¥Î•??Ä?•Ìï¥Î≥¥ÏÑ∏??
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    list.map((item, idx) => (
                                        <TableRow key={item.scrapId} className="hover:bg-muted/20 transition-colors group">
                                            <TableCell className="text-center text-muted-foreground font-medium">
                                                {totalCount - ((pageNo - 1) * 10) - idx}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/admin/collaboration/scraps/selectScrapDetail/${item.scrapId}`} className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2">
                                                    <FileText className="w-4 h-4 opacity-40" /> {item.scrapNm}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 py-1">
                                                    <a href={item.scrapUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 font-medium group/link">
                                                        {item.scrapUrl?.length > 70 ? item.scrapUrl.substring(0, 70) + '...' : item.scrapUrl}
                                                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                    </a>
                                                    <span className="text-sm text-muted-foreground font-medium truncate max-w-[500px]">{item.scrapDc || '?§Î™Ö ?ÜÏùå'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-sm text-muted-foreground font-medium">
                                                {item.frstRegisterPnttm?.substring(0, 10)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item.scrapId)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-10">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageNo(p => Math.max(1, p - 1))}
                                disabled={pageNo === 1}
                                className="px-6 font-bold shadow-sm"
                            >
                                ?¥Ï†Ñ
                            </Button>
                            <div className="flex items-center gap-2 px-6 py-2 bg-muted rounded-full">
                                <span className="text-sm font-bold text-primary">{pageNo}</span>
                                <span className="text-sm font-bold text-muted-foreground">/</span>
                                <span className="text-sm font-bold text-muted-foreground">{totalPages}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                                disabled={pageNo === totalPages}
                                className="px-6 font-bold shadow-sm"
                            >
                                ?§Ïùå
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ScrapListPage;

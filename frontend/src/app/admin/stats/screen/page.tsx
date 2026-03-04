'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { statsAdminService } from '@/services/admin/stats/StatsAdminService';
import { format } from 'date-fns';
import { Loader2, Search } from "lucide-react";

export default function ScreenStatsPage() {
    const [filter, setFilter] = useState({
        fromDate: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
        toDate: format(new Date(), 'yyyy-MM-dd')
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-stats-screen', filter],
        queryFn: () => statsAdminService.getScrinStats(filter),
    });

    const stats = (data as any)?.scrinStats || (data as any)?.list || [];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        refetch();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>화면 통계</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-6 bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <Input
                                type="date"
                                value={filter.fromDate}
                                onChange={(e) => setFilter(prev => ({ ...prev, fromDate: e.target.value }))}
                                className="w-[150px]"
                            />
                            <span className="self-center text-slate-400">~</span>
                            <Input
                                type="date"
                                value={filter.toDate}
                                onChange={(e) => setFilter(prev => ({ ...prev, toDate: e.target.value }))}
                                className="w-[150px]"
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            조회
                        </Button>
                    </form>

                    <div className="h-[500px] w-full mt-4">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center border rounded-md border-dashed">
                                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            </div>
                        ) : stats.length === 0 ? (
                            <div className="flex h-full items-center justify-center border rounded-md border-dashed text-slate-400">
                                통계 데이터가 없습니다.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart
                                    data={stats}
                                    layout="vertical"
                                    margin={{
                                        top: 5,
                                        right: 30,
                                        left: 40,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="screenNm" type="category" width={150} fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="statsCo" name="조회수" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

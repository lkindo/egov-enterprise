'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic from 'next/dynamic';
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
import { statsAdminService } from '@/services/admin/stats/StatsAdminService';
import { format } from 'date-fns';
import { Loader2, Search } from "lucide-react";

export default function UserStatsPage() {
    const [filter, setFilter] = useState({
        statsKind: 'day',
        fromDate: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
        toDate: format(new Date(), 'yyyy-MM-dd')
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-stats-user', filter],
        queryFn: () => statsAdminService.getUserStats(filter),
    });

    const stats = data?.list || [];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        refetch();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>사용자 통계</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-6 bg-slate-50 p-4 rounded-lg">
                        <Select
                            value={filter.statsKind}
                            onValueChange={(value) => setFilter(prev => ({ ...prev, statsKind: value }))}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="기간 구분" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">일별</SelectItem>
                                <SelectItem value="month">월별</SelectItem>
                                <SelectItem value="year">연별</SelectItem>
                            </SelectContent>
                        </Select>
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
                                    margin={{
                                        top: 5,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="statsDate" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="statsCo" name="사용자 수" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

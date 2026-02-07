'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import statsService from '@/services/stats/statsService';
import { StatsVO } from '@/types/stats';
import { format } from 'date-fns';

export default function UserStatsPage() {
    const [stats, setStats] = useState<StatsVO[]>([]);
    const [statsKind, setStatsKind] = useState('day');
    const [fromDate, setFromDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const fetchStats = async () => {
        try {
            const result = await statsService.getUserStats({
                statsKind,
                fromDate,
                toDate
            });
            if (result.success) {
                // Determine the correct list property from API response
                // The service returns { list: ... } which might be named differently in backend
                // Assuming client.ts handles response.data wrapping
                setStats(result.list || []);
            }
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>사용자 통계</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 mb-6">
                        <Select value={statsKind} onValueChange={setStatsKind}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="기간 구분" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">일별</SelectItem>
                                <SelectItem value="month">월별</SelectItem>
                                <SelectItem value="year">연별</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-[150px]"
                        />
                        <span className="self-center">~</span>
                        <Input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-[150px]"
                        />
                        <Button onClick={fetchStats}>조회</Button>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="statsDate" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="statsCo" name="사용자 수" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

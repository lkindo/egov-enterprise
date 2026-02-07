'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import statsService from '@/services/stats/statsService';
import { StatsVO } from '@/types/stats';
import { format } from 'date-fns';

export default function ScreenStatsPage() {
    const [stats, setStats] = useState<StatsVO[]>([]);
    const [fromDate, setFromDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const fetchStats = async () => {
        try {
            const result = await statsService.getScrinStats({
                fromDate,
                toDate
            });
            if (result.success) {
                setStats(result.list || []);
            }
        } catch (error) {
            console.error('Failed to fetch screen stats:', error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>화면 통계</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 mb-6">
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
                                layout="vertical"
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 100,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="screenNm" type="category" width={150} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="statsCo" name="조회수" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

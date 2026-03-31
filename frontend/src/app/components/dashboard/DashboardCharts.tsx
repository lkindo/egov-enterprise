'use client';

import React from 'react';
import {
 AreaChart,
 Area,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 BarChart,
 Bar,
 Cell,
} from 'recharts';
import { StatsDto } from '@/services/foundation/system/StatsAdminService';

interface ChartProps {
 data: StatsDto[];
 loading?: boolean;
}

export function DashboardVisitorChart({ data }: ChartProps) {
 // ?°ì´??ê°€ê³? ? ì§œ ?¬ë§· ìµœì ??(?? 20260302 -> 03.02)
 const chartData = (data || []).map(item => ({
 name: item.statsDate?.length === 8 ? `${item.statsDate.substring(4, 6)}.${item.statsDate.substring(6, 8)}` : item.statsDate,
 visitors: item.statsCo || 0
 }));

 if (!chartData.length) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">?°ì´?°ê? ?†ìŠµ?ˆë‹¤.</div>;

 return (
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart
 data={chartData}
 margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
 >
 <defs>
 <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="var(--color-hub-blue)" stopOpacity={0.2} />
 <stop offset="100%" stopColor="var(--color-hub-blue)" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
 <XAxis
 dataKey="name"
 axisLine={false}
 tickLine={false}
 tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)', fontWeight: 700 }}
 dy={10}
 />
 <YAxis
 axisLine={false}
 tickLine={false}
 tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)', fontWeight: 700 }}
 />
 <Tooltip
 contentStyle={{ 
 backgroundColor: 'var(--color-card)', 
 borderRadius: '20px', 
 border: '1px solid var(--color-border)', 
 boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
 padding: '12px 16px',
 fontFamily: 'inherit',
 fontSize: '12px',
 fontWeight: '900',
 textTransform: 'uppercase'
 }}
 />
 <Area
 type="monotone"
 dataKey="visitors"
 stroke="var(--color-hub-blue)"
 strokeWidth={4}
 fillOpacity={1}
 fill="url(#colorVisitors)"
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 );
}

export function DashboardPostChart({ data }: ChartProps) {
 const chartData = (data || []).map(item => ({
 name: item.statsDate?.length === 8 ? `${item.statsDate.substring(6, 8)}` : item.statsDate,
 posts: (item.creatCo || 0) + (item.inqireCo || 0)
 }));

 if (!chartData.length) return <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm font-bold tracking-tight opacity-30">?„ìŠ¤ ë¹„í™œ??/div>;

 return (
 <div className="h-[200px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
 <XAxis
 dataKey="name"
 axisLine={false}
 tickLine={false}
 tick={{ fontSize: 11, fill: '#64748b' }}
 />
 <Tooltip
 cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
 />
 <Bar dataKey="posts" radius={[4, 4, 0, 0]}>
 {chartData.map((_entry, index) => (
 <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#3b82f6' : '#94a3b8'} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
}

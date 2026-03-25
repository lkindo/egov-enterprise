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
 PieChart,
 Pie,
 Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, MessageSquare } from "lucide-react";

const trafficData = [
 { name: '02.11', views: 400 },
 { name: '02.12', views: 300 },
 { name: '02.13', views: 200 },
 { name: '02.14', views: 278 },
 { name: '02.15', views: 189 },
 { name: '02.16', views: 239 },
 { name: '02.17', views: 349 },
];

const authorData = [
 { name: '愿由ъ옄', value: 400 },
 { name: '?ъ슜?륚', value: 300 },
 { name: '?ъ슜?륛', value: 200 },
 { name: '湲고?', value: 100 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

export function BoardStats() {
 return (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
 {/* ?몃옒??異붿씠 */}
 <Card className="lg:col-span-2 border-none shadow-lg rounded-[2rem] overflow-hidden ring-1 ring-slate-100">
 <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-8">
 <CardTitle className="text-lg font-black flex items-center gap-2">
 <TrendingUp size={18} className="text-primary" />
 理쒓렐 7???몃옒??異붿씠
 </CardTitle>
 <span className="text-[10px] font-bold text-muted-foreground tracking-tight bg-muted px-2 py-1 rounded-md">Real-time</span>
 </CardHeader>
 <CardContent className="px-6 pb-6">
 <div className="h-[200px] w-full">
 <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
 <div style={{ width: '100%', height: '100%' }}><AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <defs>
 <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
 <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
 <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fill="url(#colorViews)" />
 </AreaChart></div>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>

 {/* ?묒꽦??遺꾪룷 */}
 <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden ring-1 ring-slate-100">
 <CardHeader className="pb-2 pt-6 px-8">
 <CardTitle className="text-lg font-black flex items-center gap-2">
 <Users size={18} className="text-primary" />
 ?묒꽦??遺꾪룷
 </CardTitle>
 </CardHeader>
 <CardContent className="px-6 pb-6 flex flex-col items-center">
 <div className="h-[180px] w-full">
 <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
 <div style={{ width: '100%', height: '100%' }}><PieChart>
 <Pie
 data={authorData}
 cx="50%"
 cy="50%"
 innerRadius={50}
 outerRadius={70}
 paddingAngle={5}
 dataKey="value"
 >
 {authorData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
 </PieChart></div>
 </ResponsiveContainer>
 </div>
 <div className="grid grid-cols-2 gap-3 w-full mt-2">
 {authorData.map((entry, index) => (
 <div key={entry.name} className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
 <span className="text-[11px] font-bold text-muted-foreground">{entry.name}</span>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 </div>
 );
}

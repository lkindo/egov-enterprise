'use client';

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { SafeResponsiveContainer } from '@/app/components/ui/observability-charts';

const CHART_COLORS = ['#0055FB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

interface StandardChartWrapperProps {
    title: string;
    type: 'bar' | 'line' | 'area' | 'pie';
    data: unknown[];
    dataKeys: string[];
    loading?: boolean;
    className?: string;
    height?: number;
}

export function StandardChartWrapper({
    title, type, data, dataKeys, loading, className, height = 300
}: StandardChartWrapperProps) {
    return (
        <div className={cn("p-6 border rounded-xl bg-card shadow-sm transition-all hover:shadow-md", className)}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-[11px] font-black text-slate-700 tracking-tight">{title}</h3>
            </div>

            <div style={{ width: '100%', height }}>
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
                        <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                ) : (
                    <SafeResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        {type === 'bar' ? (
                            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#0055FB" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#0055FB" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    fontWeight={800}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#475569' }}
                                />
                                <YAxis
                                    fontSize={10}
                                    fontWeight={800}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#475569' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0, 85, 251, 0.05)' }}
                                    content={<CustomTooltip />}
                                />
                                {(dataKeys || []).map((key, idx) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        fill="url(#barGradient)"
                                        radius={[6, 6, 0, 0]}
                                        barSize={24}
                                    />
                                ))}
                            </BarChart>
                        ) : type === 'area' ? (
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#0055FB" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#0055FB" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    fontWeight={800}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#475569' }}
                                />
                                <YAxis
                                    fontSize={10}
                                    fontWeight={800}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#475569' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                {(dataKeys || []).map((key, idx) => (
                                    <Area
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke="#0055FB"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#areaGradient)"
                                    />
                                ))}
                            </AreaChart>
                        ) : type === 'pie' ? (
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {(data || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    formatter={(value) => <span className="text-[10px] font-black text-slate-600 ml-1">{value}</span>}
                                />
                            </PieChart>
                        ) : type === 'line' ? (
                            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} fontWeight={800} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                {(dataKeys || []).map((key, idx) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                ))}
                            </LineChart>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                李⑦듃 ?좏삎님吏€먮릺吏€ ?딆뒿?덈떎.
                            </div>
                        )}
                    </SafeResponsiveContainer>
                )}
            </div>
        </div>
    );
}</div>
        </div>
    );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) {
    if (active && payload && (payload as unknown[]).length) {
        return (
            <div className="bg-background/95 backdrop-blur-sm border shadow-2xl rounded-xl p-3 min-w-[120px]">
                <p className="text-[10px] font-black text-muted-foreground mb-1 tracking-tighter">{label}</p>
                <div className="space-y-1">
                    {(payload as any[] || []).map((p, idx) => (
                        <div key={`tooltip-item-${idx}`} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                                <span className="text-sm font-bold text-foreground">{p.name}</span>
                            </div>
                            <span className="text-sm font-black text-primary">{p.value?.toLocaleString() || 0}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
}


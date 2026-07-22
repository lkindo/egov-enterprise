'use client';

import React, { useId } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { SafeResponsiveContainer } from '@/app/components/ui/observability-charts';
import { useChartColors } from '@/lib/hooks/useChartColors';

/**
 * 다계열(categorical) 팔레트.
 * TODO(P2): 라이트/다크 각각에서 3:1 을 만족하는 `--chart-1..n` 토큰을 globals.css 에 신설한 뒤
 * `useChartColors()` 로 흡수해야 한다. 현행 파랑 램프는 밝은 단계(#93C5FD/#BFDBFE)가
 * 라이트 표면에서 3:1 미만이며, 순차(sequential) 램프를 범주형으로 쓰는 안티패턴이다.
 * globals.css 는 본 배치의 타 소유 파일이라 여기서는 축·그리드·강조색만 토큰화한다.
 */
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
    const c = useChartColors();
    // 같은 페이지에 차트가 2개 이상일 때 <defs> id 충돌로 그라디언트가 서로를 덮어쓰는 것을 방지
    // React 의 useId 는 ':' / '«' 등 SVG id·url(#…) 에 부적합한 문자를 포함하므로 영숫자만 남긴다
    const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');
    const barGradientId = `bar-${gradientId}`;
    const areaGradientId = `area-${gradientId}`;

    return (
        <div className={cn("p-6 border rounded-lg bg-card shadow-sm transition-all hover:shadow-md", className)}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-card-foreground tracking-tight">{title}</h3>
            </div>

            <div style={{ width: '100%', height }}>
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
                        <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                ) : (
                    <SafeResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        {type === 'bar' ? (
                            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={c.accent} stopOpacity={1} />
                                        <stop offset="100%" stopColor={c.accent} stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    fontWeight={800}
                                    tickLine={false}
                                    axisLine={{ stroke: c.axis }}
                                    tick={{ fill: c.tick }}
                                />
                                <YAxis
                                    fontSize={10}
                                    fontWeight={800}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: c.tick }}
                                />
                                <Tooltip
                                    cursor={{ fill: c.accentSoft }}
                                    content={<CustomTooltip />}
                                />
                                {(dataKeys || []).map((key) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        fill={`url(#${barGradientId})`}
                                        radius={[6, 6, 0, 0]}
                                        barSize={24}
                                    />
                                ))}
                            </BarChart>
                        ) : type === 'area' ? (
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={c.accent} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    fontWeight={800}
                                    tickLine={false}
                                    axisLine={{ stroke: c.axis }}
                                    tick={{ fill: c.tick }}
                                />
                                <YAxis
                                    fontSize={10}
                                    fontWeight={800}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: c.tick }}
                                />
                                <Tooltip cursor={{ stroke: c.axis }} content={<CustomTooltip />} />
                                {(dataKeys || []).map((key) => (
                                    <Area
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={c.accent}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill={`url(#${areaGradientId})`}
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
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                                            /* 인접 조각 사이 2px 표면 간극 — 저대비 단계도 경계가 보이게 한다 */
                                            stroke={c.surface}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    formatter={(value) => <span className="text-xs font-bold text-muted-foreground ml-1">{value}</span>}
                                />
                            </PieChart>
                        ) : type === 'line' ? (
                            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
                                <XAxis dataKey="name" fontSize={10} fontWeight={800} tickLine={false} axisLine={{ stroke: c.axis }} tick={{ fill: c.tick }} />
                                <YAxis fontSize={10} fontWeight={800} tickLine={false} axisLine={false} tick={{ fill: c.tick }} />
                                <Tooltip cursor={{ stroke: c.axis }} content={<CustomTooltip />} />
                                {(dataKeys || []).map((key, idx) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: c.surface, strokeWidth: 2 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                ))}
                            </LineChart>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                지원하지 않는 차트 유형입니다.
                            </div>
                        )}
                    </SafeResponsiveContainer>
                )}
            </div>
        </div>
    );
}

interface TooltipPayloadItem {
    name?: string;
    value?: number | string;
    color?: string;
    fill?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) {
    if (active && payload && (payload as unknown[]).length) {
        const items = (payload ?? []) as TooltipPayloadItem[];
        return (
            <div className="bg-background/95 backdrop-blur-sm border shadow-2xl rounded-lg p-3 min-w-[120px]">
                <p className="text-xs font-bold text-muted-foreground mb-1 tracking-tighter">{label}</p>
                <div className="space-y-1">
                    {items.map((p, idx) => (
                        <div key={`tooltip-item-${idx}`} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                                <span className="text-sm font-bold text-foreground">{p.name}</span>
                            </div>
                            <span className="text-sm font-bold text-primary">
                                {typeof p.value === 'number' ? p.value.toLocaleString() : (p.value ?? 0)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
}

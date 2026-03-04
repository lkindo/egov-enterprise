'use client';

import React from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    YAxis,
    Tooltip,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from 'recharts';
import { cn } from '@/lib/utils';

/**
 * 1. GaugeChart
 * DB 커넥션 및 리소스 사용률을 계기판 형태로 시각화
 */
interface GaugeChartProps {
    value: number; // 0 to 100
    title: string;
    unit?: string;
    color?: string;
    className?: string;
}

export function GaugeChart({ value, title, unit = '%', color = '#3B82F6', className }: GaugeChartProps) {
    const data = [
        { value: value },
        { value: 100 - value }
    ];

    return (
        <div className={cn("flex flex-col items-center justify-center relative p-6 bg-card border rounded-3xl shadow-sm overflow-hidden group", className)}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            </div>
            <div className="w-full h-[180px] relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="75%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="gauge-active" fill={color} className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <Cell key="gauge-muted" fill="var(--muted)" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-[20%] flex flex-col items-center justify-center">
                    <span className="text-3xl font-black tracking-tighter text-foreground">{value}{unit}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
                </div>
            </div>
            {value > 90 && (
                <div className="mt-2 px-3 py-1 bg-destructive/10 text-destructive text-[10px] font-black rounded-full animate-pulse">
                    CRITICAL THRESHOLD
                </div>
            )}
        </div>
    );
}

/**
 * 2. RealtimeSparkline
 * CPU/MEM 추이를 보여주는 초소형 미세 추세선
 */
interface SparklineProps {
    data: { value: number }[];
    color?: string;
    label: string;
}

export function RealtimeSparkline({ data, color = '#3B82F6', label }: SparklineProps) {
    return (
        <div className="space-y-2 p-4 bg-muted/20 border border-white/5 rounded-2xl">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="text-xs font-black text-foreground">{data[data.length - 1]?.value}%</span>
            </div>
            <div className="h-12 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={data}>
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={3}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <YAxis hide domain={[0, 100]} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/**
 * 3. SystemStatusRadar
 * 가용성, 보안, 성능, 안정성 등의 다차원 분석
 */
interface RadarProps {
    data: { subject: string; A: number }[];
    title: string;
}

export function SystemStatusRadar({ data, title }: RadarProps) {
    return (
        <div className="p-8 border rounded-[2.5rem] bg-card shadow-lg flex flex-col items-center">
            <h3 className="text-sm font-black text-foreground uppercase tracking-[0.2em] mb-8">{title}</h3>
            <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="var(--muted-foreground)" strokeOpacity={0.2} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="System Health"
                            dataKey="A"
                            stroke="#3B82F6"
                            fill="#3B82F6"
                            fillOpacity={0.5}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                {data.map((item, idx) => (
                    <div key={`radar-item-${idx}`} className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">{item.subject}</span>
                        <span className="text-xs font-black">{item.A}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
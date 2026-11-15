'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { StandardChartBodyProps } from './standard-chart-body';

// [2026-11-15] recharts 는 통계 화면 첫 로드 JS 의 가장 큰 몫이었다(통계 경로 580KB, 중앙값 431KB). 틀·제목은 그대로 그리고
//   차트 본체만 늦게 받는다 — 자리표시는 본체와 같은 크기(부모 높이 고정)라 도착해도 레이아웃이 밀리지 않는다.
const StandardChartBody = dynamic<StandardChartBodyProps>(() => import('./standard-chart-body').then((mod) => mod.StandardChartBody), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted/20 rounded-lg animate-pulse" />,
});

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
                    <StandardChartBody type={type} data={data} dataKeys={dataKeys} />
                )}
            </div>
        </div>
    );
}

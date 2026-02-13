'use client';

import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['#0055FB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

interface StandardChartWrapperProps {
  title: string;
  type: 'bar' | 'line' | 'area' | 'pie';
  data: any[];
  dataKeys: string[];
  loading?: boolean;
  className?: string;
  height?: number;
}

export function StandardChartWrapper({ 
  title, type, data, dataKeys, loading, className, height = 300 
}: StandardChartWrapperProps) {
  return (
    <div className={cn("p-6 border rounded-xl bg-card shadow-sm", className)}>
      <h3 className="text-sm font-bold text-muted-foreground mb-6">{title}</h3>
      <div style={{ width: '100%', height }}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-lg animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        ) : (
          <ResponsiveContainer>
            {type === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                {dataKeys.map((key, idx) => <Bar key={key} dataKey={key} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            ) : type === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                {dataKeys.map((key, idx) => <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />)}
              </LineChart>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground italic text-sm">
                차트 유형이 지원되지 않습니다.
              </div>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

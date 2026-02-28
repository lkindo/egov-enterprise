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

interface MonitoringChartProps {
  data: any[];
}

export function RealtimeResourceChart({ data }: MonitoringChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="cpu" stroke="#ef4444" strokeWidth={2} fill="url(#colorCpu)" name="CPU (%)" />
          <Area type="monotone" dataKey="mem" stroke="#3b82f6" strokeWidth={2} fill="url(#colorMem)" name="Memory (%)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServiceHealthChart() {
  const data = [
    { name: '정상', value: 48 },
    { name: '주의', value: 2 },
  ];
  const COLORS = ['#10b981', '#f59e0b'];

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-28 mb-20">
        <span className="text-2xl font-black text-foreground">96%</span>
        <p className="text-[10px] text-muted-foreground font-bold">Health Score</p>
      </div>
    </div>
  );
}

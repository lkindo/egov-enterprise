'use client';

import { useState, useEffect, useRef } from 'react';
import { PieChart, 
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
  PolarRadiusAxis, 
  AreaChart, 
  Area, 
  XAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  type ResponsiveContainerProps } from 'recharts';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/**
 * Recharts는 grid/axis 색을 SVG presentation attribute로 방출하므로 `var()`가 해석되지 않는다.
 * 테마별 구체 색상을 반환해 라이트/다크 모두에서 확실히 렌더되도록 한다. (theme-02)
 */
export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return {
    grid: dark ? '#334155' : '#e2e8f0',        // slate-700 / slate-200
    tick: dark ? '#94a3b8' : '#475569',        // slate-400 / slate-600
    muted: dark ? '#1e293b' : '#f1f5f9',       // slate-800 / slate-100
    tooltipBg: dark ? '#1e293b' : '#ffffff',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    tooltipText: dark ? '#e2e8f0' : '#1e293b',
  };
}

/**
 * Recharts의 'width(-1)' 경고를 방지하기 위해 컨테이너 크기가 0보다 클 때만 렌더링하는 안전한 래퍼
 */
export const SafeResponsiveContainer = ({ children, ...props }: ResponsiveContainerProps) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[inherit]">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ResponsiveContainer {...props} width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
};

/**
 * 1. GaugeChart
 * DB 커넥션 및 리소스 사용률을 계기판 형태로 시각화합니다.
 */
interface GaugeChartProps {
 value: number; // 0 to 100
 title: string;
 unit?: string;
 color?: string;
 className?: string;
}

export function GaugeChart({ value, title, unit = '%', color = '#3B82F6', className }: GaugeChartProps) {
  const c = useChartColors();

  const data = [
    { value: value },
    { value: 100 - value }
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center relative p-6 bg-card border rounded-lg shadow-sm overflow-hidden group", className)}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
        <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
      </div>
      <div className="w-full h-[180px] relative">
        <SafeResponsiveContainer>
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
              <Cell key="gauge-muted" fill={c.muted} />
            </Pie>
          </PieChart>
        </SafeResponsiveContainer>
        <div className="absolute inset-x-0 bottom-[20%] flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tighter text-foreground">{Math.round(value)}{unit}</span>
          <span className="text-xs font-bold text-muted-foreground tracking-tight">{title}</span>
        </div>
      </div>
      {value > 90 && (
        <div className="mt-2 px-3 py-1 bg-destructive/10 text-destructive-emphasis text-xs font-bold rounded-lg animate-pulse">
          CRITICAL THRESHOLD
        </div>
      )}
    </div>
  );
}

/**
 * 2. RealtimeSparkline
 * CPU/MEM 추이를 보여주는 초미세 추세 실시간 차트입니다.
 */
interface SparklineProps {
 data: { value: number }[];
 color?: string;
 label: string;
}

export function RealtimeSparkline({ data, color = '#3B82F6', label }: SparklineProps) {
  return (
    <div className="space-y-2 p-4 bg-muted/20 border border-white/5 rounded-lg">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-muted-foreground tracking-tight">{label}</span>
        <span className="text-sm font-bold text-foreground">
          {(data || [])[(data || []).length - 1]?.value?.toFixed(1) || '0.0'}%
        </span>
      </div>
      <div className="h-12 w-full">
        <SafeResponsiveContainer height={48} debounce={50}>
          <LineChart data={data || []}>
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
        </SafeResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * 3. SystemStatusRadar
 * 가용성, 보안, 성능, 설정 등에 대한 다차원 분석 정밀 분석 레이더 차트입니다.
 */
interface RadarProps {
 data: { subject: string; A: number }[];
 title: string;
}

export function SystemStatusRadar({ data, title }: RadarProps) {
 const c = useChartColors();
 return (
 <div className="p-8 border rounded-lg bg-card shadow-lg flex flex-col items-center">
 <h3 className="text-sm font-bold text-foreground tracking-[0.2em] mb-8">{title}</h3>
 <div className="w-full h-[300px]">
        <SafeResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke={c.grid} />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: c.tick }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
            <Radar
              name="Security Score"
              dataKey="A"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.5}
            />
          </RadarChart>
        </SafeResponsiveContainer>
 </div>
 <div className="mt-4 grid grid-cols-2 gap-4 w-full">
 {(data || []).map((item, idx) => (
 <div key={`radar-item-${idx}`} className="flex flex-col">
 <span className="text-xs font-bold text-muted-foreground ">{item.subject}</span>
 <span className="text-sm font-bold">{item?.A || 0}%</span>
 </div>
 ))}
 </div>
 </div>
 );
}

/**
 * 4. ActivityAreaChart
 * 활동 트렌드 및 최근 7일 로그인 빈도 시각화 데이터 면적 차트입니다.
 */
interface ActivityData {
  name: string;
  value: number;
}

interface ActivityAreaChartProps {
  data: ActivityData[];
  title: string;
  color?: string;
  height?: number;
}

export function ActivityAreaChart({ data, title, color = '#3B82F6', height = 300 }: ActivityAreaChartProps) {
  const c = useChartColors();
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-xs font-bold text-muted-foreground tracking-[0.3em] uppercase">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-bold text-muted-foreground">통계 프로파일</span>
        </div>
      </div>
      <div style={{ width: '100%', height: height }}>
        <SafeResponsiveContainer>
          <AreaChart data={data || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} opacity={0.3} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: c.tick, fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: c.tick, fontSize: 10, fontWeight: 700 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: c.tooltipBg,
                borderRadius: '16px',
                border: `2px solid ${c.tooltipBorder}`,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '11px',
                fontWeight: '900',
                padding: '12px',
                color: c.tooltipText
              }}
              cursor={{ stroke: color, strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={4} 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={0}
            />
          </AreaChart>
        </SafeResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * 5. DistributionPieChart
 * 데이터 분포(사용자 구성 등)를 도넛 차트 형태로 시각화합니다.
 */
interface DistributionData {
  name: string;
  value: number;
}

interface DistributionPieChartProps {
  data: DistributionData[];
  title: string;
  colors?: string[];
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function DistributionPieChart({ data, title, colors = DEFAULT_COLORS }: DistributionPieChartProps) {
  const c = useChartColors();
  return (
    <div className="flex flex-col items-center h-full">
      <h3 className="text-xs font-bold text-muted-foreground tracking-[0.3em] uppercase mb-6">{title}</h3>
      <div className="w-full h-full min-h-[220px]">
        <SafeResponsiveContainer>
          <PieChart>
            <Pie
              data={data || []}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={8}
              dataKey="value"
              animationDuration={0}
              animationBegin={0}
              stroke="none"
            >
              {(data || []).map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: c.tooltipBg,
                borderRadius: '16px',
                border: `2px solid ${c.tooltipBorder}`,
                fontSize: '11px',
                fontWeight: '900',
                color: c.tooltipText
              }}
            />
          </PieChart>
        </SafeResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 w-full px-4">
        {(data || []).map((item, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="text-xs font-bold text-foreground/60 truncate uppercase">{item?.name || 'Unknown'}</span>
            <span className="text-xs font-bold text-foreground ml-auto">{item?.value || 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}


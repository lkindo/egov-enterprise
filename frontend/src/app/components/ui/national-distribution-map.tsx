'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface MapData {
  region: string;
  count: number;
  activity: 'high' | 'medium' | 'low';
  coords: { x: number; y: number };
}

const MOCK_MAP_DATA: MapData[] = [
  { region: '서울/강원', count: 1250, activity: 'high', coords: { x: 45, y: 25 } },
  { region: '경기/충청', count: 840, activity: 'medium', coords: { x: 35, y: 65 } },
  { region: '경상/대구', count: 1050, activity: 'high', coords: { x: 75, y: 75 } },
  { region: '전라/광주', count: 410, activity: 'low', coords: { x: 30, y: 85 } },
  { region: '제주', count: 120, activity: 'low', coords: { x: 35, y: 95 } },
];

export function NationalDistributionMap({ className }: { className?: string }) {
  return (
    <div className={cn("p-8 border rounded-lg bg-card shadow-sm overflow-hidden relative", className)}>
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            전국 업무 활성 지표
          </h3>
          <p className="text-xs font-bold text-muted-foreground">실시간 지리적 접속 및 업무 분포 (분석 엔진 기반)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-xs font-bold text-foreground">높음</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-foreground">보통</span>
          </div>
        </div>
      </div>

      <div className="relative aspect-[4/5] max-w-[400px] mx-auto group">
        {/* Simplified Korea Map SVG Background */}
        <svg viewBox="0 0 100 120" className="w-full h-full opacity-10 dark:opacity-20 fill-muted-foreground">
          <path d="M40,10 L50,15 L55,25 L60,40 L70,50 L75,70 L65,90 L45,100 L30,90 L25,70 L20,50 L25,30 L30,15 Z" />
          <path d="M30,105 L45,115 L35,118 Z" /> {/* Jeju */}
        </svg>

        {/* Data Points (Bubbles) */}
        {MOCK_MAP_DATA.map((item, idx) => (
          <div
            key={`map-point-${idx}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group/point"
            style={{ left: `${item.coords.x}%`, top: `${item.coords.y}%` }}
          >
            {/* Pulsing Aura for High Activity */}
            {item.activity === 'high' && (
              <div className="absolute inset-0 w-full h-full rounded-lg bg-primary/20 animate-ping" />
            )}

            <div className={cn(
              "relative z-10 w-4 h-4 rounded-lg border-2 border-background shadow-xl transition-all duration-500 group-hover/point:scale-150",
              item.activity === 'high' ? "bg-blue-600 w-6 h-6" :
              item.activity === 'medium' ? "bg-blue-400 w-4 h-4" : "bg-blue-200 w-3 h-3"
            )} />

            {/* Tooltip on Point */}
            <div className="absolute top-0 left-full ml-3 opacity-0 group-hover/point:opacity-100 transition-opacity bg-background/95 backdrop-blur-md border shadow-2xl p-3 rounded-lg min-w-[140px] pointer-events-none z-50">
              <p className="text-xs font-bold text-muted-foreground mb-1">{item.region}</p>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-foreground">접속/업무</span>
                <span className="text-xs font-bold text-primary">{item.count.toLocaleString()}</span>
              </div>
              <div className="h-1 w-full bg-muted mt-2 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, (item.count / 1500) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 left-4 p-4 rounded-lg bg-muted/30 backdrop-blur-sm border border-white/10 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted-foreground tracking-tight">분석 핵심 지점</span>
          <span className="text-xs font-bold text-foreground ">서울 본사 / 영남 허브</span>
        </div>
        <div className="h-8 w-px bg-border mx-2" />
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-muted-foreground tracking-tight">전체 분포도</span>
          <span className="text-xs font-bold text-blue-600 ">98.4% COVERAGE</span>
        </div>
      </div>
    </div>
  );
}

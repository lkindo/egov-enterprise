'use client';

import { useState, useEffect } from 'react';

export function useObservability() {
 const [metrics, setMetrics] = useState({
 cpu: [] as { value: number }[],
 memory: [] as { value: number }[],
 dbPool: 0,
 activeThreads: 0,
 healthScore: 0,
 radarData: [
 { subject: '媛⑹꽦', A: 98 },
 { subject: 'Security', A: 95 },
 { subject: 'Performance', A: 88 },
 { subject: 'Stability', A: 92 },
 { subject: 'Latency', A: 85 },
 ]
 });

 useEffect(() => {
 // 珥덇린 데이터?앹꽦
 const initialHistory = Array.from({ length: 20 }, () => ({ value: Math.floor(Math.random() * 30) + 10 }));

 setMetrics(prev => ({
 ...prev,
 cpu: initialHistory,
 memory: initialHistory.map(v => ({ value: v.value + 5 })),
 dbPool: 45,
 activeThreads: 12,
 healthScore: 94
 }));

 const interval = setInterval(() => {
 setMetrics(prev => {
 const newCpu = Math.floor(Math.random() * 40) + 10;
 const newMem = Math.floor(Math.random() * 20) + 50;

 return {
 ...prev,
 cpu: [...prev.cpu.slice(1), { value: newCpu }],
 memory: [...prev.memory.slice(1), { value: newMem }],
 dbPool: Math.min(100, Math.max(0, prev.dbPool + (Math.random() * 10 - 5))),
 activeThreads: Math.floor(Math.random() * 20) + 10,
 healthScore: 90 + Math.floor(Math.random() * 10),
 radarData: prev.radarData.map(item => ({
 ...item,
 A: Math.min(100, Math.max(70, item.A + (Math.random() * 4 - 2)))
 }))
 };
 });
 }, 3000);

 return () => clearInterval(interval);
 }, []);

 return metrics;
}

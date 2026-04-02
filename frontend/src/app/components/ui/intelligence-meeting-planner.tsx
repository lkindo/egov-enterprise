'use client';

import React from 'react';
import { Calendar, Clock, MapPin, Users, Plus, Star, Sparkles, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MeetingRoom {
 id: string;
 name: string;
 capacity: number;
 equipment: string[];
 status: 'available' | 'occupied' | 'reserved';
}

const MOCK_ROOMS: MeetingRoom[] = [
 { id: 'rm-1', name: 'Visionary Hall', capacity: 20, equipment: ['Projector', 'VC', 'Whiteboard'], status: 'available' },
 { id: 'rm-2', name: 'Strategy Suite', capacity: 8, equipment: ['VC', 'Screen'], status: 'occupied' },
 { id: 'rm-3', name: 'Innovation Pod', capacity: 4, equipment: ['Whiteboard'], status: 'available' },
 { id: 'rm-4', name: 'Nexus Point', capacity: 12, equipment: ['Projector', 'VC'], status: 'reserved' },
];

export function IntelligenceMeetingPlanner() {
 return (
 <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-full animate-in fade-in slide-in-from-right-8 duration-700">
 {/* Left Col: Timeline/Planner */}
 <div className="xl:col-span-3 space-y-6">
 <div className="p-10 bg-card border-2 border-primary/5 rounded-[4rem] shadow-2xl relative overflow-hidden group min-h-[600px]">
 <div className="flex items-center justify-between mb-10">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-primary/10 rounded-2xl text-primary">
 <Calendar size={24} />
 </div>
 <div>
 <h3 className="text-xl font-black tracking-tight ">스마트 미팅 캔버스</h3>
 <p className="text-[10px] font-black text-muted-foreground tracking-tight opacity-60 ">실시간 리소스 할당 엔진</p>
 </div>
 </div>
 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map(day => (
 <button key={day} className={cn(
 "w-12 h-16 rounded-2xl border-2 font-black text-sm flex flex-col items-center justify-center transition-all",
 day === 3 ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" : "bg-slate-50 border-slate-100 text-slate-400 hover:border-primary/20"
 )}>
 <span className="opacity-40 text-[8px] mb-1">Mar</span>
 {day + 10}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-4">
 {[
 { time: '09:00', event: 'Weekly Alpha Sync', tech: 'Room 302', status: 'completed' },
 { time: '11:30', event: 'Infrastructure Review', tech: 'Visionary Hall', status: 'current' },
 { time: '14:00', event: 'Frontend Strategy', tech: 'Pod 04', status: 'pending' },
 { time: '16:00', event: 'Security Protocol Audit', tech: 'Strategy Suite', status: 'pending' },
 ].map((m, i) => (
 <div key={i} className={cn(
 "group p-6 rounded-3xl border-2 transition-all flex items-center justify-between",
 m.status === 'current' ? "bg-primary/5 border-primary/20 shadow-lg" : "bg-muted/10 border-transparent hover:bg-card hover:border-primary/10"
 )}>
 <div className="flex items-center gap-8">
 <div className="text-center">
 <p className="text-sm font-black tracking-tighter tabular-nums">{m.time}</p>
 <div className="w-1 h-3 bg-primary/20 mx-auto rounded-full mt-1" />
 </div>
 <div>
 <h4 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">{m.event}</h4>
 <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground mt-1 underline decoration-primary/20 underline-offset-4">
 <MapPin size={10} /> {m.tech}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex -space-x-2">
 {[1, 2, 3].map(a => <div key={a} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-card" />)}
 </div>
 <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10"><Star size={14} /></Button>
 </div>
 </div>
 ))}
 </div>

 <Button className="absolute bottom-10 right-10 h-16 w-16 rounded-[2rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/40 hover:-translate-y-2 transition-all active:scale-95 group">
 <Plus size={28} className="group-hover:rotate-90 transition-transform duration-500" />
 </Button>
 </div>
 </div>

 {/* Right Col: Resource Status */}
 <div className="space-y-8">
 <div className="p-8 bg-slate-900 text-white rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
 <Zap size={100} />
 </div>
 <h3 className="relative z-10 text-sm font-black tracking-[0.3em] opacity-50 mb-6 ">활성 예약</h3>
 <div className="relative z-10 space-y-2">
 <div className="flex items-end justify-between">
 <p className="text-3xl font-black tracking-tighter tabular-nums">78%</p>
 <span className="text-[10px] font-black tracking-tight text-primary">+12% vs last week</span>
 </div>
 <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
 <div className="h-full bg-primary w-[78%] rounded-full" />
 </div>
 </div>
 </div>

 <div className="p-8 bg-card border-2 border-primary/5 rounded-[3.5rem] shadow-xl space-y-6">
 <div className="flex items-center justify-between">
 <h4 className="text-sm font-black tracking-tight ">회의실 매트릭스</h4>
 <Sparkles size={16} className="text-primary opacity-40" />
 </div>
 <div className="space-y-4">
 {MOCK_ROOMS.map(room => (
 <div key={room.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-primary/5 transition-all">
 <div className="flex items-center gap-3">
 <div className={cn(
 "w-2 h-2 rounded-full",
 room.status === 'available' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
 room.status === 'occupied' ? "bg-rose-500" : "bg-amber-500"
 )} />
 <span className="text-sm font-black truncate max-w-[100px]">{room.name}</span>
 </div>
 <div className="flex items-center gap-2">
 <Users size={12} className="opacity-40" />
 <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{room.capacity}</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="p-10 bg-primary rounded-[3rem] text-white shadow-2xl shadow-primary/20 text-center space-y-4">
 <Clock size={40} className="mx-auto opacity-30" />
 <h4 className="text-xl font-black tracking-tight leading-none ">Instant <br />예약</h4>
 <p className="text-[10px] font-bold opacity-80 tracking-tight leading-relaxed">AI가 일정을 분석하여 최적의 시간을 찾습니다</p>
 <Button variant="secondary" className="w-full h-12 rounded-xl font-black text-[10px] tracking-tight mt-4">빠른 예약</Button>
 </div>
 </div>
 </div>
 );
}

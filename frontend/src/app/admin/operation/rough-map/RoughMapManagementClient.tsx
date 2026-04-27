'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Map, Search, Plus, MapPin, Navigation, Edit3, Trash2, 
  Layers, Settings2, Sparkles, Activity, Clock, Globe,
  ArrowRight, MoreHorizontal, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { roughMapService, RoughMapInfo } from '@/services/business/roughmap/roughMapService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RoughMapManagementClient() {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState('');
  
  const { data: roughMapsData, isLoading } = useQuery({
    queryKey: ['rough-maps-list', keyword],
    queryFn: () => roughMapService.getRoughMaps({ keyword, size: 20 }),
  });

  const displayItems = roughMapsData?.list || [];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000 font-sans">
      {/* 1. Header Matrix */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase leading-none">위치 공간 매트릭스 (Rough Map Engine)</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-3">
            약도 지리 관리 <Navigation className="text-primary" />
          </h2>
          <p className="text-xs font-bold text-slate-400 tracking-tight mt-2 max-w-lg">eGov 엔터프라이즈 시설 및 거점 정보를 지능적으로 관리하는 공간 인텔리전스 센터입니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <Button className="h-14 px-8 rounded-xl bg-white text-slate-900 font-black tracking-widest text-[10px] uppercase border-2 border-slate-900 hover:bg-slate-900 hover:text-white transition-all gap-3 shadow-xl shadow-slate-900/10">
             <Globe size={18} /> 지도 서비스 연동
           </Button>
           <Button className="h-14 px-8 rounded-xl bg-slate-900 text-white font-black tracking-widest text-[10px] uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 shadow-slate-900/20">
             <Plus size={18} /> 거점 신규 등록
           </Button>
        </div>
      </div>

      {/* 2. Map & List Matrix */}
      <div className="grid grid-cols-12 gap-10 px-2 h-auto lg:h-[600px]">
        {/* Left: Interactive List (40%) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8 h-full">
           <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-[0.5em] uppercase">
                 <MapPin size={14} className="text-primary" /> Geo Asset Registry
              </div>
              <div className="relative group max-w-[200px] w-full">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                 <Input 
                   value={keyword}
                   onChange={(e) => setKeyword(e.target.value)}
                   className="h-11 bg-white border-none shadow-sm rounded-xl pl-11 font-black text-xs ring-1 ring-slate-100 focus:ring-primary/20" 
                   placeholder="거점 검색.." 
                 />
              </div>
           </div>

           <Card className="flex-1 rounded-xl border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-100/50 flex flex-col">
              <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-elegant">
                 {isLoading ? (
                    <div className="h-full flex items-center justify-center animate-pulse text-slate-300 text-[10px] font-black tracking-[0.5em]">SYNCHRONIZING MAP NODES...</div>
                 ) : displayItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-5">
                       <Map size={64} />
                       <span className="font-black text-lg tracking-tighter uppercase">NO MAP ASSETS FOUND</span>
                    </div>
                 ) : displayItems.map((map) => (
                    <motion.div 
                      layout
                      key={map.roughMapId} 
                      className="p-6 bg-white border border-slate-50 rounded-xl hover:ring-[15px] hover:ring-primary/5 hover:border-primary/20 transition-all cursor-pointer group flex items-center justify-between"
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white group-hover:bg-primary transition-colors pr-2">
                             <MapPin size={22} className="rotate-12" />
                          </div>
                          <div className="space-y-0.5">
                             <h4 className="text-base font-black text-slate-900 tracking-tighter group-hover:text-primary transition-colors">{map.roughMapSj}</h4>
                             <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 leading-none">
                                <span className="text-primary uppercase">LOC</span> {map.roughMapAddress}
                             </p>
                          </div>
                       </div>
                       <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={18} /></Button>
                    </motion.div>
                 ))}
              </div>
           </Card>
        </div>

        {/* Right: Visual Projection Map (60%) */}
        <div className="col-span-12 lg:col-span-7 h-full">
           <Card className="h-full rounded-xl border-0 bg-slate-50 shadow-2xl overflow-hidden relative group ring-1 ring-slate-900/5">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              {/* Fake Map Elements */}
              <div className="absolute inset-0 flex items-center justify-center scale-150 rotate-3 opacity-10">
                 <div className="w-[1000px] h-[1000px] border-[2px] border-slate-300 rounded-full animate-spin-slow" />
                 <div className="absolute w-[600px] h-[600px] border-[1px] border-slate-300 rounded-full animate-reverse-slow" />
              </div>

              {/* Information Overlay */}
              <div className="absolute top-12 left-12 z-20 space-y-4">
                 <div className="p-6 bg-white/90 backdrop-blur-xl rounded-xl border border-white shadow-2xl space-y-3 max-w-[280px]">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Asset Info</span>
                       <Activity size={14} className="text-primary animate-pulse" />
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-xl font-black text-slate-900 tracking-tighter italic leading-none">{displayItems[0]?.roughMapSj || 'Select Node'}</h3>
                       <p className="text-[10px] font-bold text-slate-400 tabular-nums uppercase tracking-tight">LAT: {displayItems[0]?.lat || '0.000'} / LNG: {displayItems[0]?.lng || '0.000'}</p>
                    </div>
                 </div>
              </div>

              {/* Marker Projections */}
              <div className="absolute inset-0 flex items-center justify-center">
                 {displayItems.slice(0, 5).map((map, i) => (
                    <motion.div 
                      key={map.roughMapId}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="absolute"
                      style={{ 
                        left: `${20 + (i * 15)}%`, 
                        top: `${30 + ((i % 2) * 20)}%` 
                      }}
                    >
                       <div className="relative group/pin cursor-pointer">
                          <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl group-hover/pin:bg-primary/40 animate-pulse transition-all" />
                          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-2xl border-2 border-white group-hover/pin:bg-primary transition-all rotate-45 -translate-y-4 group-hover/pin:-translate-y-6">
                             <MapPin size={18} className="-rotate-45" />
                          </div>
                          <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/pin:opacity-100 transition-opacity shadow-2xl">
                             {map.roughMapSj}
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </div>

              {/* Bottom Control */}
              <div className="absolute bottom-12 right-12 flex gap-4">
                 <Button className="h-14 w-14 rounded-xl bg-white/90 backdrop-blur-xl shadow-2xl border border-white text-slate-900 group-hover:scale-110 transition-all"><Layers size={20} /></Button>
                 <Button className="h-14 px-10 rounded-xl bg-slate-900 text-white font-black tracking-[0.3em] text-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-primary transition-all uppercase italic">공간 시뮬레이션 실행</Button>
              </div>
           </Card>
        </div>
      </div>

    </div>
  );
}

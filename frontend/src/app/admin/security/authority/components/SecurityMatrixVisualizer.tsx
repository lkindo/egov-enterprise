'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
 ShieldCheck, 
 Lock, 
 Globe, 
 Monitor, 
 Database, 
 Zap, 
 ShieldAlert, 
 Maximize2, 
 Minimize2, 
 Trash2, 
 Save, 
 Search, 
 ChevronRight, 
 Info 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Author {
 authorCode: string;
 authorNm: string;
}

interface Menu {
 menuNo: number;
 menuNm: string;
 upperMenuNo: number;
}

interface SecurityMatrixVisualizerProps {
 authors: Author[];
 menus: Menu[];
 mappings: Map<string, Set<number>>; // authorCode -> set of menuNos
 onToggle: (authorCode: string, menuNo: number) => void;
 onSave: () => void;
 isSaving?: boolean;
}

/**
 * 보안 권한 매트릭스 시각화(Access Control Grid)
 * 역할(X축)과 메뉴(Y축)의 관계를 히트맵 형식의 격자로 시각화하여
 * 시스템 전체 보안 평면을 한눈에 조망하고 제어할 수 있게 합니다.
 */
export const SecurityMatrixVisualizer: React.FC<SecurityMatrixVisualizerProps> = ({ 
 authors, 
 menus, 
 mappings, 
 onToggle, 
 onSave, 
 isSaving 
}) => {
 const [searchMenu, setSearchMenu] = useState('');
 const [isFullscreen, setIsFullscreen] = useState(false);

 const filteredMenus = menus.filter(m => String(m.menuNm || '').toLowerCase().includes(searchMenu.toLowerCase()));

 // 통계 계산
 const totalCells = authors.length * menus.length;
 const activeCells = Array.from(mappings.values()).reduce((acc, set) => acc + set.size, 0);
 const coverage = totalCells > 0 ? (activeCells / totalCells) * 100 : 0;

 return (
 <div className={cn(
 "relative flex flex-col gap-6 transition-all duration-700",
 isFullscreen ? "fixed inset-0 z-[100] bg-white p-12 overflow-y-auto" : ""
 )}>
 {/* UI Header / Stats */}
 <div className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-slate-900 rounded-lg p-10 shadow-2xl relative overflow-hidden group">
 <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] opacity-10 pointer-events-none" />
 
 <div className="flex items-center gap-6 relative z-10 text-center lg:text-left">
 <div className="w-16 h-11 rounded-lg bg-white/10 flex items-center justify-center text-primary shadow-xl border border-white/5 relative">
 <ShieldCheck size={32} className="animate-pulse" />
 <div className="absolute -inset-2 bg-primary/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
 </div>
 <div>
 <h3 className="text-2xl font-bold text-white tracking-tighter uppercase leading-none">Security_Matrix_Observer</h3>
 <p className="text-xs font-bold text-white/30 tracking-[0.4em] uppercase mt-2">Global Access Plane & Permission Heatmap</p>
 </div>
 </div>

 <div className="flex items-center gap-10 relative z-10 bg-white/5 p-6 rounded-lg border border-white/5 backdrop-blur-md">
 <div className="space-y-1">
 <p className="text-xs font-bold text-white/30 tracking-widest uppercase">Coverage_Index</p>
 <p className="text-2xl font-bold text-white tabular-nums">{coverage.toFixed(1)}%</p>
 </div>
 <div className="w-px h-10 bg-white/10" />
 <div className="space-y-1 text-right">
 <p className="text-xs font-bold text-white/30 tracking-widest uppercase">Active_Nodes</p>
 <div className="flex items-center gap-2 text-emerald-400">
 <Zap size={12} />
 <p className="text-2xl font-bold tabular-nums">{activeCells}</p>
 </div>
 </div>
 </div>

 <div className="flex gap-4 relative z-10 self-stretch lg:self-center">
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => setIsFullscreen(!isFullscreen)}
 className="h-11 w-14 rounded-lg bg-white/10 text-white border border-white/10 hover:bg-white hover:text-slate-900 transition-all shadow-xl"
 >
 {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
 </Button>
 <Button 
 onClick={onSave}
 disabled={isSaving}
 className="h-11 px-10 rounded-lg bg-primary text-white font-bold text-xs tracking-widest uppercase shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-all hover:-translate-y-1 gap-3 group"
 >
 <Save size={18} className={cn(isSaving && "animate-spin")} /> {isSaving ? 'SYNCING...' : 'COMMIT_CHANGES'}
 </Button>
 </div>
 </div>

 {/* Matrix Surface */}
 <div className="bg-slate-50 border-4 border-slate-100 rounded-lg p-10 flex flex-col gap-8 shadow-inner overflow-hidden">
 <div className="flex items-center gap-6">
 <div className="relative flex-1 group/search">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={20} />
 <Input 
 className="h-11 pl-16 rounded-lg border-none shadow-xl text-md font-bold tracking-tight focus:ring-8 focus:ring-primary/5"
 placeholder="메뉴 노드 검색(명칭, ID)..."
 value={searchMenu}
 onChange={(e) => setSearchMenu(e.target.value)}
 />
 </div>
 </div>

 <div className="overflow-x-auto rounded-lg border-2 border-slate-100 bg-white shadow-2xl custom-scrollbar relative">
 <table className="w-full border-collapse table-fixed min-w-[1000px]">
 <thead>
 <tr className="border-b-2 border-slate-100 divide-x-2 divide-slate-50">
 <th className="sticky left-0 top-0 z-30 w-[240px] bg-slate-900 p-8 text-left border-r-4 border-slate-800">
 <div className="flex items-center gap-3">
 <Monitor size={16} className="text-primary" />
 <span className="text-xs font-bold text-white/40 tracking-[0.4em] uppercase ">Entity_Map</span>
 </div>
 </th>
 {authors.map((auth) => (
 <th key={auth.authorCode} className="p-8 bg-slate-50/50 min-w-[150px] transition-colors hover:bg-slate-100">
 <div className="flex flex-col items-center gap-2 group/header cursor-pointer">
 <div className="w-10 h-10 rounded-lg bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 transition-all group-hover/header:bg-slate-900 group-hover/header:text-white group-hover/header:scale-110 shadow-sm">
 <Lock size={14} />
 </div>
 <span className="text-xs font-bold text-slate-900 tracking-tighter truncate w-full text-center">{auth.authorNm}</span>
 <span className="text-xs font-bold text-slate-300 tracking-widest font-mono uppercase">{auth.authorCode}</span>
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y-2 divide-slate-100">
 {filteredMenus.map((menu) => (
 <tr key={menu.menuNo} className="divide-x-2 divide-slate-50 hover:bg-slate-50/50 transition-colors group/row">
 <td className="sticky left-0 z-20 bg-white p-6 border-r-4 border-slate-100 group-hover/row:bg-slate-50 transition-colors">
 <div className="flex items-center gap-4">
 <div className={cn(
 "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
 menu.upperMenuNo === 0 ? "bg-amber-50 text-amber-500" : "bg-slate-50 text-slate-400"
 )}>
 {menu.upperMenuNo === 0 ? <Database size={14} /> : <ChevronRight size={14} />}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-sm font-bold text-slate-900 truncate tracking-tight">{menu.menuNm}</span>
 <span className="text-xs font-bold text-slate-300 tracking-widest font-mono uppercase">NODE_{menu.menuNo}</span>
 </div>
 </div>
 </td>
 {authors.map((auth) => {
 const isSelected = mappings.get(auth.authorCode)?.has(menu.menuNo);
 return (
 <td 
 key={`${auth.authorCode}-${menu.menuNo}`} 
 className="p-1 min-w-[150px]"
 >
 <motion.button
 whileHover={{ scale: 0.98 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => onToggle(auth.authorCode, menu.menuNo)}
 className={cn(
 "w-full h-11 rounded-lg flex items-center justify-center transition-all duration-500 relative overflow-hidden group/cell",
 isSelected 
 ? "bg-slate-900 shadow-xl border-none" 
 : "bg-white hover:bg-slate-100 border-2 border-dashed border-slate-100 hover:border-slate-200"
 )}
 >
 <AnimatePresence mode="wait">
 {isSelected ? (
 <motion.div
 initial={{ scale: 0, rotate: -20 }}
 animate={{ scale: 1, rotate: 0 }}
 exit={{ scale: 0, rotate: 20 }}
 className="flex flex-col items-center gap-1"
 >
 <ShieldCheck size={20} className="text-primary" />
 <span className="text-xs font-bold text-white/50 tracking-tighter uppercase ">AUTHORIZED</span>
 </motion.div>
 ) : (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 0.2 }}
 className="flex flex-col items-center gap-1 group-hover/cell:opacity-100 transition-opacity"
 >
 <Lock size={16} className="text-slate-300" />
 <span className="text-xs font-bold text-slate-300 tracking-widest uppercase">DENIED</span>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Ripple Effect Background */}
 {isSelected && (
 <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
 )}
 </motion.button>
 </td>
 );
 })}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Footer / Guide */}
 <div className="flex items-center gap-6 p-8 bg-slate-50 border-2 border-slate-100 border-dashed rounded-lg">
 <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100 shrink-0">
 <Info size={24} />
 </div>
 <div className="space-y-1">
 <p className="text-sm font-bold text-slate-900 tracking-tight leading-none uppercase underline decoration-primary/20 decoration-4 underline-offset-4">Governance_Protocol_Guide</p>
 <p className="text-xs font-medium text-slate-400">
 각 격자(Cell)를 클릭하여 해당 역할에 대한 메뉴 접근 권한을 토글합니다. 변경 사항은 우측 상단의 <span className="text-slate-900 font-bold">COMMIT_CHANGES</span> 버튼을 눌러 실제 아키텍처에 반영해야 합니다.
 </p>
 </div>
 </div>
 </div>
 );
};


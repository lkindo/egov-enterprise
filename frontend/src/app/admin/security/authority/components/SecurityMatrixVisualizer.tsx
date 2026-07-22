'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck,  
 Lock,  
 Monitor,  
 Database,  
 Zap,  
 Maximize2,  
 Minimize2,  
 Save,  
 Search,  
 ChevronRight,  
 Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AuthorInfo } from '@/services/foundation/system/AuthorAdminService';

interface Menu {
 menuNo: number;
 menuNm: string;
 upMenuSn: number;
}

interface SecurityMatrixVisualizerProps {
 /**
  * 권한(역할) 목록. 축은 authrtCd 하나뿐이다.
  * 과거 이 컴포넌트만 {authorCode,authorNm}이라는 존재하지 않는 계약을 선언해
  * 헤더 공백·전 셀 DENIED·undefined 키 저장을 유발했다. AuthorInfo(=서버 계약)로 통일한다.
  */
 authors: AuthorInfo[];
 menus: Menu[];
 mappings: Map<string, Set<number>>; // authrtCd -> set of menuNos
 onToggle: (authrtCd: string, menuNo: number) => void;
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

 /** 전체화면은 ESC 로 빠져나올 수 있어야 한다(수제 오버레이라 Radix 의 ESC 처리가 없다). */
 useEffect(() => {
 if (!isFullscreen) return;
 const onKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') setIsFullscreen(false);
 };
 window.addEventListener('keydown', onKeyDown);
 return () => window.removeEventListener('keydown', onKeyDown);
 }, [isFullscreen]);

 const filteredMenus = menus.filter(m => String(m.menuNm || '').toLowerCase().includes(searchMenu.toLowerCase()));

 // 통계 계산
 const totalCells = authors.length * menus.length;
 const activeCells = Array.from(mappings.values()).reduce((acc, set) => acc + set.size, 0);
 const coverage = totalCells > 0 ? (activeCells / totalCells) * 100 : 0;

 return (
 <div className={cn(
 "relative flex flex-col gap-6 transition-all duration-700",
 isFullscreen ? "fixed inset-0 z-[100] bg-card p-12 overflow-y-auto" : ""
 )}>
 {/* UI Header / Stats */}
 <div className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-surface-inverse rounded-lg p-10 shadow-2xl relative overflow-hidden group">
 <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] opacity-10 pointer-events-none" />
 
 <div className="flex items-center gap-6 relative z-10 text-center lg:text-left">
 <div className="w-16 h-11 rounded-lg bg-white/10 flex items-center justify-center text-primary shadow-xl border border-white/5 relative">
 <ShieldCheck size={32} className="animate-pulse" />
 <div className="absolute -inset-2 bg-primary/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
 </div>
 <div>
 <h3 className="text-2xl font-bold text-surface-inverse-foreground tracking-tighter uppercase leading-none">Security_Matrix_Observer</h3>
 <p className="text-xs font-bold text-white/30 tracking-[0.4em] uppercase mt-2">Global Access Plane & Permission Heatmap</p>
 </div>
 </div>

 <div className="flex items-center gap-10 relative z-10 bg-white/5 p-6 rounded-lg border border-white/5 backdrop-blur-md">
 <div className="space-y-1">
 <p className="text-xs font-bold text-white/30 tracking-widest uppercase">Coverage_Index</p>
 <p className="text-2xl font-bold text-surface-inverse-foreground tabular-nums">{coverage.toFixed(1)}%</p>
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
 aria-label={isFullscreen ? '매트릭스 전체화면 종료 (ESC)' : '매트릭스 전체화면 보기'}
 aria-pressed={isFullscreen}
 onClick={() => setIsFullscreen(!isFullscreen)}
 className="h-11 w-14 rounded-lg bg-white/10 text-surface-inverse-foreground border border-white/10 hover:bg-card hover:text-foreground transition-all shadow-xl"
 >
 {isFullscreen ? <Minimize2 size={24} aria-hidden="true" /> : <Maximize2 size={24} aria-hidden="true" />}
 </Button>
 <Button 
 onClick={onSave}
 disabled={isSaving}
 className="h-11 px-10 rounded-lg bg-primary text-white font-bold text-xs tracking-widest uppercase shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-all hover:-translate-y-1 gap-3 group"
 >
 <Save size={18} aria-hidden="true" className={cn(isSaving && "animate-spin")} /> {isSaving ? '저장 중…' : '변경사항 저장'}
 </Button>
 </div>
 </div>

 {/* Matrix Surface */}
 <div className="bg-muted border-4 border-border rounded-lg p-10 flex flex-col gap-8 shadow-inner overflow-hidden">
 <div className="flex items-center gap-6">
 <div className="relative flex-1 group/search">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={20} />
 <Input
 aria-label="메뉴 노드 검색(명칭, ID)"
 className="h-11 pl-16 rounded-lg border-none shadow-xl text-md font-bold tracking-tight focus:ring-8 focus:ring-primary/5"
 placeholder="메뉴 노드 검색(명칭, ID)..."
 value={searchMenu}
 onChange={(e) => setSearchMenu(e.target.value)}
 />
 </div>
 </div>

 <div className="overflow-x-auto rounded-lg border-2 border-border bg-card shadow-2xl custom-scrollbar relative">
 <table className="w-full border-collapse table-fixed min-w-[1000px]">
 <caption className="sr-only">역할별 메뉴 접근 권한 매트릭스. 각 셀은 해당 역할의 메뉴 접근 허용 여부를 토글합니다.</caption>
 <thead>
 <tr className="border-b-2 border-border divide-x-2 divide-border">
 <th scope="col" className="sticky left-0 top-0 z-30 w-[240px] bg-surface-inverse p-8 text-left border-r-4 border-surface-inverse-border">
 <div className="flex items-center gap-3">
 <Monitor size={16} className="text-primary" aria-hidden="true" />
 <span className="text-xs font-bold text-white/40 tracking-widest">메뉴 노드</span>
 </div>
 </th>
 {authors.map((auth) => {
 const code = auth.authrtCd;
 const name = auth.authrtNm;
 return (
 <th key={code} scope="col" className="p-8 bg-muted/50 min-w-[150px] transition-colors hover:bg-muted">
 <div className="flex flex-col items-center gap-2 group/header">
 <div className="w-10 h-10 rounded-lg bg-card border-2 border-border flex items-center justify-center text-muted-foreground transition-all group-hover/header:bg-surface-inverse group-hover/header:text-surface-inverse-foreground group-hover/header:scale-110 shadow-sm">
 <Lock size={14} aria-hidden="true" />
 </div>
 <span className="text-xs font-bold text-foreground tracking-tighter truncate w-full text-center">{name}</span>
 <span className="text-xs font-bold text-muted-foreground tracking-widest font-mono uppercase">{code}</span>
 </div>
 </th>
 );
 })}
 </tr>
 </thead>
 <tbody className="divide-y-2 divide-border">
 {filteredMenus.map((menu) => (
 <tr key={menu.menuNo} className="divide-x-2 divide-border hover:bg-muted/50 transition-colors group/row">
 <th scope="row" className="sticky left-0 z-20 bg-card p-6 border-r-4 border-border text-left font-normal group-hover/row:bg-muted transition-colors">
 <div className="flex items-center gap-4">
 <div className={cn(
 "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
 menu.upMenuSn === 0 ? "bg-amber-50 text-amber-500" : "bg-muted text-muted-foreground"
 )}>
 {menu.upMenuSn === 0 ? <Database size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-sm font-bold text-foreground truncate tracking-tight">{menu.menuNm}</span>
 <span className="text-xs font-bold text-muted-foreground tracking-widest font-mono uppercase">NODE_{menu.menuNo}</span>
 </div>
 </div>
 </th>
 {authors.map((auth) => {
 const code = auth.authrtCd;
 const isSelected = mappings.get(code)?.has(menu.menuNo);
 return (
 <td 
 key={`${code}-${menu.menuNo}`} 
 className="p-1 min-w-[150px]"
 >
 <motion.button
 whileHover={{ scale: 0.98 }}
 whileTap={{ scale: 0.95 }}
 aria-label={`${auth.authrtNm || code} 역할의 '${menu.menuNm}' 메뉴 접근 ${isSelected ? '허용됨' : '차단됨'}`}
 aria-pressed={!!isSelected}
 onClick={() => onToggle(code, menu.menuNo)}
 className={cn(
 "w-full h-11 rounded-lg flex items-center justify-center transition-all duration-500 relative overflow-hidden group/cell",
 isSelected
 ? "bg-surface-inverse shadow-xl border-none"
 : "bg-card hover:bg-muted border-2 border-dashed border-border hover:border-border"
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
 <ShieldCheck size={20} className="text-primary" aria-hidden="true" />
 <span className="text-xs font-bold text-surface-inverse-foreground/60 tracking-tight">허용</span>
 </motion.div>
 ) : (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 0.2 }}
 className="flex flex-col items-center gap-1 group-hover/cell:opacity-100 transition-opacity"
 >
 <Lock size={16} className="text-muted-foreground" aria-hidden="true" />
 <span className="text-xs font-bold text-muted-foreground tracking-tight">차단</span>
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
 <div className="flex items-center gap-6 p-8 bg-muted border-2 border-border border-dashed rounded-lg">
 <div className="w-12 h-12 rounded-lg bg-card flex items-center justify-center text-primary shadow-sm border border-border shrink-0">
 <Info size={24} aria-hidden="true" />
 </div>
 <div className="space-y-1">
 <p className="text-sm font-bold text-foreground tracking-tight leading-none uppercase underline decoration-primary/20 decoration-4 underline-offset-4">Governance_Protocol_Guide</p>
 <p className="text-xs font-medium text-muted-foreground">
 각 격자(Cell)를 클릭하여 해당 역할에 대한 메뉴 접근 권한을 토글합니다. 변경 사항은 우측 상단의 <span className="text-foreground font-bold">변경사항 저장</span> 버튼을 눌러 실제 아키텍처에 반영해야 합니다.
 </p>
 </div>
 </div>
 </div>
 );
};


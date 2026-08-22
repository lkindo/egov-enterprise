'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles,
 ShieldAlert,
 TrendingUp,
 Zap,
 CheckCircle2,
 ChevronRight,
 Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface InsightMessage {
 id: string;
 type: 'SECURITY' | 'TRAFFIC' | 'SYSTEM' | 'OPTIMIZATION';
 severity: 'INFO' | 'WARNING' | 'CRITICAL';
 message: string;
 timestamp: string;
 action?: string;
}

interface InsightBannerProps {
 /**
  * 분석 엔진이 실제로 산출한 인사이트만 전달한다.
  * ⚠ 샘플·목업·플레이스홀더 주입 금지 — 관리자는 이 배너를 실제 탐지 결과로 읽는다.
  * 거짓 보안 신호는 (a) 실재하지 않는 침해 조사를 유발하고 (b) 관리자를 둔감화시켜
  * 진짜 경보를 무시하게 만든다.
  */
 insights?: InsightMessage[];
}

/**
 * 분석 알림 배너
 *
 * 상위에서 전달된 실제 분석 결과만 렌더한다. 자체적으로 데이터를 만들어내지 않는다.
 * 전달된 인사이트가 없으면 "데이터 없음"을 명시하는 빈 상태를 보여준다.
 */
export const InsightBanner: React.FC<InsightBannerProps> = ({ insights = [] }) => {
 const [currentIndex, setCurrentIndex] = useState(0);
 const hasInsights = insights.length > 0;

 useEffect(() => {
 if (insights.length <= 1) return;
 const timer = setInterval(() => {
 setCurrentIndex((prev) => (prev + 1) % insights.length);
 }, 8000);
 return () => clearInterval(timer);
 }, [insights.length]);

 const getSeverityStyles = (severity: string) => {
 switch (severity) {
 case 'CRITICAL': return "from-rose-500/10 to-transparent border-rose-200 text-rose-700";
 case 'WARNING': return "from-amber-500/10 to-transparent border-amber-200 text-amber-800";
 case 'INFO': return "from-primary/10 to-transparent border-primary/20 text-primary";
 default: return "from-slate-500/10 to-transparent border-border text-foreground";
 }
 };

 const getIcon = (type: string) => {
 switch (type) {
 case 'SECURITY': return <ShieldAlert size={18} />;
 case 'TRAFFIC': return <TrendingUp size={18} />;
 case 'SYSTEM': return <Zap size={18} />;
 case 'OPTIMIZATION': return <CheckCircle2 size={18} />;
 default: return <Sparkles size={18} />;
 }
 };

 /*
  * 빈 상태: "이상 없음"이 아니라 "데이터 없음"이다.
  * 두 문구를 혼동하면 정상 신호를 위장한 또 다른 거짓 경보가 된다.
  */
 if (!hasInsights) {
 return (
 <div
 className="relative min-h-[140px] rounded-lg border border-dashed border-border bg-card/60 p-10 flex flex-col lg:flex-row items-center gap-8 text-left"
 role="region"
 aria-label="시스템 분석 알림"
 >
 <div className="flex-shrink-0 w-16 h-11 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
 <Info size={28} />
 </div>

 <div className="flex-1 space-y-3 text-center lg:text-left">
 <p className="text-lg font-bold tracking-tight text-foreground">
 표시할 분석 알림이 없습니다
 </p>
 <p className="text-xs font-medium text-muted-foreground leading-relaxed max-w-2xl">
 분석 결과 데이터가 아직 연결되지 않았습니다. 이 영역은 시스템 상태나 보안 이상 유무를
 나타내지 않으므로, <strong className="font-bold">정상 여부의 근거로 사용하지 마십시오.</strong>
 </p>
 <Link
 href="/admin/system/audit"
 className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline underline-offset-4 uppercase tracking-widest"
 >
 실제 보안 감사 이력 보기
 <ChevronRight size={14} />
 </Link>
 </div>
 </div>
 );
 }

 // 목록이 줄어들어도 인덱스가 범위를 벗어나지 않도록 읽는 시점에 보정한다.
 const activeInsight = insights[currentIndex % insights.length];

 return (
 <div className="relative group text-left">
 <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-hub-indigo/10 to-primary/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

 <div className={cn(
 "relative min-h-[140px] rounded-lg border-2 bg-card/80 backdrop-blur-3xl p-10 flex flex-col lg:flex-row items-center gap-10 transition-all duration-700 overflow-hidden shadow-2xl hover:shadow-primary/5",
 getSeverityStyles(activeInsight.severity)
 )} role="region" aria-label="시스템 분석 알림">
 {/* Animated Wave Background Area */}
 <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
 <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.65%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />
 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/30 via-transparent to-transparent animate-pulse" />
 </div>

 {/* AI Logo Area */}
 <div className="flex-shrink-0 relative">
 <div className="w-16 h-11 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-xl relative z-10 transition-transform group-hover:scale-110 duration-500">
 <Sparkles size={32} className="animate-pulse" />
 </div>
 <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-spin-slow opacity-40" />
 </div>

 {/* Message Stream */}
 <div className="flex-1 space-y-4 relative z-10 text-center lg:text-left">
 <div className="flex items-center justify-center lg:justify-start gap-3">
 <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-black/5 border border-black/5 text-xs font-bold tracking-widest uppercase " aria-label="분석 알림">
 {getIcon(activeInsight.type)}
 분석 알림
 </div>
 <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
 <span className="text-xs font-bold opacity-100 uppercase tracking-widest">{activeInsight.timestamp}</span>
 </div>

 <AnimatePresence mode="wait">
 <motion.div
 key={activeInsight.id}
 initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
 animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
 exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
 transition={{ duration: 0.6, ease: "circOut" }}
 className="space-y-4"
 >
 <p className="text-2xl font-bold tracking-tighter text-foreground leading-tight line-clamp-2 text-left">
 {activeInsight.message}
 </p>

 {/* 동작하지 않는 버튼은 조치가 수행됐다는 오해를 부르므로 정적 안내 문구로 노출한다. */}
 {activeInsight.action && (
 <p className="flex items-center justify-center lg:justify-start gap-2 text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
 <ChevronRight size={14} />
 권장 조치: {activeInsight.action}
 </p>
 )}
 </motion.div>
 </AnimatePresence>
 </div>

 {/* Controls */}
 {insights.length > 1 && (
 <div className="flex-shrink-0 flex flex-col items-center gap-3 relative z-10">
 <div className="flex gap-1.5">
 {insights.map((insight, idx) => (
 <div
 key={insight.id}
 className={cn(
 "w-2 h-2 rounded-full transition-all duration-500",
 idx === currentIndex % insights.length ? "w-6 bg-surface-inverse" : "bg-muted"
 )}
 />
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
};

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
 Sparkles, 
 ShieldAlert, 
 TrendingUp, 
 Activity, 
 Zap, 
 CheckCircle2, 
 Globe,
 ArrowRight,
 ChevronRight,
 Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InsightMessage {
 id: string;
 type: 'SECURITY' | 'TRAFFIC' | 'SYSTEM' | 'OPTIMIZATION';
 severity: 'INFO' | 'WARNING' | 'CRITICAL';
 message: string;
 timestamp: string;
 action?: string;
}

/**
 * AI-Driven ���ڸ����� �λ���Ʈ ���
 * �α� ��� �м� ������ ���� ������ ������ ��� ������ �����ڿ��� �����մϴ�.
 */
export const InsightBanner: React.FC = () => {
 const [currentIndex, setCurrentIndex] = useState(0);
 
 // ������ ������ �λ���Ʈ ������ (���� API ���� ����)
 const insights: InsightMessage[] = [
 {
 id: '1',
 type: 'SECURITY',
 severity: 'WARNING',
 message: "���������� �α��� �õ� ����: ���� 10�а� Ư�� ����(US) IP������ ������ 25% �����߽��ϴ�.",
 timestamp: "��� ��",
 action: "��ȭ�� ��å ����"
 },
 {
 id: '2',
 type: 'TRAFFIC',
 severity: 'INFO',
 message: "������ ����ȭ ����: ĳ�� ���� ���� ���� ��� ���� �ӵ��� 14.2ms �����Ǿ����ϴ�.",
 timestamp: "12�� ��"
 },
 {
 id: '3',
 type: 'SYSTEM',
 severity: 'CRITICAL',
 message: "DB Ŀ�ؼ� Ǯ �Ѱ�ġ ����: ���� �Ҵ緮�� 88%�� ���� ���Դϴ�. �ν��Ͻ� Ȯ���� �����մϴ�.",
 timestamp: "5�� ��",
 action: "���� Ʈ���̽� ����"
 },
 {
 id: '4',
 type: 'OPTIMIZATION',
 severity: 'INFO',
 message: "���� ���� ��: ���� �ý��� ���Ἲ �˻簡 �Ϸ�Ǿ�����, �߰ߵ� �̻� ¡�İ� �����ϴ�.",
 timestamp: "1�ð� ��"
 }
 ];

 useEffect(() => {
 const timer = setInterval(() => {
 setCurrentIndex((prev) => (prev + 1) % insights.length);
 }, 8000);
 return () => clearInterval(timer);
 }, [insights.length]);

 const activeInsight = insights[currentIndex];

 const getSeverityStyles = (severity: string) => {
 switch (severity) {
 case 'CRITICAL': return "from-rose-500/10 to-transparent border-rose-200 text-rose-700";
 case 'WARNING': return "from-amber-500/10 to-transparent border-amber-200 text-amber-800";
 case 'INFO': return "from-primary/10 to-transparent border-primary/20 text-primary";
 default: return "from-slate-500/10 to-transparent border-slate-200 text-slate-700";
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

 return (
 <div className="relative group text-left">
 <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-indigo-500/10 to-primary/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
 
 <div className={cn(
 "relative min-h-[140px] rounded-lg border-2 bg-white/80 backdrop-blur-3xl p-10 flex flex-col lg:flex-row items-center gap-10 transition-all duration-700 overflow-hidden shadow-2xl shadow-slate-200/50 hover:shadow-primary/5",
 getSeverityStyles(activeInsight.severity)
 )} role="region" aria-label="�ý��� ���ڸ����� �λ���Ʈ">
 {/* Animated Wave Background Area */}
 <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
 <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.65%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />
 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/30 via-transparent to-transparent animate-pulse" />
 </div>

 {/* AI Logo Area */}
 <div className="flex-shrink-0 relative">
 <div className="w-16 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xl relative z-10 transition-transform group-hover:scale-110 duration-500">
 <Sparkles size={32} className="animate-pulse" />
 </div>
 <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-spin-slow opacity-40" />
 </div>

 {/* Message Stream */}
 <div className="flex-1 space-y-4 relative z-10 text-center lg:text-left">
 <div className="flex items-center justify-center lg:justify-start gap-3">
 <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/5 border border-black/5 text-xs font-bold tracking-widest uppercase " aria-label="AI �λ���Ʈ ����">
 {getIcon(activeInsight.type)}
 AI_INSIGHT_ENGINE
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
 <p className="text-2xl font-bold tracking-tight text-slate-900 leading-tight line-clamp-2 text-left">
 {activeInsight.message}
 </p>
 
 {activeInsight.action && (
 <div className="flex items-center justify-center lg:justify-start gap-4">
 <Button 
 variant="link" 
 className="p-0 h-auto text-xs font-bold tracking-[0.3em] uppercase group/act flex items-center gap-2"
 >
 {activeInsight.action}
 <ChevronRight size={14} className="group-hover/act:translate-x-1 transition-transform" />
 </Button>
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </div>

 {/* Controls */}
 <div className="flex-shrink-0 flex flex-col items-center gap-3 relative z-10">
 <div className="flex gap-1.5">
 {insights.map((_, idx) => (
 <div 
 key={idx} 
 className={cn(
 "w-2 h-2 rounded-full transition-all duration-500",
 idx === currentIndex ? "w-6 bg-slate-900" : "bg-slate-200"
 )} 
 />
 ))}
 </div>
 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-slate-900 hover:text-white transition-all" aria-label="�λ���Ʈ �󼼺���">
 <Maximize2 size={16} />
 </Button>
 </div>
 </div>
 </div>
 );
};


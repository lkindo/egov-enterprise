'use client';

import React, { useState, useEffect } from 'react';
import {
 X,
 ChevronRight,
 ChevronLeft,
 Sparkles,
 Command,
 Layout,
 Bell,
 User,
 CheckCircle2,
 Activity,
 ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TourStep {
 title: string;
 description: string;
 icon: React.ReactNode;
}

export function SmartOnboardingHub() {
 const [isOpen, setIsOpen] = useState(false);
 const [currentStep, setCurrentStep] = useState(0);
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 if (typeof window !== 'undefined') {
 const hasSeenTour = localStorage.getItem('egov_smart_tour_v1');
 if (!hasSeenTour) {
 const timer = setTimeout(() => setIsOpen(true), 2000);
 return () => clearTimeout(timer);
 }
 }
 }, []);

 const handleComplete = () => {
 if (typeof window !== 'undefined') {
 localStorage.setItem('egov_smart_tour_v1', 'true');
 }
 setIsOpen(false);
 };

 const nextStep = () => {
 if (currentStep < steps.length - 1) {
 setCurrentStep(prev => prev + 1);
 } else {
 handleComplete();
 }
 };

 const prevStep = () => {
 if (currentStep > 0) {
 setCurrentStep(prev => prev - 1);
 }
 };

 const steps: TourStep[] = [
 {
 title: "eGov 5.0 Intelligence Platform",
 description: "차세?� 공공 ?�정 ?��????�도?�는 지?�형 ?�영 ?�랫?�에 ?�신 것을 ?�영?�니?? ?�프??관?��???비즈?�스 ?�크?�로?�까지, ?�이??중심???�무 ?�경???�신??기다립니??",
 icon: <Sparkles className="text-primary animate-pulse" size={40} />
 },
 {
 title: "?�텔리전??커맨???�터",
 description: "명령??기반??빠른 ?�색�??�션??경험?�세?? 마우???�이 CMD+K 만으�??�스?�의 모든 구석구석???�어?�고 ?�보�?찾을 ???�습?�다.",
 icon: <Command className="text-purple-500" size={40} />
 },
 {
 title: "?�시�??�스??관�?(Observability)",
 description: "?�버???�장박동???�시간으�?추적?�니?? CPU, 메모�? DB 커넥?�을 3�?주기�??��? 분석?�여 ?�정?�인 ?�비???�영??보장?�니??",
 icon: <Activity className="text-rose-500" size={40} />
 },
 {
 title: "?�크?�로???�로?�스 캔버??,
 description: "복잡??비즈?�스 로직???�각?�된 캠버?�에??관리하?�요. ?�메???�벤??기반???�마???�진???�신???�무 ?�로?�스�??�연?�게 ?�결?�니??",
 icon: <Layout className="text-indigo-500" size={40} />
 },
 {
 title: "?�이???�이??그리??,
 description: "?�터?�라?�즈�??�?�량 ?�이?��? 고성??그리?�로 ?�벽???�어?�니?? 컬럼 고정, ?�시�??�터�? ?�라???�정???�해 ?�이???�찰?�을 극�??�하?�요.",
 icon: <CheckCircle2 className="text-emerald-500" size={40} />
 }
 ];

 if (!mounted || !isOpen) return null;

 return (
 <div
 className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-[#020617] animate-in fade-in duration-1000"
 role="alertdialog"
 >
 <div className="relative max-w-4xl w-full bg-[#0f172a] border border-white/10 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-700 flex flex-col md:flex-row min-h-[500px]">
 {/* Progress Strip */}
 <div className="absolute top-0 left-0 w-full h-1 flex px-10 pt-4 gap-2 z-20">
 {steps.map((_, idx) => (
 <div key={idx} className={cn("h-1 rounded-full flex-1 transition-all duration-700", idx <= currentStep ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10")} />
 ))}
 </div>

 {/* Left Side: Visual Preview */}
 <div className="flex-1 bg-slate-900 p-12 flex items-center justify-center relative overflow-hidden group">
 <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 opacity-30" />
 <div className="relative z-10 w-full aspect-video rounded-3xl border border-white/10 bg-black shadow-2xl flex items-center justify-center overflow-hidden">
 <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
 <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4 duration-1000">
 <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-inner">
 {steps[currentStep].icon}
 </div>
 </div>
 </div>
 <div className="absolute bottom-10 left-10 flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
 <span className="text-[10px] font-black text-white/50 tracking-[0.4em]">기능 ?�포?�라?�트</span>
 </div>
 </div>

 {/* Right Side: Content & Actions */}
 <div className="flex-1 p-12 flex flex-col justify-between">
 <button
 onClick={handleComplete}
 data-testid="onboarding-close"
 className="absolute top-8 right-8 p-3 hover:bg-white/5 rounded-full transition-colors group"
 >
 <X size={20} className="text-white/30 group-hover:text-white transition-colors" />
 </button>

 <div className="space-y-10 py-10">
 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-700">
 <div className="flex items-center gap-2">
 <div className="h-px w-8 bg-primary" />
 <span className="text-[10px] font-black text-primary tracking-[0.3em]">모듈 가?�드</span>
 </div>
 <h2 className="text-3xl font-black tracking-tighter text-white leading-[1.1]">
 {steps[currentStep].title}
 </h2>
 <p className="text-base text-white/60 font-medium leading-relaxed">
 {steps[currentStep].description}
 </p>
 </div>

 <div className="flex flex-col gap-4">
 <div className="flex items-center gap-3">
 <CheckCircle2 size={16} className="text-emerald-500" />
 <span className="text-sm font-bold text-white/80">직�??�인 ?�용???�터?�이??/span>
 </div>
 <div className="flex items-center gap-3">
 <CheckCircle2 size={16} className="text-emerald-500" />
 <span className="text-sm font-bold text-white/80">?�시�??�이???�동 �?분석</span>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-between gap-4 pt-10 border-t border-white/5">
 <Button variant="ghost" onClick={prevStep} className={cn("rounded-2xl font-black h-12 px-6 text-white/40 hover:text-white transition-all", currentStep === 0 && "invisible")}>
 <ChevronLeft size={20} /> ?�전
 </Button>

 <div className="flex gap-3">
 {currentStep < steps.length - 1 ? (
 <Button onClick={nextStep} className="rounded-2xl font-black h-14 px-10 bg-primary text-white shadow-[0_15px_30px_-5px_rgba(59,130,246,0.3)] hover:scale-[1.05] active:scale-95 transition-all gap-3">
 {currentStep === 0 ? "?�랫???�러보기" : "?�음 기능"} <ArrowRight size={18} />
 </Button>
 ) : (
 <Button onClick={handleComplete} className="rounded-2xl font-black h-14 px-12 bg-emerald-500 text-white shadow-[0_15px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.05] active:scale-95 transition-all gap-3">
 ?�작?�기 <CheckCircle2 size={18} />
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

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
 CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TourStep {
 title: string;
 description: string;
 icon: React.ReactNode;
}

export function StandardOnboardingTour() {
 const [isOpen, setIsOpen] = useState(false);
 const [currentStep, setCurrentStep] = useState(0);
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 if (typeof window !== 'undefined') {
 const hasSeenTour = localStorage.getItem('egov_tour_completed');
 if (!hasSeenTour) {
 const timer = setTimeout(() => setIsOpen(true), 1500);
 return () => clearTimeout(timer);
 }
 }
 }, []);

 const handleComplete = () => {
 if (typeof window !== 'undefined') {
 localStorage.setItem('egov_tour_completed', 'true');
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
 title: "eGov 5.0 현대화 플랫폼에 오신 것을 환영합니다!",
 description: "국가 정보화 표준을 선도하는 새로운 관리 시스템입니다. 더 빠르고, 더 직관적인 업무 환경을 경험해보세요.",
 icon: <Sparkles className="text-primary" size={32} />
 },
 {
 title: "스마트 내비게이션",
 description: "왼쪽 사이드바를 통해 모든 업무 모듈에 빠르게 접근할 수 있습니다. 계층형 메뉴와 현대적인 아이콘으로 원하는 메뉴를 쉽게 찾아보세요.",
 icon: <Layout className="text-blue-500" size={32} />
 },
 {
 title: "글로벌 커맨드 센터 (Ctrl+K)",
 description: "마우스 클릭 없이 키보드만으로 어디든 이동하세요. 단축키 Ctrl+K를 눌러 메뉴 검색, 사용자 찾기, 빠른 액션을 실행할 수 있습니다.",
 icon: <Command className="text-purple-500" size={32} />
 },
 {
 title: "실시간 지능형 알림",
 description: "상단 종 모양 아이콘을 통해 실시간 업무 알림을 받아보세요. 새로운 결재 요청이나 공지사항이 등록되면 즉시 알려드립니다.",
 icon: <Bell className="text-orange-500" size={32} />
 },
 {
 title: "당신만의 워크스페이스",
 description: "마이페이지에서는 개인 정보 관리와 활동 이력을 한눈에 확인할 수 있습니다. 나에게 최적화된 대시보드를 만나보세요.",
 icon: <User className="text-emerald-500" size={32} />
 }
 ];

 if (!mounted || !isOpen) return null;

 return (
 <div
 className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-sm animate-in fade-in duration-500"
 role="alertdialog"
 aria-modal="true"
 aria-labelledby="tour-title"
 aria-describedby="tour-description"
 >
 <div className="relative max-w-lg w-full bg-background/80 backdrop-blur-2xl border-2 border-primary/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 ring-1 ring-white/20">
 {/* Progress Bar */}
 <div className="absolute top-0 left-0 w-full h-1.5 flex gap-1 px-1 pt-1" aria-hidden="true">
 {steps.map((_, idx) => (
 <div
 key={idx}
 className={cn(
 "h-full rounded-full transition-all duration-500 flex-1",
 idx <= currentStep ? "bg-primary" : "bg-muted/30"
 )}
 />
 ))}
 </div>

 <button
 onClick={handleComplete}
 className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors z-20 text-muted-foreground"
 aria-label="가이드 닫기"
 >
 <X size={20} />
 </button>

 <div className="p-10 pt-16 text-center space-y-8 relative z-10" aria-live="polite">
 <div className="w-20 h-20 bg-muted/50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner animate-in slide-in-from-bottom-2 duration-700" aria-hidden="true">
 {steps[currentStep].icon}
 </div>

 <div className="space-y-3 min-h-[140px] animate-in fade-in slide-in-from-bottom-2 duration-700">
 <h2 id="tour-title" className="text-3xl font-black tracking-tight text-foreground">
 {steps[currentStep].title}
 </h2>
 <p id="tour-description" className="text-base text-muted-foreground font-medium leading-relaxed">
 {steps[currentStep].description}
 </p>
 </div>

 <div className="flex items-center justify-between pt-4">
 <Button
 variant="ghost"
 onClick={prevStep}
 className={cn(
 "rounded-xl font-bold h-12 px-6 gap-2",
 currentStep === 0 && "invisible"
 )}
 aria-label="이전 단계로 이동"
 >
 <ChevronLeft size={18} /> 이전
 </Button>

 <div className="flex gap-2">
 {currentStep < steps.length - 1 ? (
 <>
 <Button variant="ghost" onClick={handleComplete} className="rounded-xl font-bold h-12 px-6 text-muted-foreground" aria-label="가이드 건너뛰기">
 건너뛰기
 </Button>
 <Button onClick={nextStep} className="rounded-xl font-black h-12 px-8 gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all" aria-label="다음 단계로 이동">
 다음 가이드 <ChevronRight size={18} />
 </Button>
 </>
 ) : (
 <Button onClick={handleComplete} className="rounded-xl font-black h-12 px-10 gap-2 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white hover:scale-105 transition-all" aria-label="가이드 완료 및 시작하기">
 시작하기 <CheckCircle2 size={18} />
 </Button>
 )}
 </div>
 </div>
 </div>

 <div className="bg-muted/20 px-10 py-4 border-t border-primary/5 text-center">
 <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.3em]">
 Step {currentStep + 1} of {steps.length} • User Onboarding Experience
 </p>
 </div>
 </div>
 </div>
 );
}

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
 title: "eGov 5.0 ?„ë????Œë«?¼ì— ?¤ì‹  ê²ƒì„ ?˜ì˜?©ë‹ˆ??",
 description: "êµ?? ?•ë³´???œì???? ë„?˜ëŠ” ?ˆë¡œ??ê´€ë¦??œìŠ¤?œì…?ˆë‹¤. ??ë¹ ë¥´ê³? ??ì§ê??ì¸ ?…ë¬´ ?˜ê²½??ê²½í—˜?´ë³´?¸ìš”.",
 icon: <Sparkles className="text-primary" size={32} />
 },
 {
 title: "?¤ë§ˆ???´ë¹„ê²Œì´??,
 description: "?¼ìª½ ?¬ì´?œë°”ë¥??µí•´ ëª¨ë“  ?…ë¬´ ëª¨ë“ˆ??ë¹ ë¥´ê²??‘ê·¼?????ˆìŠµ?ˆë‹¤. ê³„ì¸µ??ë©”ë‰´?€ ?„ë??ì¸ ?„ì´ì½˜ìœ¼ë¡??í•˜??ë©”ë‰´ë¥??½ê²Œ ì°¾ì•„ë³´ì„¸??",
 icon: <Layout className="text-blue-500" size={32} />
 },
 {
 title: "ê¸€ë¡œë²Œ ì»¤ë§¨???¼í„° (Ctrl+K)",
 description: "ë§ˆìš°???´ë¦­ ?†ì´ ?¤ë³´?œë§Œ?¼ë¡œ ?´ë””???´ë™?˜ì„¸?? ?¨ì¶•??Ctrl+Kë¥??ŒëŸ¬ ë©”ë‰´ ê²€?? ?¬ìš©??ì°¾ê¸°, ë¹ ë¥¸ ?¡ì…˜???¤í–‰?????ˆìŠµ?ˆë‹¤.",
 icon: <Command className="text-purple-500" size={32} />
 },
 {
 title: "?¤ì‹œê°?ì§€?¥í˜• ?Œë¦¼",
 description: "?ë‹¨ ì¢?ëª¨ì–‘ ?„ì´ì½˜ì„ ?µí•´ ?¤ì‹œê°??…ë¬´ ?Œë¦¼??ë°›ì•„ë³´ì„¸?? ?ˆë¡œ??ê²°ì¬ ?”ì²­?´ë‚˜ ê³µì??¬í•­???±ë¡?˜ë©´ ì¦‰ì‹œ ?Œë ¤?œë¦½?ˆë‹¤.",
 icon: <Bell className="text-orange-500" size={32} />
 },
 {
 title: "?¹ì‹ ë§Œì˜ ?Œí¬?¤í˜?´ìŠ¤",
 description: "ë§ˆì´?˜ì´ì§€?ì„œ??ê°œì¸ ?•ë³´ ê´€ë¦¬ì? ?œë™ ?´ë ¥???œëˆˆ???•ì¸?????ˆìŠµ?ˆë‹¤. ?˜ì—ê²?ìµœì ?”ëœ ?€?œë³´?œë? ë§Œë‚˜ë³´ì„¸??",
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
 aria-label="ê°€?´ë“œ ?«ê¸°"
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
 aria-label="?´ì „ ?¨ê³„ë¡??´ë™"
 >
 <ChevronLeft size={18} /> ?´ì „
 </Button>

 <div className="flex gap-2">
 {currentStep < steps.length - 1 ? (
 <>
 <Button variant="ghost" onClick={handleComplete} className="rounded-xl font-bold h-12 px-6 text-muted-foreground" aria-label="ê°€?´ë“œ ê±´ë„ˆ?°ê¸°">
 ê±´ë„ˆ?°ê¸°
 </Button>
 <Button onClick={nextStep} className="rounded-xl font-black h-12 px-8 gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all" aria-label="?¤ìŒ ?¨ê³„ë¡??´ë™">
 ?¤ìŒ ê°€?´ë“œ <ChevronRight size={18} />
 </Button>
 </>
 ) : (
 <Button onClick={handleComplete} className="rounded-xl font-black h-12 px-10 gap-2 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white hover:scale-105 transition-all" aria-label="ê°€?´ë“œ ?„ë£Œ ë°??œì‘?˜ê¸°">
 ?œì‘?˜ê¸° <CheckCircle2 size={18} />
 </Button>
 )}
 </div>
 </div>
 </div>

 <div className="bg-muted/20 px-10 py-4 border-t border-primary/5 text-center">
 <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.3em]">
 Step {currentStep + 1} of {steps.length} ??User Onboarding Experience
 </p>
 </div>
 </div>
 </div>
 );
}

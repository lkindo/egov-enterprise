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
 title: "eGov 5.0 ?꾨님님뚮옯?쇱뿉 ?ㅼ떊 寃껋쓣 ?섏쁺?⑸땲님",
 description: "援님 ?뺣낫님?쒖님님좊룄?섎뒗 ?덈줈님愿由님쒖뒪?쒖엯?덈떎. 님鍮좊Ⅴ怨? 님吏곴님곸씤 업무 ?섍꼍님寃쏀뿕?대낫?몄슂.",
 icon: <Sparkles className="text-primary" size={32} />
 },
 {
 title: "?ㅻ쭏님?대퉬寃뚯씠님,
 description: "?쇱そ ?ъ씠?쒕컮瑜님듯빐 紐⑤뱺 업무 紐⑤뱢님鍮좊Ⅴ寃님묎렐님님?덉뒿?덈떎. 怨꾩링님硫붾돱? ?꾨님곸씤 ?꾩씠肄섏쑝濡님먰븯님硫붾돱瑜님쎄쾶 李얠븘蹂댁꽭님",
 icon: <Layout className="text-blue-500" size={32} />
 },
 {
 title: "湲濡쒕쾶 而ㅻ㎤님?쇳꽣 (Ctrl+K)",
 description: "留덉슦님?대┃ ?놁씠 ?ㅻ낫?쒕쭔?쇰줈 ?대뵒님?대룞?섏꽭님 ?⑥텞님Ctrl+K瑜님뚮윭 硫붾돱 寃님 ?ъ슜님李얘린, 鍮좊Ⅸ ?≪뀡님?ㅽ뻾님님?덉뒿?덈떎.",
 icon: <Command className="text-purple-500" size={32} />
 },
 {
 title: "실시간吏?ν삎 ?뚮┝",
 description: "?곷떒 醫?紐⑥뼇 ?꾩씠肄섏쓣 ?듯빐 ?ㅼ떆媛님낅Т ?뚮┝님諛쏆븘蹂댁꽭님 ?덈줈님결재 요청?대굹 공지사항님등록?섎㈃ 利됱떆 ?뚮젮?쒕┰?덈떎.",
 icon: <Bell className="text-orange-500" size={32} />
 },
 {
 title: "?뱀떊留뚯쓽 ?뚰겕?ㅽ럹?댁뒪",
 description: "留덉씠?섏씠吏?먯꽌님媛쒖씤 ?뺣낫 愿由ъ? ?쒕룞 ?대젰님?쒕늿님?뺤씤님님?덉뒿?덈떎. ?섏뿉寃?理쒖쟻?붾맂 ??쒕낫?쒕? 留뚮굹蹂댁꽭님",
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
 aria-label="媛?대뱶 ?リ린"
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
 aria-label="?댁쟾 ?④퀎濡님대룞"
 >
 <ChevronLeft size={18} /> ?댁쟾
 </Button>

 <div className="flex gap-2">
 {currentStep < steps.length - 1 ? (
 <>
 <Button variant="ghost" onClick={handleComplete} className="rounded-xl font-bold h-12 px-6 text-muted-foreground" aria-label="媛?대뱶 嫄대꼫?곌린">
 嫄대꼫?곌린
 </Button>
 <Button onClick={nextStep} className="rounded-xl font-black h-12 px-8 gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all" aria-label="?ㅼ쓬 ?④퀎濡님대룞">
 ?ㅼ쓬 媛?대뱶 <ChevronRight size={18} />
 </Button>
 </>
 ) : (
 <Button onClick={handleComplete} className="rounded-xl font-black h-12 px-10 gap-2 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white hover:scale-105 transition-all" aria-label="媛?대뱶 ?꾨즺 諛님쒖옉?섍린">
 ?쒖옉?섍린 <CheckCircle2 size={18} />
 </Button>
 )}
 </div>
 </div>
 </div>

 <div className="bg-muted/20 px-10 py-4 border-t border-primary/5 text-center">
 <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.3em]">
 Step {currentStep + 1} of {steps.length} 님User Onboarding Experience
 </p>
 </div>
 </div>
 </div>
 );
}


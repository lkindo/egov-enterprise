
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
 description: "李⑥꽭 怨듦났 ?됱젙 ?쒖님님좊룄?섎뒗 吏ν삎 ?댁쁺 ?뚮옯?쇱뿉 ㅼ떊 寃껋쓣 ?섏쁺합니다 ?명봽님愿쒕님鍮꾩쫰?덉뒪 ?뚰겕?뚮줈?곌퉴吏, 데이터以묒떖님업무 ?섍꼍님?뱀떊님湲곕떎由쎈땲님",
 icon: <Sparkles className="text-primary animate-pulse" size={40} />
 },
 {
 title: "인텔리전스 커맨드 센터",
 description: "명령어 기반의 빠른 탐색과 액션을 경험하세요. 마우스 없이 CMD+K 만으로 시스템의 모든 구석구석을 제어하고 정보를 찾을 수 있습니다.",
 icon: <Command className="text-purple-500" size={40} />
 },
 {
 title: "실시간 시스템 관측 (Observability)",
 description: "서버의 심장박동을 실시간으로 추적합니다. CPU, 메모리, DB 커넥션을 3초 주기로 정밀 분석하여 안정적인 서비스 운영을 보장합니다.",
 icon: <Activity className="text-rose-500" size={40} />
 },
 {
 title: "워크플로우?꾨줈?몄뒪 罹붾쾭님,
 description: "蹂듭옟님鍮꾩쫰?덉뒪 濡쒖쭅님?쒓컖?붾맂 罹좊쾭ㅼ뿉님관리ы븯?몄슂. ?꾨찓님?대깽님湲곕컲님ㅻ쭏님?붿쭊님?뱀떊님업무 ?꾨줈?몄뒪瑜님좎뿰?섍쾶 ?곌껐합니다",
 icon: <Layout className="text-indigo-500" size={40} />
 },
 {
 title: "?섏씠님데이터洹몃━님,
 description: "?뷀꽣?꾨씪?댁쫰湲님⑸웾 ?곗씠?곕? 怨좎꽦님洹몃━쒕줈 ?꾨꼍님?쒖뼱합니다 而щ읆 怨좎젙, 실시간꾪꽣留 ?몃씪님?섏젙님?듯빐 데이터?듭같μ쓣 洹밸님뷀븯?몄슂.",
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
 <span className="text-[10px] font-black text-white/50 tracking-[0.4em]">湲곕뒫 ㅽ룷?몃씪?댄듃</span>
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
 <span className="text-[10px] font-black text-primary tracking-[0.3em]">紐⑤뱢 媛대뱶</span>
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
 <span className="text-sm font-bold text-white/80">吏곴님곸씤 사용자?명꽣?섏씠님/span>
 </div>
 <div className="flex items-center gap-3">
 <CheckCircle2 size={16} className="text-emerald-500" />
 <span className="text-sm font-bold text-white/80">실시간곗씠님?곕룞 및 분석</span>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-between gap-4 pt-10 border-t border-white/5">
 <Button variant="ghost" onClick={prevStep} className={cn("rounded-2xl font-black h-12 px-6 text-white/40 hover:text-white transition-all", currentStep === 0 && "invisible")}>
 <ChevronLeft size={20} /> ?댁쟾
 </Button>

 <div className="flex gap-3">
 {currentStep < steps.length - 1 ? (
 <Button onClick={nextStep} className="rounded-2xl font-black h-14 px-10 bg-primary text-white shadow-[0_15px_30px_-5px_rgba(59,130,246,0.3)] hover:scale-[1.05] active:scale-95 transition-all gap-3">
 {currentStep === 0 ? "플랫폼 둘러보기" : "ㅼ쓬 湲곕뒫"} <ArrowRight size={18} />
 </Button>
 ) : (
 <Button onClick={handleComplete} className="rounded-2xl font-black h-14 px-12 bg-emerald-500 text-white shadow-[0_15px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.05] active:scale-95 transition-all gap-3">
 시작?섍린 <CheckCircle2 size={18} />
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}


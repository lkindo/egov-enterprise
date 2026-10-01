'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { X,
  ChevronLeft, 
  Sparkles, 
  Command, 
  Layout, 
  CheckCircle2, 
  Activity, 
  ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ONBOARDING_OPEN_EVENT } from '@/lib/navigation/onboarding-bridge';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TOUR_SEEN_KEY = 'egov_smart_tour_v1';
const seenListeners = new Set<() => void>();
function subscribeSeen(listener: () => void) {
  seenListeners.add(listener);
  return () => { seenListeners.delete(listener); };
}
function readSeen(): boolean {
  try { return window.localStorage.getItem(TOUR_SEEN_KEY) !== null; } catch { return true; }
}
function markSeen() {
  try { window.localStorage.setItem(TOUR_SEEN_KEY, 'true'); } catch { /* 저장소가 없으면 이번 화면에서만 닫힌다. */ }
  seenListeners.forEach((listener) => listener());
}

/**
 * 사용 안내(온보딩).
 *
 * [2026-10-01] 저절로 모달로 열지 않는다 — 종전에는 첫 방문 2초 뒤 모달이 열려 하던 일의 포커스를 가져갔다.
 * 처음 온 사용자에게는 포커스를 가져가지 않는 안내 배너만 보이고, 안내는 배너나 계정 메뉴의 '사용 안내' 로 연다.
 * 문구는 모든 프로필에 있는 기능만 말한다(축소 프로필에 없는 '고객지원' 을 안내하지 않는다).
 */
export function SmartOnboardingHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  // 서버 렌더·하이드레이션에서는 본 것으로 간주해 배너를 그리지 않는다.
  const hasSeenTour = useSyncExternalStore(subscribeSeen, readSeen, () => true);
  // E2E 테스트 환경과 인증 화면에서는 배너를 두지 않는다.
  const suppressed = process.env.NEXT_PUBLIC_APP_ENV === 'test'
    || (pathname || '').startsWith('/login')
    || (typeof window !== 'undefined' && window.location.search.includes('e2e=true'));

  const openTour = () => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCurrentStep(0);
    setIsOpen(true);
  };

  useEffect(() => {
    const open = () => {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, open);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, open);
  }, []);

  const handleComplete = () => {
    markSeen();
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
      title: "업무 포털 둘러보기",
      description: "업무 포털의 주요 이동 방법과 화면 상태 안내를 차례로 확인할 수 있습니다. 언제든 닫고 현재 업무로 돌아갈 수 있습니다.",
      icon: <Sparkles className="text-primary animate-pulse" size={40} />
    },
    {
      title: "빠른 메뉴 찾기",
      description: "화면 위쪽의 '빠른 이동' 을 누르거나 Ctrl(또는 Command)과 K 키를 함께 누르면 메뉴·즐겨찾기·최근 방문을 찾을 수 있습니다. 사이드바의 별로 자주 쓰는 메뉴를 즐겨찾기에 넣을 수 있습니다.",
      icon: <Command className="text-hub-purple" size={40} />
    },
    {
      title: "화면 상태 확인",
      description: "화면은 불러오는 중, 결과 없음, 일부 실패, 권한 없음, 미지원 상태를 구분해 안내합니다. 오류가 계속되면 화면의 다시 시도를 이용하고, 오류 화면에 보이는 참조 번호를 관리자에게 알려 주세요.",
      icon: <Activity className="text-destructive-emphasis" size={40} />
    },
    {
      title: "키보드로 이동하기",
      description: "Tab 키로 주요 작업을 이동하고 Enter 또는 Space 키로 실행할 수 있습니다. 팝업이 열리면 Escape 키로 닫을 수 있습니다.",
      icon: <Layout className="text-hub-indigo" size={40} />
    },
    {
      title: "다시 보기",
      description: "이 안내는 오른쪽 위 계정 메뉴의 '사용 안내' 에서 언제든 다시 볼 수 있습니다. 제공되지 않는 기능은 가능한 작업과 제한 사유를 화면에서 안내합니다.",
      icon: <CheckCircle2 className="text-success-emphasis" size={40} />
    }
  ];

  if (!isOpen) {
    if (hasSeenTour || suppressed) return null;
    return (
      <section
        aria-label="사용 안내"
        className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-4 shadow-lg"
      >
        <p className="text-sm font-semibold text-foreground">처음 오셨나요?</p>
        <p className="mt-1 text-sm text-muted-foreground">메뉴를 찾는 방법과 화면 상태 안내를 짧게 확인할 수 있습니다.</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={markSeen}>다음에 보기</Button>
          <Button type="button" size="sm" onClick={openTour}>사용 안내 보기</Button>
        </div>
      </section>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleComplete();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-modal="true"
        aria-labelledby="smart-onboarding-title"
        aria-describedby="smart-onboarding-description"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          previousFocusRef.current?.focus();
          previousFocusRef.current = null;
        }}
        className="max-w-4xl sm:max-w-4xl w-full bg-surface-inverse text-surface-inverse-foreground border border-surface-inverse-border rounded-lg shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] max-h-[90dvh] overflow-y-auto p-0 flex flex-col md:flex-row md:min-h-[500px] gap-0"
      >
        {/* Progress Strip */}
        <div className="absolute top-0 left-0 w-full h-1 flex px-10 pt-4 gap-2 z-20">
          {steps.map((_, idx) => (
            <div key={idx} className={cn("h-1 rounded-lg flex-1 transition-all duration-700", idx <= currentStep ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-surface-inverse-border")} />
          ))}
        </div>

        {/* Left Side: Visual Preview */}
        <div className="flex-1 bg-surface-inverse p-12 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-hub-purple/10 opacity-30" />
          <div className="relative z-10 w-full aspect-video rounded-lg border border-surface-inverse-border bg-surface-inverse shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4 duration-1000">
              <div className="p-6 bg-surface-inverse-foreground/5 rounded-lg border border-surface-inverse-border shadow-inner">
                {steps[currentStep].icon}
              </div>
            </div>
          </div>
          <div className="absolute bottom-10 left-10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-xs font-bold text-surface-inverse-muted tracking-[0.4em]">기능 스포트라이트</span>
          </div>
        </div>

        {/* Right Side: Content & Actions */}
        <div className="flex-1 p-12 flex flex-col justify-between">
          <button
            onClick={handleComplete}
            aria-label="온보딩 닫기"
            data-testid="onboarding-close"
            className="absolute top-8 right-8 p-3 hover:bg-surface-inverse-foreground/5 rounded-lg transition-colors group"
          >
            <X size={20} className="text-surface-inverse-muted group-hover:text-surface-inverse-foreground transition-colors" />
          </button>

          <div className="space-y-10 py-10">
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="flex items-center gap-2">
                <div className="h-px w-8 bg-primary" />
                <span className="text-xs font-bold text-surface-inverse-muted tracking-[0.3em]">사용 안내</span>
              </div>
              <DialogTitle id="smart-onboarding-title" className="text-3xl font-bold tracking-tighter text-surface-inverse-foreground leading-[1.1]">
                {steps[currentStep].title}
              </DialogTitle>
              <DialogDescription id="smart-onboarding-description" className="text-base text-surface-inverse-muted font-medium leading-relaxed">
                {steps[currentStep].description}
              </DialogDescription>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-success-emphasis" />
                <span className="text-sm font-bold text-surface-inverse-foreground">권한에 맞는 메뉴와 바로가기</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-success-emphasis" />
                <span className="text-sm font-bold text-surface-inverse-foreground">작업 상태와 제한 사항 안내</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-10 border-t border-surface-inverse-border">
            <Button variant="ghost" onClick={prevStep} className={cn("rounded-lg font-bold px-6 text-surface-inverse-muted hover:text-surface-inverse-foreground transition-all", currentStep === 0 && "invisible")}>
              <ChevronLeft size={20} /> 이전
            </Button>

            <div className="flex gap-3">
              {currentStep < steps.length - 1 ? (
                <Button onClick={nextStep} className="rounded-lg font-bold px-10 bg-primary text-primary-foreground shadow-[0_15px_30px_-5px_rgba(59,130,246,0.3)] hover:scale-[1.05] active:scale-95 transition-all gap-3">
                  {currentStep === 0 ? "플랫폼 둘러보기" : "다음 기능"} <ArrowRight size={18} />
                </Button>
              ) : (
                <Button onClick={handleComplete} className="rounded-lg font-bold px-12 bg-success text-success-foreground shadow-[0_15px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.05] active:scale-95 transition-all gap-3">
                  시작하기 <CheckCircle2 size={18} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

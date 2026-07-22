'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

/**
 * 폭 매핑.
 *
 * `DialogContent` 기본 클래스에는 `max-w-[calc(100%-2rem)]` 와 `sm:max-w-lg` 가 함께 들어 있다.
 * tailwind-merge 는 같은 변형(variant) 그룹끼리만 충돌을 해소하므로, 무접두 클래스만 넘기면
 * `sm:max-w-lg` 가 살아남아 sm 이상에서 지정 폭을 덮어쓴다. 그래서 무접두 + `sm:` 를 함께 넘긴다.
 */
const maxWidthClasses: Record<NonNullable<StandardModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm sm:max-w-sm',
  md: 'max-w-md sm:max-w-md',
  lg: 'max-w-lg sm:max-w-lg',
  xl: 'max-w-xl sm:max-w-xl',
  '2xl': 'max-w-2xl sm:max-w-2xl',
  '3xl': 'max-w-3xl sm:max-w-3xl',
  '4xl': 'max-w-4xl sm:max-w-4xl',
  '5xl': 'max-w-5xl sm:max-w-5xl',
};

/**
 * 프로젝트 표준 모달.
 *
 * 외부 계약(`isOpen`/`onClose`/`title`/`children`/`footer`/`maxWidth`)은 그대로 두고
 * 내부 구현만 Radix `Dialog` 로 위임한다. 종전 수제 포털 구현에는 ESC 닫기, 포커스 트랩,
 * 닫힘 후 포커스 복귀, 닫기 버튼 접근명, 배경 요소 inert(aria-hidden) 가 전부 없었다.
 * 스크롤 잠금도 `document.body.style.overflow` 를 직접 만지던 탓에 모달이 중첩되면
 * 안쪽 모달이 닫힐 때 바깥 모달이 열려 있는데도 잠금이 풀렸다 — Radix 가 참조 카운트로 처리한다.
 */
export function StandardModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}: StandardModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        // 헤더를 직접 구성하므로 기본 닫기 버튼은 끈다(닫기 버튼 중복 방지).
        showCloseButton={false}
        // 본문 설명 슬롯을 쓰지 않는다는 명시적 선언. 생략하면 Radix 가 개발 모드에서
        // "Missing Description ..." 경고를 콘솔에 남겨 E2E 콘솔 가드를 오염시킨다.
        aria-describedby={undefined}
        // Radix 는 DialogTitle 로 aria-labelledby 를 이미 걸지만,
        // 종전 계약(`aria-label={title}`)에 의존하는 호출부/테스트를 위해 유지한다.
        aria-label={title}
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          'w-[calc(100%-2rem)] border-border shadow-xl',
          'max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]',
          maxWidthClasses[maxWidth]
        )}
      >
        {/* Header */}
        <div className="flex h-11 items-center justify-between border-b border-border/50 px-6 shrink-0 bg-card">
          <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
            {title}
          </DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="닫기"
              className="rounded-lg h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { ArrowLeft } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';
import { useReturnToList, type ReturnToListOptions } from '@/lib/navigation/use-return-to-list';

interface BackToListButtonProps extends ReturnToListOptions {
  /** 보이는 이름이 곧 접근 가능한 이름이다 — 다른 aria-label 을 붙이지 않는다(WCAG 2.5.3). */
  label?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  className?: string;
}

/**
 * 상세 화면의 공용 '목록으로'(2026-10-01). 문구는 하나로 둔다 — '뒤로 가기'·'목록으로 돌아가기'·'목록으로' 가
 * 화면마다 달랐고, 몇 곳은 보이는 '목록으로' 에 '뒤로 가기' 라는 다른 접근 가능한 이름을 붙이고 있었다.
 */
export function BackToListButton({
  fallback,
  origins,
  label = '목록으로',
  variant = 'outline',
  size,
  className,
}: BackToListButtonProps) {
  const returnToList = useReturnToList({ fallback, origins });
  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={returnToList}>
      <ArrowLeft aria-hidden="true" />
      {label}
    </Button>
  );
}

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubStatusBadgeProps {
  label?: string;
  status?: string;
  labels?: Record<string, string>;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'secondary';
  className?: string;
}

export function HubStatusBadge({ 
  label, 
  status,
  labels,
  icon: Icon, 
  variant = 'default',
  className 
}: HubStatusBadgeProps) {
  const displayLabel = labels && status ? labels[status] : (label || status || 'N/A');
  
  // default 는 라이트에서 순백 카드 위 slate-200(1.23:1)으로 상태 라벨이 보이지 않던 실측 결함.
  // secondary 와 동일한 muted pair 로 통일해 다크는 바이트 불변, 깨진 라이트 경로만 이동한다.
  const variantStyles = {
    default: 'bg-muted text-muted-foreground',
    secondary: 'bg-muted text-muted-foreground',
    success: 'bg-success/15 text-success-emphasis',
    warning: 'bg-warning/15 text-warning-foreground',
    error: 'bg-destructive/15 text-destructive-emphasis'
  };

  // Auto-variant based on status if not provided.
  // ⚠ [2026-09-22] 이 목록은 **편의이지 보장이 아니다.** 목록 밖 문구를 status 로만 넘기면
  //   조용히 default(bg-muted)로 떨어져 서로 다른 두 상태가 **같은 색으로 렌더된다** —
  //   공통코드('사용 중'/'미사용')와 배너('게시 중'/'대기 중')가 실제로 그랬고 배지 열이
  //   아무것도 구분하지 못했다. 새 화면은 variant 를 명시해 의미를 자기 자리에서 선언할 것.
  let activeVariant = variant;
  if (variant === 'default' && status) {
    if (['활성', 'PUBLISHED', 'CONFIRMED'].includes(status)) activeVariant = 'success';
    if (['PENDING', 'STAGED'].includes(status)) activeVariant = 'warning';
    if (['DISABLED', 'REJECTED', 'INACTIVE'].includes(status)) activeVariant = 'error';
  }

  return (
    <div className={cn(
      "hub-badge-status border border-border/10 whitespace-nowrap w-fit",
      variantStyles[activeVariant],
      className
    )}>
      {Icon && <Icon size={12} />}
      <span className="leading-none">{displayLabel}</span>
    </div>
  );
}

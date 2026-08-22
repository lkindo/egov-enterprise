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

  // Auto-variant based on status if not provided
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

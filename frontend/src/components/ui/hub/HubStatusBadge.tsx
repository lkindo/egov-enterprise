import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubStatusBadgeProps {
  label?: string;
  status?: string;
  labels?: Record<string, string>;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'error';
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
  
  const variantStyles = {
    default: 'bg-white/10 dark:bg-muted text-slate-300 dark:text-muted-foreground',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    error: 'bg-rose-500/20 text-rose-400'
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

import React from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HubInsightBadgeProps {
  label: string;
  icon?: LucideIcon | React.ReactNode;
  className?: string;
}

export function HubInsightBadge({ label, icon, className }: HubInsightBadgeProps) {
  const renderIcon = () => {
    if (!icon) return <Sparkles size={14} className="animate-pulse" />;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const Icon = icon as any;
      return <Icon size={14} />;
    }
    return null;
  };

  return (
    <div className={cn("hub-badge-insight mb-2", className)}>
      {renderIcon()}
      <span>{label}</span>
    </div>
  );
}

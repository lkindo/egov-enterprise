import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HubIcon, renderHubIcon } from './hub-icon';

export interface HubInsightBadgeProps {
  label: string;
  icon?: HubIcon;
  className?: string;
}

export function HubInsightBadge({ label, icon, className }: HubInsightBadgeProps) {
  return (
    <div className={cn("hub-badge-insight mb-2", className)}>
      {icon ? renderHubIcon(icon, 14) : <Sparkles size={14} className="animate-pulse" />}
      <span>{label}</span>
    </div>
  );
}

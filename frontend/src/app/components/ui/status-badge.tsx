import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'Y': { label: '승인', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  'N': { label: '반려', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  'R': { label: '대기', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  'C': { label: '완료', color: 'bg-muted text-foreground' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-foreground' };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-lg text-sm font-semibold",
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
}

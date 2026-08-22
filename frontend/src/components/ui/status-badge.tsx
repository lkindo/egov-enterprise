import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// 채움형 pair(bg-X + text-X-foreground)는 status-token-contrast 계약이 양 프로필·양 모드에서
// 4.5:1 이상을 검증하는 조합이다(BoardMakerWizard 의 landed 선례와 동일).
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Y: { label: '승인', color: 'bg-success text-success-foreground' },
  N: { label: '반려', color: 'bg-destructive text-destructive-foreground' },
  R: { label: '대기', color: 'bg-info text-info-foreground' },
  C: { label: '완료', color: 'bg-muted text-foreground' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-foreground' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-lg text-sm font-semibold',
        config.color,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

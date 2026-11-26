import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  /**
   * 도메인별 라벨 재정의.
   *
   * 기본 라벨(승인·반려·대기·완료)은 결재 어휘라 다른 도메인에서 그대로 쓰면 거짓말이 된다 —
   * 도움말 Q&A 가 답변 상태를 '승인'/'대기' 로 표시하고 있었다(2026-08-28 실측). 색 체계는
   * 공유하되 문구만 화면이 정할 수 있게 한다. 넘기지 않으면 기본 라벨 그대로다.
   */
  labels?: Record<string, string>;
}

// 채움형 pair(bg-X + text-X-foreground)는 status-token-contrast 계약이 양 프로필·양 모드에서
// 4.5:1 이상을 검증하는 조합이다. [2026-11-26 PR-3b 6번] 모양은 Badge 의 변형 하나에서 오고 이 표는 상태 → 변형만 정한다.
const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  Y: { label: '승인', variant: 'success' },
  N: { label: '반려', variant: 'destructive' },
  R: { label: '대기', variant: 'info' },
  C: { label: '완료', variant: 'muted' },
};

export function StatusBadge({ status, className, labels }: StatusBadgeProps) {
  const base = STATUS_CONFIG[status] ?? { label: status, variant: 'muted' };

  return (
    <Badge variant={base.variant} className={cn('px-2.5 font-semibold', className)}>
      {labels?.[status] ?? base.label}
    </Badge>
  );
}

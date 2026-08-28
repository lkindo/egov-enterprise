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
// 4.5:1 이상을 검증하는 조합이다(BoardMakerWizard 의 landed 선례와 동일).
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Y: { label: '승인', color: 'bg-success text-success-foreground' },
  N: { label: '반려', color: 'bg-destructive text-destructive-foreground' },
  R: { label: '대기', color: 'bg-info text-info-foreground' },
  C: { label: '완료', color: 'bg-muted text-foreground' },
};

export function StatusBadge({ status, className, labels }: StatusBadgeProps) {
  const base = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-foreground' };
  const config = { ...base, label: labels?.[status] ?? base.label };

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

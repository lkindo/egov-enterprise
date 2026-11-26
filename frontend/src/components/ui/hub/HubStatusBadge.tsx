import { LucideIcon } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/components/ui/badge';

type HubStatusVariant = 'default' | 'success' | 'warning' | 'error' | 'secondary';

interface HubStatusBadgeProps {
  label?: string;
  status?: string;
  labels?: Record<string, string>;
  icon?: LucideIcon;
  variant?: HubStatusVariant;
  className?: string;
}

// [2026-11-26 PR-3b 6번] 모양은 Badge 의 연한 변형에서 온다. 종전 자체 쌍 가운데 success(bg-success/15 위 text-success-emphasis)는
// 기본 프로필 라이트에서 3.79:1 이었다 — 토큰을 고쳐 Badge 계약(자기 틴트 위 4.5:1)으로 묶었다.
// default 는 라이트에서 순백 카드 위 slate-200(1.23:1)으로 상태 라벨이 보이지 않던 실측 결함이라 secondary 와 같은 muted 다.
const BADGE_VARIANT: Record<HubStatusVariant, BadgeVariant> = {
  default: 'muted',
  secondary: 'muted',
  success: 'success-soft',
  warning: 'warning-soft',
  error: 'destructive-soft',
};

export function HubStatusBadge({
  label,
  status,
  labels,
  icon: Icon,
  variant = 'default',
  className
}: HubStatusBadgeProps) {
  const displayLabel = labels && status ? labels[status] : (label || status || 'N/A');

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
    <Badge variant={BADGE_VARIANT[activeVariant]} className={className}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      <span className="leading-none">{displayLabel}</span>
    </Badge>
  );
}

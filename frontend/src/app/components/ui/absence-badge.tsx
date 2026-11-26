import { Badge } from '@/components/ui/badge';

/**
 * 부재 표시 — 사용자 검색 결과(UserSearchDto.absent)가 부재 중이라고 말할 때만 그린다.
 *
 * [2026-09-26 DIP B4 P4] 부재자에게 업무·결재·메일을 맡기면 처리할 사람이 없다. 고르는 순간 알린다. 대결·위임은 만들지
 * 않으므로(D10) 고르는 것 자체는 막지 않는다. 사유·기간 같은 부재 정보는 서버가 싣지 않는다.
 * [2026-11-26 PR-3b 6번] 종전 글자색 text-warning-emphasis 는 정의되지 않은 토큰이라 색이 조용히 빠져 있었다 — Badge 의 연한 경고 변형을 쓴다.
 */
export function AbsenceBadge({ absent }: { absent?: boolean | null }) {
  if (!absent) return null;
  return (
    <Badge variant="warning-soft" size="sm" className="font-semibold">
      부재 중
    </Badge>
  );
}

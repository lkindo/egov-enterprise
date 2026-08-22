import { Activity } from 'lucide-react';

export function ActivityFeed() {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-white/15 p-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-surface-inverse-foreground">
        <Activity size={20} aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-surface-inverse-foreground">
          최근 활동 데이터가 연결되지 않았습니다.
        </p>
        <p className="text-xs font-medium leading-relaxed text-surface-inverse-muted">
          공지사항과 배정 업무는 왼쪽 목록에서 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

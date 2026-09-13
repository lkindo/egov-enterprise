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
        {/*
          [2026-09-13] 종전 문구 '공지사항과 배정 업무는 왼쪽 목록에서' 는 어느 프로필에서도 사실이 아니었다 — 목록은
          왼쪽이 아니라 위에 있고, 업무 홈은 2026-08-29 에 '배정' 을 근거 없는 표현으로 걷었다. 그 목록은 collaboration
          pack 소유라 안내도 같은 블록에 둔다.
        */}
        {/* reusable-base:collaboration:start */}
        <p className="text-xs font-medium leading-relaxed text-surface-inverse-muted">
          공지사항과 업무게시판 최근 글은 위 목록에서 확인할 수 있습니다.
        </p>
        {/* reusable-base:collaboration:end */}
      </div>
    </div>
  );
}

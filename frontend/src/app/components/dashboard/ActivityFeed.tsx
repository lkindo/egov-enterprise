import { Activity } from 'lucide-react';

export function ActivityFeed() {
  return (
    // [2026-09-26 DIP V1] 이 구역은 카드(bg-card) 위에 놓인다. 종전의 반전 표면 토큰(흰 글자·흰 테두리)은
    //   어두운 배경용이라 밝은 테마에서 흰 바탕에 흰 글자가 되어 문구가 보이지 않았다.
    <div className="flex min-h-44 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Activity size={20} aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-foreground">
          최근 활동 데이터가 연결되지 않았습니다.
        </p>
        {/*
          [2026-09-13] 종전 문구 '공지사항과 배정 업무는 왼쪽 목록에서' 는 어느 프로필에서도 사실이 아니었다 — 목록은
          왼쪽이 아니라 위에 있고, 업무 홈은 2026-08-29 에 '배정' 을 근거 없는 표현으로 걷었다. 그 목록은 collaboration
          pack 소유라 안내도 같은 블록에 둔다.
        */}
        {/* reusable-base:collaboration:start */}
        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
          공지사항과 업무게시판 최근 글은 위 목록에서 확인할 수 있습니다.
        </p>
        {/* reusable-base:collaboration:end */}
      </div>
    </div>
  );
}

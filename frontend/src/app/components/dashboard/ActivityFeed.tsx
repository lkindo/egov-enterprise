import { Activity } from 'lucide-react';

/**
 * 업무 홈 '최근 활동' 구역. 활동 데이터 원천은 아직 없다고 말한다. notes 는 업무 홈에 기여한 기능이 '위에 무엇을 보여 주는지' 덧붙이는
 * 문장이다(home-sections 의 activityNote) — 그 기능이 빠진 구성에서는 문장도 함께 빠진다.
 */
export function ActivityFeed({ notes = [] }: { notes?: readonly string[] }) {
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
          왼쪽이 아니라 위에 있고, 업무 홈은 2026-08-29 에 '배정' 을 근거 없는 표현으로 걷었다. 그 목록을 그리는 기능이 안내도 준다.
        */}
        {notes.map(note => (
          <p key={note} className="text-xs font-medium leading-relaxed text-muted-foreground">
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}

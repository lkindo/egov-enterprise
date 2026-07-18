import React from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare,  UserPlus,  Clock } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'post',
    user: '홍길동',
    action: '새 공지사항을 등록했습니다.',
    target: '2026년 상반기 시스템 점검 안내',
    time: '10분 전',
    icon: <MessageSquare size={14} className="text-blue-500" />,
    bg: 'bg-blue-50'
  },
  {
    id: 2,
    type: 'user',
    user: '시스템',
    action: '새로운 사용자가 승인되었습니다.',
    target: '이순신 과장 (영업지원팀)',
    time: '1시간 전',
    icon: <UserPlus size={14} className="text-green-500" />,
    bg: 'bg-green-50'
  }
];

export function ActivityFeed() {
  return (
    <div className="space-y-6">
      {activities.map((activity, idx) => (
        <div key={`activity-${activity.id}`} className="relative flex gap-4">
          {idx !== activities.length - 1 && (
            <div className="absolute left-[17px] top-9 bottom-[-24px] w-px bg-muted" />
          )}

          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 z-10",
            activity.bg
          )}>
            {activity.icon}
          </div>

          <div className="flex flex-col gap-0.5 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{activity.user}</span>
              <span className="text-sm text-muted-foreground">{activity.action}</span>
            </div>
            <p className="text-sm font-medium text-primary hover:underline cursor-pointer">
              {activity.target}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock size={10} />
              {activity.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

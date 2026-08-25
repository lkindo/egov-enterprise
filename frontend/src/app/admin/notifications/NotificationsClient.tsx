'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { SmartNotificationHub } from '@/app/components/ui/smart-notification-hub';
import { NotificationSender } from '@/app/components/ui/notification-sender';
import { Button } from '@/components/ui/button';
import { Bell, Send, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationView = 'hub' | 'dispatch';

export default function NotificationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 뷰 상태를 URL 에서 파생시킨다. 공유·새로고침·뒤로가기가 그대로 복원되고,
  // 사이드바 활성 표시도 경로를 유지한다.
  const view: NotificationView = searchParams.get('view') === 'dispatch' ? 'dispatch' : 'hub';

  const setView = (next: NotificationView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'hub') params.delete('view');
    else params.set('view', next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-10 pb-20">
      <PageHeader
        title="스마트 알림 및 메시징 허브"
        breadcrumbs={[{ label: '시스템 관리' }, { label: '메시징 센터' }]}
        actions={
          // 종전의 '분석 리포트'·'채널 설정' 버튼은 onClick 이 없는 死버튼이었다(대응 화면·API 부재).
          // 실제 동작하는 뷰 전환만 남긴다.
          <Button
            onClick={() => setView(view === 'hub' ? 'dispatch' : 'hub')}
            aria-pressed={view === 'dispatch'}
            className={cn(
              "rounded-lg h-11 px-8 shadow-xl gap-2 font-bold transition-all",
              view === 'hub' ? "bg-primary shadow-primary/20" : "bg-surface-inverse text-surface-inverse-foreground"
            )}
          >
            {view === 'hub' ? <Send size={18} /> : <Zap size={18} />}
            {view === 'hub' ? "발송 미리보기 (데모)" : "알림 목록 보기"}
          </Button>
        }
      />

      <div className="p-8 md:p-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-12">
          <Bell size={260} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-emerald-400">
            <Bell size={20} />
            <span className="text-sm font-bold tracking-[0.3em] leading-none">
              {view === 'hub' ? "알림 API 연결 화면" : "로컬 미리보기 데모"}
            </span>
          </div>
          {/*
            지표 패널('글로벌 배포 99.9%' · '활성 트리거 2,412')은 산출 근거가 없는 고정 문자열이라 제거했다.
            실제 발송 성공률·트리거 수를 집계하는 API 가 생기면 이 자리에 배선한다.
          */}
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter leading-none">
            {view === 'hub' ? "통합 알림 모니터링" : "메시지 발송 미리보기"}
          </h2>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {view === 'hub'
              ? "현재 계정의 알림 API 응답을 확인합니다. 조회 실패는 빈 결과와 구분해 표시합니다."
              : "채널과 문구를 로컬에서 미리 보는 화면입니다. 수신자 조회·저장·전송·예약은 수행하지 않습니다."}
          </p>
        </div>
      </div>

      <div className="relative">
        {view === 'hub' ? (
          <SmartNotificationHub />
        ) : (
          <div className="animate-in zoom-in-95 duration-700">
            {/*
              종전 하단의 'Email Templates'·'SMS Quick-Replies'·'AI Assistant' 카드는
              cursor-pointer 만 있고 onClick·대응 기능이 없는 장식이라 제거했다.
            */}
            <NotificationSender />
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { SmartNotificationHub } from '@/app/components/ui/smart-notification-hub';
import { NotificationSender } from '@/app/components/ui/notification-sender';
import { Button } from '@/components/ui/button';
import { Bell, Send, Zap, ShieldCheck } from 'lucide-react';
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
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
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
            {view === 'hub' ? "메시지 발송하기" : "실시간 스트림 보기"}
          </Button>
        }
      />

      <div className="p-8 md:p-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-12">
          <Bell size={260} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-emerald-400">
            <ShieldCheck size={20} />
            <span className="text-sm font-bold tracking-[0.3em] leading-none">보안 검증 채널</span>
          </div>
          {/*
            지표 패널('글로벌 배포 99.9%' · '활성 트리거 2,412')은 산출 근거가 없는 고정 문자열이라 제거했다.
            실제 발송 성공률·트리거 수를 집계하는 API 가 생기면 이 자리에 배선한다.
          */}
          <h3 className="text-2xl md:text-3xl font-bold tracking-tighter leading-none">
            {view === 'hub' ? "통합 알림 모니터링" : "메시지 발송"}
          </h3>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {view === 'hub'
              ? "시스템 전체의 알림 흐름과 발송 결과를 확인합니다."
              : "대상자를 지정해 공지 메시지를 발송합니다."}
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

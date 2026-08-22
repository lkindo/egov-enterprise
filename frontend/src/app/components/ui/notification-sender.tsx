import { useState } from 'react';
import { Send,
  FileText,
  Target, 
  Layers, 
  Mail, 
  MessageSquare, 
  Bell, 
  Calendar, 
  ShieldCheck, 
  Zap, 
  Bot,
  Users,
  type LucideIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NotificationChannel = 'system' | 'mail' | 'sms';

const CHANNEL_OPTIONS: ReadonlyArray<{
  id: NotificationChannel;
  icon: LucideIcon;
  label: string;
}> = [
  { id: 'system', icon: Bell, label: '시스템' },
  { id: 'mail', icon: Mail, label: '이메일' },
  { id: 'sms', icon: MessageSquare, label: 'SMS' },
];

export function NotificationSender() {
  const [channel, setChannel] = useState<NotificationChannel>('system');
  const [message, setMessage] = useState('');

  const fillSampleDraft = () => {
    setMessage("[샘플 알림]\n이 문구는 로컬 미리보기용 예시입니다. 실제 일정과 발송 내용으로 사용하지 마세요.");
  };

  return (
    <div className="bg-card border-2 border-primary/10 rounded-lg p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden group/sender">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />

      <div
        role="status"
        className="relative z-10 mb-8 rounded-lg border border-warning/30 bg-warning/10 p-5 text-sm font-semibold text-foreground"
      >
        <p>로컬 미리보기 데모입니다.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          실제 수신자 조회·AI 생성·전송·예약을 수행하지 않습니다.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Configuration */}
        <div className="space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-lg text-white shadow-xl shadow-primary/30">
                <Target size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tighter">발송 미리보기</h2>
            </div>
            <p className="text-sm font-bold text-muted-foreground opacity-60 leading-relaxed max-w-sm">
              채널과 문구를 로컬 화면에서 조합해 보는 데모입니다. 서버에는 어떤 내용도 저장하거나 전송하지 않습니다.
            </p>
          </div>

          <fieldset className="space-y-6">
            <legend className="text-xs font-bold text-primary tracking-[0.3em] ml-2">발송 채널 선택</legend>
            <div className="grid grid-cols-3 gap-4">
              {CHANNEL_OPTIONS.map((item) => {
                const ChannelIcon = item.icon;
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "p-6 rounded-lg border-2 transition-all flex cursor-pointer flex-col items-center gap-3 group/item has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
                      channel === item.id ? "bg-primary text-white border-primary shadow-2xl shadow-primary/20 scale-[1.05]" : "bg-card border-transparent hover:border-primary/20 hover:bg-primary/5 text-muted-foreground"
                    )}
                  >
                    <input
                      type="radio"
                      name="notification-channel"
                      value={item.id}
                      aria-label={item.label}
                      checked={channel === item.id}
                      onChange={() => setChannel(item.id)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500",
                      channel === item.id ? "bg-white/20 rotate-12" : "bg-muted group-hover/item:bg-primary/10"
                    )}>
                      <ChannelIcon size={20} />
                    </div>
                    <span className="text-xs font-bold tracking-tight">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-4">
            <p className="text-xs font-bold text-primary tracking-[0.3em] ml-2">샘플 수신 대상</p>
            <div className="p-6 rounded-lg bg-muted/40 border-2 border-dashed border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-card border flex items-center justify-center shadow-inner">
                  <Users className="text-muted-foreground" size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">전체 임직원 (예시)</p>
                  <p className="text-xs font-bold text-muted-foreground opacity-70 tracking-tight">1,204명은 정적 샘플 값이며 조회 결과가 아닙니다.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <div className="flex-1 p-6 rounded-lg bg-hub-indigo/5 border border-hub-indigo/10">
              <div className="flex items-center gap-2 text-hub-indigo mb-2">
                <ShieldCheck size={16} />
                <span className="text-xs font-bold tracking-tight leading-none">보호 기능 미연결</span>
              </div>
              <p className="text-xs font-bold text-hub-indigo/60">중복 방지·무결성 검증·수신자 권한 확인은 실제 발송 API와 함께 구현해야 합니다.</p>
            </div>
          </div>
        </div>

        {/* Right: Content Editor */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 flex flex-col p-10 bg-card border-2 border-primary/10 rounded-lg shadow-2xl relative group/editor">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><Layers size={18} /></div>
                <span className="text-sm font-bold tracking-tight">콘텐츠 편집기</span>
              </div>
              <Button
                variant="ghost"
                onClick={fillSampleDraft}
                className="rounded-lg h-10 px-6 gap-2 bg-gradient-to-r from-hub-indigo to-hub-purple text-white font-bold text-xs tracking-tight shadow-lg shadow-hub-indigo/20 hover:scale-105 active:scale-95 transition-all"
              >
                <FileText size={14} />
                샘플 문구 채우기
              </Button>
            </div>

            <textarea
              aria-label="메시지 내용"
              className="flex-1 w-full bg-transparent border-none outline-none resize-none text-xl font-bold placeholder:text-muted-foreground/10 custom-scrollbar leading-relaxed"
              placeholder="미리 볼 메시지 내용을 입력하세요..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="pt-6 border-t border-primary/5 flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label="AI 봇 옵션 (미지원)" title="AI 생성 기능은 연결되지 않았습니다." className="h-10 w-10 rounded-lg border-2" disabled><Bot size={16} /></Button>
                <Button variant="outline" size="icon" aria-label="예약 시간 설정 (미지원)" title="예약 기능은 연결되지 않았습니다." className="h-10 w-10 rounded-lg border-2" disabled><Calendar size={16} /></Button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground opacity-60">문자 수: {message.length}</span>
                <Button
                  className="h-11 px-10 rounded-lg font-bold text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-3 group/send"
                  title="실제 발송 API가 연결되지 않았습니다."
                  disabled
                >
                  메시지 일괄 발송 <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
              </div>
            </div>

          </div>

          {/* Preview Banner */}
          <div className="p-6 bg-surface-inverse rounded-lg text-surface-inverse-foreground flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-warning" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-tight opacity-60">비주얼 미리보기</p>
                <p className="text-sm font-bold">모바일 잠금화면 위젯 (목업)</p>
              </div>
            </div>
            <div className="w-32 h-1.5 bg-white/10 rounded-lg overflow-hidden">
              <div className="h-full bg-warning w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

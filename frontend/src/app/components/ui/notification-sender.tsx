
import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Target,
  Layers,
  Mail,
  MessageSquare,
  Bell,
  X,
  Calendar,
  ShieldCheck,
  Zap,
  Bot,
  UserCheck,
  Users
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function NotificationSender() {
  const [channel, setChannel] = useState<'system' | 'mail' | 'sms'>('system');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const simulateAIGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setMessage("[알림] 시스템 유지보수 안내\n원활한 서비스 제공을 위해 아래와 같이 정기 점검이 진행될 예정입니다\n\n- 일시: 2026년 2월 28일 01:00 ~ 05:00\n- 영향: 점검 시간 중 모든 서비스 일시 중단\n\n중요한 데이터는 미리 저장해 주시기 바랍니다.");
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="bg-card border-2 border-primary/10 rounded-[0.1rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden group/sender">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Configuration */}
        <div className="space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-[0.1rem] text-white shadow-xl shadow-primary/30">
                <Target size={24} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter">발송 제어 센터</h2>
            </div>
            <p className="text-sm font-bold text-muted-foreground opacity-60 leading-relaxed max-w-sm">
              대상자에게 최적의 채널을 통해 중요한 메시지를 전달합니다. AI 엔진이 문맥에 맞는 톤앤매너를 추천합니다.
            </p>
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-black text-primary tracking-[0.3em] ml-2">발송 채널 선택</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'system', icon: <Bell />, label: '시스템' },
                { id: 'mail', icon: <Mail />, label: '이메일' },
                { id: 'sms', icon: <MessageSquare />, label: 'SMS' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setChannel(item.id as any)}
                  className={cn(
                    "p-6 rounded-[0.1rem] border-2 transition flex flex-col items-center gap-3 group/item",
                    channel === item.id ? "bg-primary text-white border-primary shadow-2xl shadow-primary/20 scale-[1.05]" : "bg-card border-transparent hover:border-primary/20 hover:bg-primary/5 text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-[0.1rem] flex items-center justify-center transition duration-500",
                    channel === item.id ? "bg-white/20 rotate-12" : "bg-muted group-hover/item:bg-primary/10"
                  )}>
                    {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
                  </div>
                  <span className="text-[10px] font-black tracking-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-primary tracking-[0.3em] ml-2">수신 대상자 분할</label>
            <div className="p-6 rounded-[0.1rem] bg-muted/40 border-2 border-dashed border-primary/10 flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer group/target">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[0.1rem] bg-white border flex items-center justify-center shadow-inner group-hover/target:scale-110 transition-transform">
                  <Users className="text-muted-foreground" size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">전체 임직원 (Active)</p>
                  <p className="text-[10px] font-bold text-muted-foreground opacity-50 tracking-tight">1,204명의 수신자 확인함</p>
                </div>
              </div>
              <UserCheck className="text-primary opacity-0 group-hover/target:opacity-100 transition-opacity" size={24} />
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <div className="flex-1 p-6 rounded-[0.1rem] bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <ShieldCheck size={16} />
                <span className="text-[9px] font-black tracking-tight leading-none">무결성 검증 통과</span>
              </div>
              <p className="text-[10px] font-bold text-indigo-900/40">메시지 중복 발송 방지 필터에 의해 안전하게 보호되고 있습니다.</p>
            </div>
          </div>
        </div>

        {/* Right: Content Editor */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 flex flex-col p-10 bg-card border-2 border-primary/10 rounded-[0.1rem] shadow-2xl relative group/editor">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-[0.1rem] text-primary"><Layers size={18} /></div>
                <span className="text-sm font-black tracking-tight">콘텐츠 편집기</span>
              </div>
              <Button
                variant="ghost"
                onClick={simulateAIGenerate}
                disabled={isGenerating}
                className="rounded-[0.1rem] h-10 px-6 gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-[10px] tracking-tight shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition"
              >
                {isGenerating ? <Zap size={14} className="animate-spin" /> : <Sparkles size={14} />}
                AI 콘텐츠 초안 생성
              </Button>
            </div>

            <textarea
              className="flex-1 w-full bg-transparent border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none text-xl font-bold placeholder:text-muted-foreground/10 custom-scrollbar leading-relaxed"
              placeholder="메시지 내용을 입력하거나 AI 드래프트를 활용하세요..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="pt-6 border-t border-primary/5 flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-[0.1rem] border-2"><Bot size={16} /></Button>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-[0.1rem] border-2"><Calendar size={16} /></Button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-muted-foreground opacity-40">Words: {message.length}</span>
                <Button className="h-14 px-10 rounded-[0.1rem] font-black text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-3 group/send">
                  메시지 일괄 발송 <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
              </div>
            </div>

            {isGenerating && (
              <div className="absolute inset-x-10 bottom-32 h-1 bg-muted rounded-full overflow-hidden p-0.5">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-ai-progress" />
              </div>
            )}
          </div>

          {/* Preview Banner */}
          <div className="p-6 bg-slate-900 rounded-[0.1rem] text-white flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-[0.1rem] flex items-center justify-center">
                <Zap size={18} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-tight opacity-60">비주얼 미리보기</p>
                <p className="text-sm font-bold">모바일 잠금화면 위젯 (목업)</p>
              </div>
            </div>
            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

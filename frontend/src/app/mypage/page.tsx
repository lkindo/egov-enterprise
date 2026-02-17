'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { userService } from '@/services/userService';
import { UserDto } from '@/types/user';
import { useToast } from '@/app/components/ui/toast';
import { StandardTabs } from '@/app/components/ui/standard-tabs';
import { StandardForm, FormField } from '@/app/components/ui/standard-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Settings, 
  History, 
  Shield, 
  Mail,
  Phone, 
  Briefcase,
  Edit3,
  Calendar,
  Lock,
  LogOut,
  Camera,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function MyPageDashboard() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userService.getMe();
      if (res.success) setProfile(res.data);
    } catch (error) {
      toast('프로필 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-pulse">
      <div className="w-20 h-20 bg-muted rounded-full" />
      <div className="h-8 bg-muted rounded-xl w-48" />
      <div className="h-4 bg-muted rounded-lg w-64" />
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: '활동 요약', icon: <Zap size={16} /> },
    { id: 'profile', label: '개인정보 수정', icon: <User size={16} /> },
    { id: 'password', label: '비밀번호 변경', icon: <Lock size={16} /> }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      <PageHeader 
        title="Personal Workspace" 
        breadcrumbs={[{ label: '계정 설정' }, { label: '마이페이지' }]}
        actions={
          <Button variant="outline" className="rounded-xl border-2 font-bold gap-2">
            <LogOut size={18} /> 로그아웃
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Left: Enhanced Profile Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-card border-2 border-primary/5 rounded-[3rem] shadow-2xl shadow-primary/5 overflow-hidden relative group">
            <div className="h-32 bg-slate-900 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
              <div className="absolute -right-4 -bottom-10 opacity-10 scale-[2] -rotate-12">
                <User size={100} className="text-white" />
              </div>
            </div>
            <div className="px-8 pb-8 text-center -mt-16 relative z-10">
              <div className="inline-block relative">
                <div className="w-32 h-32 rounded-[2.5rem] bg-background border-8 border-card shadow-2xl flex items-center justify-center mb-6 group-hover:rotate-3 transition-transform duration-500 overflow-hidden">
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                    <User size={64} />
                  </div>
                </div>
                <button className="absolute bottom-8 right-0 p-2 bg-primary text-white rounded-xl shadow-xl hover:scale-110 transition-all border-4 border-card">
                  <Camera size={16} />
                </button>
              </div>
              <h2 className="text-2xl font-black tracking-tighter">{profile?.userNm}</h2>
              <p className="text-sm text-muted-foreground font-medium mb-8">@{profile?.userId}</p>
              
              <div className="space-y-4 pt-6 border-t border-primary/5">
                <InfoItem icon={<Briefcase size={14} />} label="소속" value={profile?.role || '전략기획팀'} />
                <InfoItem icon={<Mail size={14} />} label="이메일" value={profile?.emailAdres || 'user@egov.go.kr'} />
                <InfoItem icon={<Phone size={14} />} label="연락처" value={profile?.moblphonNo || '010-1234-5678'} />
                <InfoItem icon={<Calendar size={14} />} label="가입일" value="2026.01.15" />
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] bg-primary/20 w-32 h-32 rounded-full blur-[60px]" />
            <div className="relative z-10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" /> Security Status
              </h3>
              <div className="space-y-1">
                <p className="text-2xl font-black">Level High</p>
                <p className="text-[10px] text-slate-400 font-bold">Your account is well protected.</p>
              </div>
              <Button variant="link" className="p-0 h-auto text-xs font-black text-primary uppercase tracking-wider hover:no-underline hover:text-white transition-colors">
                Run Audit &rarr;
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Tabbed Content Area */}
        <div className="lg:col-span-3 space-y-8">
          <StandardTabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onChange={setActiveTab} 
            className="p-1.5 bg-muted/30 rounded-[1.5rem]"
          />

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'dashboard' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard title="작성한 게시글" count={12} icon={<Edit3 size={20} />} color="blue" />
                  <StatCard title="받은 알림" count={45} icon={<History size={20} />} color="purple" />
                  <StatCard title="완료한 업무" count={8} icon={<CheckCircle2 size={20} />} color="emerald" />
                </div>

                <div className="bg-card border-2 border-primary/5 rounded-[3rem] shadow-xl overflow-hidden">
                  <div className="px-10 py-8 border-b border-primary/5 flex items-center justify-between bg-muted/5">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <Clock size={22} className="text-primary" />
                      나의 최근 활동 타임라인
                    </h3>
                    <Button variant="ghost" size="sm" className="font-bold text-xs gap-1">
                      전체보기 <ArrowRight size={14} />
                    </Button>
                  </div>
                  <div className="p-10 space-y-8">
                    <ActivityItem 
                      title="게시글 등록" 
                      desc="'2026년 상반기 혁신 전략' 글을 성공적으로 등록했습니다." 
                      time="2시간 전"
                      icon={<Edit3 size={14} />}
                      type="success"
                    />
                    <ActivityItem 
                      title="정보 수정" 
                      desc="프로필 사진 및 연락처 정보를 업데이트했습니다." 
                      time="어제"
                      icon={<User size={14} />}
                      type="info"
                    />
                    <ActivityItem 
                      title="결재 완료" 
                      desc="팀 주간 회의 비용 정산 건이 최종 승인되었습니다." 
                      time="3일 전"
                      icon={<CheckCircle2 size={14} />}
                      type="success"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-card border-2 border-primary/5 rounded-[3rem] shadow-xl p-10 md:p-16">
                <div className="mb-12 space-y-2 text-center md:text-left">
                  <h3 className="text-3xl font-black tracking-tight">개인정보 수정</h3>
                  <p className="text-muted-foreground font-medium">최신 정보를 유지하여 사내 소통을 원활하게 관리하세요.</p>
                </div>
                <StandardForm onSubmit={() => toast('저장되었습니다.', 'success')}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <FormField label="사용자 성명" required>
                      <Input defaultValue={profile?.userNm} className="h-14 rounded-2xl border-primary/10 font-bold px-6" />
                    </FormField>
                    <FormField label="이메일 주소" required>
                      <Input type="email" defaultValue={profile?.emailAdres} className="h-14 rounded-2xl border-primary/10 font-bold px-6" />
                    </FormField>
                    <FormField label="휴대전화 번호">
                      <Input defaultValue={profile?.moblphonNo} className="h-14 rounded-2xl border-primary/10 font-bold px-6" />
                    </FormField>
                    <FormField label="직급 / 부서">
                      <Input defaultValue={profile?.role || '전략기획팀'} className="h-14 rounded-2xl border-primary/10 font-bold px-6" />
                    </FormField>
                  </div>
                  <div className="flex justify-end pt-8 border-t border-primary/5">
                    <Button type="submit" size="lg" className="h-16 px-12 rounded-[1.5rem] font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                      프로필 정보 업데이트
                    </Button>
                  </div>
                </StandardForm>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="bg-card border-2 border-primary/5 rounded-[3rem] shadow-xl p-10 md:p-16 max-w-2xl">
                <div className="mb-12 space-y-2">
                  <h3 className="text-3xl font-black tracking-tight">비밀번호 변경</h3>
                  <p className="text-muted-foreground font-medium">보안을 위해 주기적으로 비밀번호를 변경하는 것을 권장합니다.</p>
                </div>
                <StandardForm onSubmit={() => toast('비밀번호가 변경되었습니다.', 'success')} className="space-y-8">
                  <FormField label="현재 비밀번호" required>
                    <Input type="password" placeholder="••••••••" className="h-14 rounded-2xl border-primary/10 px-6" />
                  </FormField>
                  <div className="h-px bg-primary/5 my-4" />
                  <FormField label="새 비밀번호" required>
                    <Input type="password" placeholder="최소 8자 이상" className="h-14 rounded-2xl border-primary/10 px-6" />
                  </FormField>
                  <FormField label="새 비밀번호 확인" required>
                    <Input type="password" placeholder="비밀번호 재입력" className="h-14 rounded-2xl border-primary/10 px-6" />
                  </FormField>
                  <div className="pt-8 flex justify-end">
                    <Button type="submit" size="lg" className="h-16 px-12 rounded-[1.5rem] font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                      비밀번호 변경 완료
                    </Button>
                  </div>
                </StandardForm>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function InfoItem({ icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between group/item">
      <div className="flex items-center gap-2.5 text-muted-foreground group-hover/item:text-primary transition-colors">
        <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

function StatCard({ title, count, icon, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5",
    purple: "bg-purple-50 text-purple-600 border-purple-100 shadow-purple-500/5",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5"
  };

  return (
    <div className={cn("p-8 rounded-[2.5rem] border-2 bg-card shadow-xl transition-all hover:-translate-y-1 duration-300", colorMap[color])}>
      <div className="flex justify-between items-start mb-6">
        <div className="p-3.5 rounded-2xl bg-white shadow-inner">{icon}</div>
        <span className="text-4xl font-black tracking-tighter">{count}</span>
      </div>
      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{title}</p>
    </div>
  );
}

function ActivityItem({ title, desc, time, icon, type }: any) {
  return (
    <div className="flex gap-6 relative group/activity">
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative z-10 group-hover/activity:scale-110 transition-transform",
          type === 'success' ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
        )}>
          {icon}
        </div>
        <div className="w-0.5 h-full bg-primary/5 absolute top-10" />
      </div>
      <div className="pb-8 space-y-1">
        <div className="flex items-center gap-3">
          <h4 className="font-black text-lg tracking-tight">{title}</h4>
          <span className="text-[10px] font-bold text-muted-foreground/40 bg-muted px-2 py-0.5 rounded-md">{time}</span>
        </div>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xl">{desc}</p>
      </div>
    </div>
  );
}

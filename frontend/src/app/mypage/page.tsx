'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { userService } from '@/services/userService';
import { UserDto } from '@/types/user';
import { useToast } from '@/app/components/ui/toast';
import { 
  User, 
  Settings, 
  History, 
  ShieldLock, 
  Mail, 
  Phone, 
  Briefcase,
  Edit3
} from 'lucide-react';
import Link from 'next/link';

export default function MyPageDashboard() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await userService.getMe();
        if (res.success) setProfile(res.data);
      } catch (error) {
        toast('프로필 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [toast]);

  if (loading) return <div className="p-12 text-center animate-pulse font-medium">로딩 중...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader 
        title="마이페이지" 
        breadcrumbs={[{ label: '사용자' }, { label: '마이페이지' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="h-24 bg-primary/10" />
            <div className="px-6 pb-6 text-center -mt-12">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-background border-4 border-card shadow-md mb-4">
                <User size={48} className="text-primary" />
              </div>
              <h2 className="text-xl font-black">{profile?.userNm}</h2>
              <p className="text-sm text-muted-foreground font-medium mb-6">@{profile?.userId}</p>
              
              <Link 
                href="/mypage/profile"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm"
              >
                <Edit3 size={16} /> 프로필 수정
              </Link>
            </div>
            
            <div className="border-t px-6 py-4 space-y-3">
              <InfoRow icon={<Briefcase size={14} />} label="소속" value={profile?.role || '일반사용자'} />
              <InfoRow icon={<Mail size={14} />} label="이메일" value={profile?.emailAdres || '미등록'} />
              <InfoRow icon={<Phone size={14} />} label="연락처" value={profile?.moblphonNo || '미등록'} />
            </div>
          </div>

          <div className="p-6 bg-muted/20 border border-dashed rounded-2xl space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ShieldLock size={16} className="text-primary" /> 보안 설정
            </h3>
            <Link 
              href="/mypage/password"
              className="block text-xs font-bold text-primary hover:underline"
            >
              비밀번호 변경하기 &rarr;
            </Link>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <ActivityCard title="작성한 게시글" count={5} icon={<Edit3 className="text-blue-500" />} />
            <ActivityCard title="나의 알림" count={12} icon={<History className="text-purple-500" />} />
          </div>

          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/5">
              <h3 className="font-bold flex items-center gap-2">
                <History size={18} className="text-primary" />
                최근 활동 이력
              </h3>
            </div>
            <div className="p-12 text-center text-muted-foreground italic text-sm">
              최근 활동 이력이 없습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground font-medium">
        {icon} <span>{label}</span>
      </div>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function ActivityCard({ title, count, icon }: { title: string, count: number, icon: any }) {
  return (
    <div className="p-6 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-center mb-4">
        <div className="p-2.5 rounded-lg bg-muted/50">{icon}</div>
        <span className="text-2xl font-black text-foreground">{count}</span>
      </div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
    </div>
  );
}

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { Button } from '@/components/ui/button';
import { Users,  
  ShieldCheck,  
  Calendar, 
  ChevronLeft, 
  ArrowUpRight, 
  MessageSquare, 
  Globe, 
  Settings, 
  UserPlus, 
  Share2, 
  BookOpen, 
  Info } from 'lucide-react';
;
;
import { communityService } from '@/services/business/community/communityService';
import { CommunityVO } from '@/types/business/community';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function CommunityDetailHubClient({ 
  id,
  initialData 
}: { 
  id: string;
  initialData: CommunityVO 
}) {

  const { data: community } = useQuery({
    queryKey: ['community', id],
    queryFn: () => communityService.getCommunity(id),
    initialData: initialData
  });

  if (!community) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-[var(--gap-hub-section)] pb-24 animate-in fade-in duration-1000">
        <PageHeader
          title={community.cmntyNm}
          breadcrumbs={[{ label: '협업 서비스' }, { label: '커뮤니티 공간', href: '/cop/cmy/selectCommunityList' }, { label: '상세 정보' }]}
          actions={
            <Link href="/cop/cmy/selectCommunityList">
              <Button variant="outline" className="h-12 gap-3 font-bold border-2 rounded-[var(--radius-hub-item)] hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all tracking-tight text-xs">
                <ChevronLeft size={16} /> 목록으로 돌아가기
              </Button>
            </Link>
          }
        />

        <HubHeader
          title="Space"
          highlight="Detail"
          subtitle={`IDENTITY NODE: ${id}`}
          icon={Globe}
          actions={
            <div className="flex gap-4 p-2 items-center">
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="lg" aria-label="커뮤니티 공유하기" className="h-11 w-14 rounded-[var(--radius-hub-item)] bg-white border-2 border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95">
                    <Share2 size={22} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-[var(--radius-hub-item)] px-4 py-2 text-xs font-bold tracking-tight">
                  커뮤니티 공유하기
                </TooltipContent>
              </Tooltip>

              <Button 
                size="lg" 
                className="h-11 px-10 rounded-[var(--radius-hub-item)] bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
              >
                <UserPlus size={20} />
                커뮤니티 가입 신청
                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-12 gap-[var(--gap-hub-section)]">
          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-8 space-y-[var(--gap-hub-section)]">
            <HubSectionCard
              title="Overview & Intelligence"
              description="커뮤니티의 비전과 주요 운영 정보를 확인하세요"
              icon={Info}
            >
              <div className="space-y-[var(--gap-hub-section)] py-6">
                <div className="space-y-6">
                   <h3 className="text-xs font-bold text-primary tracking-tight">_ Introduction_cn</h3>
                   <div className="p-10 bg-muted border-2 border-border rounded-[var(--radius-hub-widget)] shadow-inner relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6 text-primary">
                        <BookOpen size={120} />
                      </div>
                      <p className="text-2xl font-bold tracking-tighter text-foreground leading-relaxed relative z-10">
                        "{community.cmntyIntroCn || '등록된 소개 정보가 정의되지 않았습니다.'}"
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <DetailBlock icon={<ShieldCheck size={18} />} label="Operational Manager" value={community.frstRegisterNm || 'System_Admin'} />
                  <DetailBlock icon={<Calendar size={18} />} label="Initialization Date" value={community.crtDt?.substring(0, 10) || 'Unknown'} />
                  <DetailBlock icon={<Users size={18} />} label="Member Count" value="42_Active_Entities" />
                  <DetailBlock icon={<Globe size={18} />} label="Visibility Protocol" value={community.useYn === 'Y' ? 'PUBLIC_ACCESS' : 'PRIVATE_NODE'} />
                </div>
              </div>
            </HubSectionCard>

            <HubSectionCard
              title="Knowledge Stream"
              description="커뮤니티 내에서 공유된 최신 지식 자산 목록입니다"
              icon={MessageSquare}
            >
              <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-[var(--radius-hub-section)] bg-muted/30">
                <div className="w-20 h-11 bg-white border-2 border-border rounded-[var(--radius-hub-item)] flex items-center justify-center text-muted-foreground shadow-xl mb-8 group-hover:rotate-12 transition-transform">
                  <BookOpen size={32} />
                </div>
                <h4 className="text-xl font-bold text-muted-foreground tracking-tighter">_ No_Posts_Detected</h4>
                <p className="text-xs font-bold text-muted-foreground tracking-tight mt-4">해당 커뮤니티에 등록된 게시글이 없습니다</p>
              </div>
            </HubSectionCard>
          </div>

          {/* Sidebar Area */}
          <div className="col-span-12 lg:col-span-4 space-y-[var(--gap-hub-section)]">
            <div className="rounded-[var(--radius-hub-section)] bg-surface-inverse text-surface-inverse-foreground p-12 space-y-10 shadow-2xl relative overflow-hidden group border-none">
              <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                <Settings size={240} className="text-primary" />
              </div>
              <div className="relative z-10 space-y-8 text-center">
                <div className="w-20 h-11 bg-white/10 rounded-[var(--radius-hub-item)] flex items-center justify-center mx-auto border border-white/5 shadow-inner group-hover:rotate-12 transition-transform">
                  <ShieldCheck size={40} className="text-primary" />
                </div>
                <div className="space-y-4">
                  <h4 className="text-2xl font-bold tracking-tighter leading-tight">_ SECURITY<br />POLICY</h4>
                  <p className="text-xs text-white/60 font-bold tracking-tight leading-relaxed">가입 승인 필요<br />내부 임직원 전용</p>
                </div>
                <Button className="w-full h-11 bg-white text-foreground rounded-[var(--radius-hub-item)] font-bold text-xs tracking-tight hover:bg-primary hover:text-white transition-all shadow-xl group">
                  ADMIN_PANEL_LOGIN <ChevronLeft size={16} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

            <div className="hub-glass-premium rounded-[var(--radius-hub-section)] p-10 space-y-10 border-2 border-border shadow-2xl relative overflow-hidden group">
               <div className="flex items-center justify-between border-b border-border/50 pb-6">
                  <h4 className="text-sm font-bold text-foreground tracking-tighter">_ Member_Pulse</h4>
                  <span className="text-xs font-bold text-primary tracking-tight">Live</span>
               </div>
               <div className="space-y-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center justify-between group/user">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[var(--radius-hub-item)] bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs group-hover/user:bg-surface-inverse group-hover/user:text-surface-inverse-foreground transition-all">
                          ID
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground tracking-tight">_ Active_Entity_{i}</p>
                          <p className="text-xs text-muted-foreground font-bold tracking-tight">Connected</p>
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                  ))}
               </div>
               <Button variant="ghost" className="w-full h-12 text-xs font-bold text-muted-foreground tracking-tight hover:text-primary transition-colors">
                  VIEW_ALL_ENTITIES <ArrowUpRight size={14} className="ml-2" />
               </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function DetailBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-8 rounded-[var(--radius-hub-widget)] bg-muted border border-border transition-all hover:bg-white hover:shadow-2xl hover:scale-[1.03] group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6 text-primary">
        {icon}
      </div>
      <h5 className="text-xs font-bold text-muted-foreground tracking-tight flex items-center gap-3 mb-4 relative z-10">
        {icon} {label}
      </h5>
      <p className="text-xl font-bold tracking-tighter text-foreground truncate relative z-10">
        {value}
      </p>
    </div>
  );
}

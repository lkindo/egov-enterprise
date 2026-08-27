'use client';

import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { Button } from '@/components/ui/button';
import { ShieldCheck,  
  Calendar, 
  ChevronLeft, 
  MessageSquare, 
  Globe, 
  Settings, 
  UserPlus, 
  BookOpen, 
  Info } from 'lucide-react';
;
;
import { communityService } from '@/services/business/community/communityService';
import { communityUserService } from '@/services/business/user/community/CommunityUserService';
import { useToast } from '@/app/components/ui/toast';
import { CommunityVO } from '@/types/business/community';
import Link from 'next/link';
import { TooltipProvider } from "@/components/ui/tooltip";

export default function CommunityDetailHubClient({ 
  cmntySn,
  initialData 
}: { 
  cmntySn: number;
  initialData: CommunityVO 
}) {

  const { toast } = useToast();
  const joinPendingRef = React.useRef(false);
  const [isJoining, setJoining] = React.useState(false);

  const { data: community } = useQuery({
    queryKey: ['community', cmntySn],
    queryFn: () => communityService.getCommunity(cmntySn),
    initialData: initialData
  });

  /**
   * 커뮤니티 가입 신청.
   *
   * 서버는 상태 위반을 구분해 돌려준다 — 비활성 커뮤니티는 409(RESOURCE_IN_USE),
   * 이미 가입/신청 중이면 409(DUPLICATE_RESOURCE). 그래서 성공·실패를 같은 문구로 뭉개지 않고
   * 서버 메시지를 그대로 보여 준다(A3 금지 항목과 같은 규율).
   */
  const joinMutation = useMutation({
    mutationFn: () => communityUserService.joinCommunity(cmntySn),
    onSuccess: () => toast('가입을 신청했습니다. 관리자 승인 후 이용할 수 있습니다.', 'success'),
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : '';
      toast(message || '가입 신청 중 오류가 발생했습니다.', 'error');
    },
  });

  const handleJoin = async () => {
    if (joinPendingRef.current) return;
    joinPendingRef.current = true;
    setJoining(true);
    try {
      await joinMutation.mutateAsync();
    } catch {
      // mutation onError가 실패 안내를 소유하며 상세 화면은 그대로 유지한다.
    } finally {
      joinPendingRef.current = false;
      setJoining(false);
    }
  };

  if (!community) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-[var(--gap-hub-section)] pb-24">
        <PageHeader
          title={community.cmntyNm}
          breadcrumbs={[{ label: '협업 서비스' }, { label: '커뮤니티 공간', href: '/cop/cmy/selectCommunityList' }, { label: '상세 정보' }]}
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/cop/cmy/selectCommunityList">
                  <ChevronLeft size={16} aria-hidden="true" /> 목록으로 돌아가기
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={() => { void handleJoin(); }}
                disabled={isJoining}
                aria-busy={isJoining || undefined}
                aria-label={isJoining ? '커뮤니티 가입 신청 중' : '커뮤니티 가입 신청'}
              >
                <UserPlus size={16} aria-hidden="true" />
                {isJoining ? '신청 중…' : '커뮤니티 가입 신청'}
              </Button>
            </div>
          }
        />

        {/* [2026-08-26] 페이지 헤더가 두 겹이었다 — PageHeader 아래 HubHeader(`Space Detail` +
            `IDENTITY NODE: n` 문구)가 한 번 더 있었다. 거기 붙어 있던 두 버튼은 **onClick 이 없는
            죽은 컨트롤**이었다(G10). 공유 기능은 정의된 적이 없어 삭제하고, 가입 신청은 실제
            API(`POST /communities/{cmntySn}/join`)가 있으므로 페이지 헤더에서 배선한다. */}

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
                  {/*
                    [2026-08-28] 'Member Count 42_Active_Entities' 제거.
                    **회원 수를 내려주는 API 가 없다** — /api/v1/communities 는 목록·상세·join 3개뿐이고
                    CommunityDto 에 회원 수 필드가 없다(실측). 고정 문자열을 실측값처럼 보여 주면
                    관리자가 그 숫자를 근거로 판단한다. 값을 지어내는 대신 노출하지 않는다.
                  */}
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
                <div className="w-20 h-11 bg-card border-2 border-border rounded-[var(--radius-hub-item)] flex items-center justify-center text-muted-foreground shadow-xl mb-8 group-hover:rotate-12 transition-transform">
                  <BookOpen size={32} />
                </div>
                {/*
                  [2026-08-28] '등록된 게시글이 없습니다' → 미제공 고지.
                  이 섹션은 **어떤 조회도 하지 않는다.** 그런데 '게시글이 없다'고 단정해,
                  실제로 글이 있는 커뮤니티에서도 비었다고 말했다. 커뮤니티별 게시글을 내려주는
                  경로가 아직 없으므로(BoardMasterRepository 의 커뮤니티 조회는 미노출),
                  없다고 말하는 대신 아직 제공되지 않는다고 말한다.
                */}
                <h4 className="text-xl font-bold text-muted-foreground tracking-tighter">_ Not_Available</h4>
                <p className="text-xs font-bold text-muted-foreground tracking-tight mt-4">커뮤니티별 게시글 목록은 아직 제공되지 않습니다</p>
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
                {/*
                  [2026-08-28] 'ADMIN_PANEL_LOGIN' 버튼 제거 — onClick·href 가 없어 눌러도 아무 일이
                  일어나지 않았고, 가리키던 대상 라우트가 정의된 적도 없다.
                */}
              </div>
            </div>

            {/*
              [2026-08-28] 'Member_Pulse' 패널 통째 제거.
              하드코딩한 다섯 명(_ Active_Entity_1~5)을 'Live' 라벨과 초록 점으로 **접속 중인 실제
              회원처럼** 보여 주고 있었다. 회원 목록을 내려주는 API 는 없고
              (CommunityUserRepository.findByIdCmntySn 은 main 소스에서 호출자 0건),
              'VIEW_ALL_ENTITIES' 버튼도 onClick·href 가 없어 죽어 있었다.
              실측 데이터가 생기면 그때 되살린다 — 지금은 없는 것을 있는 척하지 않는다.
            */}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function DetailBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-8 rounded-[var(--radius-hub-widget)] bg-muted border border-border transition-all hover:bg-card hover:shadow-2xl hover:scale-[1.03] group relative overflow-hidden">
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

'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const joinPendingRef = React.useRef(false);
  const [isJoining, setJoining] = React.useState(false);

  const { data: community } = useQuery({
    queryKey: ['community', cmntySn],
    queryFn: () => communityService.getCommunity(cmntySn),
    initialData: initialData
  });

  /**
   * [2026-09-06 DEC-OPS-043] 내 멤버십 상태. 승인 절차가 생겼으므로(관리자 '커뮤니티 관리 → 회원 관리') 화면이
   * 신청 뒤 상태를 말할 수 있다 — NONE 이면 신청 버튼, REQUESTED 면 '승인 대기', MEMBER 면 '회원'.
   * 아직 모르는 동안(로딩·조회 실패)은 버튼을 연다: 서버가 중복·비활성을 409 로 막으므로 열어 두는 쪽이 안전하고,
   * 조회 실패 하나로 가입 경로를 닫지 않기 위해서다.
   */
  const { data: membership } = useQuery({
    queryKey: ['community-membership', cmntySn],
    queryFn: () => communityUserService.getMyMembership(cmntySn),
  });
  const membershipStatus = membership?.status;

  /*
    [2026-09-08 PD-CMTY-001] 회원 자격이 처음으로 여는 기능 — 커뮤니티 귀속 게시판 목록.

    종전에는 이 화면의 '커뮤니티 게시글' 섹션이 아무 조회도 하지 않고 '아직 제공되지 않습니다'
    라고만 말했다. `tb_bbs_master.cmnty_sn` 과 `findByCmntySnAndUseYn` 은 있었지만 호출자가
    0 이었다(GAP-CMTY-001). 이제 서버가 승인된 회원에게만 목록을 내려준다.

    회원이 아닐 때는 **조회 자체를 하지 않는다** — 서버가 403 을 줄 것이 확실한 요청을 보내
    콘솔에 오류를 남길 이유가 없고, 화면은 어차피 안내를 보여 준다.
  */
  const canSeeBoards = membershipStatus === 'MEMBER';
  const {
    data: boards,
    isLoading: isBoardsLoading,
    error: boardsError,
  } = useQuery({
    queryKey: ['community-boards', cmntySn],
    queryFn: () => communityUserService.getCommunityBoards(cmntySn),
    enabled: canSeeBoards,
  });

  /**
   * 커뮤니티 가입 신청.
   *
   * 서버는 상태 위반을 구분해 돌려준다 — 비활성 커뮤니티는 409(RESOURCE_IN_USE),
   * 이미 가입/신청 중이면 409(DUPLICATE_RESOURCE). 그래서 성공·실패를 같은 문구로 뭉개지 않고
   * 서버 메시지를 그대로 보여 준다(A3 금지 항목과 같은 규율).
   *
   * [2026-08-28] 성공 문구에서 '관리자 승인 후 이용할 수 있습니다' 를 뺐었다 — 당시에는 그 승인 절차가
   * 존재하지 않았다(가입이 만드는 `mbrSttsCd='A'` 를 읽거나 옮기는 코드가 0건).
   * [2026-09-06 DEC-OPS-043] 승인·반려 API 와 관리자 화면이 생겨 이제는 사실이다 — 문구를 되살리되
   * 화면이 실제로 하는 일만 말한다(관리자가 승인하면 회원이 된다). 회원이 되어도 열리는 기능은 아직 없으므로
   * '이용할 수 있다' 고는 말하지 않는다.
   */
  const joinMutation = useMutation({
    mutationFn: () => communityUserService.joinCommunity(cmntySn),
    onSuccess: () => {
      toast('가입을 신청했습니다. 관리자가 승인하면 회원이 됩니다.', 'success');
      void queryClient.invalidateQueries({ queryKey: ['community-membership', cmntySn] });
    },
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
              {membershipStatus === 'REQUESTED' ? (
                <span role="status" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-warning/10 px-3 text-xs font-bold text-warning-emphasis">
                  <UserPlus size={16} aria-hidden="true" /> 가입 승인 대기 중
                </span>
              ) : membershipStatus === 'MEMBER' ? (
                <span role="status" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-success/10 px-3 text-xs font-bold text-success-emphasis">
                  <ShieldCheck size={16} aria-hidden="true" /> 회원
                </span>
              ) : membershipStatus === 'UNKNOWN' ? (
                <span role="status" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted px-3 text-xs font-bold text-muted-foreground">
                  멤버십 상태 확인 필요
                </span>
              ) : (
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
              )}
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
            {/* [2026-08-28] 영문·의사코드 라벨을 업무 문구로 정정한다(ADR-0002 한국어 우선). */}
            <HubSectionCard
              title="커뮤니티 소개"
              description="커뮤니티 소개와 등록 정보입니다"
              icon={Info}
            >
              <div className="space-y-[var(--gap-hub-section)] py-6">
                <div className="space-y-6">
                   <h3 className="text-xs font-bold text-primary tracking-tight">소개</h3>
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
                  {/*
                    [2026-08-28] 'Operational Manager = frstRegisterNm || System_Admin' 을 걷어냈다.
                    **서버는 frstRegisterNm 을 어떤 경로에서도 채우지 않는다** — CommunityDto.from()
                    이 frstRgtrId 만 매핑하고 그 필드는 빌더에서 빠져 있다(목록·상세·포틀릿 모두
                    같은 from() 을 쓴다). 그래서 모든 커뮤니티가 'System_Admin' 으로 보였다 —
                    바로 옆에서 지운 '42_Active_Entities' 와 정확히 같은 부류의 지어낸 값이다.
                    서버가 실제로 채우는 등록자 ID(BaseEntity 규약상 loginId)를 그대로 보여 준다.
                  */}
                  <DetailBlock icon={<ShieldCheck size={18} />} label="등록자" value={community.frstRgtrId || '알 수 없음'} />
                  <DetailBlock icon={<Calendar size={18} />} label="등록일" value={community.crtDt?.substring(0, 10) || '알 수 없음'} />
                  {/*
                    [2026-08-28] 'Member Count 42_Active_Entities' 제거.
                    **회원 수를 내려주는 API 가 없다** — /api/v1/communities 는 목록·상세·join 3개뿐이고
                    CommunityDto 에 회원 수 필드가 없다(실측). 고정 문자열을 실측값처럼 보여 주면
                    관리자가 그 숫자를 근거로 판단한다. 값을 지어내는 대신 노출하지 않는다.
                  */}
                  <DetailBlock icon={<Globe size={18} />} label="사용 여부" value={community.useYn === 'Y' ? '사용' : '미사용'} />
                </div>
              </div>
            </HubSectionCard>

            {/*
              [2026-09-08 PD-CMTY-001] '아직 제공되지 않습니다' 를 실제 목록으로 바꾼다.
              [2026-08-28] 그 이전에는 '등록된 게시글이 없습니다' 라고 단정했는데 이 섹션은 어떤
              조회도 하지 않았다 — 글이 있는 커뮤니티에서도 비었다고 말했다. 지금은 조회하고,
              조회할 수 없는 사람에게는 그 이유를 말한다.
            */}
            <HubSectionCard
              title="커뮤니티 게시판"
              description="이 커뮤니티에 귀속된 게시판입니다. 회원만 볼 수 있습니다."
              icon={MessageSquare}
            >
              {!canSeeBoards ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center border-2 border-dashed border-border rounded-[var(--radius-hub-section)] bg-muted/30">
                  <BookOpen size={32} className="text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-bold text-muted-foreground">
                    {membershipStatus === 'REQUESTED'
                      ? '가입 승인을 기다리는 중입니다. 승인되면 이 커뮤니티의 게시판이 보입니다.'
                      : '이 커뮤니티의 게시판은 승인된 회원만 볼 수 있습니다.'}
                  </p>
                </div>
              ) : isBoardsLoading ? (
                <p className="py-16 text-center text-sm text-muted-foreground">게시판을 불러오는 중…</p>
              ) : boardsError ? (
                <p role="alert" className="py-16 text-center text-sm font-bold text-destructive-emphasis">
                  게시판 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </p>
              ) : (boards ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center border-2 border-dashed border-border rounded-[var(--radius-hub-section)] bg-muted/30">
                  <BookOpen size={32} className="text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-bold text-muted-foreground">이 커뮤니티에 등록된 게시판이 없습니다.</p>
                </div>
              ) : (
                <ul className="space-y-3 py-4">
                  {(boards ?? []).map((board) => (
                    <li key={board.bbsId}>
                      <Link
                        href={`/admin/community/boards/select-board-list?bbsId=${encodeURIComponent(board.bbsId)}`}
                        className="flex items-center gap-4 rounded-[var(--radius-hub-widget)] border border-border bg-card px-6 py-4 transition-all hover:bg-muted"
                      >
                        <BookOpen size={20} className="shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-foreground">
                            {board.bbsTtl || board.bbsId}
                          </span>
                          {board.bbsExpln ? (
                            <span className="block truncate text-xs text-muted-foreground">{board.bbsExpln}</span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
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
                  {/*
                    [2026-08-28] '_ SECURITY POLICY / 가입 승인 필요 / 내부 임직원 전용' 을 걷어냈다.
                    당시에는 승인 절차가 없었고, '내부 임직원 전용' 을 집행하는 게이트도 없었다(가입 API 는
                    인증 사용자면 통과한다 — 지금도 그렇다).
                    [2026-09-06 DEC-OPS-043] 승인 절차가 생겼다(관리자 '커뮤니티 관리 → 회원 관리'). 화면은
                    실제 절차만 말한다 — 임직원 전용 같은 집행되지 않는 정책은 여전히 표방하지 않는다.
                  */}
                  <h4 className="text-2xl font-bold tracking-tight leading-tight">가입 신청</h4>
                  <p className="text-xs text-white/60 font-bold tracking-tight leading-relaxed">
                    {membershipStatus === 'MEMBER'
                      ? '이 커뮤니티의 회원입니다.'
                      : membershipStatus === 'REQUESTED'
                        ? '가입 신청이 접수되었습니다. 관리자가 승인하면 회원이 됩니다.'
                        : '신청하면 관리자가 검토해 승인하거나 반려합니다.'}
                    <br />
                    {/* [2026-09-08 PD-CMTY-001] 회원 전용 게시판이 생겼으므로 미제공 고지를 걷는다. */}
                    회원이 되면 이 커뮤니티에 귀속된 게시판을 이용할 수 있습니다.
                  </p>
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

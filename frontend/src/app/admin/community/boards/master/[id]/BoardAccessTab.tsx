'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/app/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import { handOffMenuFocus, handOffScreen, type HandoffReturn } from '@/lib/navigation/target-handoff';
import {
  boardMenuRoute,
  findBoardMenuLinks,
  publicationReadiness,
  type BoardEntryPaths,
  type BoardMenuLink,
  type CheckState,
  type GroupSource,
  type MenuExposure,
  type ReadinessWarning,
} from '@/lib/board/board-menu-links';
import type { BoardMasterDetail } from '@/services/foundation/system/BoardAdminService';
import { boardOperationsHref } from '../board-operations-tabs';
import { HOME_CARD_LABELS, boardAudience, boardCommunityOf, knowledgeTabLabel } from '../board-usage';
import { useBoardAccessSources } from '../useBoardAccessSources';

/**
 * 게시판 운영 화면의 메뉴·접근 탭(ADR-0040 결정 8·§5.6). 메뉴 연결과 그룹 표시는 계산해 보이기만 하고, 바꾸기는 메뉴 관리에서
 * 한다 — 연결된 메뉴는 그 메뉴를 고른 상태로 메뉴 관리를 연다(menu-focus 인계). 메뉴 원장(MENU_READ)·그룹(AUTHRT_READ)을 읽을
 * 권한이 없으면 "확인 권한 없음", 조회에 실패하면 "확인 불가" 로 보이고 연결 없음·모두에게 보임으로 추정하지 않는다.
 *
 * [2026-10-26 ADR-0043 결정 1·3] 공개 준비는 '사용 중 + 이용자가 찾는 길 하나 이상'이다. 항목마다 고치는 곳으로 가는 동작을 두고,
 * 이용자가 이미 닿는 길(통합 검색·업무 홈 카드·지식 허브 탭·커뮤니티 화면)을 따로 보인다. 연결된 메뉴가 없으면 '메뉴에 붙이기'
 * 로 게시판 이용 화면 주소·이름·돌아갈 곳을 메뉴 관리에 넘긴다 — 메뉴 저장은 메뉴 관리의 구조 저장이 권한을 집행한다. 커뮤니티
 * 귀속 게시판은 메뉴 대신 커뮤니티 화면이 입구다.
 */
const READINESS_RETURN_LABEL = '게시판 공개 준비로 돌아가기';

const CHECK_NAMES: Readonly<Record<string, string>> = {
  'board-in-use': '게시판 사용',
  'entry-path': '이용자가 찾는 길',
  'edit-permission': '지정 게시판 편집 권한 배정',
};

const WARNING_TEXT: Readonly<Record<ReadinessWarning, string>> = {
  'community-general-menu': '커뮤니티 귀속 게시판인데 일반 그룹에 보이는 메뉴가 있습니다. 회원이 아닌 사용자는 그 메뉴로 들어와도 거부됩니다 — 입구는 커뮤니티 화면입니다.',
  'closed-board-general-menu': '사용 안 함 게시판인데 일반 그룹에 보이는 활성 메뉴가 있습니다. 이용자에게는 열리지 않는 메뉴가 보입니다.',
};

/** 찾는 길로 센 것들의 이름(공개 준비 통과 설명). 귀속이 아닌 게시판만 쓴다. */
function foundPathNames(paths: BoardEntryPaths): string[] {
  return [
    ...(paths.generalMenu === 'pass' ? ['일반 그룹에 보이는 메뉴'] : []),
    ...paths.hubTabs.map((tab) => `지식 허브 ${knowledgeTabLabel(tab)} 탭`),
    ...paths.homeCards.map((card) => HOME_CARD_LABELS[card] ?? card),
  ];
}

const STATE_LABEL: Readonly<Record<CheckState, string>> = {
  pass: '통과',
  fail: '통과하지 못함',
  unknown: '확인 불가',
  'not-applicable': '해당 없음',
};

const READINESS_LABEL = { pass: '공개 준비 통과', fail: '공개 준비 통과하지 못함', unknown: '공개 준비 확인 불가' } as const;

/**
 * 게시글 권한(모든 게시판 공통). 추가 조건은 이 게시판의 사정에 따라 덧붙인다 — 서버 판정과 같게 둔다(BoardService).
 *  · codes: 동작에 **모두** 필요한 권한이다. 엔드포인트 권한(BOARD_UPDATE 등)과 대행 권한(…_ALL)은 따로 판정되고 대행 권한이
 *    기본 권한을 포함하지 않는다(operation-bindings·PermissionPolicy).
 *  · community: 커뮤니티 귀속 게시판이면 승인 회원이어야 한다. 조회 대행 권한(BOARD_READ_ALL) 보유자는 면제다(assertCommunityAccess).
 *  · specialEdit: 공지·FAQ 지정 게시판이면 그 편집 권한이 더 필요하다 — 쓰기 판정(loadWritableMaster)을 지나는 동작이다.
 * [2026-10-23 ADR-0040 결정 3] 게시 기간은 시작일·종료일 모두 집행한다 — 시작일 전·종료일 뒤 글은 글쓴이 본인과 조회 대행 권한자만 본다.
 *  운영 화면의 처리(게시 기간 바꾸기·상단 고정)는 관리 API(/api/v1/admin/**)라 관리자 역할도 있어야 한다(URL 게이트, R-10).
 * [2026-10-23 ADR-0040 결정 6·7] 추천은 게시판이 추천을 받을 때만, 추천 취소는 설정과 무관하게 된다. 비밀글 정책이 필수인 게시판은 서버가
 *  저장하는 글(새 글과 고친 글)을 늘 비밀글로 만든다(BoardPolicySupport.resolveSecretYn).
 */
const READ_ALL_EXEMPTS_UNUSED = '(조회 대행 권한이 있으면 사용 안 함 게시판에도)';
const OPERATIONS_SCREEN_ONLY = '운영 화면(관리 화면 경로라 관리자 역할도 필요)';
const POST_PERMISSIONS: readonly { action: string; codes: string[]; condition: string; community: boolean; specialEdit: boolean }[] = [
  { action: '글 보기', codes: ['BOARD_READ'], condition: '게시판 사용 중, 게시 기간 안(시작일 전·종료일 뒤 글은 글쓴이 본인만), 비밀글은 글쓴이 본인만', community: true, specialEdit: false },
  { action: '공개 FAQ 보기(FAQ 지정 게시판)', codes: ['BOARD_READ'], condition: 'FAQ 게시판 사용 중, 게시 기간 안, 비밀글이 아닌 글만', community: false, specialEdit: false },
  { action: '글 쓰기', codes: ['BOARD_CREATE'], condition: `게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}, 시작일이 오늘보다 뒤면 게시판이 예약 게시를 받아야 함, 비밀글 정책이 필수면 비밀글로 저장(고칠 때도)`, community: true, specialEdit: true },
  { action: '내 글 고치기·해결 표시', codes: ['BOARD_UPDATE'], condition: `글쓴이 본인, 게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}, 게시가 시작된 글의 시작일은 게시글 전체 수정 권한(BOARD_UPDATE_ALL)도 있어야 바꿈`, community: true, specialEdit: true },
  { action: '내 글 지우기', codes: ['BOARD_DELETE'], condition: `글쓴이 본인, 게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: true },
  { action: '남의 글 고치기', codes: ['BOARD_UPDATE', 'BOARD_UPDATE_ALL'], condition: `게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: true },
  { action: '남의 글 지우기', codes: ['BOARD_DELETE', 'BOARD_DELETE_ALL'], condition: `게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: true },
  { action: '게시 기간 바꾸기(운영 화면)', codes: ['BOARD_UPDATE_ALL'], condition: `${OPERATIONS_SCREEN_ONLY}, 오늘보다 이른 종료일은 받지 않음, 예약 게시를 받지 않는 게시판은 미래 시작일을 받지 않음`, community: true, specialEdit: true },
  // [2026-10-23 ADR-0040 결정 5] 상단 고정은 새 권한(BOARD_PIN, 기본 배정 없음)이다. 설정은 새 고정만 막고 해제는 늘 된다(결정 6).
  { action: '상단 고정·해제(운영 화면)', codes: ['BOARD_PIN'], condition: `${OPERATIONS_SCREEN_ONLY}, 고정은 게시판이 상단 고정을 받을 때 상한까지(해제는 늘 가능), 원글만, 오늘보다 이른 고정 종료일은 받지 않음`, community: true, specialEdit: true },
  { action: '비밀글·예약·게시 종료 글·사용 안 함 게시판 보기', codes: ['BOARD_READ', 'BOARD_READ_ALL'], condition: '비밀글·예약·게시 종료 글은 글쓴이 본인도 본다. 사용 안 함 게시판은 이 권한으로만 본다. 커뮤니티 회원이 아니어도 된다', community: false, specialEdit: false },
  { action: '삭제 글 보기(상세만)', codes: ['BOARD_READ', 'BOARD_READ_ALL'], condition: '—', community: false, specialEdit: false },
  { action: '추천', codes: ['BOARD_LIKE'], condition: '게시판 사용 중, 게시판이 추천을 받음, 글을 볼 수 있어야 함, 한 사람당 한 번', community: true, specialEdit: false },
  // [2026-10-23 ADR-0040 결정 6] 추천 취소는 추천과 같은 권한이다. 추천을 받지 않는 게시판에서도 내 추천은 거둔다(서버가 설정을 보지 않는다).
  { action: '내 추천 취소', codes: ['BOARD_LIKE'], condition: '게시판 사용 중, 글을 볼 수 있어야 함, 내가 한 추천만(추천을 받지 않는 게시판에서도 가능)', community: true, specialEdit: false },
  { action: '댓글 보기', codes: ['COMMENT_READ'], condition: `글을 볼 수 있어야 함${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: false },
  { action: '댓글 쓰기', codes: ['COMMENT_CREATE'], condition: '게시판 사용 중, 글을 볼 수 있어야 함, 게시판이 댓글을 받음', community: true, specialEdit: false },
];

function exposureText(exposure: MenuExposure): string {
  switch (exposure.kind) {
    case 'inactive': return '— (메뉴 비활성)';
    case 'hidden': return '어느 그룹에도 보이지 않음';
    case 'admin-only': return `관리자 그룹만: ${exposure.groups.join(', ')}`;
    case 'general': return `일반 그룹 표시: ${exposure.groups.join(', ')}`;
    case 'no-permission': return '확인 권한 없음';
    case 'unknown': return '확인 불가';
  }
}

function basisText(link: BoardMenuLink): string {
  if (link.basis.kind === 'board-address') return '게시판 주소';
  if (link.basis.kind === 'hub-tab') return `허브 탭 ?tab=${link.basis.tab}`;
  return '허브 기본 탭(확인 불가 — 기본 탭은 화면이 정함)';
}

function groupsHolding(groupSource: GroupSource | null, codes: readonly string[]): string {
  if (groupSource === null) return '확인하는 중…';
  if (groupSource.status === 'no-permission') return '확인 권한 없음';
  if (groupSource.status === 'failed') return '확인 불가';
  // 동작에 필요한 권한을 모두 가진 그룹만이다 — 하나만 있으면 서버가 그 동작을 거부한다.
  const names = groupSource.groups
    .filter((group) => codes.every((code) => group.grants.some((grant) => grant.type === 'OPERATION' && grant.code === code)))
    .map((group) => group.name || group.code);
  return names.length > 0 ? names.join(', ') : '배정된 그룹 없음';
}

/** 메뉴 관리에 직접 등록할 게시판 주소와 복사 단추. */
function AddressBlock({ route, onCopy }: { route: string; onCopy: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{route}</code>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onCopy}>
        <Copy className="size-4" aria-hidden="true" />
        주소 복사
      </Button>
    </div>
  );
}

export function BoardAccessTab({ detail }: { detail: BoardMasterDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const canOpenMenus = canOpenPage(user, '/admin/system/menus');
  const canOpenAuthority = canOpenPage(user, '/admin/security/authority');
  // [ADR-0043 결정 1] 메뉴에 붙이기는 메뉴 관리가 새 메뉴를 추가·저장할 수 있을 때만 넘긴다(MENU_CREATE·MENU_UPDATE) — 그룹
  //   표시(AUTHRT_GRANT)는 메뉴 관리가 따로 판정한다. 마법사 결과 화면과 같은 판정이다.
  const canAttachMenu = canOpenMenus && canPermission(user, 'MENU_CREATE') && canPermission(user, 'MENU_UPDATE');
  const { menuSource, groupSource, retry } = useBoardAccessSources();
  const [menuHandoffFailed, setMenuHandoffFailed] = useState(false);
  const boardInUse = detail.useYn === 'Y';
  const community = boardCommunityOf(detail);
  const audience = boardAudience(community);
  const returnTo: HandoffReturn = { route: boardOperationsHref(detail.bbsId, 'access'), label: READINESS_RETURN_LABEL };

  // 두 원천이 모두 확정된 뒤에 판정한다 — 그룹 조회가 아직 진행 중인데 '불러오지 못함'으로 판정하지 않는다(권한이 없으면
  //   useBoardAccessSources 가 조회 없이 바로 확인 권한 없음으로 확정한다).
  const links = useMemo(() => (menuSource === null || groupSource === null
    ? null
    : findBoardMenuLinks(detail.bbsId, menuSource, groupSource, detail.bbsTtl)),
  [detail.bbsId, detail.bbsTtl, menuSource, groupSource]);
  const readiness = links === null || groupSource === null ? null
    : publicationReadiness({ bbsId: detail.bbsId, boardInUse, links, groupSource, designations: detail.designations, community });

  const openMenu = (link: BoardMenuLink) => {
    if (!handOffMenuFocus({ menuSn: link.menuNo, returnTo })) {
      toast('메뉴를 넘기지 못했습니다. 브라우저 저장소를 쓸 수 없는 상태입니다. 메뉴 관리에서 직접 찾아 주세요.', 'error');
      return;
    }
    router.push('/admin/system/menus');
  };

  /** 메뉴에 붙이기 — 게시판 이용 화면 주소·이름·돌아갈 곳을 넘기고 메뉴 관리를 연다. 넘기지 못하면 이동하지 않고 주소를 안내한다. */
  const attachMenu = () => {
    if (!handOffScreen({ route: boardMenuRoute(detail.bbsId), label: detail.bbsTtl, returnTo })) {
      setMenuHandoffFailed(true);
      return;
    }
    router.push('/admin/system/menus');
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(boardMenuRoute(detail.bbsId));
      toast('게시판 주소를 복사했습니다.', 'success');
    } catch {
      toast('주소를 복사하지 못했습니다. 직접 선택해 복사하세요.', 'error');
    }
  };

  const noMenuLinks = links?.status === 'ready' && links.links.length === 0;

  /** 공개 준비 점검에서 메뉴 연결 절로 옮겨 간다 — 주소(해시)를 바꾸지 않고 절 제목에 초점을 둔다. */
  const showMenuLinks = () => {
    const heading = document.getElementById('board-access-menus');
    heading?.scrollIntoView?.({ block: 'start' });
    heading?.focus();
  };

  const checkDetail = (id: string, state: CheckState, missing?: string[]): string => {
    if (id === 'board-in-use') return state === 'pass' ? '사용 중' : '사용 안 함 — 이용자에게 읽기·쓰기 모두 닫혀 있습니다.';
    if (id === 'entry-path') {
      if (community !== null) {
        if (state === 'pass') return `귀속 커뮤니티 화면으로 회원이 들어옵니다(${audience.label}).`;
        if (state === 'fail') return '귀속 커뮤니티가 사용 중지라 이용자가 들어갈 입구가 없습니다. 커뮤니티를 다시 사용으로 바꿔야 회원에게 열립니다.';
        return '귀속 커뮤니티의 사용 여부를 확인할 수 없습니다(커뮤니티 기능이 없거나 커뮤니티를 찾지 못했습니다).';
      }
      if (state === 'pass') return `있음 — ${readiness ? foundPathNames(readiness.paths).join(', ') : ''}`;
      if (state === 'fail') return '일반 그룹에 보이는 활성 메뉴·지식 허브 탭·업무 홈 카드가 없습니다. 관리자 그룹에만 보이는 메뉴는 세지 않습니다.';
      return menuSource?.status === 'no-permission' || groupSource?.status === 'no-permission'
        ? '메뉴 원장이나 그룹을 볼 권한이 없어 메뉴로 닿는지 확인할 수 없습니다.'
        : '메뉴 원장이나 그룹을 불러오지 못했거나, 판정할 수 없는 메뉴 주소가 있습니다.';
    }
    if (state === 'pass') return '지정 게시판의 편집 권한이 그룹에 배정돼 있습니다.';
    if (state === 'fail') return `어느 그룹에도 배정되지 않은 편집 권한: ${(missing ?? []).join(', ')}`;
    return '그룹을 볼 권한이 없거나 불러오지 못해 확인할 수 없습니다.';
  };

  /** 항목마다 고치는 곳(ADR-0043 결정 3·설계서 §5.6). 통과한 항목에는 두지 않는다. */
  const checkAction = (id: string, state: CheckState) => {
    if (state === 'pass' || state === 'not-applicable') return null;
    if (id === 'board-in-use') {
      return (
        <Button type="button" variant="outline" size="xs" onClick={() => router.push(boardOperationsHref(detail.bbsId, 'settings'))}>
          설정 탭에서 사용으로 바꾸기
        </Button>
      );
    }
    if (id === 'edit-permission') {
      return canOpenAuthority
        ? <Button type="button" variant="outline" size="xs" onClick={() => router.push('/admin/security/authority')}>권한 관리에서 배정하기</Button>
        : null;
    }
    // 이용자가 찾는 길 — 귀속 게시판의 입구는 커뮤니티 화면이라 메뉴로 고치지 않는다. 메뉴 원장을 못 읽었으면 고칠 곳을 모른다.
    if (community !== null || links?.status !== 'ready') return null;
    if (noMenuLinks) {
      return canAttachMenu ? <Button type="button" variant="outline" size="xs" onClick={attachMenu}>메뉴에 붙이기</Button> : null;
    }
    // 연결된 메뉴가 있으면(관리자 그룹만·비활성 등) 아래 메뉴 연결 표의 '메뉴 관리에서 열기' 가 고치는 곳이다.
    return <Button type="button" variant="link" size="xs" onClick={showMenuLinks}>메뉴 연결 보기</Button>;
  };

  const paths = readiness?.paths ?? null;

  return (
    <div className="space-y-6">
      <section aria-labelledby="board-access-readiness" className="space-y-3 rounded-md border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="board-access-readiness" className="text-[length:var(--font-size-body)] font-semibold text-foreground">공개 준비 점검</h2>
          {readiness === null
            ? <span role="status" className="text-sm text-muted-foreground">확인하는 중…</span>
            : <Badge variant="outline">{READINESS_LABEL[readiness.state]}</Badge>}
        </div>
        {readiness !== null && (
          <ul className="space-y-1.5 text-[length:var(--font-size-body)]">
            {readiness.checks.filter((check) => check.state !== 'not-applicable').map((check) => (
              <li key={check.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{CHECK_NAMES[check.id] ?? check.id}</span>
                <span>{STATE_LABEL[check.state]}</span>
                <span className="text-muted-foreground">{checkDetail(check.id, check.state, check.missing)}</span>
                {checkAction(check.id, check.state)}
              </li>
            ))}
          </ul>
        )}
        {readiness !== null && readiness.warnings.length > 0 && (
          <div role="note" aria-label="공개 준비 경고" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)] text-foreground">
            <ul className="list-disc space-y-1 pl-5">
              {readiness.warnings.map((warning) => <li key={warning}>{WARNING_TEXT[warning]}</li>)}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          메뉴는 길 안내일 뿐 접근을 막지 않습니다. 관리자 그룹(ROLE_ADMIN·ROLE_SYSTEM)에만 보이는 메뉴는 이용자가 찾는 길로 세지 않습니다.
          메뉴 활성화와 그룹 표시는 메뉴 관리에서 함께 저장합니다(메뉴 조회·수정, 권한 그룹 조회·배정 권한 — MENU_READ·MENU_UPDATE·AUTHRT_READ·AUTHRT_GRANT).
          상위 메뉴도 같은 그룹에 보여야 사이드바에 나타납니다.
        </p>
      </section>

      {/* [2026-10-26 ADR-0043, NAV-07] 메뉴가 없어도 사용 중인 게시판에 닿는 길. 공개 준비 판정과 같은 값을 쓴다. */}
      <section aria-labelledby="board-access-paths" className="space-y-3">
        <h2 id="board-access-paths" className="text-[length:var(--font-size-body)] font-semibold text-foreground">이용자가 이미 닿는 길</h2>
        {paths === null
          ? <p role="status" className="text-sm text-muted-foreground">확인하는 중…</p>
          : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-md border border-border p-4 text-[length:var(--font-size-body)] sm:grid-cols-[9rem_1fr]">
              <dt className="text-muted-foreground">통합 검색</dt>
              <dd className="text-foreground">
                {paths.search
                  ? '나옵니다 — 사용 중인 게시판의 글은 메뉴가 없어도 통합 검색 결과에 나옵니다.'
                  : community !== null
                    ? '나오지 않습니다 — 커뮤니티 귀속 게시판은 통합 검색에서 빠집니다.'
                    : '나오지 않습니다 — 사용 안 함 게시판입니다.'}
              </dd>
              <dt className="text-muted-foreground">업무 홈 카드</dt>
              <dd className="text-foreground">
                {paths.homeCards.length > 0 ? paths.homeCards.map((card) => HOME_CARD_LABELS[card] ?? card).join(', ') : '없음'}
              </dd>
              <dt className="text-muted-foreground">지식 허브 탭</dt>
              <dd className="text-foreground">
                {paths.hubTabs.length + paths.contributedHubTabs.length > 0
                  ? [
                    ...paths.hubTabs.map((tab) => `${knowledgeTabLabel(tab)} 탭`),
                    ...paths.contributedHubTabs.map((tab) => `${knowledgeTabLabel(tab)} 탭(${knowledgeTabLabel(tab)} 기능을 넣은 구성에서)`),
                  ].join(', ')
                  : '없음'}
              </dd>
              <dt className="text-muted-foreground">커뮤니티 화면</dt>
              <dd className="text-foreground">
                {community === null
                  ? '해당 없음 — 커뮤니티 귀속 게시판이 아닙니다.'
                  : audience.kind === 'community' && audience.state === 'in-use'
                    ? `${audience.label}이 커뮤니티 화면에서 이 게시판에 들어옵니다.`
                    : audience.kind === 'community' && audience.state === 'stopped'
                      ? '귀속 커뮤니티가 사용 중지라 입구가 없습니다.'
                      : '귀속 커뮤니티를 확인할 수 없습니다.'}
              </dd>
            </dl>
          )}
        {!boardInUse && (
          <p className="text-sm text-muted-foreground">지금은 사용 안 함이라 위 길로 들어와도 이용자에게 닫혀 있습니다.</p>
        )}
      </section>

      <section aria-labelledby="board-access-menus" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="board-access-menus" tabIndex={-1} className="text-[length:var(--font-size-body)] font-semibold text-foreground">메뉴 연결</h2>
          {(menuSource?.status === 'failed' || groupSource?.status === 'failed') && (
            <Button type="button" variant="outline" size="sm" onClick={retry}>다시 불러오기</Button>
          )}
        </div>
        {links === null && <p role="status" className="text-sm text-muted-foreground">메뉴 연결을 확인하는 중…</p>}
        {links?.status === 'no-permission' && (
          <p className="text-[length:var(--font-size-body)] text-muted-foreground">메뉴 원장을 볼 권한(MENU_READ)이 없어 메뉴 연결을 확인할 수 없습니다(확인 권한 없음).</p>
        )}
        {links?.status === 'unknown' && (
          <p role="alert" className="text-[length:var(--font-size-body)] text-destructive">메뉴 원장을 불러오지 못해 메뉴 연결을 확인할 수 없습니다(확인 불가).</p>
        )}
        {links?.status === 'ready' && links.links.length > 0 && (
          <div className="relative overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{`${detail.bbsTtl} 메뉴 연결`}</caption>
              <thead className="bg-muted">
                <tr>{['메뉴 위치', '연결 근거', '메뉴 상태', '보이는 그룹', '고치는 곳'].map((title) => <th key={title} scope="col" className="p-3">{title}</th>)}</tr>
              </thead>
              <tbody>
                {links.links.map((link) => (
                  <tr key={link.menuNo} className="border-t border-border align-top">
                    <th scope="row" className="p-3 font-medium">
                      {link.path.join(' › ')}
                      {link.nameDiffers && <p className="mt-1 text-xs font-normal text-muted-foreground">메뉴 이름이 게시판 이름({detail.bbsTtl})과 다릅니다.</p>}
                    </th>
                    <td className="p-3">
                      {basisText(link)}
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{link.route}</p>
                    </td>
                    <td className="p-3">{link.exposure.kind === 'inactive' ? '비활성' : '활성'}</td>
                    <td className="p-3">{exposureText(link.exposure)}</td>
                    <td className="p-3">
                      {canOpenMenus
                        ? <Button type="button" variant="outline" size="sm" onClick={() => openMenu(link)}>메뉴 관리에서 열기</Button>
                        : <span className="text-muted-foreground">메뉴 관리(메뉴 조회 권한 필요)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {noMenuLinks && (
          <div className="space-y-2 rounded-md border border-border p-4 text-[length:var(--font-size-body)]">
            <p className="font-medium text-foreground">이 게시판을 가리키는 메뉴가 없습니다(연결 없음).</p>
            {community !== null ? (
              /* [ADR-0043 결정 1] 귀속 게시판의 입구는 커뮤니티 화면이다 — 메뉴를 붙이라고 안내하지 않는다. */
              <p className="text-muted-foreground">
                이 게시판의 입구는 커뮤니티 화면입니다. 승인 회원만 열 수 있어 메뉴를 따로 붙이지 않습니다.
              </p>
            ) : canAttachMenu ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  메뉴는 길 안내일 뿐이라 없어도 사용 중인 게시판은 위 길로 열립니다. 메뉴 관리에서 위치를 고르고, 이용자 그룹에 보이도록 함께
                  저장합니다(그룹 표시는 권한 배정 권한이 필요합니다). 저장한 뒤 메뉴 관리의 돌아가기 단추로 이 화면에 돌아옵니다.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={attachMenu}>메뉴에 붙이기</Button>
                {menuHandoffFailed && (
                  <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive-emphasis">
                    <p>메뉴 관리에 게시판을 넘기지 못했습니다. 브라우저 저장소를 쓸 수 없는 상태입니다. 메뉴 관리에서 새 메뉴를 추가하고 아래 주소를 직접 등록하세요.</p>
                    <AddressBlock route={boardMenuRoute(detail.bbsId)} onCopy={() => void copyAddress()} />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  메뉴 연결은 메뉴 관리 권한(메뉴 등록·수정)이 있는 관리자에게 요청하세요. 요청할 때 아래 게시판 주소를 함께 전하세요.
                </p>
                <AddressBlock route={boardMenuRoute(detail.bbsId)} onCopy={() => void copyAddress()} />
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="board-access-permissions" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="board-access-permissions" className="text-[length:var(--font-size-body)] font-semibold text-foreground">게시글 권한(모든 게시판 공통)</h2>
          {canOpenAuthority && (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push('/admin/security/authority')}>
              <ExternalLink className="size-4" aria-hidden="true" />
              권한 관리 열기
            </Button>
          )}
        </div>
        <p className="text-[length:var(--font-size-body)] text-muted-foreground">
          게시판별로 이용자를 나누는 수단은 커뮤니티 귀속 하나뿐입니다. 아래 권한은 모든 게시판에 함께 적용됩니다.
        </p>
        <div className="relative overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">게시글 권한</caption>
            <thead className="bg-muted">
              <tr>{['할 수 있는 일', '필요한 권한', '배정된 그룹', '추가 조건'].map((title) => <th key={title} scope="col" className="p-3">{title}</th>)}</tr>
            </thead>
            <tbody>
              {POST_PERMISSIONS.map((row) => (
                <tr key={row.action} className="border-t border-border align-top">
                  <th scope="row" className="p-3 font-medium">{row.action}</th>
                  <td className="p-3 font-mono text-xs">{row.codes.join(' + ')}</td>
                  <td className="p-3">{groupsHolding(groupSource, row.codes)}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.condition}
                    {community !== null && row.community ? ' · 커뮤니티 승인 회원(조회 대행 권한은 면제)' : ''}
                    {row.specialEdit && detail.designations.includes('NOTICE') ? ' · 공지 편집 권한(NOTICE_EDIT)' : ''}
                    {row.specialEdit && detail.designations.includes('FAQ') ? ' · FAQ 편집 권한(FAQ_EDIT)' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

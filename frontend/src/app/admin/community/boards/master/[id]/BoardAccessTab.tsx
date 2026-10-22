'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/app/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';
import { handOffMenuFocus } from '@/lib/navigation/target-handoff';
import {
  boardMenuRoute,
  findBoardMenuLinks,
  publicationReadiness,
  type BoardMenuLink,
  type CheckState,
  type GroupSource,
  type MenuExposure,
} from '@/lib/board/board-menu-links';
import type { BoardMasterDetail } from '@/services/foundation/system/BoardAdminService';
import { useBoardAccessSources } from '../useBoardAccessSources';

/**
 * 게시판 운영 화면의 메뉴·접근 탭(ADR-0040 결정 8·§5.6). 메뉴 연결과 그룹 표시는 계산해 보이기만 하고, 바꾸기는 메뉴 관리에서
 * 한다 — 연결된 메뉴는 그 메뉴를 고른 상태로 메뉴 관리를 연다(menu-focus 인계). 메뉴 원장(MENU_READ)·그룹(AUTHRT_READ)을 읽을
 * 권한이 없으면 "확인 권한 없음", 조회에 실패하면 "확인 불가" 로 보이고 연결 없음·모두에게 보임으로 추정하지 않는다.
 */
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
 * 게시 시작일(예약)은 아직 집행하지 않는다 — 기간 조건은 게시 종료일만이다(ADR-0040 결정 3 은 B1 배치).
 */
const READ_ALL_EXEMPTS_UNUSED = '(조회 대행 권한이 있으면 사용 안 함 게시판에도)';
const POST_PERMISSIONS: readonly { action: string; codes: string[]; condition: string; community: boolean; specialEdit: boolean }[] = [
  { action: '글 보기', codes: ['BOARD_READ'], condition: '게시판 사용 중, 게시 종료 전, 비밀글은 글쓴이 본인만', community: true, specialEdit: false },
  { action: '공개 FAQ 보기(FAQ 지정 게시판)', codes: ['BOARD_READ'], condition: 'FAQ 게시판 사용 중, 게시 종료 전, 비밀글이 아닌 글만', community: false, specialEdit: false },
  { action: '글 쓰기', codes: ['BOARD_CREATE'], condition: `게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: true },
  { action: '내 글 고치기·해결 표시', codes: ['BOARD_UPDATE'], condition: `글쓴이 본인, 게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: true },
  { action: '내 글 지우기', codes: ['BOARD_DELETE'], condition: `글쓴이 본인, 게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: true },
  { action: '남의 글 고치기', codes: ['BOARD_UPDATE', 'BOARD_UPDATE_ALL'], condition: `게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: true },
  { action: '남의 글 지우기', codes: ['BOARD_DELETE', 'BOARD_DELETE_ALL'], condition: `게시판 사용 중${READ_ALL_EXEMPTS_UNUSED}`, community: true, specialEdit: true },
  { action: '비밀글·게시 종료 글·사용 안 함 게시판 보기', codes: ['BOARD_READ', 'BOARD_READ_ALL'], condition: '비밀글·게시 종료 글은 글쓴이 본인도 본다. 사용 안 함 게시판은 이 권한으로만 본다. 커뮤니티 회원이 아니어도 된다', community: false, specialEdit: false },
  { action: '삭제 글 보기(상세만)', codes: ['BOARD_READ', 'BOARD_READ_ALL'], condition: '—', community: false, specialEdit: false },
  { action: '추천', codes: ['BOARD_LIKE'], condition: '게시판 사용 중, 글을 볼 수 있어야 함, 한 사람당 한 번', community: true, specialEdit: false },
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

export function BoardAccessTab({ detail }: { detail: BoardMasterDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const canOpenMenus = canOpenPage(user, '/admin/system/menus');
  const canOpenAuthority = canOpenPage(user, '/admin/security/authority');
  const { menuSource, groupSource, retry } = useBoardAccessSources();
  const boardInUse = detail.useYn === 'Y';

  // 두 원천이 모두 확정된 뒤에 판정한다 — 그룹 조회가 아직 진행 중인데 '불러오지 못함'으로 판정하지 않는다(권한이 없으면
  //   useBoardAccessSources 가 조회 없이 바로 확인 권한 없음으로 확정한다).
  const links = useMemo(() => (menuSource === null || groupSource === null
    ? null
    : findBoardMenuLinks(detail.bbsId, menuSource, groupSource, detail.bbsTtl)),
  [detail.bbsId, detail.bbsTtl, menuSource, groupSource]);
  const readiness = links === null || groupSource === null ? null
    : publicationReadiness({ boardInUse, links, groupSource, designations: detail.designations });

  const openMenu = (link: BoardMenuLink) => {
    if (!handOffMenuFocus({ menuSn: link.menuNo })) {
      toast('메뉴를 넘기지 못했습니다. 브라우저 저장소를 쓸 수 없는 상태입니다. 메뉴 관리에서 직접 찾아 주세요.', 'error');
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

  const checkDetail = (id: string, state: CheckState, missing?: string[]): string => {
    if (id === 'board-in-use') return state === 'pass' ? '사용 중' : '사용 안 함 — 설정 탭에서 바꿉니다.';
    if (id === 'general-menu') {
      if (state === 'pass') return '일반 그룹에 보이는 활성 메뉴가 있습니다.';
      if (state === 'fail') return '일반 그룹에 보이는 활성 메뉴가 없습니다.';
      return menuSource?.status === 'no-permission' || groupSource?.status === 'no-permission'
        ? '메뉴 원장이나 그룹을 볼 권한이 없어 확인할 수 없습니다.'
        : '메뉴 원장이나 그룹을 불러오지 못했거나, 판정할 수 없는 메뉴 주소가 있습니다.';
    }
    if (state === 'pass') return '지정 게시판의 편집 권한이 그룹에 배정돼 있습니다.';
    if (state === 'fail') return `어느 그룹에도 배정되지 않은 편집 권한: ${(missing ?? []).join(', ')}`;
    return '그룹을 볼 권한이 없거나 불러오지 못해 확인할 수 없습니다.';
  };

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
              <li key={check.id} className="flex flex-wrap gap-2">
                <span className="font-medium text-foreground">
                  {check.id === 'board-in-use' ? '게시판 사용' : check.id === 'general-menu' ? '일반 그룹에 보이는 활성 메뉴' : '지정 게시판 편집 권한 배정'}
                </span>
                <span>{STATE_LABEL[check.state]}</span>
                <span className="text-muted-foreground">{checkDetail(check.id, check.state, check.missing)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          메뉴 활성화와 그룹 표시는 메뉴 관리에서 함께 저장합니다(메뉴 조회·수정, 권한 그룹 조회·배정 권한 — MENU_READ·MENU_UPDATE·AUTHRT_READ·AUTHRT_GRANT).
          상위 메뉴도 같은 그룹에 보여야 사이드바에 나타납니다.
        </p>
      </section>

      <section aria-labelledby="board-access-menus" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="board-access-menus" className="text-[length:var(--font-size-body)] font-semibold text-foreground">메뉴 연결</h2>
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
        {links?.status === 'ready' && links.links.length === 0 && (
          <div className="space-y-2 rounded-md border border-border p-4 text-[length:var(--font-size-body)]">
            <p className="font-medium text-foreground">이 게시판을 가리키는 메뉴가 없습니다(연결 없음).</p>
            <p className="text-muted-foreground">메뉴 관리에서 새 메뉴를 추가하고 아래 주소를 메뉴 경로로 등록하세요.</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{boardMenuRoute(detail.bbsId)}</code>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void copyAddress()}>
                <Copy className="size-4" aria-hidden="true" />
                주소 복사
              </Button>
              {canOpenMenus && (
                <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push('/admin/system/menus')}>
                  <ExternalLink className="size-4" aria-hidden="true" />
                  메뉴 관리 열기
                </Button>
              )}
            </div>
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
                    {detail.cmntySn && row.community ? ' · 커뮤니티 승인 회원(조회 대행 권한은 면제)' : ''}
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { COMMUNITY_BOARD_ID } from '@/config/board-ids';
import type { HubTabViews } from '@/extensions/slots';
import { CommunityManageDialog } from './CommunityManageDialog';

/**
 * 지식 허브의 커뮤니티 탭 머리 동작(커뮤니티 소유, 허브 분해 H2). 커뮤니티를 찾고 가입하는 목록 화면으로 가는 길은 누구에게나,
 * 커뮤니티 생성·수정·폐쇄 대화상자는 COMMUNITY_READ_ALL 보유자에게만 보인다(DEC-OPS-037). 대화상자는 열릴 때만 마운트한다 —
 * 닫으면 폼·선택 상태가 함께 버려지고, 대화상자의 조회 훅이 허브 렌더에 끼지 않는다.
 */
export function KnowledgeCommunityActions() {
  const router = useRouter();
  const { user } = useAuth();
  const canManageCommunities = canPermission(user, 'COMMUNITY_READ_ALL');
  const [manageOpen, setManageOpen] = useState(false);
  return (
    <>
      {/* [2026-10-01 결정 20] 커뮤니티를 찾고 가입하는 목록 화면으로 가는 길 — 메뉴를 바꾸지 않고 이 탭에서 잇는다. */}
      <Button variant="outline" size="sm" onClick={() => router.push('/cop/cmy/selectCommunityList')}>
        <Users size={16} aria-hidden="true" /> 커뮤니티 목록·가입
      </Button>
      {canManageCommunities && (
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <Users size={16} aria-hidden="true" /> 커뮤니티 관리
        </Button>
      )}
      {canManageCommunities && manageOpen && <CommunityManageDialog isOpen onClose={() => setManageOpen(false)} />}
    </>
  );
}

/** 지식 허브 커뮤니티 탭의 뷰. 셸이 이 게시판의 글 목록을 그리고, 탭이 열렸을 때 머리 동작을 더한다. */
export const KNOWLEDGE_COMMUNITY_TAB_VIEW: HubTabViews['knowledge'] = {
  description: '활성 게시판',
  icon: Users,
  bbsId: COMMUNITY_BOARD_ID,
  Actions: KnowledgeCommunityActions,
};

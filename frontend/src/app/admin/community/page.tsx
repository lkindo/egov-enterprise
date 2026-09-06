import { redirect } from 'next/navigation';

/**
 * `/admin/community` 는 지식 허브의 커뮤니티 탭(`/admin/help?tab=COMMUNITY`)으로 보낸다.
 *
 * [2026-09-06 DEC-OPS-040] 이 라우트는 `KnowledgeHubClient defaultTab="COMMUNITY"` 를 그대로 렌더해
 * `/admin/help?tab=COMMUNITY` 와 같은 화면을 다른 주소로 한 번 더 보여 주고 있었다(overlay 제안
 * consolidate-to-canonical → owner 승인). 정본은 `/admin/help` 이고 탭은 URL `?tab=` 이 정한다.
 *
 * 라우트를 지우지 않고 보내는 이유는 `/admin/community/boards/write` 와 같다(문자열 URL 참조·메뉴 행 보존).
 */
export default function CommunityRedirectPage() {
  redirect('/admin/help?tab=COMMUNITY');
}

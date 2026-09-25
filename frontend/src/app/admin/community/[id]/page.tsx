import { redirect } from 'next/navigation';

/**
 * 커뮤니티 상세의 옛 경로.
 *
 * [2026-09-25 DEC-OPS-130] 이 화면은 이름이 '커뮤니티 상세' 였지만 경로의 [id] 를 읽지 않고, 선택한
 * 게시판(기본값 공지사항)의 글 목록을 보여 줬다 — 어떤 커뮤니티를 열어도 같은 화면이었다. id 로
 * 커뮤니티와 그 게시판을 보여 주는 정본은 /cop/cmy/selectCommunityDetail/[id] 이므로 id 를 그대로
 * 실어 보낸다. 게시판 글 목록은 게시판 목록 화면이 계속 제공한다.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/cop/cmy/selectCommunityDetail/${id}`);
}

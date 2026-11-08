import { notFound, redirect } from 'next/navigation';

/**
 * 커뮤니티 상세의 옛 경로.
 *
 * [2026-09-25 DEC-OPS-130] 이 화면은 이름이 '커뮤니티 상세' 였지만 경로의 [id] 를 읽지 않고, 선택한
 * 게시판(기본값 공지사항)의 글 목록을 보여 줬다 — 어떤 커뮤니티를 열어도 같은 화면이었다. id 로
 * 커뮤니티와 그 게시판을 보여 주는 정본은 /cop/cmy/selectCommunityDetail/[id] 이므로 그리로 보낸다.
 * 게시판 글 목록은 게시판 목록 화면이 계속 제공한다.
 *
 * [2026-11-08] 경로의 id 를 그대로 실어 보내지 않는다 — 정본과 같은 규칙(양의 안전 정수)으로 검증해 정규화한 값만 보내고,
 * 아니면 없는 화면이다(IA §9.1.4). 숫자만 남으므로 따로 인코딩할 문자가 없다.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const cmntySn = Number((await params).id);
    if (!Number.isSafeInteger(cmntySn) || cmntySn <= 0) notFound();
    const id = String(cmntySn);
    redirect(`/cop/cmy/selectCommunityDetail/${id}`);
}

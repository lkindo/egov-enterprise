import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { BoardRegistClient } from './BoardRegistClient';
import { BoardWritePicker } from './BoardWritePicker';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';

export const metadata: Metadata = {
  title: `게시글 작성·수정 | ${SITE_IDENTITY.frameworkName}`,
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InsertBoardArticlePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const bbsId = typeof params.bbsId === 'string' ? params.bbsId.trim() : '';
  /*
    [2026-10-26 ADR-0043 1차 UX-09] 게시판 없이 들어오면(옛 주소 /admin/community/boards/write·/boards/[id], 북마크) 공지사항으로 정하지
    않고 글을 쓸 수 있는 게시판을 고르게 한다. 종전에는 공지사항(NOTICE_BOARD_ID)을 기본값으로 써서, 공지 편집 권한자는 모르는 채
    공지사항에 썼고 그 밖의 사용자는 쓸 수 없는 화면에 닿았다. 글 번호만 있는 주소는 어느 게시판의 글인지 알 수 없으므로 고쳐 쓰는
    화면을 열지 않고 같은 선택에서 시작한다(게시판을 추정해 엉뚱한 글을 고치지 않는다 — H4).
  */
  if (!bbsId) return <BoardWritePicker />;
  const pstSnValue = params.pstSn ? Number(params.pstSn) : undefined;
  const pstSn = pstSnValue && Number.isSafeInteger(pstSnValue) && pstSnValue > 0 ? pstSnValue : undefined;

  let initialData = null;
  if (pstSn) {
    // 수정 대상 조회 실패를 빈 신규 작성 폼으로 위장하지 않고 상위 error boundary에 맡긴다.
    // 수정 화면 진입은 글을 읽는 것이 아니다 — 조회수를 올리지 않는다(DIP I8).
    initialData = await knowledgeService.getArticle(bbsId, pstSn, { countView: false });
  }

  return (
    <BoardRegistClient
      initialData={initialData}
      bbsId={bbsId}
      pstSn={pstSn}
    />
  );
}

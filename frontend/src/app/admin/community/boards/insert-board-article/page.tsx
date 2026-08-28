import { BoardRegistClient } from './BoardRegistClient';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { NOTICE_BOARD_ID } from '@/config/board-ids';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InsertBoardArticlePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const bbsId = (params.bbsId as string) || NOTICE_BOARD_ID;
  const pstSnValue = params.pstSn ? Number(params.pstSn) : undefined;
  const pstSn = pstSnValue && Number.isSafeInteger(pstSnValue) && pstSnValue > 0 ? pstSnValue : undefined;

  let initialData = null;
  if (pstSn) {
    // 수정 대상 조회 실패를 빈 신규 작성 폼으로 위장하지 않고 상위 error boundary에 맡긴다.
    initialData = await knowledgeService.getArticle(bbsId, pstSn);
  }

  return (
    <BoardRegistClient 
      initialData={initialData} 
      bbsId={bbsId} 
      pstSn={pstSn}
    />
  );
}

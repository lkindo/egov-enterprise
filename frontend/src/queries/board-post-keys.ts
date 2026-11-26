/**
 * 게시글(이용 화면)의 쿼리 키 — 게시판 목록, 게시글 상세, 첨부 목록, FAQ 답 펼침.
 *
 * 조회는 게시판 목록(BoardListClient·useBoardList)·게시글 상세(BoardDetailClient)·작성 화면(BoardRegistClient)·FAQ 템플릿
 * (BoardTemplates)이 하고, 무효화는 작성·삭제 화면과 운영 화면의 게시 기간·고정 변경(invalidateBoardOperationPosts)이 한다.
 * 네 뿌리는 서로 다른 캐시라 하나의 `all` 아래로 모으지 않는다 — 뿌리 이름을 바꾸면 이미 쓰는 캐시 키가 달라진다.
 * 다른 모듈을 import 하지 않는다(기능을 뺀 생성물의 연쇄 제거에 걸리지 않게).
 */
export const boardPostKeys = {
  /** 게시판 목록 뿌리. */
  listRoot: ['boardList'] as const,
  /** 한 게시판의 목록 전체 — 글 저장·삭제·추천 뒤 무효화하는 접두. 상세 주소에 게시판이 없으면 null 이 온다. */
  lists: (bbsId: string | null) => [...boardPostKeys.listRoot, bbsId] as const,
  /** 조건별 목록 한 쪽. */
  list: (bbsId: string, params: object) => [...boardPostKeys.lists(bbsId), params] as const,
  /** 게시글 상세 뿌리. */
  detailRoot: ['article-detail'] as const,
  /** 한 게시판의 상세 전체 — 운영 화면이 게시 기간·고정을 바꾼 뒤 무효화하는 접두. */
  details: (bbsId: string | null) => [...boardPostKeys.detailRoot, bbsId] as const,
  /** 게시글 한 건의 상세. */
  detail: (bbsId: string | null, pstSn: number) => [...boardPostKeys.details(bbsId), pstSn] as const,
  /** 첨부 목록 뿌리. */
  filesRoot: ['article-files'] as const,
  /** 첨부 묶음 하나의 파일 목록. 글에 첨부가 없으면 undefined 가 온다(조회는 꺼져 있다). */
  files: (atchFileSn: number | undefined) => [...boardPostKeys.filesRoot, atchFileSn] as const,
  /** FAQ 템플릿이 펼칠 때 받는 답(게시글 상세) 뿌리. 상세 화면의 'article-detail' 과 다른 캐시다. */
  articleRoot: ['boardArticle'] as const,
  /** FAQ 답 한 건. */
  article: (bbsId: string, pstSn: number) => [...boardPostKeys.articleRoot, bbsId, pstSn] as const,
};

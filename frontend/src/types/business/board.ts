/**
 * 게시 상태(서버 판정, ADR-0040 결정 3) — 서버 BoardDto.postingStatus 의 어휘(SCHEDULED 시작일 전·POSTING 게시 중·ENDED 종료일
 * 지남)와 같다. 화면은 날짜로 다시 계산하지 않는다(DEC-OPS-140). 이 파일은 게시판 기능 밖의 화면도 읽어, 생성 API 스키마 이름을
 * 쓰지 않는다 — 게시판을 고르지 않은 생성물에는 그 스키마가 없다(정밀 점검 API_CONTRACT_REFERENCE).
 */
export type BoardPostingStatus = 'SCHEDULED' | 'POSTING' | 'ENDED';

export interface BoardPost {
  pstSn: number;
  bbsId: string;
  ansSn?: number;
  pstTtl: string;
  pstCn: string;
  upPstSn?: number;
  sortOrdr?: number;
  ttlBoldYn?: string;
  inqCnt?: number;
  useYn: string;
  pstBgngYmd?: string;
  pstEndYmd?: string;
  userId: string;
  userNm?: string;
  pswd?: string;
  atchFileSn?: number;
  scrtYn?: string;
  evntDt?: string;
  qnaSttsCd?: string;
  qnaCatCd?: string;
  likeCnt?: number;
  commentCnt?: number;
  fileCnt?: number;
  crtDt?: string;
  ansLv?: number;
  /** 현재 사용자가 이미 추천했는지(서버 판정, 모르면 null). */
  recommended?: boolean | null;
  /** 게시 상태(서버가 오늘(Asia/Seoul) 기준으로 판정). 게시판 목록·상세에서만 오고 그 밖은 null 이다. */
  postingStatus?: BoardPostingStatus | null;
  /** 게시글 버전(낙관적 잠금, ADR-0040 결정 10). 수정·운영 일정 변경 요청에 그대로 돌려보낸다. */
  version?: number | null;
  /**
   * 지금 게시판 목록 맨 위에 고정 중인지(서버가 오늘(Asia/Seoul) 기준으로 판정, ADR-0040 결정 5). 화면은 고정 종료일과 오늘을
   * 비교하지 않는다(DEC-OPS-140). 게시판 목록·상세에서만 오고 그 밖은 null 이다.
   */
  pinned?: boolean | null;
  /** 상단 고정 종료일(yyyyMMdd). 지금 고정 중일 때만 오고 그 밖은 null 이다. */
  upendFixEndYmd?: string | null;
}


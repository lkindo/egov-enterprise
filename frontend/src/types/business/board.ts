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
}


export interface BoardPost {
  pstId: string;
  bbsId: string;
  pstTtl: string;
  pstCn: string;
  ntcrNm?: string;
  frstRegisterNm?: string;
  inqireCo: number;
  likeCo?: number;
  createdDate?: string;
  atchFileId?: string;
  pstSn: number;
  sortOrdr: number;
  parnts: string;
  replyYn: string;
  replyLc: number;
  ntceBgnyYmd: string;
  ntceEndYmd: string;
  useYn: string;
  isExpired: string;
  frstRegisterPnttmStr: string;
  ntcrId?: string;
  frstRgtrId: string;
  lastMdfrId: string;
  lastModifiedDate: string;
  password: string;
  noticeYn: string;
  secretYn: string;
  blogYn: string;
  commentCo: number;
  bbsTtl: string;
  eventDate: string;
  qnaStatus: string;
  qnaCategory: string;
  knoId: string;
  knoNm: string;
  knoCn: string;
  statusCd: string;
  categoryCd: string;
  eventDateStr: string;
}

export interface BoardResponse {
  list: BoardPost[];
  total: number;
  totalPage: number;
  size: number;
  page: number;
}

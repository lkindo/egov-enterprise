export interface BoardPost {
  id: number;
  nttId: number;
  bbsId: string;
  nttSj: string;
  nttCn: string;
  ntcrNm?: string;
  frstRegisterNm?: string;
  inqireCo: number;
  likeCo?: number;
  frstRegisterPnttm: string;
  createdDate?: string;
  atchFileId?: string;
  nttNo: number;
  sortOrdr: number;
  parnts: string;
  replyAt: string;
  replyLc: number;
  ntceBgnde: string;
  ntceEndde: string;
  useAt: string;
  isExpired: string;
  frstRegisterPnttmStr: string;
  ntcrId?: string;
  frstRegisterId: string;
  lastUpdusrId: string;
  lastUpdtPnttm: string;
  password: string;
  noticeAt: string;
  secretAt: string;
  blogAt: string;
  commentCo: number;
  bbsNm: string;
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

export interface BoardPost {
 nttId: number;
 bbsId: string;
 nttSj: string;
 nttCn: string;
 ntcrId?: string;
 ntcrNm?: string;
 frstRegisterNm?: string;
 createdDate: string;
 inqireCo: number;
 atchFileId?: string;
 noticeAt: 'Y' | 'N';
 secretAt: 'Y' | 'N';
 useAt: 'Y' | 'N';
 qnaStatus?: string;
 qnaCategory?: string;
 eventDate?: string;
}

export interface BoardResponse {
  list: BoardPost[];
  total: number;
  totalPage: number;
  size: number;
  page: number;
}

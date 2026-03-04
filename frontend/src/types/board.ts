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
}

export interface BoardResponse {
  content: BoardPost[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
export interface CommentVO {
  ansSn: number;
  pstId: string;
  bbsId: string;
  wrterId: string;
  wrterNm: string;
  ansCn: string;
  crtDt: string;
}

export interface CommentSaveRequest {
  pstId: string;
  bbsId: string;
  ansCn: string;
  pswd?: string;
}

export interface CommentSearchParams {
  pstId: string;
  bbsId: string;
  page?: number;
  size?: number;
}

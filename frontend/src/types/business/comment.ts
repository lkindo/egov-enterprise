export interface CommentVO {
  ansSn: number;
  pstSn: number;
  bbsId: string;
  wrterId: string;
  wrterNm: string;
  ansCn: string;
  crtDt: string;
}

export interface CommentSaveRequest {
  pstSn: number;
  bbsId: string;
  ansCn: string;
  pswd?: string;
}

export interface CommentSearchParams {
  pstSn: number;
  bbsId: string;
  page?: number;
  size?: number;
}

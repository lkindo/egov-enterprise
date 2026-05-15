export interface CommentVO {
  id: number;
  pstId: number;
  bbsId: string;
  writerId: string;
  wrterNm: string;
  cmntCn: string;
  createdDate: string;
  modifiedDate?: string;
  useYn: string;
}

export interface CommentSaveRequest {
  pstId: number;
  bbsId: string;
  cmntCn: string;
  password?: string;
}

export interface CommentSearchParams {
  pstId: number;
  bbsId: string;
  page?: number;
  size?: number;
}

export interface CommentVO {
  ansSn: number;
  pstSn: number;
  bbsId: string;
  wrterId: string;
  wrterNm: string;
  /**
   * 등록자 로그인 ID. 수정·삭제 버튼 노출 판정에 쓴다.
   *
   * ⚠ 서버 가드(`SecurityUtil.assertOwnerOrAdmin`)가 보는 필드와 같은 축이어야 한다.
   *   wrterId(esntlId)로 판정하면 서버가 검사하는 값과 다른 값으로 표시를 정하게 된다.
   */
  frstRgtrId?: string;
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

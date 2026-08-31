// User Management Types

export interface UserManage {
  userId: string;
  userNm: string;
  pswd?: string;
  pswdHint?: string;
  pswdCrans?: string;
  emlAddr?: string; // 백엔드 UserDto에서 nullable이며, 누락은 미지정으로 보존한다.
  groupId?: string;
  userSttsCd?: string; // 목록 projection에는 없으며 상세 응답에서만 제공될 수 있다.
  sbscrbDe?: string;
  esntlId?: string;
  mblTelno?: string;
  areaNo?: string;
  middleTelno?: string;
  endTelno?: string;
  faxNo?: string; // Aligned with backend faxNo
  zip?: string;
  homeAddr?: string; // Aligned with backend homeAddr
  daddr?: string;
  ognzId?: string;
  emplNo?: string;
  gndrCd?: string;
  brthYmd?: string; // Aligned with backend brthYmd
  otpSecret?: string;
}

export interface UserSearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchCondition?: string;
  searchKeyword?: string;
  sbscrbSttus?: string;
  size?: number;
}

export interface UserDto {
  userId: string;
  userNm: string;
  esntlId: string;
  role: string;
  emplNo?: string;
  ofcpsNm?: string;
  crtDt?: string;
  emlAddr?: string;
  mblTelno?: string;
  otpSecret?: string;
}

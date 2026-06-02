// User Management Types

export interface UserManage {
  userId: string;
  userNm: string;
  pswd?: string;
  pswdHint?: string;
  pswdCrans?: string;
  emlAddr: string; // Aligned with backend emlAddr
  groupId?: string;
  userSttsCd: string;
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
  createdDate?: string;
  emlAddr?: string;
  mblTelno?: string;
  otpSecret?: string;
}

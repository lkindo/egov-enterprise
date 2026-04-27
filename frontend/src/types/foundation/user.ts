// User Management Types

export interface UserManage {
  userId: string;
  userNm: string;
  password?: string;
  passwordHint?: string;
  passwordCnsr?: string;
  emailAdres: string; // Aligned with backend emailAdres
  groupId?: string;
  userSttusCode: string;
  sbscrbDe?: string;
  esntlId?: string;
  moblphonNo?: string;
  areaNo?: string;
  homemiddleTelno?: string; // Aligned with backend homemiddleTelno
  homeendTelno?: string; // Aligned with backend homeendTelno
  fxnum?: string; // Aligned with backend fxnum
  zip?: string;
  homeadres?: string; // Aligned with backend homeadres
  detailAdres?: string;
  orgnztId?: string;
  emplNo?: string;
  sexdstnCode?: string;
  brth?: string; // Aligned with backend brth
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
  emailAdres?: string;
  moblphonNo?: string;
  otpSecret?: string;
}

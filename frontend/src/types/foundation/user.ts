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
  /**
   * 직함. 목록 projection(UserRepositoryImpl 10필드)과 상세 응답 양쪽에 실려 온다.
   * 종전에는 서비스 매핑 whitelist 에 없어 서버가 보낸 값을 프런트가 버리고 있었다.
   */
  ofcpsNm?: string;
  /** 사무실 전화번호. 목록 projection 에 포함된다. */
  officeTelno?: string;
  /** 등록 일시(ISO). 목록 projection 에 포함되며 표기는 `toDisplayDateTime`/`toDisplayYmd` 가 소유한다. */
  crtDt?: string;
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
  groups?: string[];
  permissions?: string[];
  authorizationVersion?: string;
  emplNo?: string;
  ofcpsNm?: string;
  crtDt?: string;
  emlAddr?: string;
  mblTelno?: string;
  otpSecret?: string;
}

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
  /** 연속 로그인 실패 잠금 여부('Y' 면 잠김). 상세 응답에서만 온다(DIP B4 P7). */
  lckYn?: string;
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
  /** 권한 그룹 코드(응답 전용, 관리자 상세에서만 채운다 — UserDto.groups). */
  groups?: string[];
}

export interface UserSearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchCondition?: string;
  searchKeyword?: string;
  sbscrbSttus?: string;
  size?: number;
  /** [2026-09-26 DIP B5 F4] 계정 상태(P 정상·A 승인 대기·D 비활성). 어휘 밖 값은 서버가 400 으로 거부한다. */
  userSttsCd?: string;
  /** 소속 부서(직속만). */
  ognzId?: string;
  /** 로그인 잠금(Y 잠김·N 잠기지 않음). */
  lckYn?: string;
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
}

export interface OnlinePollManageVO {
  pollSn?: number;
  pollNm: string;
  // ⚠ 물리 컬럼은 varchar(8), DTO 는 @Size(max = 8) — 저장/전송 포맷은 'yyyyMMdd' 다.
  //   'yyyy-MM-dd'(10자)를 보내면 컨트롤러 @Valid 에서 400 이 난다.
  //   표시/입력 변환은 @/lib/format-date 를 쓴다.
  pollBgngYmd: string; // yyyyMMdd
  pollEndYmd: string; // yyyyMMdd
  pollKndCd: string; // COM039 (001: 찬반, 002: 선택)
  pollDsuseYn: string; // N: 사용, Y: 폐기
  pollAtmcDsuseYn?: string;
  frstRgtrId?: string;
  crtDt?: string;
}

/**
 * 조회 응답 형태. 서버(OnlinePollService)는 목록·상세 모두에서 응답 선택지를 채워 내려주는데
 * **프런트 타입에 선언이 없어 화면이 존재 자체를 몰랐다.** 그래서 관리자는 자기가 만든
 * 설문의 선택지를 어디에서도 볼 수 없었다.
 *
 * ⚠ 쓰기 VO({@link OnlinePollManageVO})와 **분리해 둔다.** updatePoll 은 pollArticles 가 실려
 *   오면 항목을 clear-and-recreate 하는데, tb_onln_poll_rslt.poll_artcl_sn 외래키가 NO ACTION
 *   이라(V2_67) 투표가 한 건이라도 있으면 저장이 실패한다. 한 타입으로 합치면 폼 state 를 그대로
 *   spread 하는 순간 그 경로를 타므로, 타입 단계에서 못 섞이게 한다.
 */
export interface OnlinePollManageDetailVO extends OnlinePollManageVO {
  pollArticles?: OnlinePollItemVO[];
}

export interface OnlinePollItemVO {
  pollSn: number;
  pollArtclSn?: number;
  pollArtclNm: string;
  pollIemCo?: number; // 투표 수
  frstRgtrId?: string;
  crtDt?: string;
}

export interface OnlinePollPartcptnVO {
  pollSn: number;
  pollArtclSn: number; // 선택한 항목 일련번호
  frstRgtrId?: string; // 사용자ID
}

export interface PollSearchParams {
  page?: number;
  size?: number;
  searchCondition?: string;
  searchKeyword?: string;
}

export interface OnlinePollManageVO {
  pollId?: string;
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

export interface OnlinePollItemVO {
  pollId: string;
  pollArtclId?: string;
  pollArtclNm: string;
  pollIemCo?: number; // 투표 수
  frstRgtrId?: string;
  crtDt?: string;
}

export interface OnlinePollPartcptnVO {
  pollId: string;
  pollArtclId: string; // 선택한 항목 ID
  frstRgtrId?: string; // 사용자ID
}

export interface PollSearchParams {
  page?: number;
  size?: number;
  searchCondition?: string;
  searchKeyword?: string;
}

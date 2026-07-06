export interface OnlinePollManageVO {
  pollId?: string;
  pollNm: string;
  pollBgngYmd: string; // YYYY-MM-DD
  pollEndYmd: string; // YYYY-MM-DD
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

export interface OnlinePollManageVO {
 pollId?: string;
 pollNm: string;
 pollBeginDe: string; // YYYY-MM-DD
 pollEndDe: string; // YYYY-MM-DD
 pollKindCode: string; // COM039 (001: 찬반, 002: 선택)
 pollDsuseYn: string; // N: 사용, Y: 폐기 (Backend naming seems to be 'Y' for disuse?) -> Check controller or VO logic. Usually 'Y' means deleted/unused.
 // Controller: pollDsuseYn
 frstRegisterId?: string;
 frstRegisterNm?: string;
 frstRegistPnttm?: string;
}

export interface OnlinePollItemVO {
 pollId: string;
 pollIemId?: string;
 pollIemNm: string; // 항목명
 sortOrdr?: number; // 정렬순서
 frstRegisterId?: string;
 frstRegistPnttm?: string;
}

export interface OnlinePollPartcptnVO {
 pollId: string;
 pollIemId: string; // 선택한 항목 ID
 frstRegisterId?: string; // 사용자 ID (로그인 시 자동)
}

export interface PollSearchParams {
  pageIndex?: number;
 searchCondition?: string;
 searchKeyword?: string;
}

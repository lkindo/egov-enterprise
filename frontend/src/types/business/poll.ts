export interface OnlinePollManageVO {
 pollId?: string;
 pollNm: string;
 pollBeginDe: string; // YYYY-MM-DD
 pollEndDe: string; // YYYY-MM-DD
 pollKindCode: string; // COM039 (001: 李щ컲, 002: ?좏깮)
 pollDsuseYn: string; // N: ъ슜, Y: ?먭린 (Backend naming seems to be 'Y' for disuse?) -> Check controller or VO logic. Usually 'Y' means deleted/unused.
 // Controller: pollDsuseYn
 frstRegisterId?: string;
 frstRegisterNm?: string;
 frstRegistPnttm?: string;
}

export interface OnlinePollItemVO {
 pollId: string;
 pollIemId?: string;
 pollIemNm: string; // 님ぉ紐 sortOrdr?: number; // ?뺣젹?쒖꽌
 frstRegisterId?: string;
 frstRegistPnttm?: string;
}

export interface OnlinePollPartcptnVO {
 pollId: string;
 pollIemId: string; // ?좏깮님님ぉ ID
 frstRegisterId?: string; // 사용자ID (로그인님?먮룞)
}

export interface PollSearchParams {
  page踰덊샇?: number;
 searchCondition?: string;
 searchKeyword?: string;
}

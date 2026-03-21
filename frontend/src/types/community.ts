// Community Types

export interface CommunityVO {
 cmmntyId?: string;
 cmmntyNm: string;
 cmmntyIntrcn: string;
 useAt: string;
 registSeCode?: string; // 등록구분코드 (REGC01: 등록신청, REGC02: 등록거절, REGC03: 등록완료)
 frstRegisterId?: string;
 frstRegisterNm?: string;
 frstRegistPnttm?: string;
 lastUpdtPnttm?: string;
}

export interface CommunitySearchParams {
 pageIndex?: number;
 searchCondition?: string;
 searchKeyword?: string;
}

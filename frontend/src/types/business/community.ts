// Community Types

export interface CommunityVO {
 cmmntyId?: string;
 cmmntyNm: string;
 cmmntyIntrcn: string;
 useAt: string;
 registSeCode?: string; // 등록援щ텇肄붾뱶 (REGC01: 등록?좎껌, REGC02: 등록嫄곗젅, REGC03: 등록?꾨즺)
 frstRegisterId?: string;
 frstRegisterNm?: string;
 frstRegistPnttm?: string;
 lastUpdtPnttm?: string;
}

export interface CommunitySearchParams {
 page踰덊샇?: number;
 searchCondition?: string;
 searchKeyword?: string;
}

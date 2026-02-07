export interface StatsVO {
    statsId?: string;
    statsKind?: string; // 'day', 'month', 'year' 등
    fromDate?: string;
    toDate?: string;
    statsCo?: number;
    maxStatsCo?: number;
    maxUnit?: number;
    grpId?: string;
    grpNm?: string;
    statsItem?: string; // 통계 항목 (예: 날짜, 사용자ID 등)
}

export interface StatsSearchParams {
    pageIndex?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
    statsKind?: string;
}

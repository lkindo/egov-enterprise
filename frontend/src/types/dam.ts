export interface KnoManagementVO {
 knoId: string;
 knoNm: string;
 knoCn: string;
 othbcAt: string;
 frstRegistPnttm: string;
 frstRegisterId: string;
 lastUpdtPnttm: string;
 lastUpdusrId: string;
}

export interface KnoSearchParams {
 page번호?: number;
 searchKeyword?: string;
 searchCondition?: string;
}

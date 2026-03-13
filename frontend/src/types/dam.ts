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
    pageIndex?: number;
    searchKeyword?: string;
    searchCondition?: string;
}

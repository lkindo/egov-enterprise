export interface KnoManagementVO {
    knoId?: string;
    knoNm?: string;
    knoCn?: string;
    knoType?: string; // 지식 유형 (매뉴얼, 지침 등)
    othbcAt?: string; // 공개 여부 (Y/N)
    atchFileId?: string;
    frstRegisterId?: string;
    frstRegisterPnttm?: string;
    lastUpdusrId?: string;
    lastUpdusrPnttm?: string;
    emplyrId?: string;
    emplyrNm?: string;
}

export interface KnoSearchParams {
    pageIndex?: number;
    pageSize?: number;
    searchCondition?: string;
    searchKeyword?: string;
}
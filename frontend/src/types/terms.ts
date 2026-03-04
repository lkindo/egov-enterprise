export interface StplatManageVO {
    useStplatId?: string;
    useStplatNm: string;
    useStplatCn: string;
    infoProvdAgreCn: string;
    frstRegisterId?: string;
    frstRegistPnttm?: string; // or createdDate
    lastUpdusrId?: string;
    lastUpdtPnttm?: string;
}

export interface TermsSearchParams {
    pageIndex?: number;
    searchCondition?: string; // 1: 약관명, 2: 약관내용
    searchKeyword?: string;
}
export interface QustnrRespondInfo {
    qestnrQesrspnsId: string;
    qestnrQesitmId: string;
    qestnrId: string;
    qestnrTmplatId: string;
    qustnrIemId: string;
    respondAnswerCn: string;
    respondNm: string;
    etcAnswerCn: string;
    frstRegisterPnttm: string;
    frstRegisterId: string;
    lastUpdtPnttm: string;
    lastUpdusrId: string;
}

export interface QustnrRespondInfoVO extends QustnrRespondInfo {
    searchCondition?: string;
    searchKeyword?: string;
    pageIndex?: number;
    pageUnit?: number;
    pageSize?: number;
    firstIndex?: number;
    lastIndex?: number;
    recordCountPerPage?: number;
}

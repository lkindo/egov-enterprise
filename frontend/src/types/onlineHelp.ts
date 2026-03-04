// Online Help Types

export interface FaqVO {
    faqId?: string;
    qestnSj: string;
    qestnCn: string;
    answerCn: string;
    inqireCo?: number;
    frstRegisterId?: string;
    frstRegisterNm?: string;
    frstRegistPnttm?: string;
    lastUpdtPnttm?: string;
    atchFileId?: string;
}

export interface QnaVO {
    qaId?: string;
    qestnSj: string;
    qestnCn: string;
    answerCn?: string;
    answerSttusCode?: string;
    writerId?: string;
    wrterNm?: string;
    wrterEmailAdres?: string;
    inqireCo?: number;
    qaPassword?: string;
    frstRegisterId?: string;
    frstRegisterNm?: string;
    frstRegistPnttm?: string;
    lastUpdtPnttm?: string;
}

export interface OnlineHelpSearchParams {
    pageIndex?: number;
    searchCondition?: string;
    searchKeyword?: string;
}

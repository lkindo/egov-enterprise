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

export interface OnlineHelpSearchParams {
 pageIndex?: number;
 searchCondition?: string;
 searchKeyword?: string;
}

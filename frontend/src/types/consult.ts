import { SearchParams } from './system';

export interface CnsltVO {
    cnsltId?: string;
    cnsltSj: string;
    cnsltCn: string;
    othbcAt?: string;
    writngPassword?: string;
    wrterNm: string;
    inqireCo?: number;
    qnaProcessSttusCode?: string;
    managtCn?: string;
    managtDe?: string;
    createdBy?: string;
    createdDate?: string;
}

export interface CnsltSearchParams extends SearchParams {
    pageIndex?: number;
    searchCondition?: string;
    searchKeyword?: string;
}

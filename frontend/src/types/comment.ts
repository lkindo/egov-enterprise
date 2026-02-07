export interface CommentVO {
    id: number;
    nttId: number;
    bbsId: string;
    wrterId: string;
    wrterNm: string;
    commentCn: string;
    frstRegisterPnttm: string;
    useAt: string;
    commentNo?: string; // Legacy comp compatibility
}

export interface CommentSearchParams {
    pageIndex?: number;
    searchKeyword?: string;
}

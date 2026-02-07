// User Management Types

export interface UserManage {
    userId: string;
    userNm: string;
    password?: string;
    passwordHint?: string;
    passwordCnsr?: string;
    email: string;
    groupId?: string;
    userSttusCode: string;
    sbscrbDe?: string;
    esntlId?: string;
    moblphonNo?: string;
    areaNo?: string;
    middleTelno?: string;
    endTelno?: string;
    faxNo?: string;
    zip?: string;
    adres?: string;
    detailAdres?: string;
    orgnztId?: string;
    emplNo?: string;
    sexdstnCode?: string;
    brthdy?: string;
}

export interface UserSearchParams {
    pageIndex?: number;
    searchCondition?: string;
    searchKeyword?: string;
    sbscrbSttus?: string;
}

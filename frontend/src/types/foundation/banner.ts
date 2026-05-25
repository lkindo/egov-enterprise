export interface Banner {
    bnrId: string;
    bnrNm: string;
    linkUrl: string;
    bnrImgNm: string;
    bnrExpln?: string;
    sortOrdr: number;
    rfltYn: 'Y' | 'N';
    atchFileId?: string;
    createdBy?: string;
    createdDate?: string;
}

export interface Popup {
    popupId: string;
    popupTtlNm: string;
    fileUrl: string;
    popupWdthPstn: string;
    popupVrtcPstn: string;
    popupVrtcSz: string;
    popupWdthSz: string;
    ntceBgnde: string;
    ntceEndde: string;
    stopvewSetupYn: 'Y' | 'N';
    ntceYn: 'Y' | 'N';
    createdBy?: string;
    createdDate?: string;
}

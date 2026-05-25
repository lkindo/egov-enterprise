export interface Banner {
    bannerId: string;
    bannerNm: string;
    linkUrl: string;
    bannerImage: string;
    bannerDc?: string;
    sortOrdr: number;
    reflctAt: 'Y' | 'N';
    bannerImageFile?: string;
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

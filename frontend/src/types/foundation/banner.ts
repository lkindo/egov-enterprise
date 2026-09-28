export interface Banner {
    bnrSn: number;
    bnrNm: string;
    linkUrl: string;
    bnrImgNm: string;
    bnrExpln?: string;
    sortOrdr: number;
    rfltYn: 'Y' | 'N';
    atchFileSn?: number;
    frstRgtrId?: string;
    crtDt?: string;
}

export interface Popup {
    popupSn: number;
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
    frstRgtrId?: string;
    crtDt?: string;
}

/** Public display DTOs omit the administrator-only audit identity and timestamps. */
export type PublicBanner = Omit<Banner, 'frstRgtrId' | 'crtDt'>;
export type PublicPopup = Omit<Popup, 'frstRgtrId' | 'crtDt'>;

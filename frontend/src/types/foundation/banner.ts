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
    /** 낙관적 잠금 버전(V2_133). 수정할 때 읽은 값을 그대로 돌려보낸다 — 그 사이 다른 사람이 고쳤으면 서버가 409 로 거부한다. */
    version?: number;
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
    /** 낙관적 잠금 버전(V2_133). 수정할 때 읽은 값을 그대로 돌려보낸다 — 그 사이 다른 사람이 고쳤으면 서버가 409 로 거부한다. */
    version?: number;
}

/** Public display DTOs omit the administrator-only audit identity, timestamps and the edit version. */
export type PublicBanner = Omit<Banner, 'frstRgtrId' | 'crtDt' | 'version'>;
export type PublicPopup = Omit<Popup, 'frstRgtrId' | 'crtDt' | 'version'>;

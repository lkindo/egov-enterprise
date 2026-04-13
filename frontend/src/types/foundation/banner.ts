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
    popupTitleName: string;
    fileUrl: string;
    popupWidthLocation: string;
    popupHeightLocation: string;
    popupHeightSize: string;
    popupWidthSize: string;
    noticeBeginDate: string;
    noticeEndDate: string;
    isStopView: 'Y' | 'N';
    isNotice: 'Y' | 'N';
    createdBy?: string;
    createdDate?: string;
}

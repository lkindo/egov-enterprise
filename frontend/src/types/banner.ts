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
  popupTitleNm: string;
  fileUrl: string;
  popupWlc: string;
  popupHlc: string;
  popupHSize: string;
  popupWSize: string;
  ntceBgnde: string;
  ntceEndde: string;
  stopVewAt: 'Y' | 'N';
  ntceAt: 'Y' | 'N';
  frstRegisterId?: string;
  frstRegistPnttm?: string;
}
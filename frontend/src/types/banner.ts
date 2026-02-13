export interface Banner {
  bannerId: string;
  bannerNm: string;
  linkUrl: string;
  bannerImage: string; // Image file ID or path
  bannerDc?: string;
  reflctAt: 'Y' | 'N';
  frstRegisterId?: string;
  createdDate?: string;
}

export interface Popup {
  popupId: string;
  popupNm: string;
  fileUrl: string;
  popupWidth: number;
  popupHeight: number;
  popupTop: number;
  popupLeft: number;
  stopVewAt: 'Y' | 'N';
  ntceBgnde: string;
  ntceEndde: string;
  ntceAt: 'Y' | 'N';
}

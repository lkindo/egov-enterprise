export interface MenuInfo {
  menuNo: number;
  menuNm: string;
  upperMenuId: number;
  menuOrdr: number;
  menuDc?: string;
  relateImagePath?: string;
  relateImageNm?: string;
  progrmFileNm?: string;
  chkURL?: string; // Derived from program URL
  modernRoute?: string;
}

export interface MenuResponse {
  success: boolean;
  list: MenuInfo[];
}

export interface MenuInfo {
 menuNo: number;
 menuNm: string;
 upperMenuId: number;
 upperMenuNo: number;
 menuOrdr: number;
 menuDc?: string;
 relateImagePath?: string;
 relateImageNm?: string;
 progrmFileNm?: string;
 chkURL?: string; // Derived from program URL
 modernRoute?: string;
 children?: MenuInfo[];
}

export interface MenuResponse {
 success: boolean;
 list: MenuInfo[];
}

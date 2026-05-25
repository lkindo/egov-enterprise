export interface MenuInfo {
 menuNo: number;
 menuNm: string;
 upperMenuId: number;
 upMenuSn: number;
 menuOrdr: number;
 menuDc?: string;
 relImgPath?: string;
 relImgNm?: string;
 prgrmFileNm?: string;
 chkURL?: string; // Derived from program URL
 modernRoute?: string;
 children?: MenuInfo[];
}

export interface MenuResponse {
 success: boolean;
 list: MenuInfo[];
}

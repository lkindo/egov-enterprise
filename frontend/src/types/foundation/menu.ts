export interface MenuInfo {
 menuNo: number;
 menuNm: string;
 upperMenuId: number;
 upMenuSn: number;
 menuOrdr: number;
 menuDc?: string;
 menuExpln?: string;
 relImgPath?: string;
 relImgNm?: string;
 prgrmFileNm?: string;
 chkURL?: string; // Derived from program URL
 modernRoute?: string;
 useYn?: 'Y' | 'N';
 children?: MenuInfo[];
}

interface MenuResponse {
 success: boolean;
 list: MenuInfo[];
}

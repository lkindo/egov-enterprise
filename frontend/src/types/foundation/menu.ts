export interface MenuInfo {
 menuNo: number;
 menuNm: string;
 upperMenuId: number;
 upMenuSn: number;
 menuOrdr: number;
 menuExpln?: string;
 relImgPath?: string;
 relImgNm?: string;
 chkURL?: string; // modernRoute, or '#' when the menu has none (not a destination of its own)
 modernRoute?: string;
 useYn?: 'Y' | 'N';
 children?: MenuInfo[];
}


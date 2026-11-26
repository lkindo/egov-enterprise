export interface MenuInfo {
 menuNo: number;
 menuNm: string;
 /** 상위 메뉴 번호 — 최상위 메뉴는 서버가 비워 보낸다(화면은 없으면 최상위로 본다). */
 upperMenuId?: number;
 upMenuSn?: number;
 menuOrdr: number;
 menuExpln?: string;
 relImgPath?: string;
 relImgNm?: string;
 chkURL?: string; // modernRoute, or '#' when the menu has none (not a destination of its own)
 modernRoute?: string;
 useYn?: 'Y' | 'N';
 children?: MenuInfo[];
}


// Security Management Types

export interface GroupManage {
 groupId: string;
 groupNm: string;
 groupDc: string;
 groupCrtDt?: string;
}

export interface MenuByAuthority {
 menuNo: number;
 menuNm: string;
 upperMenuId: number;
 menuOrdr: number;
 children?: MenuByAuthority[];
}

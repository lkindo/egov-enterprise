// Security Management Types

export interface AuthorManage {
 authrtCd: string;
 authrtNm: string;
 authrtExpln: string;
 authrtCrtYmd?: string;
}

export interface RoleManage {
 roleId: string;
 roleNm: string;
 rolePatrn: string;
 roleExpln: string;
 roleTypeCd: string;
 roleSort: string;
 crtDt?: string;
}

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
 prgrmFileNm: string;
 children?: MenuByAuthority[];
}

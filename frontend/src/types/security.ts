// Security Management Types

export interface AuthorManage {
 authorCode: string;
 authorNm: string;
 authorDc: string;
 authorCreatDe?: string;
}

export interface RoleManage {
 roleCode: string;
 roleNm: string;
 rolePtn: string;
 roleDc: string;
 roleTyp: string;
 roleSort: string;
 roleCreatDe?: string;
}

export interface GroupManage {
 groupId: string;
 groupNm: string;
 groupDc: string;
 groupCreatDe?: string;
}

export interface MenuByAuthority {
 menuNo: number;
 menuNm: string;
 upperMenuId: number;
 menuOrdr: number;
 progrmFileNm: string;
 children?: MenuByAuthority[];
}

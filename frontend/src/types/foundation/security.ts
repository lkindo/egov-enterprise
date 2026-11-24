// Security Management Types

export interface GroupManage {
 groupId: string;
 groupNm: string;
 groupDc: string;
 groupCrtDt?: string;
 /** 낙관적 잠금 버전(V2_155). 목록에서 받은 값을 수정 요청에 그대로 돌려보낸다(다르면 409). */
 version?: number;
}

export interface MenuByAuthority {
 menuNo: number;
 menuNm: string;
 upperMenuId: number;
 menuOrdr: number;
 children?: MenuByAuthority[];
}

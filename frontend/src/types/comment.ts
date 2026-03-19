export interface CommentVO {
 id: number;
 nttId: number;
 bbsId: string;
 wrterId: string;
 wrterNm: string;
 commentCn: string;
 createdDate: string; // Updated from frstRegisterPnttm to match backend
 modifiedDate?: string;
 useAt: string;
}

export interface CommentSaveRequest {
 nttId: number;
 bbsId: string;
 commentCn: string;
 password?: string;
}

export interface CommentSearchParams {
 nttId: number;
 bbsId: string;
 page?: number;
 size?: number;
}

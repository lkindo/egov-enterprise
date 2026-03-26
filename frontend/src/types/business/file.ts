export interface FileVO {
 atchFileId: string;
 fileSn: number;
 fileStreCours: string;
 streFileNm: string;
 orignlFileNm: string;
 fileExtsn: string;
 fileMg: number;
 fileCn?: string;
 frstRegisterPnttm?: string;
}

export interface FileSearchParams {
 page번호?: number;
 searchKeyword?: string;
}

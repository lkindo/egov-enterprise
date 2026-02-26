export interface Program {
    progrmFileNm: string;
    progrmStrePath: string;
    progrmNm: string;
    url: string;
    progrmDc?: string;
}

/** 새 client는 ApiResponse.data를 직접 반환하므로 페이지네이션 구조 */
export interface ProgramResponse {
    content: Program[];
    totalElements: number;
    totalPages: number;
}

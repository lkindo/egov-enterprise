export interface Program {
  progrmFileNm: string;
  progrmStrePath: string;
  progrmNm: string;
  url: string;
  progrmDc?: string;
}

export interface ProgramResponse {
  success: boolean;
  data: {
    content: Program[];
    totalElements: number;
    totalPages: number;
  };
}

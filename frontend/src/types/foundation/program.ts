import { PaginationInfo } from './system';

export interface Program {
  prgrmFileNm: string;
  prgrmStrgPath: string;
  prgrmKornNm: string;
  url: string;
  prgrmExpln?: string;
  // Audit Fields (Newly synchronized via Full-Stack Survey)
  frstRgtrId?: string;
  crtDt?: string;
  lastMdfrId?: string;
  mdfcnDt?: string;
}

/** client의 ApiResponse.data를 직접 반환하도록 페이지네이션 구조 정의 */
export interface ProgramResponse {
  list: Program[];
  total: number;
  totalPage: number;
  page: number;
  size: number;
}

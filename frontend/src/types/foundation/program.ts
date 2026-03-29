import { PaginationInfo } from './system';

export interface Program {
  progrmFileNm: string;
  progrmStrePath: string;
  progrmKoreanNm: string;
  url: string;
  progrmDc?: string;
}

/** 새 client는 ApiResponse.data를 직접 반환하므로 페이지네이션 구조 */
export interface ProgramResponse {
  content?: Program[];
  totalElements?: number;
  totalPages?: number;
  resultList?: Program[];
  paginationInfo?: PaginationInfo;
}

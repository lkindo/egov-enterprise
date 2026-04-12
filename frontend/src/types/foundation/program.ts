import { PaginationInfo } from './system';

export interface Program {
  progrmFileNm: string;
  progrmStrePath: string;
  progrmKoreanNm: string;
  url: string;
  progrmDc?: string;
}

/** 님client님ApiResponse.data瑜吏곸젒 諛섑솚?섎濡님섏씠吏ㅼ씠님援ъ“ */
export interface ProgramResponse {
  list: Program[];
  total: number;
  totalPage: number;
  page: number;
  size: number;
}

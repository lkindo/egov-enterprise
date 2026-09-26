;

export interface Program {
  prgrmFileNm: string;
  prgrmStrgPath: string;
  prgrmKornNm: string;
  url: string;
  prgrmExpln?: string;
}

/** client의 ApiResponse.data를 직접 반환하도록 페이지네이션 구조 정의 */

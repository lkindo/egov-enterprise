export interface DashboardTask {
  id: string | number;
  bbsId?: string;
  pstSn?: number;
  nttId?: string | number;
  title?: string;
  date: string;
  isNew: boolean;
  author?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  /**
   * 게시판 글의 게시 상태(서버 판정, ADR-0040 결정 3). 예약·게시 종료 글은 작성자와 조회 대행 권한자에게만 온다 — 화면은 그 사실을
   * 표지로 말하고 날짜로 다시 계산하지 않는다(DEC-OPS-140).
   */
  postingStatus?: 'SCHEDULED' | 'POSTING' | 'ENDED';
  /** 게시 시작일(yyyyMMdd). 예약 표지가 언제 공개되는지 말할 때만 쓴다. */
  postingStartYmd?: string;
}



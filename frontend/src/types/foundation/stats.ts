interface ConnectStats {
  statsDate: string; // Aligned with backend statsDate
  statsCo: number; // Aligned with backend statsCo
}

export interface MenuStats {
  menuNm: string;
  statsCo: number; // Aligned with backend statsCo
  percentage: number;
}

interface UserActivityStats {
  userId: string;
  userNm: string;
  postCount: number;
  commentCount: number;
}

export interface SummaryStats {
  totalUsers: number;
  totalPosts: number;
  todayConnects: number;
}

interface StatsVO {
  statsId: string;
  statsSe: string;
  statsCn: string;
  crtDt: string;
}

interface StatsSearchParams {
  statsSe?: string;
  searchPeriod?: string;
  statsKind?: string;
  fromDate?: string;
  toDate?: string;
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  size?: number;
}

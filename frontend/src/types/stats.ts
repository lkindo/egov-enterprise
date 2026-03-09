export interface ConnectStats {
  date: string;
  count: number;
}

export interface MenuStats {
  menuNm: string;
  count: number;
  percentage: number;
}

export interface UserActivityStats {
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

export interface StatsVO {
  statsId: string;
  statsSe: string;
  statsCn: string;
  createdDate: string;
}

export interface StatsSearchParams {
  statsSe?: string;
  searchPeriod?: string;
  statsKind?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  size?: number;
}


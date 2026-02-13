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
  pendingTroubles: number;
}

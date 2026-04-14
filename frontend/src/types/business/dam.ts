export interface KnoManagementVO {
  knoId: string;
  knoNm: string;
  knoCn: string;
  othbcAt: string;
  frstRegisterPnttm: string;
  frstRegisterId: string;
  lastUpdtPnttm: string;
  lastUpdusrId: string;
}

export interface KnoSearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchKeyword?: string;
  searchCondition?: string;
}

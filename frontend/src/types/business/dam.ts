export interface KnoManagementVO {
  knoId: string;
  knoNm: string;
  knoCn: string;
  othbcAt: string;
  crtDt: string;
  frstRgtrId: string;
  mdfcnDt: string;
  lastMdfrId: string;
}

export interface KnoSearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchKeyword?: string;
  searchCondition?: string;
}

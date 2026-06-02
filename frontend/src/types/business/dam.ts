export interface KnoManagementVO {
  knoId: string;
  knoNm: string;
  knoCn: string;
  othbcAt: string;
  createdDate: string;
  frstRgtrId: string;
  lastModifiedDate: string;
  lastMdfrId: string;
}

export interface KnoSearchParams {
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  searchKeyword?: string;
  searchCondition?: string;
}

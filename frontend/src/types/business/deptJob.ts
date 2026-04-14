export interface DeptJobVO {
  deptJobId?: string;
  deptJobNm: string;
  deptJobCn: string;
  deptJobbxId?: string;
  deptJobbxNm?: string;
  deptId?: string;
  deptNm?: string;
  chargerId?: string;
  chargerNm?: string;
  priort: string;
  atchFileId?: string;
  frstRegisterId?: string;
  frstRegisterPnttm?: string;
  lastUpdusrId?: string;
  lastUpdtPnttm?: string;
}

export interface DeptJobBxVO {
  deptJobbxId: string;
  deptJobbxNm: string;
  deptId?: string;
  deptNm?: string;
  indictOrdr?: number;
  frstRegisterId?: string;
  frstRegisterPnttm?: string;
  lastUpdusrId?: string;
  lastUpdtPnttm?: string;
}

export interface DeptJobSearchParams {
  pageNo?: number;
  searchCondition?: string;
  searchKeyword?: string;
  searchDeptJobBxId?: string; // 업무함필터
}

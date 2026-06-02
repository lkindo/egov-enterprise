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
  frstRgtrId?: string;
  createdDate?: string;
  lastMdfrId?: string;
  lastModifiedDate?: string;
}

export interface DeptJobBxVO {
  deptJobbxId: string;
  deptJobbxNm: string;
  deptId?: string;
  deptNm?: string;
  indictOrdr?: number;
  frstRgtrId?: string;
  createdDate?: string;
  lastMdfrId?: string;
  lastModifiedDate?: string;
}

export interface DeptJobSearchParams {
  pageNo?: number;
  searchCondition?: string;
  searchKeyword?: string;
  searchDeptJobBxId?: string; // 업무함필터
}

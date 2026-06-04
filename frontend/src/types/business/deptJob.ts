export interface DeptJobVO {
  deptTaskId?: string;
  deptTaskNm: string;
  deptTaskCn: string;
  deptTaskBoxId?: string;
  deptTaskBoxNm?: string;
  deptId?: string;
  deptNm?: string;
  picId?: string;
  picNm?: string;
  prrtyRnk: string;
  atchFileId?: string;
  frstRgtrId?: string;
  crtDt?: string;
  lastMdfrId?: string;
  mdfcnDt?: string;
}

export interface DeptJobBxVO {
  deptTaskBoxId: string;
  deptTaskBoxNm: string;
  deptId?: string;
  deptNm?: string;
  sortOrdr?: number;
  frstRgtrId?: string;
  crtDt?: string;
  lastMdfrId?: string;
  mdfcnDt?: string;
}

export interface DeptJobSearchParams {
  pageNo?: number;
  searchCondition?: string;
  searchKeyword?: string;
  searchDeptJobBxId?: string; // 업무함필터
}

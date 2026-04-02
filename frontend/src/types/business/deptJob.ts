export interface DeptJobVO {
  deptJobId?: string;
  deptJobNm: string; // 부서업무명
  deptJobCn: string; // 부서업무내용
  deptJobBxId?: string; // 부서업무함ID
  deptJobBxNm?: string; // 부서업무함명
  chargerId?: string; // 담당자ID
  chargerNm?: string; // 담당자명
  priort: string; // 우선순위 (1:높음, 2:보통, 3:낮음)
  frstRegisterId?: string;
  frstRegistPnttm?: string;
}

export interface DeptJobBxVO {
  deptJobBxId: string;
  deptJobBxNm: string;
  deptId?: string;
  deptNm?: string;
}

export interface DeptJobSearchParams {
  pageNo?: number;
  searchCondition?: string;
  searchKeyword?: string;
  searchDeptJobBxId?: string; // 업무함필터
}

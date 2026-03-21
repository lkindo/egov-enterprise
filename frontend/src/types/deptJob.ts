export interface DeptJobVO {
 deptJobId?: string;
 deptJobNm: string; // 업무명
 deptJobCn: string; // 업무내용
 deptJobBxId?: string; // 부서업무함ID
 deptJobBxNm?: string;
 chargerId?: string; // 담당자ID
 chargerNm?: string;
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
 pageIndex?: number;
 searchCondition?: string;
 searchKeyword?: string;
 searchDeptJobBxId?: string; // 업무함 필터
}

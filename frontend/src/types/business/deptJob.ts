export interface DeptJobVO {
 deptJobId?: string;
 deptJobNm: string; // 업무紐? deptJobCn: string; // 업무?댁슜
 deptJobBxId?: string; // 遺?쒖뾽臾댄븿ID
 deptJobBxNm?: string;
 chargerId?: string; // ?대떦?륤D
 chargerNm?: string;
 priort: string; // ?곗꽑?쒖쐞 (1:?믪쓬, 2:蹂댄넻, 3:님쓬)
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
 page踰덊샇?: number;
 searchCondition?: string;
 searchKeyword?: string;
 searchDeptJobBxId?: string; // 업무님?꾪꽣
}

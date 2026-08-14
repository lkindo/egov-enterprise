interface Schedule {
  schdlSn: number;
  schdlSeCd: string; // 1 (부서) 2 (개인)
  schdlDeptId?: string;
  schdlKndCd?: string;
  // ⚠ 물리 컬럼은 varchar(8), DTO 는 @Size(max = 8) — 'yyyyMMdd' 다. 시각 정보는 스키마에 없다.
  //   (종전 주석 'yyyyMMddHHmm' 은 오기였고, 실제로 16자를 보내던 등록 화면은 400 을 받고 있었다.)
  schdlBgngYmd: string; // yyyyMMdd
  schdlEndYmd: string;  // yyyyMMdd
  schdlNm: string;
  schdlCn: string;
  schdlPlcNm?: string;
  schdlImprtCd?: string;
  schdlPicId?: string;
  atchFileId?: string;
  reptSeCd?: string;
  frstRgtrId?: string;
  crtDt?: string;
  schdlIpAddr?: string;
  lastMdfrId?: string;
  mdfcnDt?: string;
}



export interface DeptSchedule extends Schedule {
  schdlDeptId: string;
}

export interface ScheduleSearchParams {
  schdlSeCd?: string;
  schdlDeptId?: string;
  schdlBgngYmd?: string;
  schdlEndYmd?: string;
  schdlNm?: string;
  pageNo?: number;
  pageIndex?: number;
  size?: number;
}



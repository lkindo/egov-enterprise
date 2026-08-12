
import type { components } from '@/types/generated-api';

export interface PaginationInfo {
  currentPageNo?: number;
  recordCountPerPage?: number;
  pageSize?: number;
  totalRecordCount?: number;
  totalPageCount?: number;
  firstPageNoOnPageList?: number;
  lastPageNoOnPageList?: number;
  firstRecordNo?: number;
  lastRecordNo?: number;
}

/**
 * 백엔드 신규 페이지 응답 모델 (PageResponse)
 * - list/content: 현재 페이지 데이터
 * - total/totalElements: 전체 레코드 수
 * - page: 현재 페이지 번호 (1-based)
 * - size: 페이지당 항목 수
 * - totalPage: 전체 페이지 수
 */
export interface PageResponse<T = unknown> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}



export interface SearchParams {
  /** 서버가 @RequestParam("keyword") 로 받는 검색어 (부서 목록 등). searchKeyword 와 별개 축이다. */
  keyword?: string;
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  size?: number;
  searchCondition?: string;
  searchKeyword?: string;
  searchWrd?: string;
  ntwrkId?: string;
  codeId?: string;
  pageUnit?: number;
  sbscrbSttus?: string;
  [key: string]: unknown;
}

// Common Code
export interface CmmnClCode {
  clsfCd: string;
  clsfCdNm: string;
  clsfCdExpln: string;
  useYn: 'Y' | 'N';
  frstRgtrId?: string;
  lastMdfrId?: string;
}

export interface CmmnCode {
  cdId: string;
  cdIdNm: string;
  cdIdExpln: string;
  useYn: 'Y' | 'N';
  clsfCd: string;
  clsfCdNm?: string;
}

export interface CmmnDetailCode {
  cdId: string;
  dtlCd: string;
  dtlCdNm: string;
  dtlCdExpln: string;
  useYn: 'Y' | 'N';
  cdIdNm?: string;
}

// Menu

// Program
export interface ProgrmManage {
  prgrmFileNm: string;
  prgrmStrgPath: string;
  prgrmKornNm: string;
  prgrmExpln: string;
  url: string;
}

// Log

/** API 생성 계약을 로그 DTO의 단일 진실 공급원으로 사용한다. */
export type SysLog = components['schemas']['SysLogDto'];
export type LoginLog = components['schemas']['LoginLogDto'];

/**
 * 사용자 활동 로그. 개별 요청이 아니라 **사용자 × 서비스 × 메서드 × 일자 단위 집계**다.
 *
 * ⚠ 2026-08-05 정정 — 종전 선언(`occrrncDe`·`rqesterId`·`svcNm`·`methodNm`·`creatDt`·`userLogId`)은
 * 백엔드 실물과 어긋나 있었다. `creatDt`(등록일시)와 단일 `userLogId` 는 **존재하지 않으며**
 * (`tb_user_log` 는 복합키다), 정작 이 테이블의 값인 카운터 6종은 선언되지 않았다.
 * 화면은 없는 컬럼을 그리고 실제 값은 그리지 않고 있었다.
 */
export type UserLog = components['schemas']['UserLogDto'];

// Login Log

// Web Log
export type WebLog = components['schemas']['WebLogDto'];

/**
 * 개인정보 조회 로그. **이 로그의 내용 자체가 개인정보**라 열람은 ADMIN 전용이다
 * (`PrivacyLogApiController` 는 `@AdminOnly`).
 *
 * ⚠ 2026-08-05 정정 — 종전 선언(`logId`·`trgetId`·`trgetClCode`·`trgetNm`·`processSeCode`·
 * `creatDt`·`rqesterId`)은 백엔드 실물과 전부 어긋나 있었다.
 */
export type PrivacyLog = components['schemas']['PrivacyLogDto'];

/*
 * 전송 로그(TransferLog)는 두지 않는다 (2026-08-05 제거).
 * 테이블도 엔티티도 존재한 적이 없다(DB 90개 테이블 전수 확인) — "구현이 안 된 것" 이 아니라
 * **무엇을 전송 로그로 기록할지 정의된 적이 없는 것**이다. 화면·서비스 메서드와 함께 제거했다.
 * 필요해지면 요구사항(무엇을·어디로 전송한 기록인가)부터 정의할 것.
 */

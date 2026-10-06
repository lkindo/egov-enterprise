export interface Survey {
  srvySn: number;
  srvyTtl: string;
  srvyPrps: string;
  srvyWrtGdCn: string;
  srvyTrgt: string;
  srvyBgngYmd: string;
  srvyEndYmd: string;
  srvyTmpltSn: number;
  frstRgtrId?: string;
  crtDt: string;
  /** 현재 사용자가 이미 응답했는지(응답 전용, 목록·상세 모두 서버가 채운다). null 은 판정하지 않음(DIP V8, 2026-10-01 목록). */
  responded?: boolean | null;
  /** 응답자에게 공개했는가('Y' 공개·'N' 작성 중). 새 설문은 작성 중으로 시작한다(2026-10-01 결정 21). */
  rlsYn?: string | null;
}

export interface SurveyQuestion {
  srvyQstnSn: number;
  srvySn: number;
  qstnSn: number;
  qstnTypeCd: string;
  qstnCn: string;
  maxChcCnt: number;
  srvyTmpltSn: number;
  frstRgtrId: string;
  crtDt: string;
  items: SurveyAnswer[];
}

/**
 * 설문 응답 제출 payload. 서버 `SurveyResponseSubmitDto` 와 같은 모양이다.
 *
 * srvyArtclSn 은 주관식 문항에도 반드시 필요하다 — 물리 컬럼이 NOT NULL 이라
 * 주관식은 '기타' 성격의 단일 항목을 두고 그 ID 를 보낸다(서버 DTO 주석).
 */
export interface SurveyResponseSubmit {
  rspnsNm?: string;
  answers: {
    srvyQstnSn: number;
    srvyArtclSn: number;
    rspdntAnsCn?: string;
    etcAnsCn?: string;
  }[];
}

/** 문항의 선택 항목(`tb_srvy_artcl`). 문항 하위 자원이라 단독으로는 의미가 없다. */
export interface SurveyAnswer {
  srvyArtclSn: number;
  srvyQstnSn: number;
  srvySn: number;
  artclSn: number;
  artclCn: string;
  etcAnsYn: string;
  srvyTmpltSn: number;
  frstRgtrId: string;
  crtDt: string;
}

/**
 * 문항별 항목 응답 분포 1행. **(문항 × 항목)** 단위의 평면 행이며 중첩 구조가 아니다.
 *
 * <p>종전에는 `{artclCn, count, percentage}` 만 선언돼 있었으나 화면(`/survey/stats`·`/survey/[id]`)은
 * `qstnCn`·`qstnTypeCd` 까지 렌더한다 — `as any` 로 받고 있어 이 누락이 드러나지 않았다.
 * 3단계에서 신설할 백엔드 통계 DTO 가 이 형태를 SSOT 로 삼는다.
 */
export interface SurveyResultStats {
  /** 문항 일련번호 */
  srvyQstnSn: number;
  /** 문항 내용 */
  qstnCn: string;
  /** 문항 유형 코드 ('1'=객관식, 그 외 주관식) */
  qstnTypeCd: string;
  /** 항목 일련번호 */
  srvyArtclSn: number;
  /** 항목 내용. 주관식이면 비어 있다 */
  artclCn?: string;
  /** 해당 항목 응답 수 */
  count: number;
  /** 응답자 중 이 항목을 고른 비율(%). 복수선택이면 문항 합계가 100 을 넘을 수 있다 */
  percentage: number;
  /** 이 문항에 응답한 사람 수 — 비율의 분모(DIP V8) */
  respondentCount?: number;
}

export interface QustnrRespondInfo {
  srvyRspnsSn: number;
  srvySn: number;
  srvyQstnSn: number;
  srvyTmpltSn: number;
  srvyArtclSn: number;
  rspdntAnsCn: string;
  rspnsNm: string;
  etcAnsCn: string;
  frstRgtrId: string;
  crtDt: string;
  srvyTtl?: string; // Optionally included in detail responses
}


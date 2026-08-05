export interface Survey {
  srvyId: string;
  srvyTtl: string;
  srvyPrps: string;
  srvyWrtGdCn: string;
  srvyTrgt: string;
  srvyBgngYmd: string;
  srvyEndYmd: string;
  srvyTmpltId?: string;
  frstRgtrId?: string;
  crtDt: string;
}

export interface SurveyQuestion {
  srvyQstnId: string;
  srvyId: string;
  qstnSn: number;
  qstnTypeCd: string;
  qstnCn: string;
  maxChcCnt: number;
  srvyTmpltId: string;
  frstRgtrId: string;
  crtDt: string;
  items: SurveyAnswer[];
}

interface SurveyAnswer {
  srvyArtclId: string;
  srvyQstnId: string;
  srvyId: string;
  artclSn: number;
  artclCn: string;
  etcAnsYn: string;
  srvyTmpltId: string;
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
  /** 문항 내용 */
  qstnCn: string;
  /** 문항 유형 코드 ('1'=객관식, 그 외 주관식) */
  qstnTypeCd: string;
  /** 항목 내용. 주관식이면 비어 있다 */
  artclCn?: string;
  /** 해당 항목 응답 수 */
  count: number;
  /** 문항 내 응답 비율(%) */
  percentage: number;
}

export interface QustnrRespondInfo {
  srvyRspnsId: string;
  srvyId: string;
  srvyQstnId: string;
  srvyTmpltId: string;
  srvyArtclId: string;
  rspdntAnsCn: string;
  rspnsNm: string;
  etcAnsCn: string;
  frstRgtrId: string;
  crtDt: string;
  srvyTtl?: string; // Optionally included in detail responses
}

interface QustnrRespondInfoVO {
  qustnrRespondInfo: QustnrRespondInfo;
  answers: SurveyAnswer[];
  pageNo?: number;
  pageIndex?: number;
  size?: number;
  respondNm?: string;
}
